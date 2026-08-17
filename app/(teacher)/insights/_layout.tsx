import { Stack } from 'expo-router';
import { color, weight } from '../../../src/ui/tokens';

// Dashboard (index) uses the app's own header; drill-downs get a native header
// with a back chevron and set their own title.
export default function InsightsStack() {
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
