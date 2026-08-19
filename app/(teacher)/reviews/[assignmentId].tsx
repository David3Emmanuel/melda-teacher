// The live tracker for one review: who has handed in, their score, and the class
// average so far (GET /assignments/:id, which returns server-computed progress).
// useApi refetches on focus, so navigating back here after a student submits
// shows the new paper. This is the teacher side of the student->teacher loop.

import { Stack, useLocalSearchParams } from 'expo-router';
import { api } from '../../../src/api/client';
import { useApi } from '../../../src/api/useApi';
import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  Loading,
  Row,
  Screen,
  StatTile,
  Txt,
} from '../../../src/ui/components';
import { color, masteryTone } from '../../../src/ui/tokens';

export default function ReviewTracker() {
  const { assignmentId } = useLocalSearchParams<{ assignmentId: string }>();
  const { data: prog, loading, error } = useApi(() => api.assignment(assignmentId));

  if (loading && !prog) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Review' }} />
        <Loading />
      </Screen>
    );
  }

  if (error || !prog) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Review' }} />
        <EmptyState title="Could not load this review" body={error ?? undefined} icon="🔍" />
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
