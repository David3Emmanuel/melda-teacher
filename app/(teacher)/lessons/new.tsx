// AI-assisted "new lesson": the teacher types a topic, MELDA drafts a full lesson
// (POST /ai/draft-lesson), the teacher edits any field, and saving posts it to the
// class (POST /classes/:id/lessons), where the backend resolves the topic to a
// real concept and stores the lesson as a draft. The draft is the AI's first pass;
// everything after saving is real, server-owned state.

import { useState } from 'react';
import { View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import type { LessonDraft } from 'melda-shared';
import { api } from '../../../src/api/client';
import { useUnsavedGuard } from '../../../src/hooks/useUnsavedGuard';
import { useSession } from '../../../src/state/store';
import {
  Badge,
  Button,
  Card,
  Input,
  Row,
  Screen,
  SectionTitle,
  Txt,
} from '../../../src/ui/components';
import { color, sp } from '../../../src/ui/tokens';

const KIND_LABEL: Record<string, string> = {
  explanation: 'Explain',
  example: 'Example',
  activity: 'Activity',
  check: 'Check',
};

export default function NewLesson() {
  const router = useRouter();
  const classId = useSession((s) => s.currentClass?.id) ?? '';
  const [topic, setTopic] = useState('');
  // Grade level shapes the draft's reading level. The class record carries no
  // grade, so this is an editable field defaulting to the common case rather than
  // a value silently baked into the request.
  const [gradeLevel, setGradeLevel] = useState('Grade 10');
  const [draft, setDraft] = useState<LessonDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // An edited draft that has not been saved is real work; warn before it is lost.
  // Off while saving so the successful-save router.replace is not itself blocked.
  useUnsavedGuard(!!draft && !saving);

  // Edit the draft in place before saving - the AI's text is a starting point,
  // not a contract. Each setter patches one slice of the draft state.
  const setField = (patch: Partial<LessonDraft>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const setSection = (i: number, patch: Partial<LessonDraft['sections'][number]>) =>
    setDraft((d) =>
      d ? { ...d, sections: d.sections.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) } : d,
    );

  const generate = async () => {
    const t = topic.trim();
    if (!t) return;
    setLoading(true);
    setError(null);
    try {
      setDraft(await api.draftLesson({ topic: t, gradeLevel: gradeLevel.trim() || undefined }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not draft the lesson.');
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const { id } = await api.createLesson(classId, {
        topic: topic.trim(),
        title: draft.title,
        summary: draft.summary,
        sections: draft.sections.map((s) => ({ title: s.title, kind: s.kind, body: s.body })),
      });
      router.replace(`/(teacher)/lessons/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the lesson.');
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: 'New lesson' }} />

      <Card>
        <Input
          label="Topic"
          value={topic}
          onChangeText={setTopic}
          placeholder="e.g. Le Chatelier's Principle"
          onSubmitEditing={generate}
        />
        <Input
          label="Grade level"
          value={gradeLevel}
          onChangeText={setGradeLevel}
          placeholder="e.g. Grade 10"
          style={{ marginTop: sp.md }}
        />
        <Txt variant="tiny" c={color.inkMuted} style={{ marginTop: sp.sm }}>
          MELDA drafts an explanation, a worked example, an activity and a quick check. You edit
          before publishing.
        </Txt>
      </Card>

      <Button
        title={draft ? 'Redraft' : 'Draft with MELDA'}
        icon="sparkle"
        loading={loading}
        disabled={!topic.trim()}
        onPress={generate}
      />

      {error ? (
        <Txt variant="small" c={color.struggle}>
          {error}
        </Txt>
      ) : null}

      {draft ? (
        <>
          <View>
            <SectionTitle title="Draft" caption="Edit any field, then save to your library" />
            <Card>
              <Input
                label="Title"
                value={draft.title}
                onChangeText={(t) => setField({ title: t })}
              />
              <Input
                label="Summary"
                value={draft.summary}
                onChangeText={(t) => setField({ summary: t })}
                multiline
                style={{ marginTop: sp.md }}
              />
            </Card>
          </View>

          {draft.sections.map((s, i) => (
            <Card key={i}>
              <Row>
                <Badge label={KIND_LABEL[s.kind] ?? s.kind} tone="accent" />
              </Row>
              <Input
                label="Section title"
                value={s.title}
                onChangeText={(t) => setSection(i, { title: t })}
                style={{ marginTop: sp.sm }}
              />
              <Input
                value={s.body}
                onChangeText={(t) => setSection(i, { body: t })}
                multiline
                style={{ marginTop: sp.sm }}
              />
            </Card>
          ))}

          <Button title="Save to lessons" icon="check" loading={saving} onPress={save} />
        </>
      ) : null}
    </Screen>
  );
}
