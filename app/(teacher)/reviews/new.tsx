// AI-assisted "new review": the teacher types a topic, MELDA drafts multiple-
// choice questions (POST /ai/draft-quiz), and saving posts the review to the
// class (POST /classes/:id/assignments), where the backend resolves the topic to
// a real concept so the tracker and insights close the loop. The draft is the
// AI's job; the graded assignment it becomes is server-owned state.

import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import type { QuizDraft } from 'melda-shared';
import { api } from '../../../src/api/client';
import { useSession } from '../../../src/state/store';
import { Badge, Button, Card, Row, Screen, SectionTitle, Txt } from '../../../src/ui/components';
import { color, radius, sp, weight } from '../../../src/ui/tokens';

// A week from now, in whole days - the default window a review is open for.
const DUE_IN_DAYS = 7;

export default function NewReview() {
  const router = useRouter();
  const classId = useSession((s) => s.currentClass?.id) ?? '';
  const [topic, setTopic] = useState('');
  const [draft, setDraft] = useState<QuizDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    const t = topic.trim();
    if (!t) return;
    setLoading(true);
    setError(null);
    try {
      setDraft(await api.draftQuiz({ topic: t, gradeLevel: 'Grade 10', count: 5 }));
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
    due.setDate(due.getDate() + DUE_IN_DAYS);
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
        <Txt
          variant="tiny"
          c={color.inkMuted}
          w={weight.semibold}
          style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
        >
          Topic
        </Txt>
        <TextInput
          value={topic}
          onChangeText={setTopic}
          placeholder="e.g. Balancing equations"
          placeholderTextColor={color.inkMuted}
          style={styles.input}
          returnKeyType="done"
          onSubmitEditing={generate}
        />
        <Txt variant="tiny" c={color.inkMuted} style={{ marginTop: sp.sm }}>
          MELDA drafts five multiple-choice questions with an answer key. You review before setting
          it for the class.
        </Txt>
      </Card>

      <Button
        title={draft ? 'Redraft' : 'Draft with MELDA'}
        icon="✨"
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
            <SectionTitle title="Draft" caption="Review and set for your class" />
            <Card>
              <Txt variant="h3">{draft.title}</Txt>
              <Txt variant="small" c={color.inkMuted} style={{ marginTop: sp.xs }}>
                {draft.questions.length} questions
              </Txt>
            </Card>
          </View>

          {draft.questions.map((q, i) => (
            <Card key={i}>
              <Txt variant="h3">
                {i + 1}. {q.prompt}
              </Txt>
              <View style={{ marginTop: sp.sm, gap: sp.xs }}>
                {q.choices.map((choice, ci) => (
                  <Row key={ci} style={{ alignItems: 'flex-start' }}>
                    {ci === q.correctIndex ? (
                      <Badge label="Answer" tone="ok" />
                    ) : (
                      <Txt variant="small" c={color.inkMuted}>
                        {String.fromCharCode(65 + ci)}.
                      </Txt>
                    )}
                    <Txt
                      variant="small"
                      c={ci === q.correctIndex ? color.ink : color.inkSecondary}
                      style={{ flex: 1 }}
                    >
                      {choice}
                    </Txt>
                  </Row>
                ))}
              </View>
            </Card>
          ))}

          <Button title="Set for the class" icon="✓" loading={saving} onPress={save} />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    marginTop: sp.xs,
    minHeight: 48,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    paddingHorizontal: sp.md,
    fontSize: 15,
    color: color.ink,
    backgroundColor: color.appBg,
  },
});
