// The lesson library - the CREATE layer's home. Lists every lesson (seeded and
// teacher-made), its status, and how many MELDA adaptations it has grown. "New"
// opens the AI-assisted draft flow; tapping a lesson opens it for editing and
// adapting.

import { useRouter } from 'expo-router';
import { useAppStore } from '../../../src/state/store';
import { Badge, Button, Card, Row, Screen, Txt } from '../../../src/ui/components';
import { color, sp } from '../../../src/ui/tokens';

export default function LessonsLibrary() {
  const router = useRouter();
  const lessons = useAppStore((s) => s.data.lessons);

  return (
    <Screen
      title="Lessons"
      subtitle="Your Chemistry unit"
      right={
        <Button
          title="New"
          icon="+"
          size="sm"
          onPress={() => router.push('/(teacher)/lessons/new')}
        />
      }
    >
      {lessons.map((l) => (
        <Card key={l.id} onPress={() => router.push(`/(teacher)/lessons/${l.id}`)}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Badge
              label={l.status === 'published' ? 'Published' : 'Draft'}
              tone={l.status === 'published' ? 'ok' : 'warn'}
              dot
            />
            {l.adaptations.length ? (
              <Txt variant="tiny" c={color.accentInk}>
                ✨ {l.adaptations.length} adaptation{l.adaptations.length > 1 ? 's' : ''}
              </Txt>
            ) : null}
          </Row>
          <Txt variant="h3" style={{ marginTop: sp.sm }}>
            {l.title}
          </Txt>
          <Txt variant="small" c={color.inkMuted} numberOfLines={2} style={{ marginTop: 2 }}>
            {l.summary}
          </Txt>
          <Txt variant="tiny" c={color.inkMuted} style={{ marginTop: sp.sm }}>
            {l.sections.length} sections
          </Txt>
        </Card>
      ))}
    </Screen>
  );
}
