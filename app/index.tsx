import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Button, Card, Screen, Txt } from '../src/ui/components';
import { color, sp } from '../src/ui/tokens';
import { useAppStore } from '../src/state/store';

// The front door. MELDA is two surfaces over one brain: the teacher's CREATE +
// UNDERSTAND tools and the student's EXPERIENCE. Both write to the same store,
// so a student's work shows up in the teacher's dashboards live - which is the
// whole demo. This picker just chooses which surface to open.
export default function Index() {
  const router = useRouter();
  const resetDemo = useAppStore((s) => s.resetDemo);
  // Two-tap confirm: repeated demo runs pile up submissions in the persisted
  // store, so reset restores the seed. Armed state is local, so navigating away
  // disarms it - no accidental wipe.
  const [armed, setArmed] = useState(false);
  return (
    <Screen title="MELDA" subtitle="AI teaching assistant and learning companion">
      <Txt variant="small" c={color.inkMuted}>
        Who is using MELDA right now?
      </Txt>
      <Card onPress={() => router.push('/(teacher)/insights')}>
        <Txt variant="h2">📊 Teacher</Txt>
        <Txt variant="small" c={color.inkMuted} style={{ marginTop: sp.xs }}>
          See where the class is struggling and adapt your lessons with MELDA.
        </Txt>
      </Card>
      <Card onPress={() => router.push('/student')}>
        <Txt variant="h2">🎒 Student</Txt>
        <Txt variant="small" c={color.inkMuted} style={{ marginTop: sp.xs }}>
          Read your lessons, ask for a simpler explanation, and take your review.
        </Txt>
      </Card>
      <Button
        title={armed ? 'Tap again to reset the class' : 'Reset demo data'}
        icon="↺"
        variant="ghost"
        size="sm"
        style={{ marginTop: sp.md }}
        onPress={() => {
          if (armed) resetDemo();
          setArmed((a) => !a);
        }}
      />
    </Screen>
  );
}
