// The student's lesson reader. Each section can be re-explained on demand: tap
// "I don't get this" and MELDA re-casts it in simpler terms inline (the same
// ai.adaptSection the teacher uses, mode 'simpler'). That tap also emits a
// REQUEST_SIMPLER signal - the exact record a real student app would POST - so
// the teacher's dashboards see who asked for help, live. Any adaptations the
// teacher already saved to a section show here too.

import { useState } from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ai } from '../../../src/ai';
import type { Adaptation, LessonSection } from '../../../src/domain/models';
import { newId, useAppStore } from '../../../src/state/store';
import { Badge, Button, Card, EmptyState, Screen, Txt } from '../../../src/ui/components';
import { adaptationLabel, color, sp, weight } from '../../../src/ui/tokens';

const KIND_LABEL: Record<string, string> = {
  explanation: 'Explanation',
  example: 'Example',
  activity: 'Activity',
  check: 'Check',
};

export default function LessonReader() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const data = useAppStore((s) => s.data);
  const studentId = useAppStore((s) => s.currentStudentId);
  const recordSignal = useAppStore((s) => s.recordSignal);
  const lesson = data.lessons.find((l) => l.id === lessonId);

  if (!lesson) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Lesson' }} />
        <EmptyState title="Lesson not found" icon="🔍" />
      </Screen>
    );
  }

  const conceptName =
    data.concepts.find((c) => lesson.conceptIds.includes(c.id))?.name ?? lesson.title;

  const askedSimpler = (section: LessonSection) => {
    if (!studentId) return;
    recordSignal({
      id: newId('sig'),
      studentId,
      type: 'REQUEST_SIMPLER',
      conceptId: section.conceptId,
      lessonId: lesson.id,
      sectionId: section.id,
      createdAt: new Date().toISOString(),
      note: `Asked for a simpler take on "${section.title}"`,
    });
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: lesson.title }} />
      <Txt variant="body" c={color.inkSecondary}>
        {lesson.summary}
      </Txt>
      {lesson.sections.map((section) => (
        <SectionCard
          key={section.id}
          section={section}
          conceptName={conceptName}
          saved={lesson.adaptations.filter((a) => a.sectionId === section.id)}
          onAskSimpler={() => askedSimpler(section)}
        />
      ))}
    </Screen>
  );
}

function AdaptationNote({ label, body }: { label: string; body: string }) {
  return (
    <Card
      style={{ backgroundColor: color.accentSoft, borderColor: color.accentSoft, marginTop: sp.md }}
    >
      <Txt variant="tiny" c={color.accentInk} w={weight.bold}>
        ✨ MELDA - {label}
      </Txt>
      <Txt variant="body" c={color.inkSecondary} style={{ marginTop: sp.xs }}>
        {body}
      </Txt>
    </Card>
  );
}

function SectionCard(props: {
  section: LessonSection;
  conceptName: string;
  saved: Adaptation[];
  onAskSimpler: () => void;
}) {
  const { section, conceptName, saved, onAskSimpler } = props;
  const [draft, setDraft] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [asked, setAsked] = useState(false);

  const help = async () => {
    if (!asked) {
      onAskSimpler(); // record the REQUEST_SIMPLER signal once per section
      setAsked(true);
    }
    setLoading(true);
    const res = await ai.adaptSection({
      conceptName,
      sectionTitle: section.title,
      originalBody: section.body,
      mode: 'simpler',
    });
    setDraft(res.body);
    setLoading(false);
  };

  return (
    <Card>
      <Badge label={KIND_LABEL[section.kind] ?? section.kind} tone="neutral" />
      <Txt variant="h3" style={{ marginTop: sp.sm }}>
        {section.title}
      </Txt>
      <Txt variant="body" c={color.inkSecondary} style={{ marginTop: sp.xs }}>
        {section.body}
      </Txt>

      {saved.map((a) => (
        <AdaptationNote key={a.id} label={adaptationLabel[a.mode] ?? a.mode} body={a.body} />
      ))}
      {draft ? <AdaptationNote label="Simpler" body={draft} /> : null}

      <Button
        title={draft ? 'Explain it another way' : "I don't get this"}
        icon="🤔"
        variant="secondary"
        size="sm"
        loading={loading}
        style={{ marginTop: sp.md }}
        onPress={help}
      />
    </Card>
  );
}
