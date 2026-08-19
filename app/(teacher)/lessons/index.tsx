// The lesson library - the CREATE layer's home. Lists every lesson for the class
// (GET /classes/:id/lessons), its status, and how many MELDA adaptations it has
// grown. "New" opens the AI-assisted draft flow; tapping a lesson opens it for
// editing and adapting.

import { useRouter } from 'expo-router';
import { api } from '../../../src/api/client';
import { useApi } from '../../../src/api/useApi';
import { useSession } from '../../../src/state/store';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Loading,
  Row,
  Screen,
  Txt,
} from '../../../src/ui/components';
import { color, sp } from '../../../src/ui/tokens';

export default function LessonsLibrary() {
  const router = useRouter();
  const classId = useSession((s) => s.currentClass?.id) ?? '';
  const { data: lessons, loading, error } = useApi(() => api.lessons(classId));

  const right = (
    <Button title="New" icon="+" size="sm" onPress={() => router.push('/(teacher)/lessons/new')} />
  );

  return (
    <Screen title="Lessons" subtitle="Lessons you have written" right={right}>
      {loading && !lessons ? <Loading /> : null}

      {error ? <EmptyState title="Could not load lessons" body={error} icon="⚠️" /> : null}

      {lessons && lessons.length === 0 ? (
        <EmptyState
          title="No lessons yet"
          body="Draft one with MELDA to start your unit."
          icon="📚"
        />
      ) : null}

      {(lessons ?? []).map((l) => (
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
