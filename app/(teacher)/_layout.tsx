import { Redirect, Tabs } from 'expo-router';
import { StackActions } from '@react-navigation/native';
import { Icon, type IconName } from 'melda-shared/ui/components';
import { color, sp } from 'melda-shared/ui/tokens';
import { useSession } from '../../src/state/store';

const tabIcon =
  (name: IconName) =>
  ({ color: c, size }: { color: string; size: number }) => (
    <Icon name={name} size={size} color={c} />
  );

// Re-tapping the active tab pops that tab's nested stack back to its home
// (index) instead of doing nothing - the gesture people expect on mobile.
const popToHome =
  ({ navigation }: { navigation: { isFocused: () => boolean; dispatch: (a: unknown) => void } }) => ({
    tabPress: () => {
      if (navigation.isFocused()) navigation.dispatch(StackActions.popToTop());
    },
  });

export default function TeacherTabs() {
  // Guard the whole teacher surface: no token (fresh boot, or signed out by a
  // 401) sends you back to the login screen, and a token with no class yet sends
  // you to create one.
  const token = useSession((s) => s.token);
  const currentClass = useSession((s) => s.currentClass);
  if (!token) return <Redirect href="/" />;
  if (!currentClass) return <Redirect href="/create-class" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.accent,
        tabBarInactiveTintColor: color.inkMuted,
        tabBarStyle: {
          backgroundColor: color.card,
          borderTopColor: color.border,
          height: 70,
          paddingBottom: sp.md,
          paddingTop: sp.xs,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="insights"
        options={{ title: 'Insights', tabBarIcon: tabIcon('chart') }}
        listeners={popToHome}
      />
      <Tabs.Screen
        name="lessons"
        options={{ title: 'Lessons', tabBarIcon: tabIcon('book') }}
        listeners={popToHome}
      />
      <Tabs.Screen
        name="reviews"
        options={{ title: 'Reviews', tabBarIcon: tabIcon('reviews') }}
        listeners={popToHome}
      />
    </Tabs>
  );
}
