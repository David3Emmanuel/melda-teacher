import { Stack } from 'expo-router';
import { color, weight } from '../../../src/ui/tokens';

export default function LessonsStack() {
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
