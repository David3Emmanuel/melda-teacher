// Adapt a section: the teacher picks a mode (simpler, worked example, visual...)
// and MELDA re-casts the section for the students who did not get it (POST
// /ai/adapt-section). The text is editable always - the teacher can write their
// own explanation from scratch, or draft it with MELDA and then edit. Saving
// posts (POST /lessons/:id/adaptations) and the server UPSERTS per
// lesson+section+mode, so re-saving never stacks duplicates.

import { useEffect, useState } from 'react';
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
} from 'melda-shared/ui/components';
import { adaptationLabel, color, sp, weight } from 'melda-shared/ui/tokens';

const MODES: AdaptationMode[] = [
  'simpler',
  'detailed',
  'example',
  'visual',
  'practice',
  'reexplain',
  'custom',
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
  const [body, setBody] = useState('');
  const [customInstruction, setCustomInstruction] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  // When data loads or the mode changes, load any saved adaptation for that mode.
  useEffect(() => {
    const existing = data?.lesson.adaptations.find(
      (a) => a.sectionId === sectionId && a.mode === mode,
    );
    setBody(existing?.body ?? '');
  }, [data, mode, sectionId]);

  // The existing adaptation for the current mode (so the guard only warns on
  // genuinely unsaved edits, not on a fresh load of an existing one).
  const existingBody =
    data?.lesson.adaptations.find((a) => a.sectionId === sectionId && a.mode === mode)?.body ?? '';
  const isDirty = body.trim() !== '' && body !== existingBody;
  useUnsavedGuard(isDirty && !saving);

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
  const conceptName = insight?.name ?? lesson.title;
  const strugglePct = insight?.strugglePct;
  // Previous explanations for this section, so the AI varies rather than repeats.
  const priorBodies = lesson.adaptations
    .filter((a) => a.sectionId === section.id)
    .map((a) => a.body);

  const generate = async () => {
    setGenerating(true);
    setFailure(null);
    try {
      const res = await api.adaptSection({
        conceptName,
        sectionTitle: section.title,
        originalBody: section.body,
        mode,
        customInstruction: mode === 'custom' ? customInstruction || undefined : undefined,
        strugglePct,
        priorAdaptations: priorBodies,
      });
      setBody(res.body);
    } catch (e) {
      setFailure(e instanceof Error ? e.message : 'Could not generate the adaptation.');
    } finally {
      setGenerating(false);
    }
  };

  const save = async () => {
    if (!body.trim()) return;
    setSaving(true);
    setFailure(null);
    try {
      await api.createAdaptation(lesson.id, {
        sectionId: section.id,
        conceptId: conceptId ?? section.conceptId,
        mode,
        body: body.trim(),
      });
      router.replace(`/(teacher)/lessons/${lesson.id}`);
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
              title={m === 'custom' ? 'My own way' : adaptationLabel[m]}
              size="sm"
              variant={m === mode ? 'primary' : 'secondary'}
              onPress={() => setMode(m)}
            />
          ))}
        </Row>
      </View>

      {mode === 'custom' ? (
        <Card style={{ backgroundColor: color.accentSoft, borderColor: color.accentSoft }}>
          <Txt variant="tiny" c={color.accentInk} w={weight.bold}>
            Tell MELDA how to re-explain it
          </Txt>
          <Input
            value={customInstruction}
            onChangeText={setCustomInstruction}
            multiline
            placeholder="e.g. use a basketball pass as the analogy for electron transfer"
            style={{ marginTop: sp.xs }}
          />
        </Card>
      ) : null}

      <Button
        title={body ? 'Regenerate with MELDA' : 'Generate with MELDA'}
        icon="sparkle"
        variant={body ? 'secondary' : 'primary'}
        loading={generating}
        onPress={generate}
        disabled={mode === 'custom' && !customInstruction.trim()}
      />

      <Card style={{ backgroundColor: color.accentSoft, borderColor: color.accentSoft }}>
        <Row gap={sp.xs}>
          <Icon name="sparkle" size={12} color={color.accentInk} />
          <Txt variant="tiny" c={color.accentInk} w={weight.bold}>
            {adaptationLabel[mode]}
          </Txt>
        </Row>
        <Input
          value={body}
          onChangeText={setBody}
          multiline
          placeholder="Write the explanation yourself, or draft it with MELDA and then edit."
          style={{ marginTop: sp.xs }}
        />
      </Card>

      {failure ? (
        <Txt variant="small" c={color.struggle}>
          {failure}
        </Txt>
      ) : null}

      <Button
        title="Save to lesson"
        icon="check"
        loading={saving}
        disabled={!body.trim()}
        onPress={save}
      />
    </Screen>
  );
}
