// The reviews list - the tracking layer's home. Each review shows how many of
// the class have handed in so far; tapping opens the live tracker. "New" opens
// the AI-assisted quiz draft flow. Progress is derived live from submissions,
// so these counts move the instant a student submits.

import { useRouter } from 'expo-router';
import { assignmentProgress } from '../../../src/domain/experience';
import { useAppStore } from '../../../src/state/store';
import { Badge, Button, Card, EmptyState, Row, Screen, Txt } from '../../../src/ui/components';
import { color, sp } from '../../../src/ui/tokens';

export default function ReviewsList() {
  const router = useRouter();
  const data = useAppStore((s) => s.data);

  return (
    <Screen
      title="Reviews"
      subtitle="Quizzes you have set"
      right={
        <Button
          title="New"
          icon="+"
          size="sm"
          onPress={() => router.push('/(teacher)/reviews/new')}
        />
      }
    >
      {data.assignments.length === 0 ? (
        <EmptyState
          title="No reviews yet"
          body="Draft one with MELDA to start tracking."
          icon="📝"
        />
      ) : null}

      {data.assignments.map((a) => {
        // Never null here: the id comes straight from the list we are mapping.
        const prog = assignmentProgress(data, a.id)!;
        const done = prog.submittedCount === prog.studentCount;
        return (
          <Card key={a.id} onPress={() => router.push(`/(teacher)/reviews/${a.id}`)}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Badge
                label={`${prog.submittedCount}/${prog.studentCount} handed in`}
                tone={done ? 'ok' : 'warn'}
                dot
              />
              {prog.avgScorePct !== null ? (
                <Txt variant="tiny" c={color.inkMuted}>
                  Avg {prog.avgScorePct}%
                </Txt>
              ) : null}
            </Row>
            <Txt variant="h3" style={{ marginTop: sp.sm }}>
              {a.title}
            </Txt>
            <Txt variant="tiny" c={color.inkMuted} style={{ marginTop: sp.sm }}>
              {a.questions.length} questions
            </Txt>
          </Card>
        );
      })}
    </Screen>
  );
}
