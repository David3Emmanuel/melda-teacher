// The reviews list - the tracking layer's home. Each review shows how many of the
// class have handed in so far (GET /classes/:id/assignments returns the full
// progress per review); tapping opens the live tracker. "New" opens the
// AI-assisted quiz draft flow.

import { useRouter } from 'expo-router';
import { api } from '../../../src/api/client';
import { useApi } from '../../../src/api/useApi';
import { useSession } from '../../../src/state/store';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Loading,
  Row,
  Screen,
  Txt,
} from 'melda-shared/ui/components';
import { color, dueLabel, sp, toneStyle, weight } from 'melda-shared/ui/tokens';

export default function ReviewsList() {
  const router = useRouter();
  const classId = useSession((s) => s.currentClass?.id) ?? '';
  const { data: reviews, loading, error, reload } = useApi(() => api.assignments(classId));

  const right = (
    <Button
      title="New"
      icon="plus"
      size="sm"
      onPress={() => router.push('/(teacher)/reviews/new')}
    />
  );

  return (
    <Screen title="Reviews" subtitle="Quizzes you have set" right={right} onRefresh={reload}>
      {loading && !reviews ? <Loading /> : null}

      {error && !reviews ? (
        <ErrorState title="Could not load reviews" message={error} onRetry={reload} />
      ) : null}
      {error && reviews ? (
        <Txt variant="small" c={color.warnInk}>
          Couldn't refresh. Showing the last reviews loaded.
        </Txt>
      ) : null}

      {reviews && reviews.length === 0 ? (
        <EmptyState
          title="No reviews yet"
          body="Draft one with MELDA to start tracking."
          art="reviews"
        />
      ) : null}

      {(reviews ?? []).map((prog) => {
        const done = prog.submittedCount === prog.studentCount;
        const due = dueLabel(prog.assignment.dueAt);
        return (
          <Card
            key={prog.assignment.id}
            onPress={() => router.push(`/(teacher)/reviews/${prog.assignment.id}`)}
          >
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
              {prog.assignment.title}
            </Txt>
            <Row style={{ justifyContent: 'space-between', marginTop: sp.sm }}>
              <Txt variant="tiny" c={color.inkMuted}>
                {prog.assignment.questions.length} questions
              </Txt>
              {due.text ? (
                <Txt variant="tiny" w={weight.semibold} c={toneStyle(due.tone).fg}>
                  {due.text}
                </Txt>
              ) : null}
            </Row>
          </Card>
        );
      })}
    </Screen>
  );
}
