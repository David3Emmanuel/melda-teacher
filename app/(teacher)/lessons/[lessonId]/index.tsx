// Lesson detail: the sections a lesson is made of, any MELDA adaptations grafted
// onto them, and the actions a teacher takes here - adapt a section that is not
// landing, or publish a draft. Loaded from GET /lessons/:id; publish posts to
// /lessons/:id/publish and refetches. Adaptations show inline under the section
// they re-cast, so the "understand -> adapt" loop is visible in one place.

import { useState } from 'react';
import { View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import type { SectionKind } from 'melda-shared';
import { api } from '../../../../src/api/client';
import { useApi } from '../../../../src/api/useApi';
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Loading,
  Row,
  Screen,
  Txt,
} from '../../../../src/ui/components';
import { adaptationLabel, color, radius, sp, weight } from '../../../../src/ui/tokens';

const KIND_LABEL: Record<SectionKind, string> = {
  explanation: 'Explain',
  example: 'Example',
  activity: 'Activity',
  check: 'Check',
};

export default function LessonDetail() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const router = useRouter();
  const { data: lesson, loading, error, reload } = useApi(() => api.lesson(lessonId));
  const [publishing, setPublishing] = useState(false);

  if (loading && !lesson) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Lesson' }} />
        <Loading />
      </Screen>
    );
  }

  if (error || !lesson) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Lesson' }} />
        <ErrorState
          title="Could not load this lesson"
          message={error ?? undefined}
          onRetry={reload}
        />
      </Screen>
    );
  }

  const published = lesson.status === 'published';

  const publish = async () => {
    setPublishing(true);
    try {
      await api.publishLesson(lesson.id);
      reload();
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: lesson.title }} />

      <View style={{ gap: sp.sm }}>
        <Badge label={published ? 'Published' : 'Draft'} tone={published ? 'ok' : 'warn'} dot />
        <Txt variant="body" c={color.inkSecondary}>
          {lesson.summary}
        </Txt>
      </View>

      {lesson.sections.map((sec) => {
        const adaptations = lesson.adaptations.filter((a) => a.sectionId === sec.id);
        return (
          <Card key={sec.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Badge label={KIND_LABEL[sec.kind]} tone="accent" />
              <Button
                title="Adapt"
                icon="✨"
                variant="ghost"
                size="sm"
                onPress={() =>
                  router.push(
                    `/(teacher)/lessons/${lesson.id}/adapt?sectionId=${sec.id}&conceptId=${sec.conceptId}`,
                  )
                }
              />
            </Row>
            <Txt variant="h3" style={{ marginTop: sp.xs }}>
              {sec.title}
            </Txt>
            <Txt variant="body" c={color.inkSecondary} style={{ marginTop: sp.xs }}>
              {sec.body}
            </Txt>

            {adaptations.map((a) => (
              <View
                key={a.id}
                style={{
                  backgroundColor: color.accentSoft,
                  borderRadius: radius.md,
                  padding: sp.md,
                  marginTop: sp.sm,
                  gap: 4,
                }}
              >
                <Txt variant="tiny" c={color.accentInk} w={weight.bold}>
                  ✨ MELDA - {adaptationLabel[a.mode]}
                </Txt>
                <Txt variant="small" c={color.inkSecondary}>
                  {a.body}
                </Txt>
              </View>
            ))}
          </Card>
        );
      })}

      {!published ? (
        <Button title="Publish lesson" icon="✓" loading={publishing} onPress={publish} />
      ) : null}
    </Screen>
  );
}
