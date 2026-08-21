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
import {
  Avatar,
  Badge,
  BarRow,
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

  // Tally the student's signals by type, most frequent first. This is the one
  // bit of aggregation the screen does itself (everything else the server
  // computes); it stays here so melda-shared can be a types-only dependency.
  const counts = [
    ...signals.reduce((m, s) => m.set(s.type, (m.get(s.type) ?? 0) + 1), new Map<string, number>()),
  ]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

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
    </Screen>
  );
}
