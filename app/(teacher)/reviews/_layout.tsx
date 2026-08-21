import { Stack } from 'expo-router';
import { color, weight } from 'melda-shared/ui/tokens';

export default function ReviewsStack() {
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
