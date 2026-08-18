// The review quiz - the heart of the student->teacher loop. The student answers
// the MCQs; on submit we grade with buildSubmission (pure) and write the result
// through submitAssignment, which REPLACES any prior attempt so mastery is not
// double-counted. The teacher's dashboards recompute off the same store, so the
// class struggle numbers move the instant this lands. The result view links
// straight to the teacher view to show exactly that.

import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { buildSubmission, type Selections } from '../../../src/domain/experience';
import { newId, useAppStore } from '../../../src/state/store';
import { Badge, Button, Card, EmptyState, Row, Screen, Txt } from '../../../src/ui/components';
import { color, masteryTone, radius, sp } from '../../../src/ui/tokens';

export default function Quiz() {
  const { assignmentId } = useLocalSearchParams<{ assignmentId: string }>();
  const router = useRouter();
  const data = useAppStore((s) => s.data);
  const studentId = useAppStore((s) => s.currentStudentId);
  const submitAssignment = useAppStore((s) => s.submitAssignment);

  const [selections, setSelections] = useState<Selections>({});
  const [scored, setScored] = useState<{ correct: number; total: number } | null>(null);

  if (!studentId) return <Redirect href="/student" />;

  const assignment = data.assignments.find((a) => a.id === assignmentId);
  if (!assignment) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Review' }} />
        <EmptyState title="Review not found" icon="🔍" />
      </Screen>
    );
  }

  const answeredCount = Object.keys(selections).length;
  const allAnswered = answeredCount === assignment.questions.length;

  const submit = () => {
    const result = buildSubmission(
      assignment,
      studentId,
      selections,
      new Date().toISOString(),
      newId('sub'),
    );
    submitAssignment(result);
    const correct = result.submission.answers.filter((a) => a.correct).length;
    setScored({ correct, total: result.submission.answers.length });
  };

  if (scored) {
    return (
      <Result
        assignmentId={assignment.id}
        studentId={studentId}
        correct={scored.correct}
        total={scored.total}
        onDone={() => router.back()}
        onSeeTeacher={() => router.push('/(teacher)/insights')}
      />
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Your review' }} />
      <Txt variant="small" c={color.inkMuted}>
        {assignment.title} - {answeredCount}/{assignment.questions.length} answered
      </Txt>

      {assignment.questions.map((q, qi) => (
        <Card key={q.id}>
          <Txt variant="h3">
            {qi + 1}. {q.prompt}
          </Txt>
          <View style={{ marginTop: sp.sm, gap: sp.sm }}>
            {(q.choices ?? []).map((choice, ci) => (
              <Choice
                key={ci}
                label={choice}
                selected={selections[q.id] === ci}
                onPress={() => setSelections((prev) => ({ ...prev, [q.id]: ci }))}
              />
            ))}
          </View>
        </Card>
      ))}

      <Button
        title={
          allAnswered ? 'Submit review' : `Answer all ${assignment.questions.length} to submit`
        }
        icon="✓"
        disabled={!allAnswered}
        onPress={submit}
      />
    </Screen>
  );
}

function Choice(props: { label: string; selected: boolean; onPress: () => void }) {
  const { label, selected, onPress } = props;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        selected ? styles.choiceSel : null,
        pressed ? { opacity: 0.7 } : null,
      ]}
    >
      <View style={[styles.radio, selected ? styles.radioSel : null]} />
      <Txt variant="body" style={{ flex: 1 }} c={selected ? color.accentInk : color.ink}>
        {label}
      </Txt>
    </Pressable>
  );
}

function Result(props: {
  assignmentId: string;
  studentId: string;
  correct: number;
  total: number;
  onDone: () => void;
  onSeeTeacher: () => void;
}) {
  const { assignmentId, studentId, correct, total, onDone, onSeeTeacher } = props;
  const data = useAppStore((s) => s.data);

  // Break the just-submitted paper down by concept so the student sees where
  // they are strong and where to go back and re-read.
  const perConcept = useMemo(() => {
    const sub = data.submissions.find(
      (s) => s.assignmentId === assignmentId && s.studentId === studentId,
    );
    if (!sub) return [];
    return data.concepts
      .map((c) => {
        const ans = sub.answers.filter((a) => a.conceptId === c.id);
        if (!ans.length) return null;
        return { name: c.name, right: ans.filter((a) => a.correct).length, total: ans.length };
      })
      .filter((x): x is { name: string; right: number; total: number } => x !== null);
  }, [data, assignmentId, studentId]);

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Submitted' }} />
      <Card style={{ alignItems: 'center', gap: sp.xs }}>
        <Txt variant="small" c={color.inkMuted}>
          You scored
        </Txt>
        <Txt variant="display" c={color.accent}>
          {correct}/{total}
        </Txt>
        <Txt variant="small" c={color.inkMuted} center>
          Saved. Your teacher can see this now.
        </Txt>
      </Card>

      {perConcept.map((c) => {
        const tone = masteryTone(Math.round((c.right / c.total) * 100));
        return (
          <Card key={c.name}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt variant="h3" style={{ flex: 1 }}>
                {c.name}
              </Txt>
              <Badge label={tone.label} tone={tone.tone} />
            </Row>
            <Txt variant="small" c={color.inkMuted} style={{ marginTop: sp.xs }}>
              {c.right} of {c.total} correct
            </Txt>
          </Card>
        );
      })}

      <Button title="See it on the teacher dashboard" icon="📊" onPress={onSeeTeacher} />
      <Button title="Back to my lessons" variant="secondary" onPress={onDone} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
    padding: sp.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.cardAlt,
  },
  choiceSel: { borderColor: color.accent, backgroundColor: color.accentSoft },
  radio: {
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: color.inkMuted,
  },
  radioSel: { borderColor: color.accent, borderWidth: 6 },
});
