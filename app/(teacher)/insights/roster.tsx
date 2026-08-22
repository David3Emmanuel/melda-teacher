// The full class roster, reachable from the dashboard's "+N more" row and the
// Students tile. It is the one place every student in the class is reachable -
// ranked by need by default - and the home of student search. The list reuses
// the same GET /classes/:id/insights payload as the dashboard (studentsByNeed
// already carries every student), so no new endpoint exists just for this
// screen.

import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { api } from '../../../src/api/client';
import { useApi } from '../../../src/api/useApi';
import { useSession } from '../../../src/state/store';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  ErrorState,
  Input,
  Loading,
  type PressState,
  Row,
  Screen,
  SectionTitle,
  Txt,
} from 'melda-shared/ui/components';
import { color, masteryTone, radius, sp, weight } from 'melda-shared/ui/tokens';

type SortKey = 'need' | 'name' | 'mastery';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'need', label: 'By need' },
  { key: 'name', label: 'A-Z' },
  { key: 'mastery', label: 'By mastery' },
];

export default function Roster() {
  const router = useRouter();
  const classId = useSession((s) => s.currentClass?.id) ?? '';
  const className = useSession((s) => s.currentClass?.name);
  const { data, loading, error, reload } = useApi(() => api.insights(classId));

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('need');

  if (loading && !data) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Roster' }} />
        <Loading />
      </Screen>
    );
  }

  if (error || !data) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Roster' }} />
        <ErrorState
          title="Could not load the roster"
          message={error ?? undefined}
          onRetry={reload}
        />
      </Screen>
    );
  }

  const roster = data.studentsByNeed;
  const q = query.trim().toLowerCase();
  const rows = [...roster]
    .filter((n) => !q || n.student.name.toLowerCase().includes(q))
    .sort((a, b) => {
      if (sort === 'name') return a.student.name.localeCompare(b.student.name);
      // Lowest mastery first (null = no submissions yet, sinks to the bottom).
      if (sort === 'mastery') {
        return (a.overallMasteryPct ?? 101) - (b.overallMasteryPct ?? 101);
      }
      return 0; // 'need': the server already ranked by struggle, then mastery.
    });

  return (
    <Screen onRefresh={reload}>
      <Stack.Screen options={{ title: 'Roster' }} />

      <View>
        <SectionTitle
          title={className ?? 'Class'}
          caption={`${roster.length} ${roster.length === 1 ? 'student' : 'students'} - tap one to see how they are doing`}
        />
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Search students"
          style={{ marginBottom: sp.sm }}
        />
        <Row wrap gap={sp.sm}>
          {SORTS.map(({ key, label }) => (
            <Button
              key={key}
              title={label}
              size="sm"
              variant={sort === key ? 'primary' : 'secondary'}
              onPress={() => setSort(key)}
            />
          ))}
        </Row>
      </View>

      {rows.length ? (
        <Card>
          {rows.map((n, idx) => {
            const mastery = masteryTone(n.overallMasteryPct);
            const tone = n.struggleCount > 0 ? 'struggle' : mastery.tone;
            return (
              <View key={n.student.id}>
                {idx > 0 ? <Divider /> : null}
                <Pressable
                  onPress={() => router.push(`/(teacher)/insights/student/${n.student.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`${n.student.name}, ${
                    n.struggleCount > 0
                      ? `${n.struggleCount} concepts below the pass line: ${n.strugglingConceptNames.join(', ')}`
                      : 'on track'
                  }, mastery ${n.overallMasteryPct ?? 'no data'}%. View student.`}
                  style={({ pressed, hovered, focused }: PressState) => [
                    { paddingVertical: sp.sm, borderRadius: radius.sm },
                    hovered ? { backgroundColor: color.appBg } : null,
                    focused ? { boxShadow: `0 0 0 2px ${color.accent}` } : null,
                    pressed ? { opacity: 0.7 } : null,
                  ]}
                >
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Row gap={sp.md} style={{ flex: 1 }}>
                      <Avatar initials={n.student.initials} tone={tone} size={40} />
                      <View style={{ flex: 1 }}>
                        <Txt w={weight.semibold} numberOfLines={1}>
                          {n.student.name}
                        </Txt>
                        <Txt variant="tiny" c={color.inkMuted} numberOfLines={1}>
                          {n.struggleCount > 0
                            ? n.strugglingConceptNames.join(', ')
                            : n.overallMasteryPct === null
                              ? 'No data yet'
                              : 'No concepts below the pass line'}
                        </Txt>
                      </View>
                    </Row>
                    <Badge
                      label={
                        n.overallMasteryPct === null ? 'No data' : `${n.overallMasteryPct}%`
                      }
                      tone={mastery.tone}
                    />
                  </Row>
                </Pressable>
              </View>
            );
          })}
        </Card>
      ) : (
        <EmptyState
          title="No students match"
          body={`Nobody in this class matches "${query.trim()}".`}
          art="search"
        />
      )}
    </Screen>
  );
}
