import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { color, sp } from '../../src/ui/tokens';

const icon =
  (glyph: string) =>
  ({ focused }: { focused: boolean }) => (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.55 }}>{glyph}</Text>
  );

export default function TeacherTabs() {
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
