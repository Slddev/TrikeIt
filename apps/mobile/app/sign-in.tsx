import { GoogleIcon } from '@/components/brand/google-icon';
import { Logo } from '@/components/brand/logo';
import { CodeStep, ErrorText, PhoneStep, PrimaryButton } from '@/components/auth/phone-steps';
import { Text } from '@/components/ui/text';
import { authClient } from '@/lib/auth-client';
import { SmartphoneIcon } from 'lucide-react-native';
import * as React from 'react';
import { BackHandler, KeyboardAvoidingView, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Step = 'welcome' | 'phone' | 'code';

// On success the session hook in _layout updates and routes to the app.
export default function SignInScreen() {
  const [step, setStep] = React.useState<Step>('welcome');
  const [phone, setPhone] = React.useState<string | null>(null); // E.164, set once a code is sent

  // Android back steps through the flow instead of closing the app.
  React.useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 'welcome') return false;
      setStep(step === 'code' ? 'phone' : 'welcome');
      return true;
    });
    return () => sub.remove();
  }, [step]);

  return (
    <SafeAreaView className="flex-1 bg-brand-yellow">
      <KeyboardAvoidingView className="flex-1" behavior="padding">
        {step === 'welcome' && <WelcomeStep onPhone={() => setStep('phone')} />}
        {step === 'phone' && (
          <PhoneStep
            initialPhone={phone}
            onBack={() => setStep('welcome')}
            onSent={(e164) => {
              setPhone(e164);
              setStep('code');
            }}
          />
        )}
        {step === 'code' && phone && <CodeStep phone={phone} onBack={() => setStep('phone')} />}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function WelcomeStep({ onPhone }: { onPhone: () => void }) {
  const [error, setError] = React.useState<string | null>(null);

  async function onGoogle() {
    setError(null);
    const { error } = await authClient.signIn.social({ provider: 'google', callbackURL: '/' });
    if (error) setError(error.message ?? 'Could not start Google sign-in.');
  }

  return (
    <View className="flex-1 px-6 pb-6">
      <View className="flex-1 items-center justify-center gap-4">
        <Logo size={168} />
        <View className="items-center gap-1">
          <Text className="font-poppins-bold text-4xl text-brand-navy">TrikeIt!</Text>
          <Text className="text-center font-poppins text-base text-brand-navy/70">
            Deliveries by your local trike.
          </Text>
        </View>
      </View>

      <View className="gap-3">
        <PrimaryButton onPress={onPhone} icon={SmartphoneIcon}>
          Continue with phone
        </PrimaryButton>
        <Pressable
          onPress={onGoogle}
          className="h-14 flex-row items-center justify-center gap-3 rounded-2xl border-2 border-brand-navy bg-brand-cream active:opacity-80">
          <GoogleIcon />
          <Text className="font-poppins-semibold text-base text-brand-navy">
            Continue with Google
          </Text>
        </Pressable>
        {error && <ErrorText>{error}</ErrorText>}
        <Text className="mt-2 text-center font-poppins text-xs text-brand-navy/60">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </Text>
      </View>
    </View>
  );
}
