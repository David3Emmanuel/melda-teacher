import { Stack } from 'expo-router';
import { color, weight } from '../../src/ui/tokens';

// The student EXPERIENCE stack. Mirrors the teacher stacks: a styled native
// header (so pushed screens get a back button) with the entry screen's own
// header hidden, since it renders its own via <Screen>.
export default function StudentStack() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: color.appBg },
        headerShadowVisible: false,
        headerTintColor: color.accent,
        headerTitleStyle: { color: color.ink, fontWeight: weight.semibold },
        contentStyle: { backgroundColor: color.appBg },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
