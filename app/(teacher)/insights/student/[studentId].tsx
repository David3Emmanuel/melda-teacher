// Student drill-down: one learner's mastery across every assessed concept, plus
// the raw signals they generated. Tapping a concept row jumps to the whole
// class for that concept. Mastery bars are coloured by status band and always
// carry a text label, so colour is never the only cue.

import { useMemo } from 'react';
import { View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { dataset } from '../../../../src/data/seed';
import { signalCounts, studentDetail } from '../../../../src/domain/insights/aggregate';
import {
  Avatar,
  Badge,
  BarRow,
  Card,
  Divider,
  EmptyState,
  Row,
  Screen,
  SectionTitle,
  Txt,
} from '../../../../src/ui/components';
import { color, masteryTone, signalLabel, sp, toneStyle, weight } from '../../../../src/ui/tokens';

const masteryFill = (tone: string): string =>
  tone === 'ok'
    ? color.ok
    : tone === 'warn'
      ? color.warn
      : tone === 'neutral'
        ? color.inkMuted
        : color.struggle;

export default function StudentScreen() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  const router = useRouter();
  const detail = useMemo(() => studentDetail(dataset, studentId), [studentId]);

  if (!detail) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Student' }} />
        <EmptyState title="Student not found" icon="🔍" />
      </Screen>
    );
  }

  const { student, overallMasteryPct, perConcept, signals } = detail;
  const overall = masteryTone(overallMasteryPct);
  const counts = signalCounts(signals);

  return (
    <Screen>
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
                  fill={masteryFill(t.tone)}
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
