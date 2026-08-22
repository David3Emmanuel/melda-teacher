// AI-assisted "new review": the teacher types a topic, MELDA drafts multiple-
// choice questions (POST /ai/draft-quiz), the teacher edits any prompt, choice or
// answer, and saving posts the review to the class (POST /classes/:id/assignments),
// where the backend resolves the topic to a real concept so the tracker and
// insights close the loop. The draft is the AI's first pass; the graded
// assignment it becomes is server-owned state.

import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import type { QuizDraft } from 'melda-shared';
import { api } from '../../../src/api/client';
import { useUnsavedGuard } from '../../../src/hooks/useUnsavedGuard';
import { useSession } from '../../../src/state/store';
import {
  Badge,
  Button,
  Card,
  Input,
  Row,
  Screen,
  SectionTitle,
  Txt,
} from 'melda-shared/ui/components';
import { clampInt, color, sp } from 'melda-shared/ui/tokens';

export default function NewReview() {
  const router = useRouter();
  const classId = useSession((s) => s.currentClass?.id) ?? '';
  const [topic, setTopic] = useState('');
  // Draft + due params, all editable rather than baked into the request. The class
  // record carries no grade, so grade level defaults to the common case.
  const [gradeLevel, setGradeLevel] = useState('Grade 10');
  const [count, setCount] = useState('5');
  const [openDays, setOpenDays] = useState('7');
  const [draft, setDraft] = useState<QuizDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // An edited draft that has not been set for the class is real work; warn before
  // it is lost. Off while saving so the successful-save router.replace is allowed.
  useUnsavedGuard(!!draft && !saving);

  // Edit the draft in place before setting it - the AI can misword a prompt or
  // pick the wrong key. Each setter patches one slice of the draft state.
  const patchQuestion = (i: number, patch: Partial<QuizDraft['questions'][number]>) =>
    setDraft((d) =>
      d
        ? { ...d, questions: d.questions.map((q, idx) => (idx === i ? { ...q, ...patch } : q)) }
        : d,
    );
  const patchChoice = (qi: number, ci: number, text: string) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            questions: d.questions.map((q, idx) =>
              idx === qi ? { ...q, choices: q.choices.map((c, k) => (k === ci ? text : c)) } : q,
            ),
          }
        : d,
    );

  const generate = async () => {
    const t = topic.trim();
    if (!t) return;
    setLoading(true);
    setError(null);
    try {
      setDraft(
        await api.draftQuiz({
          topic: t,
          gradeLevel: gradeLevel.trim() || undefined,
          count: clampInt(count, 1, 10, 5),
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not draft the review.');
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setError(null);
    const due = new Date();
    due.setDate(due.getDate() + clampInt(openDays, 1, 90, 7));
    try {
      const { id } = await api.createAssignment(classId, {
        topic: topic.trim(),
        title: draft.title,
        dueAt: due.toISOString(),
        questions: draft.questions.map((q) => ({
          prompt: q.prompt,
          choices: q.choices,
          correctIndex: q.correctIndex,
        })),
      });
      router.replace(`/(teacher)/reviews/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not set the review.');
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: 'New review' }} />

      <Card>
        <Input
          label="Topic"
          value={topic}
          onChangeText={setTopic}
          placeholder="e.g. Balancing equations"
          onSubmitEditing={generate}
        />
        <Input
          label="Grade level"
          value={gradeLevel}
          onChangeText={setGradeLevel}
          placeholder="e.g. Grade 10"
          style={{ marginTop: sp.md }}
        />
        <Row gap={sp.md} style={{ marginTop: sp.md, alignItems: 'flex-start' }}>
          <Input
            label="Questions (1-10)"
            value={count}
            onChangeText={setCount}
            keyboardType="number-pad"
            style={{ flex: 1 }}
          />
          <Input
            label="Open for days (1-90)"
            value={openDays}
            onChangeText={setOpenDays}
            keyboardType="number-pad"
            style={{ flex: 1 }}
          />
        </Row>
        <Txt variant="tiny" c={color.inkMuted} style={{ marginTop: sp.sm }}>
          MELDA drafts multiple-choice questions with an answer key. Edit any question or answer
          before setting it for the class.
        </Txt>
      </Card>

      <Button
        title={draft ? 'Redraft' : 'Draft with MELDA'}
        icon="sparkle"
        loading={loading}
        disabled={!topic.trim()}
        onPress={generate}
      />

      {error ? (
        <Txt variant="small" c={color.struggle}>
          {error}
        </Txt>
      ) : null}

      {draft ? (
        <>
          <View>
            <SectionTitle title="Draft" caption="Tap a letter to set the correct answer" />
            <Card>
              <Input
                label="Review title"
                value={draft.title}
                onChangeText={(title) => setDraft((d) => (d ? { ...d, title } : d))}
              />
              <Txt variant="small" c={color.inkMuted} style={{ marginTop: sp.xs }}>
                {draft.questions.length} question{draft.questions.length === 1 ? '' : 's'}
              </Txt>
            </Card>
          </View>

          {draft.questions.map((q, i) => (
            <Card key={i}>
              <Input
                label={`Question ${i + 1}`}
                value={q.prompt}
                onChangeText={(prompt) => patchQuestion(i, { prompt })}
                multiline
                nativeID={`q-${i}-prompt`}
              />
              {/* The answer key for one question: a radiogroup named by the
                  prompt, one radio per choice. aria-checked carries the state
                  on web (react-native-web drops the legacy accessibilityState
                  mapping), and each letter badge sits in a 44px hit area so a
                  mis-tap can't set the wrong answer key. */}
              <View
                accessibilityRole="radiogroup"
                aria-labelledby={`q-${i}-prompt`}
                style={{ marginTop: sp.sm, gap: sp.sm }}
              >
                {q.choices.map((choice, ci) => {
                  const isAnswer = ci === q.correctIndex;
                  return (
                    <Row key={ci} gap={sp.sm} style={{ alignItems: 'center' }}>
                      <Pressable
                        onPress={() => patchQuestion(i, { correctIndex: ci })}
                        accessibilityRole="radio"
                        aria-checked={isAnswer}
                        accessibilityState={{ selected: isAnswer }}
                        accessibilityLabel={`Mark ${String.fromCharCode(65 + ci)} as the correct answer`}
                        style={{
                          minWidth: 44,
                          minHeight: 44,
                          alignItems: 'center',
                          justifyContent: 'center',
                          alignSelf: 'flex-start',
                        }}
                      >
                        <Badge
                          label={isAnswer ? 'Answer' : String.fromCharCode(65 + ci)}
                          tone={isAnswer ? 'ok' : 'neutral'}
                          dot={isAnswer}
                        />
                      </Pressable>
                      <Input
                        value={choice}
                        onChangeText={(t) => patchChoice(i, ci, t)}
                        style={{ flex: 1 }}
                      />
                    </Row>
                  );
                })}
              </View>
            </Card>
          ))}

          <Button title="Set for the class" icon="check" loading={saving} onPress={save} />
        </>
      ) : null}
    </Screen>
  );
}
