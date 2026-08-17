// Adapt a section: the teacher picks a mode (simpler, worked example, visual...)
// and MELDA re-casts the section for the students who did not get it. The
// struggle % shown here is the real aggregated figure, passed into the prompt so
// the copy can reference it; the re-cast prose is what the AI produces. Saving
// grafts the adaptation onto the lesson, where it appears inline under the
// original section.

import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ai } from '../../../../src/ai';
import { conceptInsights } from '../../../../src/domain/insights/aggregate';
import type { AdaptationMode } from '../../../../src/domain/models';
import { newId, useAppStore } from '../../../../src/state/store';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Row,
  Screen,
  SectionTitle,
  Txt,
} from '../../../../src/ui/components';
import { adaptationLabel, color, sp, weight } from '../../../../src/ui/tokens';

const MODES: AdaptationMode[] = [
  'simpler',
  'detailed',
  'example',
  'visual',
  'practice',
  'reexplain',
];

export default function AdaptSection() {
  const { lessonId, sectionId, conceptId } = useLocalSearchParams<{
    lessonId: string;
    sectionId: string;
    conceptId: string;
  }>();
  const router = useRouter();
  const data = useAppStore((s) => s.data);
  const addAdaptation = useAppStore((s) => s.addAdaptation);
  const lesson = data.lessons.find((l) => l.id === lessonId);
  const section = lesson?.sections.find((sec) => sec.id === sectionId);
  const concept = data.concepts.find((c) => c.id === conceptId);
  const strugglePct = useMemo(
    () => conceptInsights(data).find((i) => i.conceptId === conceptId)?.strugglePct,
    [data, conceptId],
  );

  const [mode, setMode] = useState<AdaptationMode>('simpler');
  const [draft, setDraft] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!lesson || !section) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Adapt' }} />
        <EmptyState title="Section not found" icon="🔍" />
      </Screen>
    );
  }

  // A seeded lesson names a real concept; a freshly drafted one carries a
  // synthetic id, so fall back to the lesson title for the prompt.
  const conceptName = concept?.name ?? lesson.title;

  const generate = async () => {
    setLoading(true);
    const res = await ai.adaptSection({
      conceptName,
      sectionTitle: section.title,
      originalBody: section.body,
      mode,
      strugglePct,
    });
    setDraft(res.body);
    setLoading(false);
  };

  const save = () => {
    if (!draft) return;
    addAdaptation(lesson.id, {
      id: newId('adapt'),
      sectionId: section.id,
      conceptId: conceptId ?? section.conceptId,
      mode,
      body: draft,
      createdAt: new Date().toISOString(),
    });
    router.back();
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Adapt section' }} />

      <Card>
        <Badge label={conceptName} tone="accent" />
        <Txt variant="h3" style={{ marginTop: sp.sm }}>
          {section.title}
        </Txt>
        <Txt variant="small" c={color.inkSecondary} style={{ marginTop: sp.xs }}>
          {section.body}
        </Txt>
        {strugglePct ? (
          <Txt variant="tiny" c={color.struggleInk} style={{ marginTop: sp.sm }}>
            {strugglePct}% of the class struggled here
          </Txt>
        ) : null}
      </Card>

      <View>
        <SectionTitle title="How should MELDA re-cast it?" />
        <Row wrap gap={sp.sm}>
          {MODES.map((m) => (
            <Button
              key={m}
              title={adaptationLabel[m]}
              size="sm"
              variant={m === mode ? 'primary' : 'secondary'}
              onPress={() => setMode(m)}
            />
          ))}
        </Row>
      </View>

      <Button
        title={draft ? 'Regenerate' : 'Generate with MELDA'}
        icon="✨"
        loading={loading}
        onPress={generate}
      />

      {draft ? (
        <>
          <Card style={{ backgroundColor: color.accentSoft, borderColor: color.accentSoft }}>
            <Txt variant="tiny" c={color.accentInk} w={weight.bold}>
              ✨ MELDA - {adaptationLabel[mode]}
            </Txt>
            <Txt variant="body" c={color.inkSecondary} style={{ marginTop: sp.xs }}>
              {draft}
            </Txt>
          </Card>
          <Button title="Save to lesson" icon="✓" variant="secondary" onPress={save} />
        </>
      ) : null}
    </Screen>
  );
}
