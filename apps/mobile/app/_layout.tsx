import '@/global.css';

import { accountGaps } from '@/lib/account';
import { authClient } from '@/lib/auth-client';
import { BookingProvider } from '@/lib/booking';
import { CartProvider } from '@/lib/cart';
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
  const gaps = session ? accountGaps(session.user) : null;
  const ready = !!gaps && !gaps.needsPhone && !gaps.needsDetails;
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
        <CartProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Protected guard={ready}>
              <Stack.Screen name="index" />
              <Stack.Screen name="pick-location" />
              <Stack.Screen name="booking/[id]" />
              <Stack.Screen name="merchant/[id]" />
              <Stack.Screen name="merchant/item" options={{ presentation: 'modal' }} />
              <Stack.Screen name="checkout" />
              <Stack.Protected guard={session?.user.role === 'driver'}>
                <Stack.Screen name="trip" />
                <Stack.Screen name="trip-map" />
              </Stack.Protected>
            </Stack.Protected>
            <Stack.Protected guard={!!session && !ready}>
              <Stack.Screen name="complete-profile" />
            </Stack.Protected>
            <Stack.Protected guard={!session}>
              <Stack.Screen name="sign-in" />
            </Stack.Protected>
          </Stack>
          <PortalHost />
        </CartProvider>
      </BookingProvider>
    </ThemeProvider>
  );
}
