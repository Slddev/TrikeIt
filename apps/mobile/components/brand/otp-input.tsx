import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { Pressable, TextInput, View } from 'react-native';

type Props = {
  value: string;
  onChange: (value: string) => void;
  /** Called once when the last digit is entered (typed, pasted or autofilled). */
  onComplete?: (value: string) => void;
  length?: number;
  error?: boolean;
  disabled?: boolean;
};

/**
 * One hidden TextInput drawn as separate digit boxes. Keeping a single input means
 * paste, SMS autofill (iOS oneTimeCode, Android sms-otp) and backspace all just work.
 */
export function OtpInput({ value, onChange, onComplete, length = 6, error, disabled }: Props) {
  const inputRef = React.useRef<TextInput>(null);
  const [focused, setFocused] = React.useState(false);

  function handleChange(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, length);
    onChange(digits);
    if (digits.length === length && value.length !== length) onComplete?.(digits);
  }

  return (
    <Pressable onPress={() => inputRef.current?.focus()} disabled={disabled}>
      <View className="flex-row justify-between gap-2" pointerEvents="none">
        {Array.from({ length }, (_, i) => {
          const char = value[i] ?? '';
          const isActive = focused && !disabled && i === Math.min(value.length, length - 1);
          return (
            <View
              key={i}
              className={cn(
                'h-14 flex-1 items-center justify-center rounded-2xl border-2 bg-white',
                error
                  ? 'border-destructive'
                  : isActive
                    ? 'border-brand-navy'
                    : char
                      ? 'border-brand-gold'
                      : 'border-transparent'
              )}>
              <Text className="font-poppins-semibold text-2xl text-brand-navy">{char}</Text>
              {isActive && !char && <View className="absolute h-6 w-0.5 rounded-full bg-brand-navy" />}
            </View>
          );
        })}
      </View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        editable={!disabled}
        autoFocus
        keyboardType="number-pad"
        autoComplete="sms-otp"
        textContentType="oneTimeCode"
        maxLength={length}
        caretHidden
        accessibilityLabel={`${length}-digit verification code`}
        className="absolute inset-0 opacity-0"
      />
    </Pressable>
  );
}
