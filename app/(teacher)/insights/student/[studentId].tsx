// Student drill-down: one learner's mastery across every assessed concept, plus
// the raw signals they generated (GET /classes/:id/students/:studentId). Tapping
// a concept row jumps to the whole class for that concept. Mastery bars are
// coloured by status band and always carry a text label, so colour is never the
// only cue.

import { View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../../../src/api/client';
import { useApi } from '../../../../src/api/useApi';
import { useSession } from '../../../../src/state/store';
import { weakestConcept } from '../../../../src/weakestConcept';
import {
  Avatar,
  Badge,
  BarRow,
  Button,
  Card,
  Divider,
  ErrorState,
  Loading,
  Row,
  Screen,
  SectionTitle,
  Txt,
} from 'melda-shared/ui/components';
import {
  color,
  masteryTone,
  signalLabel,
  sp,
  toneFill,
  toneStyle,
  weight,
} from 'melda-shared/ui/tokens';

export default function StudentScreen() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  const router = useRouter();
  const classId = useSession((s) => s.currentClass?.id) ?? '';
  const { data, loading, error, reload } = useApi(() => api.studentDetail(classId, studentId));

  if (loading && !data) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Student' }} />
        <Loading />
      </Screen>
    );
  }

  if (error || !data) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Student' }} />
        <ErrorState
          title="Could not load this student"
          message={error ?? undefined}
          onRetry={reload}
        />
      </Screen>
    );
  }

  const { student, overallMasteryPct, perConcept, signals } = data;
  const overall = masteryTone(overallMasteryPct);
  // The one concept this student is weakest at anchors the two quick actions
  // below (undefined when nothing is assessed yet, so the actions stay hidden).
  const weakest = weakestConcept(perConcept);
  const firstName = student.name.split(' ')[0];

  // Tally the student's signals by type, most frequent first. This is the one
  // bit of aggregation the screen does itself (everything else the server
  // computes); it stays here so melda-shared can be a types-only dependency.
  const counts = [
    ...signals.reduce((m, s) => m.set(s.type, (m.get(s.type) ?? 0) + 1), new Map<string, number>()),
  ]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  // The actionable help signals: which sections this student flagged, newest
  // first - so the teacher sees the note and can adapt that exact section.
  const helpSignals = signals
    .filter((s) => s.type === 'REQUEST_SIMPLER')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <Screen onRefresh={reload}>
      <Stack.Screen options={{ title: student.name }} />

      <Card>
        <Row gap={sp.md}>
          <Avatar initials={student.initials} tone={overall.tone} size={52} />
          <View style={{ flex: 1 }}>
            <Txt
              variant="tiny"
              c={color.inkMuted}
              w={weight.semibold}
              style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
            >
              Overall mastery
            </Txt>
            <Row gap={sp.sm} style={{ alignItems: 'baseline' }}>
              <Txt variant="h1" c={toneStyle(overall.tone).fg}>
                {overallMasteryPct === null ? '—' : `${overallMasteryPct}%`}
              </Txt>
              <Badge label={overall.label} tone={overall.tone} />
            </Row>
          </View>
        </Row>
      </Card>

      {/* Two decisive actions keyed to the weak spot: see the whole class for
          the concept, or set a targeted review on it (prefills reviews/new). The
          per-concept bars below still deep-link too; this makes "act" one tap. */}
      {weakest ? (
        <View style={{ gap: sp.sm }}>
          <Button
            title={`Help ${firstName} with ${weakest.name}`}
            icon="chart"
            onPress={() => router.push(`/(teacher)/insights/concept/${weakest.conceptId}`)}
          />
          <Button
            title={`Set a review on ${weakest.name}`}
            icon="reviews"
            variant="secondary"
            onPress={() =>
              router.push(`/(teacher)/reviews/new?topic=${encodeURIComponent(weakest.name)}`)
            }
          />
        </View>
      ) : null}

      <View>
        <SectionTitle title="Mastery by concept" caption="Tap a concept to see the whole class" />
        <Card>
          {perConcept.map((p, idx) => {
            const t = masteryTone(p.masteryPct);
            return (
              <View key={p.conceptId}>
                {idx > 0 ? <Divider /> : null}
                <BarRow
                  label={p.name}
                  value={p.masteryPct ?? 0}
                  display={p.masteryPct === null ? 'No data' : `${p.masteryPct}%`}
                  sub={t.label}
                  fill={toneFill(t.tone)}
                  onPress={() => router.push(`/(teacher)/insights/concept/${p.conceptId}`)}
                />
              </View>
            );
          })}
        </Card>
      </View>

      {counts.length ? (
        <View>
          <SectionTitle
            title="What this student did"
            caption={`${signals.length} signals captured`}
          />
          <Card>
            {counts.map((s, idx) => (
              <View key={s.type}>
                {idx > 0 ? <Divider /> : null}
                <Row style={{ justifyContent: 'space-between', paddingVertical: sp.xs }}>
                  <Txt variant="small" style={{ flex: 1 }}>
                    {signalLabel[s.type] ?? s.type}
                  </Txt>
                  <Badge label={String(s.count)} tone="neutral" />
                </Row>
              </View>
            ))}
          </Card>
        </View>
      ) : null}

      {helpSignals.length ? (
        <View>
          <SectionTitle title="Asked for help" caption="Adapt the section they flagged" />
          <Card>
            {helpSignals.map((s, idx) => (
              <View key={s.id}>
                {idx > 0 ? <Divider /> : null}
                <Row
                  style={{
                    justifyContent: 'space-between',
                    paddingVertical: sp.xs,
                    alignItems: 'flex-start',
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Txt variant="small" w={weight.semibold}>
                      {signalLabel[s.type] ?? s.type}
                    </Txt>
                    {s.note ? (
                      <Txt variant="tiny" c={color.inkMuted} style={{ marginTop: 2 }}>
                        {s.note}
                      </Txt>
                    ) : null}
                  </View>
                  {s.lessonId && s.sectionId ? (
                    <Button
                      title="Adapt"
                      size="sm"
                      variant="secondary"
                      icon="sparkle"
                      onPress={() =>
                        router.push(
                          `/(teacher)/lessons/${s.lessonId}/adapt?sectionId=${s.sectionId}${
                            s.conceptId ? `&conceptId=${s.conceptId}` : ''
                          }`,
                        )
                      }
                    />
                  ) : null}
                </Row>
              </View>
            ))}
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}
