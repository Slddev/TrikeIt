import { OtpInput } from '@/components/brand/otp-input';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { authClient } from '@/lib/auth-client';
import { formatE164, formatNational, normalizePhoneNumber, toNationalDigits } from '@/lib/phone';
import { cn } from '@/lib/utils';
import { ArrowLeftIcon, MessageSquareTextIcon } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';

const NAVY = '#0B0F3F';
const RESEND_SECONDS = 30;

export function PhoneStep({
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
      {showInvalid && (
        <ErrorText>Philippine mobile numbers start with 9, e.g. 917 123 4567.</ErrorText>
      )}
      {error && <ErrorText>{error}</ErrorText>}

      <View className="flex-1" />

      <PrimaryButton
        onPress={onSendCode}
        disabled={!e164}
        loading={pending}
        icon={MessageSquareTextIcon}>
        Send code
      </PrimaryButton>
    </View>
  );
}

/**
 * Signs in with the code, or with `attach` adds the verified number to the signed-in account
 * (used to give Google sign-ups a phone number).
 */
export function CodeStep({
  phone,
  onBack,
  attach = false,
}: {
  phone: string;
  onBack: () => void;
  attach?: boolean;
}) {
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
    const { error } = await authClient.phoneNumber.verify({
      phoneNumber: phone,
      code: value,
      ...(attach && { updatePhoneNumber: true }),
    });
    setPending(false);
    if (error) {
      setError(error.message ?? "That code didn't work. Please try again.");
      return;
    }
    // Signing in refreshes the session by itself; attaching a number to an existing one doesn't.
    if (attach) authClient.$store.notify('$sessionSignal');
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

export function PrimaryButton({
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

export function BackButton({ onPress }: { onPress: () => void }) {
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

export function ErrorText({ children }: { children: string }) {
  return <Text className="mt-2 font-poppins text-sm text-destructive">{children}</Text>;
}
