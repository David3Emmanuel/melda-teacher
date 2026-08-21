// Adapt a section: the teacher picks a mode (simpler, worked example, visual...)
// and MELDA re-casts the section for the students who did not get it (POST
// /ai/adapt-section). The struggle % shown here is the real aggregated figure
// (pulled from the class insights) and is passed into the prompt so the copy can
// reference it. Saving posts the adaptation (POST /lessons/:id/adaptations),
// where it appears inline under the original section.

import { useState } from 'react';
import { View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import type { AdaptationMode } from 'melda-shared';
import { api } from '../../../../src/api/client';
import { useApi } from '../../../../src/api/useApi';
import { useUnsavedGuard } from '../../../../src/hooks/useUnsavedGuard';
import { useSession } from '../../../../src/state/store';
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Icon,
  Input,
  Loading,
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
  const classId = useSession((s) => s.currentClass?.id) ?? '';
  const { data, loading, error, reload } = useApi(async () => {
    const [lesson, insights] = await Promise.all([api.lesson(lessonId), api.insights(classId)]);
    return {
      lesson,
      section: lesson.sections.find((s) => s.id === sectionId) ?? null,
      insight: insights.concepts.find((c) => c.conceptId === conceptId) ?? null,
    };
  });

  const [mode, setMode] = useState<AdaptationMode>('simpler');
  const [draft, setDraft] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  // A generated-but-unsaved adaptation is real work; warn before it is lost. Off
  // while saving so the successful-save router.back() is not itself intercepted.
  useUnsavedGuard(!!draft && !saving);

  if (loading && !data) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Adapt' }} />
        <Loading />
      </Screen>
    );
  }

  if (error || !data || !data.section) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Adapt' }} />
        <ErrorState
          title="Could not load this section"
          message={error ?? undefined}
          onRetry={reload}
        />
      </Screen>
    );
  }

  const { lesson, section, insight } = data;
  // An assessed concept carries a name and a real struggle %; a freshly drafted
  // concept has no submissions yet, so fall back to the lesson title for the prompt.
  const conceptName = insight?.name ?? lesson.title;
  const strugglePct = insight?.strugglePct;

  const generate = async () => {
    setGenerating(true);
    setFailure(null);
    try {
      const res = await api.adaptSection({
        conceptName,
        sectionTitle: section.title,
        originalBody: section.body,
        mode,
        strugglePct,
      });
      setDraft(res.body);
    } catch (e) {
      setFailure(e instanceof Error ? e.message : 'Could not generate the adaptation.');
    } finally {
      setGenerating(false);
    }
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setFailure(null);
    try {
      await api.createAdaptation(lesson.id, {
        sectionId: section.id,
        conceptId: conceptId ?? section.conceptId,
        mode,
        body: draft,
      });
      router.back();
    } catch (e) {
      setFailure(e instanceof Error ? e.message : 'Could not save the adaptation.');
      setSaving(false);
    }
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
        icon="sparkle"
        loading={generating}
        onPress={generate}
      />

      {failure ? (
        <Txt variant="small" c={color.struggle}>
          {failure}
        </Txt>
      ) : null}

      {draft ? (
        <>
          <Card style={{ backgroundColor: color.accentSoft, borderColor: color.accentSoft }}>
            <Row gap={sp.xs}>
              <Icon name="sparkle" size={12} color={color.accentInk} />
              <Txt variant="tiny" c={color.accentInk} w={weight.bold}>
                MELDA - {adaptationLabel[mode]}
              </Txt>
            </Row>
            <Input value={draft} onChangeText={setDraft} multiline style={{ marginTop: sp.xs }} />
          </Card>
          <Button
            title="Save to lesson"
            icon="check"
            variant="secondary"
            loading={saving}
            onPress={save}
          />
        </>
      ) : null}
    </Screen>
  );
}
