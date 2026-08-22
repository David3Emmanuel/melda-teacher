// First-run for a teacher with no class yet: create one and get the invite code
// their students use to join (POST /classes). Once created, the teacher lands on
// their dashboard; the code is shown once so they can share it.
//
// Production is seeded with nothing, so this screen is how a class comes into
// existence in a real deployment.

import { useState } from 'react';
import { Redirect, useRouter } from 'expo-router';
import type { CreateClassResponse } from 'melda-shared';
import { Button, Card, Input, Screen, Txt } from 'melda-shared/ui/components';
import { color, sp } from 'melda-shared/ui/tokens';
import { api, ApiError } from '../src/api/client';
import { useSession } from '../src/state/store';

export default function CreateClass() {
  const router = useRouter();
  const token = useSession((s) => s.token);
  const setCurrentClass = useSession((s) => s.setCurrentClass);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreateClassResponse | null>(null);

  if (!token) return <Redirect href="/" />;

  const submit = async () => {
    const n = name.trim();
    if (!n) return;
    setBusy(true);
    setError(null);
    try {
      const klass = await api.createClass({
        name: n,
        subject: subject.trim() || undefined,
      });
      setCreated(klass);
      setCurrentClass(klass);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create the class. Try again.');
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    return (
      <Screen title="Class created">
        <Card style={{ gap: sp.md, alignItems: 'center' }}>
          <Txt variant="h3" center>
            {created.name}
          </Txt>
          <Txt variant="small" c={color.inkMuted} center>
            Share this code with your students so they can join:
          </Txt>
          <Txt variant="display" c={color.accent} center>
            {created.inviteCode}
          </Txt>
          <Button
            title="Go to your dashboard"
            icon="next"
            onPress={() => router.replace('/(teacher)/insights')}
          />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen title="Create your class" subtitle="Start with the class you teach">
      <Card style={{ gap: sp.md }}>
        <Txt variant="h3">Your first class</Txt>
        <Input
          label="Class name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Grade 10 Chemistry"
          onSubmitEditing={submit}
        />
        <Input
          label="Subject (optional)"
          value={subject}
          onChangeText={setSubject}
          placeholder="e.g. Chemistry"
        />
        {error ? (
          <Txt variant="small" c={color.struggle}>
            {error}
          </Txt>
        ) : null}
        <Button
          title="Create class"
          icon="plus"
          loading={busy}
          disabled={!name.trim()}
          onPress={submit}
        />
      </Card>
    </Screen>
  );
}
