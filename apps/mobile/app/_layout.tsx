import '@/global.css';

import { authClient } from '@/lib/auth-client';
import { BookingProvider } from '@/lib/booking';
import { NAV_THEME } from '@/lib/theme';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from '@expo-google-fonts/poppins';
import { ThemeProvider } from 'expo-router/react-navigation';
import { PortalHost } from '@rn-primitives/portal';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export { ErrorBoundary } from 'expo-router';

export default function RootLayout() {
  const { data: session, isPending } = authClient.useSession();
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  if (isPending || !fontsLoaded) return null;

  return (
    <ThemeProvider value={NAV_THEME.light}>
      <BookingProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={!!session}>
            <Stack.Screen name="index" />
            <Stack.Screen name="pick-location" />
          </Stack.Protected>
          <Stack.Protected guard={!session}>
            <Stack.Screen name="sign-in" />
          </Stack.Protected>
        </Stack>
        <PortalHost />
      </BookingProvider>
    </ThemeProvider>
  );
}
