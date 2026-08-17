import { Redirect } from 'expo-router';

// Open straight onto the class insights - the screen that carries the app.
export default function Index() {
  return <Redirect href="/(teacher)/insights" />;
}
