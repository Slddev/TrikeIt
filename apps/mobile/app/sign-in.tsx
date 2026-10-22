import { GoogleIcon } from '@/components/brand/google-icon';
import { Logo } from '@/components/brand/logo';
import { OtpInput } from '@/components/brand/otp-input';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { authClient } from '@/lib/auth-client';
import {
  formatE164,
  formatNational,
  normalizePhoneNumber,
  toNationalDigits,
} from '@/lib/phone';
import { cn } from '@/lib/utils';
import { ArrowLeftIcon, MessageSquareTextIcon, SmartphoneIcon } from 'lucide-react-native';
import * as React from 'react';
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const NAVY = '#0B0F3F';
const RESEND_SECONDS = 30;

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
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
            Rides and deliveries by your local trike.
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

function PhoneStep({
  initialPhone,
  onBack,
  onSent,
}: {
  initialPhone: string | null;
  onBack: () => void;
  onSent: (e164: string) => void;
}) {
  const [digits, setDigits] = React.useState(initialPhone ? toNationalDigits(initialPhone) : '');
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const e164 = normalizePhoneNumber(digits);
  // Only complain once they've typed a full-length number that still isn't valid.
  const showInvalid = digits.length === 10 && !e164;

  async function onSendCode() {
    if (!e164 || pending) return;
    setError(null);
    setPending(true);
    const { error } = await authClient.phoneNumber.sendOtp({ phoneNumber: e164 });
    setPending(false);
    if (error) {
      setError(error.message ?? 'Could not send the code. Please try again.');
      return;
    }
    onSent(e164);
  }

  return (
    <View className="flex-1 px-6 pb-6">
      <BackButton onPress={onBack} />

      <View className="mt-6 gap-2">
        <Text className="font-poppins-bold text-3xl text-brand-navy">
          What's your mobile number?
        </Text>
        <Text className="font-poppins text-base text-brand-navy/70">
          We'll text you a 6-digit code. No password needed.
        </Text>
      </View>

      <View
        className={cn(
          'mt-8 h-16 flex-row items-center rounded-2xl border-2 bg-white px-4',
          showInvalid || error ? 'border-destructive' : 'border-brand-navy'
        )}>
        <Text className="font-poppins-semibold text-lg text-brand-navy">🇵🇭 +63</Text>
        <View className="mx-3 h-7 w-px bg-brand-navy/20" />
        <TextInput
          value={formatNational(digits)}
          onChangeText={(text) => {
            setError(null);
            setDigits(toNationalDigits(text));
          }}
          onSubmitEditing={onSendCode}
          placeholder="917 123 4567"
          placeholderTextColor="#0B0F3F55"
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          autoFocus
          maxLength={12} // 10 digits + 2 spaces
          accessibilityLabel="Mobile number"
          className="h-full flex-1 font-poppins-medium text-lg text-brand-navy"
        />
      </View>
      {showInvalid && <ErrorText>Philippine mobile numbers start with 9, e.g. 917 123 4567.</ErrorText>}
      {error && <ErrorText>{error}</ErrorText>}

      <View className="flex-1" />

      <PrimaryButton onPress={onSendCode} disabled={!e164} loading={pending} icon={MessageSquareTextIcon}>
        Send code
      </PrimaryButton>
    </View>
  );
}

function CodeStep({ phone, onBack }: { phone: string; onBack: () => void }) {
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [resendIn, setResendIn] = React.useState(RESEND_SECONDS);

  React.useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  async function verify(value: string) {
    if (value.length !== 6 || pending) return;
    setError(null);
    setPending(true);
    const { error } = await authClient.phoneNumber.verify({ phoneNumber: phone, code: value });
    setPending(false);
    if (error) setError(error.message ?? "That code didn't work. Please try again.");
  }

  async function resend() {
    setError(null);
    setCode('');
    setResendIn(RESEND_SECONDS);
    const { error } = await authClient.phoneNumber.sendOtp({ phoneNumber: phone });
    if (error) {
      setError(error.message ?? 'Could not resend the code. Please try again.');
      setResendIn(0);
    }
  }

  return (
    <View className="flex-1 px-6 pb-6">
      <BackButton onPress={onBack} />

      <View className="mt-6 gap-2">
        <Text className="font-poppins-bold text-3xl text-brand-navy">Enter your code</Text>
        <Text className="font-poppins text-base text-brand-navy/70">
          Sent to <Text className="font-poppins-semibold text-brand-navy">{formatE164(phone)}</Text>
          {'  '}
          <Text onPress={onBack} className="font-poppins-semibold text-brand-navy underline">
            Change
          </Text>
        </Text>
      </View>

      <View className="mt-8">
        <OtpInput
          value={code}
          onChange={(v) => {
            setError(null);
            setCode(v);
          }}
          onComplete={verify}
          error={!!error}
          disabled={pending}
        />
      </View>
      {error && <ErrorText>{error}</ErrorText>}

      <View className="mt-6 flex-row items-center justify-center">
        {resendIn > 0 ? (
          <Text className="font-poppins text-sm text-brand-navy/60">
            Resend code in 0:{String(resendIn).padStart(2, '0')}
          </Text>
        ) : (
          <Pressable onPress={resend} hitSlop={12}>
            <Text className="font-poppins-semibold text-sm text-brand-navy underline">
              Resend code
            </Text>
          </Pressable>
        )}
      </View>

      <View className="flex-1" />

      <PrimaryButton onPress={() => verify(code)} disabled={code.length !== 6} loading={pending}>
        Verify and continue
      </PrimaryButton>
    </View>
  );
}

function PrimaryButton({
  children,
  onPress,
  disabled,
  loading,
  icon,
}: {
  children: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ComponentProps<typeof Icon>['as'];
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={cn(
        'h-14 flex-row items-center justify-center gap-3 rounded-2xl bg-brand-navy active:opacity-90',
        disabled && 'opacity-40'
      )}>
      {loading ? (
        <ActivityIndicator color="#FFE891" />
      ) : (
        <>
          {icon && <Icon as={icon} size={20} className="text-brand-yellow" />}
          <Text className="font-poppins-semibold text-base text-brand-yellow">{children}</Text>
        </>
      )}
    </Pressable>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityLabel="Back"
      className="mt-2 h-11 w-11 items-center justify-center rounded-full bg-white/70 active:bg-white">
      <ArrowLeftIcon size={22} color={NAVY} />
    </Pressable>
  );
}

function ErrorText({ children }: { children: string }) {
  return <Text className="mt-2 font-poppins text-sm text-destructive">{children}</Text>;
}
