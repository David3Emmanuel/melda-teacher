// The class dashboard - the screen the whole app is built to reach. It opens on
// the headline "32% struggled with Ionic Bonding" and lets the teacher drill into
// any concept or student. The numbers, the ranked concepts, the follow-up list
// and the one-paragraph narration are all computed on the backend (GET
// /classes/:id/insights) so nothing can drift between the app and the data - the
// screen only renders what the server aggregated.

import { useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../../src/api/client';
import { useApi } from '../../../src/api/useApi';
import { useSession } from '../../../src/state/store';
import {
  Avatar,
  Badge,
  BarRow,
  Button,
  Card,
  Divider,
  EmptyState,
  ErrorState,
  Icon,
  Loading,
  type PressState,
  Row,
  Screen,
  SectionTitle,
  StatTile,
  Txt,
} from 'melda-shared/ui/components';
import {
  color,
  masteryTone,
  radius,
  signalLabel,
  sp,
  struggleTone,
  toneFill,
  weight,
} from 'melda-shared/ui/tokens';

export default function InsightsDashboard() {
  const router = useRouter();
  const currentClass = useSession((s) => s.currentClass);
  const classId = currentClass?.id ?? '';
  const { data, loading, error, reload } = useApi(() => api.insights(classId));

  // The teacher uses this at a desk too. Past a tablet's width, drop the two tall
  // triage lists into side-by-side columns so the whole picture fits with less
  // scrolling. Deliberately a single breakpoint, no tablet/desktop tiers - the
  // upgrade path is a third column only if one is ever needed.
  const { width } = useWindowDimensions();
  const twoCol = width >= 900;

  // Two-tap confirm for the demo reset. This re-seeds the whole class, so it is
  // gated to dev builds (__DEV__) - it must never render in a classroom where one
  // stray tap would wipe real state. Armed state is local, so leaving the screen
  // disarms it. On confirm it re-seeds on the backend, then refetches.
  const [armed, setArmed] = useState(false);
  const [resetting, setResetting] = useState(false);
  const onReset = async () => {
    if (!armed) {
      setArmed(true);
      return;
    }
    setResetting(true);
    try {
      await api.resetDemo(classId);
      setArmed(false);
      reload();
    } finally {
      setResetting(false);
    }
  };
  const resetControl = __DEV__ ? (
    <Button
      title={armed ? 'Confirm reset' : 'Reset demo'}
      icon="refresh"
      variant="ghost"
      size="sm"
      loading={resetting}
      onPress={() => {
        void onReset();
      }}
    />
  ) : null;

  const title = data?.summary.className ?? currentClass?.name ?? 'Insights';

  if (loading && !data) {
    return (
      <Screen title={title} subtitle={currentClass?.subject}>
        <Loading label="Reading the class" />
      </Screen>
    );
  }

  if (error || !data) {
    return (
      <Screen title={title} subtitle={currentClass?.subject} right={resetControl}>
        <ErrorState title="Could not load insights" message={error ?? undefined} onRetry={reload} />
      </Screen>
    );
  }

  const { summary, concepts, studentsByNeed, avgMasteryPct, narration } = data;
  // The follow-up list is a triage top-5, not the whole caseload: show every
  // struggler's row count and hand the rest to the full roster screen (which is
  // also where student search lives) instead of silently truncating.
  const strugglers = studentsByNeed.filter((n) => n.struggleCount > 0);
  const needs = strugglers.slice(0, 5);
  const hiddenCount = strugglers.length - needs.length;
  const top = summary.topStruggle;
  // The full signal breakdown: the set of types is small and bounded, and
  // rendering all rows keeps the caption's total reconciling with the rows.
  const maxSignal = summary.signalCounts[0]?.count ?? 1;
  const mastery = masteryTone(avgMasteryPct);

  // Zero-state: with no submissions there is nothing to aggregate, so skip the
  // "0% / Struggling" theatre and point the teacher at the next step instead.
  if (summary.submissionCount === 0) {
    return (
      <Screen
        title={summary.className}
        subtitle={currentClass?.subject}
        right={resetControl}
        onRefresh={reload}
      >
        <ClassSwitcher />
        <StatTile label="Students" value={String(summary.studentCount)} caption="in this class" />
        <EmptyState
          title="No submissions yet"
          body="Set a review for the class. As students hand in, MELDA shows you here where they are struggling."
          icon="inbox"
        />
        <Button
          title="Create a review"
          icon="plus"
          onPress={() => router.push('/(teacher)/reviews/new')}
        />
      </Screen>
    );
  }

  return (
    <Screen
      title={summary.className}
      subtitle={currentClass?.subject}
      right={resetControl}
      maxWidth={1080}
      onRefresh={reload}
    >
      <ClassSwitcher />
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
          <Icon name="sparkle" size={18} color={color.accentInk} />
          <Txt variant="h3">What MELDA sees</Txt>
        </Row>
        <Txt variant="body" c={color.inkSecondary} style={{ marginTop: sp.sm }}>
          {narration}
        </Txt>
      </Card>

      <Row gap={sp.md} style={{ alignItems: 'stretch' }}>
        <StatTile
          label="Students"
          value={String(summary.studentCount)}
          caption="in this class - tap for the roster"
          onPress={() => router.push('/(teacher)/insights/roster')}
        />
        <StatTile
          label="Submitted"
          value={`${summary.submissionRatePct}%`}
          tone={summary.submissionRatePct === 100 ? 'ok' : 'warn'}
          caption={`${summary.submissionCount}/${summary.studentCount} in`}
        />
        <StatTile
          label="Avg mastery"
          value={`${avgMasteryPct}%`}
          tone={mastery.tone}
          caption={mastery.label}
        />
      </Row>

      <View
        style={{ flexDirection: twoCol ? 'row' : 'column', gap: sp.lg, alignItems: 'flex-start' }}
      >
        <View style={twoCol ? { flex: 1 } : undefined}>
          <SectionTitle
            title="Where students are struggling"
            caption="Share of the class below the pass line, by concept"
          />
          {concepts.length ? (
            <Card>
              {concepts.map((i, idx) => (
                <View key={i.conceptId}>
                  {idx > 0 ? <Divider /> : null}
                  <BarRow
                    label={i.name}
                    value={i.strugglePct}
                    display={`${i.strugglePct}%`}
                    fill={toneFill(struggleTone(i.strugglePct).tone)}
                    sub={`${i.strugglers} of ${i.attempted} struggling - avg mastery ${i.avgMasteryPct}%`}
                    onPress={() => router.push(`/(teacher)/insights/concept/${i.conceptId}`)}
                  />
                </View>
              ))}
            </Card>
          ) : (
            <EmptyState
              title="Nothing below the pass line"
              body="Every assessed concept is on track."
              icon="success"
            />
          )}
        </View>

        {needs.length ? (
          <View style={twoCol ? { flex: 1 } : undefined}>
            <SectionTitle
              title={hiddenCount > 0 ? 'Top 5 by need' : 'Students to check in with'}
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
              {hiddenCount > 0 ? (
                <View>
                  <Divider />
                  <Pressable
                    onPress={() => router.push('/(teacher)/insights/roster')}
                    accessibilityRole="button"
                    accessibilityLabel={`${hiddenCount} more students to check in with. Open the full roster.`}
                    style={({ pressed, hovered, focused }: PressState) => [
                      {
                        paddingVertical: sp.md,
                        alignItems: 'center',
                        borderRadius: radius.sm,
                      },
                      hovered ? { backgroundColor: color.appBg } : null,
                      focused ? { boxShadow: `0 0 0 2px ${color.accent}` } : null,
                      pressed ? { opacity: 0.7 } : null,
                    ]}
                  >
                    <Txt variant="small" w={weight.semibold} c={color.accent}>
                      +{hiddenCount} more - see the full roster
                    </Txt>
                  </Pressable>
                </View>
              ) : null}
            </Card>
          </View>
        ) : null}
      </View>

      <View>
        <SectionTitle
          title="Signals MELDA collected"
          caption={`${summary.totalSignals} learning signals from the student app`}
        />
        {summary.signalCounts.length ? (
          <Card>
            {summary.signalCounts.map((s, idx) => (
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
        ) : (
          <EmptyState
            title="No signals yet"
            body="Signals appear as students read lessons and submit reviews."
            icon="signal"
          />
        )}
      </View>
    </Screen>
  );
}

// A teacher can own more than one class, but sign-in silently lands on the first
// (classes[0]) with no way to reach the rest. This surfaces every class as a
// selectable pill and calls setCurrentClass, which every screen already reads
// through useSession. Rendered nothing when there is only one class, so the
// common single-class teacher sees no extra chrome.
function ClassSwitcher() {
  const classes = useSession((s) => s.classes);
  const currentId = useSession((s) => s.currentClass?.id);
  const setCurrentClass = useSession((s) => s.setCurrentClass);
  if (classes.length <= 1) return null;
  return (
    <Row wrap gap={sp.sm}>
      {classes.map((c) => {
        const active = c.id === currentId;
        return (
          <Pressable
            key={c.id}
            onPress={() => setCurrentClass(c)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`View ${c.name}`}
            style={({ hovered, focused }: PressState) => [
              {
                paddingVertical: sp.xs,
                paddingHorizontal: sp.md,
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: active || hovered ? color.accent : color.border,
                backgroundColor: active ? color.accentSoft : color.card,
              },
              focused ? { boxShadow: `0 0 0 2px ${color.accent}` } : null,
            ]}
          >
            <Txt
              variant="small"
              w={active ? weight.semibold : weight.regular}
              c={active ? color.accentInk : color.inkSecondary}
            >
              {c.name}
            </Txt>
          </Pressable>
        );
      })}
    </Row>
  );
}
