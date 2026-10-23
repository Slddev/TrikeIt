import { createAuthClient } from 'better-auth/react';
import { inferAdditionalFields, phoneNumberClient } from 'better-auth/client/plugins';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_API_URL!,
  plugins: [
    phoneNumberClient(),
    // Mirrors user.additionalFields in apps/web/src/lib/auth.ts.
    inferAdditionalFields({ user: { role: { type: 'string', input: false } } }),
    expoClient({
      scheme: 'trikeit',
      storagePrefix: 'trikeit',
      storage: SecureStore,
    }),
  ],
});
