import { Redirect, Tabs } from 'expo-router';
import { Text } from 'react-native';
import { color, sp } from '../../src/ui/tokens';
import { useSession } from '../../src/state/store';

const icon =
  (glyph: string) =>
  ({ focused }: { focused: boolean }) => (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.55 }}>{glyph}</Text>
  );

export default function TeacherTabs() {
  // Guard the whole teacher surface: no token (fresh boot, or signed out by a
  // 401) sends you back to the login screen.
  const token = useSession((s) => s.token);
  if (!token) return <Redirect href="/" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.accent,
        tabBarInactiveTintColor: color.inkMuted,
        tabBarStyle: {
          backgroundColor: color.card,
          borderTopColor: color.border,
          height: 60,
          paddingBottom: sp.sm,
          paddingTop: sp.xs,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="insights" options={{ title: 'Insights', tabBarIcon: icon('📊') }} />
      <Tabs.Screen name="lessons" options={{ title: 'Lessons', tabBarIcon: icon('📚') }} />
      <Tabs.Screen name="reviews" options={{ title: 'Reviews', tabBarIcon: icon('📝') }} />
    </Tabs>
  );
}
