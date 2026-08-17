// AI-assisted "new lesson": the teacher types a topic, MELDA drafts a full
// lesson (explanation, example, activity, check), and saving drops it into the
// library as a draft they can then edit, adapt, and publish. The draft is the
// AI's job; everything after saving is real app state.

import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ai, type LessonDraft } from '../../../src/ai';
import type { Lesson } from '../../../src/domain/models';
import { newId, useAppStore } from '../../../src/state/store';
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
  const addLesson = useAppStore((s) => s.addLesson);
  const [topic, setTopic] = useState('');
  const [draft, setDraft] = useState<LessonDraft | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    const t = topic.trim();
    if (!t) return;
    setLoading(true);
    const res = await ai.draftLesson({ topic: t, gradeLevel: 'Grade 10' });
    setDraft(res);
    setLoading(false);
  };

  const save = () => {
    if (!draft) return;
    // A brand-new topic is not one of the assessed concepts, so it gets its own
    // synthetic concept id shared by every section - enough to keep the lesson
    // self-consistent without touching the seeded insight data.
    const conceptId = newId('concept');
    const lesson: Lesson = {
      id: newId('lesson'),
      title: draft.title,
      summary: draft.summary,
      conceptIds: [conceptId],
      sections: draft.sections.map((s, i) => ({
        id: newId(`sec-${i}`),
        title: s.title,
        kind: s.kind,
        body: s.body,
        conceptId,
      })),
      status: 'draft',
      createdAt: new Date().toISOString(),
      adaptations: [],
    };
    addLesson(lesson);
    router.replace(`/(teacher)/lessons/${lesson.id}`);
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
        icon="✨"
        loading={loading}
        disabled={!topic.trim()}
        onPress={generate}
      />

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

          <Button title="Save to lessons" icon="✓" onPress={save} />
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
