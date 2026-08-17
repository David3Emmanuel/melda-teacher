// The class dashboard - the screen the whole app is built to reach. It opens on
// the headline "32% struggled with Ionic Bonding" (recomputed from raw
// submissions, never stored), lets the teacher drill into any concept or
// student, and shows the breadth of signals MELDA collected. The numbers are
// real aggregation; only the one-paragraph read is AI-narrated.

import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { ai } from '../../../src/ai';
import { useAppStore } from '../../../src/state/store';
import {
  classSummary,
  conceptInsights,
  studentsByNeed,
} from '../../../src/domain/insights/aggregate';
import {
  Avatar,
  Badge,
  BarRow,
  Button,
  Card,
  Divider,
  Row,
  Screen,
  SectionTitle,
  StatTile,
  Txt,
} from '../../../src/ui/components';
import { color, masteryTone, signalLabel, sp, weight } from '../../../src/ui/tokens';

export default function InsightsDashboard() {
  const router = useRouter();
  const data = useAppStore((s) => s.data);
  const summary = useMemo(() => classSummary(data), [data]);
  const insights = useMemo(() => conceptInsights(data), [data]);
  const needs = useMemo(
    () =>
      studentsByNeed(data)
        .filter((n) => n.struggleCount > 0)
        .slice(0, 5),
    [data],
  );
  const avgMastery = useMemo(
    () =>
      insights.length
        ? Math.round(insights.reduce((sum, i) => sum + i.avgMasteryPct, 0) / insights.length)
        : 0,
    [insights],
  );
  const top = summary.topStruggle;

  const [narration, setNarration] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    ai.narrateInsight({
      className: summary.className,
      studentCount: summary.studentCount,
      topConceptName: top?.name ?? '',
      topStrugglePct: top?.strugglePct ?? 0,
      avgMasteryPct: avgMastery,
    }).then((text) => {
      if (alive) setNarration(text);
    });
    return () => {
      alive = false;
    };
  }, [summary, top, avgMastery]);

  const topSignals = summary.signalCounts.slice(0, 5);
  const maxSignal = topSignals[0]?.count ?? 1;
  const mastery = masteryTone(avgMastery);

  return (
    <Screen title={summary.className} subtitle="Class insights from the last assignment">
      {top ? (
        <Card onPress={() => router.push(`/(teacher)/insights/concept/${top.conceptId}`)}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Badge label="Biggest gap" tone="struggle" dot />
            <Txt variant="small" c={color.inkMuted}>
              Tap to drill in
            </Txt>
          </Row>
          <Row gap={sp.md} style={{ alignItems: 'baseline', marginTop: sp.md }}>
            <Txt variant="display" c={color.struggleInk}>
              {top.strugglePct}%
            </Txt>
            <Txt variant="body" style={{ flex: 1 }}>
              of the class struggled with <Txt w={weight.bold}>{top.name}</Txt>
            </Txt>
          </Row>
          <Txt variant="small" c={color.inkSecondary} style={{ marginTop: sp.sm }}>
            {top.strugglers} of {top.attempted} students scored below the pass line.
          </Txt>
        </Card>
      ) : null}

      <Card>
        <Row gap={sp.sm}>
          <Txt>🤖</Txt>
          <Txt variant="h3">What MELDA sees</Txt>
        </Row>
        <Txt variant="body" c={color.inkSecondary} style={{ marginTop: sp.sm }}>
          {narration ?? 'Reading the class...'}
        </Txt>
      </Card>

      <Row gap={sp.md} style={{ alignItems: 'stretch' }}>
        <StatTile label="Students" value={String(summary.studentCount)} caption="in this class" />
        <StatTile
          label="Submitted"
          value={`${summary.submissionRatePct}%`}
          tone={summary.submissionRatePct === 100 ? 'ok' : 'warn'}
          caption={`${summary.submissionCount}/${summary.studentCount} in`}
        />
        <StatTile
          label="Avg mastery"
          value={`${avgMastery}%`}
          tone={mastery.tone}
          caption={mastery.label}
        />
      </Row>

      <View>
        <SectionTitle
          title="Where students are struggling"
          caption="Share of the class below the pass line, by concept"
        />
        <Card>
          {insights.map((i, idx) => (
            <View key={i.conceptId}>
              {idx > 0 ? <Divider /> : null}
              <BarRow
                label={i.name}
                value={i.strugglePct}
                display={`${i.strugglePct}%`}
                sub={`${i.strugglers} of ${i.attempted} struggling - avg mastery ${i.avgMasteryPct}%`}
                onPress={() => router.push(`/(teacher)/insights/concept/${i.conceptId}`)}
              />
            </View>
          ))}
        </Card>
      </View>

      {needs.length ? (
        <View>
          <SectionTitle
            title="Students to check in with"
            caption="Most concepts below the pass line"
          />
          <Card>
            {needs.map((n, idx) => (
              <View key={n.student.id}>
                {idx > 0 ? <Divider /> : null}
                <Row style={{ justifyContent: 'space-between', paddingVertical: sp.sm }}>
                  <Row gap={sp.md} style={{ flex: 1 }}>
                    <Avatar initials={n.student.initials} tone="struggle" />
                    <View style={{ flex: 1 }}>
                      <Txt w={weight.semibold} numberOfLines={1}>
                        {n.student.name}
                      </Txt>
                      <Txt variant="tiny" c={color.inkMuted} numberOfLines={1}>
                        {n.strugglingConceptNames.join(', ')}
                      </Txt>
                    </View>
                  </Row>
                  <Button
                    title="View"
                    variant="secondary"
                    size="sm"
                    onPress={() => router.push(`/(teacher)/insights/student/${n.student.id}`)}
                  />
                </Row>
              </View>
            ))}
          </Card>
        </View>
      ) : null}

      <View>
        <SectionTitle
          title="Signals MELDA collected"
          caption={`${summary.totalSignals} learning signals from the student app`}
        />
        <Card>
          {topSignals.map((s, idx) => (
            <View key={s.type}>
              {idx > 0 ? <Divider /> : null}
              <BarRow
                label={signalLabel[s.type] ?? s.type}
                value={s.count}
                max={maxSignal}
                display={String(s.count)}
                fill={color.accent}
              />
            </View>
          ))}
        </Card>
      </View>
    </Screen>
  );
}
