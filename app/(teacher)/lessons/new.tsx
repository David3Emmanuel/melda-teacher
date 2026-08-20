// AI-assisted "new lesson": the teacher types a topic, MELDA drafts a full lesson
// (POST /ai/draft-lesson), and saving posts it to the class (POST
// /classes/:id/lessons), where the backend resolves the topic to a real concept
// and stores the lesson as a draft. The draft is the AI's job; everything after
// saving is real, server-owned state.

import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import type { LessonDraft } from 'melda-shared';
import { api } from '../../../src/api/client';
import { useSession } from '../../../src/state/store';
import { Badge, Button, Card, Row, Screen, SectionTitle, Txt } from '../../../src/ui/components';
import { color, radius, sp, weight } from '../../../src/ui/tokens';

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
  const [draft, setDraft] = useState<LessonDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    const t = topic.trim();
    if (!t) return;
    setLoading(true);
    setError(null);
    try {
      setDraft(await api.draftLesson({ topic: t, gradeLevel: 'Grade 10' }));
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
        <Txt
          variant="tiny"
          c={color.inkMuted}
          w={weight.semibold}
          style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
        >
          Topic
        </Txt>
        <TextInput
          value={topic}
          onChangeText={setTopic}
          placeholder="e.g. Le Chatelier's Principle"
          placeholderTextColor={color.inkMuted}
          style={styles.input}
          returnKeyType="done"
          onSubmitEditing={generate}
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
            <SectionTitle title="Draft" caption="Review and save to your library" />
            <Card>
              <Txt variant="h3">{draft.title}</Txt>
              <Txt variant="small" c={color.inkMuted} style={{ marginTop: sp.xs }}>
                {draft.summary}
              </Txt>
            </Card>
          </View>

          {draft.sections.map((s, i) => (
            <Card key={i}>
              <Row>
                <Badge label={KIND_LABEL[s.kind] ?? s.kind} tone="accent" />
              </Row>
              <Txt variant="h3" style={{ marginTop: sp.xs }}>
                {s.title}
              </Txt>
              <Txt variant="body" c={color.inkSecondary} style={{ marginTop: sp.xs }}>
                {s.body}
              </Txt>
            </Card>
          ))}

          <Button title="Save to lessons" icon="check" loading={saving} onPress={save} />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    marginTop: sp.xs,
    minHeight: 48,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    paddingHorizontal: sp.md,
    fontSize: 15,
    color: color.ink,
    backgroundColor: color.appBg,
  },
});
