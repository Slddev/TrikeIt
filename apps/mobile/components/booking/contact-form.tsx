import { Text } from '@/components/ui/text';
import type { Contact, Stop } from '@/lib/booking';
import { formatE164, normalizePhoneNumber } from '@/lib/phone';
import { cn } from '@/lib/utils';
import { Pressable, TextInput, View } from 'react-native';

export type ContactDraft = { isMe: boolean; name: string; phone: string };

/** The contact to save, or null while a "someone else" contact is incomplete. */
export function resolveContact(
  draft: ContactDraft,
  me: { name: string; phoneNumber?: string | null }
): Contact | null {
  if (draft.isMe)
    return me.phoneNumber ? { isMe: true, name: me.name, phone: me.phoneNumber } : null;
  const phone = normalizePhoneNumber(draft.phone);
  return draft.name.trim() && phone ? { isMe: false, name: draft.name.trim(), phone } : null;
}

const field =
  'h-12 rounded-xl border-2 border-brand-navy/15 bg-white px-3 font-poppins text-base text-brand-navy';

export function ContactForm({
  stop,
  value,
  onChange,
  me,
}: {
  stop: Stop;
  value: ContactDraft;
  onChange: (next: ContactDraft) => void;
  me: { name: string; phoneNumber?: string | null };
}) {
  const role = stop === 'pickup' ? 'Sender' : 'Recipient';

  return (
    <View className="gap-2">
      <Text className="font-poppins text-xs uppercase tracking-wider text-brand-navy/50">
        {role}
      </Text>
      <View className="flex-row rounded-xl bg-brand-cream p-1">
        {[true, false].map((isMe) => (
          <Pressable
            key={String(isMe)}
            onPress={() => onChange({ ...value, isMe })}
            accessibilityRole="radio"
            accessibilityState={{ checked: value.isMe === isMe }}
            className={cn(
              'flex-1 items-center rounded-lg py-2',
              value.isMe === isMe && 'bg-brand-navy'
            )}>
            <Text
              className={cn(
                'font-poppins-semibold text-sm',
                value.isMe === isMe ? 'text-brand-yellow' : 'text-brand-navy'
              )}>
              {isMe ? 'Me' : 'Someone else'}
            </Text>
          </Pressable>
        ))}
      </View>

      {value.isMe ? (
        <Text className="font-poppins text-sm text-brand-navy/70">
          {me.name}
          {me.phoneNumber ? ` · ${formatE164(me.phoneNumber)}` : ''}
        </Text>
      ) : (
        <View className="gap-2">
          <TextInput
            value={value.name}
            onChangeText={(name) => onChange({ ...value, name })}
            placeholder={`${role}'s name`}
            placeholderTextColor="#0B0F3F80"
            autoComplete="name"
            className={field}
          />
          <TextInput
            value={value.phone}
            onChangeText={(phone) => onChange({ ...value, phone })}
            placeholder={`${role}'s mobile, e.g. 0917 123 4567`}
            placeholderTextColor="#0B0F3F80"
            keyboardType="phone-pad"
            className={field}
          />
        </View>
      )}
    </View>
  );
}
