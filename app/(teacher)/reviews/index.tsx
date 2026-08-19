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
} from '../../../src/ui/components';
import { color, sp } from '../../../src/ui/tokens';

export default function ReviewsList() {
  const router = useRouter();
  const classId = useSession((s) => s.currentClass?.id) ?? '';
  const { data: reviews, loading, error, reload } = useApi(() => api.assignments(classId));

  const right = (
    <Button title="New" icon="+" size="sm" onPress={() => router.push('/(teacher)/reviews/new')} />
  );

  return (
    <Screen title="Reviews" subtitle="Quizzes you have set" right={right}>
      {loading && !reviews ? <Loading /> : null}

      {error ? (
        <ErrorState title="Could not load reviews" message={error} onRetry={reload} />
      ) : null}

      {reviews && reviews.length === 0 ? (
        <EmptyState
          title="No reviews yet"
          body="Draft one with MELDA to start tracking."
          icon="📝"
        />
      ) : null}

      {(reviews ?? []).map((prog) => {
        const done = prog.submittedCount === prog.studentCount;
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
            <Txt variant="tiny" c={color.inkMuted} style={{ marginTop: sp.sm }}>
              {prog.assignment.questions.length} questions
            </Txt>
          </Card>
        );
      })}
    </Screen>
  );
}
