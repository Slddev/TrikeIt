import { CodeStep, ErrorText, PhoneStep, PrimaryButton } from '@/components/auth/phone-steps';
import { Text } from '@/components/ui/text';
import { accountGaps } from '@/lib/account';
import { api } from '@/lib/api';
import { authClient } from '@/lib/auth-client';
import * as React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Shown after sign-in until the account has a verified phone, a name and an email.
// The layout routes away from here by itself once the session is complete.
export default function CompleteProfileScreen() {
  const { data: session } = authClient.useSession();
  const [phone, setPhone] = React.useState<string | null>(null);
  if (!session) return null;
  const { needsPhone } = accountGaps(session.user);

  return (
    <SafeAreaView className="flex-1 bg-brand-yellow">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {needsPhone ? (
          phone ? (
            <CodeStep phone={phone} onBack={() => setPhone(null)} attach />
          ) : (
            <PhoneStep initialPhone={null} onBack={() => authClient.signOut()} onSent={setPhone} />
          )
        ) : (
          <DetailsStep currentName={session.user.name} />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function DetailsStep({ currentName }: { currentName: string }) {
  // New phone accounts are named after their number until the person sets a real name.
  const [name, setName] = React.useState(/^\+?\d+$/.test(currentName) ? '' : currentName);
  const [email, setEmail] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function save() {
    setError(null);
    setPending(true);
    try {
      await api('/api/profile', { method: 'POST', body: { name, email } });
      authClient.$store.notify('$sessionSignal');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  const field =
    'h-14 rounded-2xl border-2 border-brand-navy bg-white px-4 font-poppins-medium text-lg text-brand-navy';

  return (
    <ScrollView contentContainerClassName="flex-grow px-6 pb-6" keyboardShouldPersistTaps="handled">
      <View className="mt-14 gap-2">
        <Text className="font-poppins-bold text-3xl text-brand-navy">Tell us about you</Text>
        <Text className="font-poppins text-base text-brand-navy/70">
          Riders and recipients see your name. We'll use your email for receipts.
        </Text>
      </View>

      <View className="mt-8 gap-3">
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Full name"
          placeholderTextColor="#0B0F3F55"
          autoComplete="name"
          autoFocus
          className={field}
        />
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor="#0B0F3F55"
          autoComplete="email"
          keyboardType="email-address"
          autoCapitalize="none"
          className={field}
        />
        {error && <ErrorText>{error}</ErrorText>}
      </View>

      <View className="flex-1" />
      <PrimaryButton
        onPress={save}
        disabled={name.trim().length < 2 || !email.includes('@')}
        loading={pending}>
        Continue
      </PrimaryButton>
    </ScrollView>
  );
}
