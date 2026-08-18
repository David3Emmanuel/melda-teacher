// AI-assisted "new review": the teacher types a topic, MELDA drafts a set of
// multiple-choice questions, and saving drops the review into the class so the
// live tracker can follow it in. The draft is the AI's job; the graded
// Assignment it becomes is real app state students then answer.

import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ai, type QuizDraft } from '../../../src/ai';
import type { Assignment } from '../../../src/domain/models';
import { newId, useAppStore } from '../../../src/state/store';
import { Badge, Button, Card, Row, Screen, SectionTitle, Txt } from '../../../src/ui/components';
import { color, radius, sp, weight } from '../../../src/ui/tokens';

export default function NewReview() {
  const router = useRouter();
  const addAssignment = useAppStore((s) => s.addAssignment);
  const [topic, setTopic] = useState('');
  const [draft, setDraft] = useState<QuizDraft | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    const t = topic.trim();
    if (!t) return;
    setLoading(true);
    const res = await ai.draftQuiz({ topic: t, gradeLevel: 'Grade 10', count: 5 });
    setDraft(res);
    setLoading(false);
  };

  const save = () => {
    if (!draft) return;
    // A brand-new topic is not one of the assessed concepts, so every question
    // shares one synthetic concept id - enough to grade and give a per-concept
    // read-out without touching the seeded insight data.
    const conceptId = newId('concept');
    const due = new Date();
    due.setDate(due.getDate() + 7);
    const assignment: Assignment = {
      id: newId('a'),
      title: draft.title,
      questions: draft.questions.map((q, i) => ({
        id: newId(`q-${i}`),
        conceptId,
        prompt: q.prompt,
        kind: 'mcq',
        choices: q.choices,
        correctIndex: q.correctIndex,
      })),
      dueAt: due.toISOString(),
    };
    addAssignment(assignment);
    router.replace(`/(teacher)/reviews/${assignment.id}`);
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

          <Button title="Set for the class" icon="✓" onPress={save} />
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
