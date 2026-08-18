// The student's way in. With no identity chosen yet it shows the class roster
// to pick from (a stand-in for a real login); once chosen it shows that
// student's home: their review assignment and the lessons they can read. Picking
// an identity is how the demo "becomes" a struggling student and watches their
// work flow back to the teacher's dashboards.

import { useRouter } from 'expo-router';
import { useAppStore } from '../../src/state/store';
import { Avatar, Badge, Button, Card, EmptyState, Row, Screen, Txt } from '../../src/ui/components';
import { color, sp } from '../../src/ui/tokens';

export default function StudentEntry() {
  const currentStudentId = useAppStore((s) => s.currentStudentId);
  return currentStudentId ? <StudentHome studentId={currentStudentId} /> : <IdentityPicker />;
}

function IdentityPicker() {
  const router = useRouter();
  const students = useAppStore((s) => s.data.students);
  const className = useAppStore((s) => s.data.classroom.name);
  const setCurrentStudent = useAppStore((s) => s.setCurrentStudent);

  return (
    <Screen
      title="Who are you?"
      subtitle={className}
      right={<Button title="Roles" variant="ghost" size="sm" onPress={() => router.back()} />}
    >
      {students.map((s) => (
        <Card key={s.id} onPress={() => setCurrentStudent(s.id)}>
          <Row>
            <Avatar initials={s.initials} />
            <Txt variant="h3">{s.name}</Txt>
          </Row>
        </Card>
      ))}
    </Screen>
  );
}

function StudentHome({ studentId }: { studentId: string }) {
  const router = useRouter();
  const data = useAppStore((s) => s.data);
  const setCurrentStudent = useAppStore((s) => s.setCurrentStudent);

  const student = data.students.find((s) => s.id === studentId);
  if (!student) {
    // Stale id (e.g. after resetDemo): drop back to the picker.
    return (
      <Screen title="Student">
        <EmptyState title="Pick who you are" icon="🎒" />
        <Button title="Choose a name" onPress={() => setCurrentStudent(null)} />
      </Screen>
    );
  }

  const { assignment } = data;
  const submission = data.submissions.find(
    (s) => s.assignmentId === assignment.id && s.studentId === studentId,
  );
  const correct = submission?.answers.filter((a) => a.correct).length ?? 0;
  const total = submission?.answers.length ?? assignment.questions.length;
  const published = data.lessons.filter((l) => l.status === 'published');
  const firstName = student.name.split(' ')[0];

  return (
    <Screen
      title={`Hi, ${firstName}`}
      subtitle={data.classroom.name}
      right={
        <Button title="Switch" variant="ghost" size="sm" onPress={() => setCurrentStudent(null)} />
      }
    >
      <Card onPress={() => router.push(`/student/quiz/${assignment.id}`)}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Badge label={submission ? 'Submitted' : 'To do'} tone={submission ? 'ok' : 'warn'} dot />
          {submission ? (
            <Txt variant="tiny" c={color.inkMuted}>
              Scored {correct}/{total}
            </Txt>
          ) : null}
        </Row>
        <Txt variant="h3" style={{ marginTop: sp.sm }}>
          {assignment.title}
        </Txt>
        <Txt variant="small" c={color.inkMuted} style={{ marginTop: 2 }}>
          {assignment.questions.length} questions
        </Txt>
        <Button
          title={submission ? 'Retake the review' : 'Start the review'}
          icon="✏️"
          size="sm"
          style={{ marginTop: sp.md }}
          onPress={() => router.push(`/student/quiz/${assignment.id}`)}
        />
      </Card>

      <Txt variant="h3" style={{ marginTop: sp.sm }}>
        Your lessons
      </Txt>
      {published.map((l) => (
        <Card key={l.id} onPress={() => router.push(`/student/lesson/${l.id}`)}>
          <Txt variant="h3">{l.title}</Txt>
          <Txt variant="small" c={color.inkMuted} numberOfLines={2} style={{ marginTop: 2 }}>
            {l.summary}
          </Txt>
          {l.adaptations.length ? (
            <Txt variant="tiny" c={color.accentInk} style={{ marginTop: sp.sm }}>
              ✨ {l.adaptations.length} MELDA explanation{l.adaptations.length > 1 ? 's' : ''}
            </Txt>
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}
