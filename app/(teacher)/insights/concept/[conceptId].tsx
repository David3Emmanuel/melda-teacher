// Concept drill-down: reached by tapping a struggle bar or the hero card. Shows
// the struggle for one concept (GET /classes/:id/concepts/:conceptId), exactly
// who is below the pass line, the signals tied to it, and a jump into the lesson
// that teaches it - so the UNDERSTAND layer hands straight back to CREATE. The
// lesson link needs the class's lessons, so both are fetched together.

import { View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../../../src/api/client';
import { useApi } from '../../../../src/api/useApi';
import { useSession } from '../../../../src/state/store';
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
  StatTile,
  Txt,
} from '../../../../src/ui/components';
import {
  color,
  masteryTone,
  signalLabel,
  sp,
  struggleTone,
  toneStyle,
  weight,
} from '../../../../src/ui/tokens';

export default function ConceptScreen() {
  const { conceptId } = useLocalSearchParams<{ conceptId: string }>();
  const router = useRouter();
  const classId = useSession((s) => s.currentClass?.id) ?? '';
  const { data, loading, error, reload } = useApi(async () => {
    const [detail, lessons] = await Promise.all([
      api.conceptDetail(classId, conceptId),
      api.lessons(classId),
    ]);
    return { detail, lesson: lessons.find((l) => l.conceptIds.includes(conceptId)) ?? null };
  });

  if (loading && !data) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Concept' }} />
        <Loading />
      </Screen>
    );
  }

  if (error || !data) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Concept' }} />
        <ErrorState
          title="Could not load this concept"
          message={error ?? undefined}
          onRetry={reload}
        />
      </Screen>
    );
  }

  const { concept, insight, strugglingStudents, signalCounts } = data.detail;
  const lesson = data.lesson;
  const st = struggleTone(insight.strugglePct);
  const mastery = masteryTone(insight.avgMasteryPct);
  const maxSignal = signalCounts[0]?.count ?? 1;

  return (
    <Screen>
      <Stack.Screen options={{ title: concept.name }} />

      <Card>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <Txt variant="display" c={toneStyle(st.tone).fg}>
              {insight.strugglePct}%
            </Txt>
            <Txt variant="small" c={color.inkSecondary}>
              of the class struggling
            </Txt>
          </View>
          <Badge label={st.label} tone={st.tone} dot />
        </Row>
        <Txt variant="small" c={color.inkMuted} style={{ marginTop: sp.md }}>
          {concept.blurb}
        </Txt>
      </Card>

      <Row gap={sp.md} style={{ alignItems: 'stretch' }}>
        <StatTile
          label="Struggling"
          value={String(insight.strugglers)}
          caption={`of ${insight.attempted} assessed`}
          tone="struggle"
        />
        <StatTile
          label="Avg mastery"
          value={`${insight.avgMasteryPct}%`}
          tone={mastery.tone}
          caption={mastery.label}
        />
      </Row>

      {lesson ? (
        <Button
          title="Open the lesson"
          icon="book"
          variant="secondary"
          onPress={() => router.push(`/(teacher)/lessons/${lesson.id}`)}
        />
      ) : null}

      <View>
        <SectionTitle
          title="Who is struggling"
          caption={`${strugglingStudents.length} students below the pass line`}
        />
        <Card>
          {strugglingStudents.length ? (
            strugglingStudents.map((s, idx) => (
              <View key={s.id}>
                {idx > 0 ? <Divider /> : null}
                <Row style={{ justifyContent: 'space-between', paddingVertical: sp.sm }}>
                  <Row gap={sp.md} style={{ flex: 1 }}>
                    <Avatar initials={s.initials} tone="struggle" />
                    <Txt w={weight.semibold} style={{ flex: 1 }} numberOfLines={1}>
                      {s.name}
                    </Txt>
                  </Row>
                  <Button
                    title="View"
                    variant="ghost"
                    size="sm"
                    onPress={() => router.push(`/(teacher)/insights/student/${s.id}`)}
                  />
                </Row>
              </View>
            ))
          ) : (
            <Txt variant="small" c={color.inkMuted}>
              Nobody is struggling with this concept.
            </Txt>
          )}
        </Card>
      </View>

      {signalCounts.length ? (
        <View>
          <SectionTitle title="Signals on this concept" />
          <Card>
            {signalCounts.map((s, idx) => (
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
      ) : null}
    </Screen>
  );
}
