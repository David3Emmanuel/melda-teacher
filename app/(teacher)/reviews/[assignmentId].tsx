// The live tracker for one review: who has handed in, their score, and the class
// average so far (GET /assignments/:id, which returns server-computed progress).
// useApi refetches on focus, so navigating back here after a student submits
// shows the new paper. This is the teacher side of the student->teacher loop.

import { Pressable, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../../src/api/client';
import { useApi } from '../../../src/api/useApi';
import { useSession } from '../../../src/state/store';
import {
  Avatar,
  Badge,
  Card,
  Divider,
  ErrorState,
  Loading,
  Row,
  Screen,
  StatTile,
  Txt,
} from 'melda-shared/ui/components';
import { color, dueLabel, masteryTone, sp, toneStyle, weight } from 'melda-shared/ui/tokens';

export default function ReviewTracker() {
  const { assignmentId } = useLocalSearchParams<{ assignmentId: string }>();
  const router = useRouter();
  const classId = useSession((s) => s.currentClass?.id) ?? '';
  // Fetch the assignment plus the class lessons, so a linked lessonId resolves to
  // its title and the "reviewing <lesson>" header can deep-link back to the lesson.
  const { data: prog, loading, error, reload } = useApi(async () => {
    const assignment = await api.assignment(assignmentId);
    const lessons = await api.lessons(classId);
    return { assignment, lessons };
  });

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
        <ErrorState
          title="Could not load this review"
          message={error ?? undefined}
          onRetry={reload}
        />
      </Screen>
    );
  }

  const { assignment: progress, lessons } = prog;
  const inner = progress.assignment;
  const linkedLesson = inner.lessonId ? lessons.find((l) => l.id === inner.lessonId) ?? null : null;
  // Worst-first for triage: submitted papers ranked lowest score up top (that is
  // who needs the teacher), then the students who have not handed in. The server
  // sorts submitted-first in roster order; this is a display-only reorder, so it
  // stays here rather than in the shared progress model. sort() is stable, so
  // equal scores and the trailing unsubmitted block keep their roster order.
  const score = (r: (typeof progress.rows)[number]) => (r.total > 0 ? r.correct / r.total : 0);
  const rows = [...progress.rows].sort((a, b) => {
    if (a.submitted !== b.submitted) return a.submitted ? -1 : 1;
    if (!a.submitted) return 0;
    return score(a) - score(b);
  });
  const due = dueLabel(inner.dueAt);

  return (
    <Screen onRefresh={reload}>
      <Stack.Screen options={{ title: 'Live tracker' }} />

      <Txt variant="h2">{inner.title}</Txt>
      {due.text ? (
        <Txt variant="small" w={weight.semibold} c={toneStyle(due.tone).fg}>
          {due.text}
        </Txt>
      ) : null}
      {linkedLesson ? (
        <Pressable
          onPress={() => router.push(`/(teacher)/lessons/${linkedLesson.id}`)}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`Reviewing ${linkedLesson.title}. Open the lesson.`}
          style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}
        >
          <Txt variant="small" c={color.accentInk} w={weight.semibold} style={{ marginTop: sp.xs }}>
            Reviewing {linkedLesson.title} ›
          </Txt>
        </Pressable>
      ) : null}
      <Row>
        <StatTile
          label="Handed in"
          value={`${progress.submittedCount}/${progress.studentCount}`}
          caption={`${inner.questions.length} questions`}
        />
        <StatTile
          label="Class average"
          value={progress.avgScorePct === null ? '—' : `${progress.avgScorePct}%`}
          caption={progress.avgScorePct === null ? 'No papers yet' : 'of submitted papers'}
          tone={masteryTone(progress.avgScorePct).tone}
        />
      </Row>

      <Card>
        {rows.map((r, idx) => {
          const pct = r.submitted ? Math.round(score(r) * 100) : null;
          const tone = r.submitted ? masteryTone(pct).tone : 'neutral';
          return (
            <View key={r.student.id}>
              {idx > 0 ? <Divider /> : null}
              <Pressable
                onPress={() => router.push(`/(teacher)/insights/student/${r.student.id}`)}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`${r.student.name}, ${
                  r.submitted ? `scored ${r.correct} of ${r.total}` : 'not handed in yet'
                }. View student.`}
                style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}
              >
                <Row style={{ justifyContent: 'space-between', paddingVertical: sp.sm }}>
                  <Row style={{ flex: 1 }}>
                    <Avatar initials={r.student.initials} tone={tone} size={34} />
                    <Txt variant="h3" style={{ flex: 1 }} numberOfLines={1}>
                      {r.student.name}
                    </Txt>
                  </Row>
                  {r.submitted ? (
                    <Badge label={`${r.correct}/${r.total}`} tone={tone} />
                  ) : (
                    <Txt variant="tiny" c={color.inkMuted}>
                      Not yet
                    </Txt>
                  )}
                </Row>
              </Pressable>
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}
