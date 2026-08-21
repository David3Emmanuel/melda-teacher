// Guards the AI authoring flows (new lesson, new review, adapt section) against
// silently losing an unsaved draft. While `active`, any attempt to leave the
// screen - the header back button, the native back gesture, a router.back() - is
// intercepted and the teacher must confirm the discard first.
//
// usePreventRemove wraps React Navigation's `beforeRemove` event; the confirm is
// platform-split because react-native-web's Alert is a no-op (its alert() does
// nothing), so blocking navigation and then calling Alert.alert would trap the
// teacher on the screen. window.confirm is the web equivalent.
//
// Known ceiling: on web this covers in-app navigation, not the browser's own
// back/forward button or a tab close. A window `beforeunload` listener is the
// upgrade path if that gap ever bites.

import { Alert, Platform } from 'react-native';
import { useNavigation } from 'expo-router';
import { usePreventRemove } from '@react-navigation/native';

export function useUnsavedGuard(active: boolean) {
  const navigation = useNavigation();
  usePreventRemove(active, ({ data }) => {
    const discard = () => navigation.dispatch(data.action);
    if (Platform.OS === 'web') {
      if (window.confirm('Discard this draft? Your unsaved changes will be lost.')) discard();
      return;
    }
    Alert.alert('Discard draft?', 'Your unsaved changes will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: discard },
    ]);
  });
}
