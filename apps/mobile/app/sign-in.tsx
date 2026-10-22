import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { authClient } from '@/lib/auth-client';
import { normalizePhoneNumber } from '@/lib/phone';
import * as React from 'react';
import { TextInput, View } from 'react-native';

const INPUT_CLASS =
  'rounded-md border border-border bg-background px-3 py-2 text-base text-foreground';

export default function SignInScreen() {
  const [step, setStep] = React.useState<'phone' | 'code'>('phone');
  const [phoneInput, setPhoneInput] = React.useState('');
  const [phone, setPhone] = React.useState<string | null>(null); // E.164, set once a code is sent
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  // On success the session hook in _layout updates and routes to the app.
  async function onGoogle() {
    setError(null);
    const { error } = await authClient.signIn.social({ provider: 'google', callbackURL: '/' });
    if (error) setError(error.message ?? 'Could not start Google sign-in.');
  }

  async function onSendCode() {
    setError(null);
    const normalized = normalizePhoneNumber(phoneInput);
    if (!normalized) {
      setError('Enter a valid Philippine mobile number, e.g. 0917 123 4567.');
      return;
    }
    setPending(true);
    const { error } = await authClient.phoneNumber.sendOtp({ phoneNumber: normalized });
    setPending(false);
    if (error) {
      setError(error.message ?? 'Could not send the code. Please try again.');
      return;
    }
    setPhone(normalized);
    setStep('code');
  }

  async function onVerify() {
    if (!phone) return;
    setError(null);
    setPending(true);
    const { error } = await authClient.phoneNumber.verify({ phoneNumber: phone, code: code.trim() });
    setPending(false);
    if (error) setError(error.message ?? "That code didn't work. Please try again.");
  }

  return (
    <View className="flex-1 justify-center gap-4 p-6">
      <Text variant="h1" className="text-left">
        Sign in to TrikeIt!
      </Text>

      {step === 'phone' ? (
        <>
          <Button variant="outline" onPress={onGoogle}>
            <Text>Continue with Google</Text>
          </Button>

          <Text className="text-center text-xs text-muted-foreground">or use your mobile number</Text>

          <TextInput
            className={INPUT_CLASS}
            placeholder="0917 123 4567"
            value={phoneInput}
            onChangeText={setPhoneInput}
            keyboardType="phone-pad"
            autoComplete="tel"
          />
          <Button onPress={onSendCode} disabled={pending}>
            <Text>{pending ? 'Sending…' : 'Send code'}</Text>
          </Button>
        </>
      ) : (
        <>
          <Text className="text-sm text-muted-foreground">We sent a 6-digit code to {phone}.</Text>
          <TextInput
            className={INPUT_CLASS}
            placeholder="123456"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
          />
          <Button onPress={onVerify} disabled={pending}>
            <Text>{pending ? 'Verifying…' : 'Verify and continue'}</Text>
          </Button>
          <Button
            variant="ghost"
            onPress={() => {
              setError(null);
              setCode('');
              setStep('phone');
            }}>
            <Text>Use a different number</Text>
          </Button>
        </>
      )}

      {error && <Text className="text-sm text-destructive">{error}</Text>}
    </View>
  );
}
