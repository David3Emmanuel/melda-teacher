// The live tracker for one review: who has handed in, their score, and the
// class average so far. It reads assignmentProgress, a pure function over the
// store, so every submission a student makes shows up here on the next render
// with no wiring. This is the teacher side of the student->teacher loop.

import { Stack, useLocalSearchParams } from 'expo-router';
import { assignmentProgress } from '../../../src/domain/experience';
import { useAppStore } from '../../../src/state/store';
import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  Row,
  Screen,
  StatTile,
  Txt,
} from '../../../src/ui/components';
import { color, masteryTone, sp } from '../../../src/ui/tokens';

export default function ReviewTracker() {
  const { assignmentId } = useLocalSearchParams<{ assignmentId: string }>();
  const data = useAppStore((s) => s.data);
  const prog = assignmentProgress(data, assignmentId);

  if (!prog) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Review' }} />
        <EmptyState title="Review not found" icon="🔍" />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Live tracker' }} />

      <Txt variant="h2">{prog.assignment.title}</Txt>
      <Row>
        <StatTile
          label="Handed in"
          value={`${prog.submittedCount}/${prog.studentCount}`}
          caption={`${prog.assignment.questions.length} questions`}
        />
        <StatTile
          label="Class average"
          value={prog.avgScorePct === null ? '—' : `${prog.avgScorePct}%`}
          caption={prog.avgScorePct === null ? 'No papers yet' : 'of submitted papers'}
          tone={masteryTone(prog.avgScorePct).tone}
        />
      </Row>

      {prog.rows.map((r) => {
        const pct = r.submitted ? Math.round((r.correct / r.total) * 100) : null;
        return (
          <Card key={r.student.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row style={{ flex: 1 }}>
                <Avatar
                  initials={r.student.initials}
                  tone={r.submitted ? masteryTone(pct).tone : 'neutral'}
                  size={34}
                />
                <Txt variant="h3" style={{ flex: 1 }} numberOfLines={1}>
                  {r.student.name}
                </Txt>
              </Row>
              {r.submitted ? (
                <Badge label={`${r.correct}/${r.total}`} tone={masteryTone(pct).tone} />
              ) : (
                <Txt variant="tiny" c={color.inkMuted}>
                  Not yet
                </Txt>
              )}
            </Row>
          </Card>
        );
      })}
    </Screen>
  );
}
