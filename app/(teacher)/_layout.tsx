import { Redirect, Tabs } from 'expo-router';
import { Icon, type IconName } from 'melda-shared/ui/components';
import { color, sp } from 'melda-shared/ui/tokens';
import { useSession } from '../../src/state/store';

const tabIcon =
  (name: IconName) =>
  ({ color: c, size }: { color: string; size: number }) => (
    <Icon name={name} size={size} color={c} />
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
      <Tabs.Screen name="insights" options={{ title: 'Insights', tabBarIcon: tabIcon('chart') }} />
      <Tabs.Screen name="lessons" options={{ title: 'Lessons', tabBarIcon: tabIcon('book') }} />
      <Tabs.Screen name="reviews" options={{ title: 'Reviews', tabBarIcon: tabIcon('reviews') }} />
    </Tabs>
  );
}
