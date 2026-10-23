import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { DAYS_AHEAD, dayLabel, formatSlot, slotsOn, timeLabel } from '@/lib/schedule';
import { cn } from '@/lib/utils';
import { CheckIcon, ChevronDownIcon, ClockIcon } from 'lucide-react-native';
import * as React from 'react';
import { Modal, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';

const MENU_WIDTH = 220;
const MENU_MAX_HEIGHT = 320;

export function ScheduleDropdown({
  value,
  onChange,
}: {
  value: Date | null;
  onChange: (at: Date | null) => void;
}) {
  const trigger = React.useRef<View>(null);
  const window = useWindowDimensions();
  const [anchor, setAnchor] = React.useState<{ x: number; y: number; w: number; h: number } | null>(
    null
  );

  function open() {
    trigger.current?.measureInWindow((x, y, w, h) => setAnchor({ x, y, w, h }));
  }
  function pick(at: Date | null) {
    onChange(at);
    setAnchor(null);
  }

  const below = anchor ? window.height - (anchor.y + anchor.h) - 16 >= MENU_MAX_HEIGHT : true;
  const position = anchor && {
    left: Math.max(16, Math.min(anchor.x + anchor.w - MENU_WIDTH, window.width - MENU_WIDTH - 16)),
    ...(below ? { top: anchor.y + anchor.h + 6 } : { bottom: window.height - anchor.y + 6 }),
  };
  const days = Array.from({ length: DAYS_AHEAD }, (_, i) => ({
    offset: i,
    slots: slotsOn(i),
  })).filter((d) => d.slots.length > 0);

  return (
    <>
      <Pressable
        ref={trigger}
        onPress={open}
        accessibilityRole="combobox"
        accessibilityState={{ expanded: !!anchor }}
        accessibilityLabel={`Pick-up time: ${value ? formatSlot(value) : 'now'}`}
        className="shrink flex-row items-center gap-1.5 rounded-full bg-brand-yellow px-3 py-2 active:opacity-80">
        <Icon as={ClockIcon} size={16} className="text-brand-navy" />
        <Text className="shrink font-poppins-medium text-sm text-brand-navy" numberOfLines={1}>
          {value ? formatSlot(value) : 'Now'}
        </Text>
        <Icon as={ChevronDownIcon} size={16} className="text-brand-navy" />
      </Pressable>

      <Modal
        visible={!!anchor}
        transparent
        animationType="fade"
        // Drawn edge to edge so it shares measureInWindow's coordinates on Android.
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setAnchor(null)}>
        <Pressable className="flex-1" onPress={() => setAnchor(null)} accessibilityLabel="Close" />
        {position && (
          <View
            className="absolute overflow-hidden rounded-2xl bg-white shadow-lg shadow-black/25"
            style={[position, { width: MENU_WIDTH, maxHeight: MENU_MAX_HEIGHT, elevation: 8 }]}>
            <ScrollView>
              <Option label="Now" selected={value === null} onPress={() => pick(null)} />
              {days.map(({ offset, slots }) => (
                <View key={offset}>
                  <Text className="bg-brand-cream px-4 py-1.5 font-poppins-semibold text-xs uppercase tracking-wider text-brand-navy/60">
                    {dayLabel(offset)}
                  </Text>
                  {slots.map((slot) => (
                    <Option
                      key={slot.getTime()}
                      label={timeLabel(slot)}
                      selected={value?.getTime() === slot.getTime()}
                      onPress={() => pick(slot)}
                    />
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </Modal>
    </>
  );
}

function Option({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="menuitem"
      accessibilityState={{ selected }}
      className={cn(
        'flex-row items-center justify-between px-4 py-3 active:bg-brand-cream',
        selected && 'bg-brand-yellow/60'
      )}>
      <Text
        className={cn(
          'text-sm text-brand-navy',
          selected ? 'font-poppins-semibold' : 'font-poppins'
        )}>
        {label}
      </Text>
      {selected && <Icon as={CheckIcon} size={16} className="text-brand-navy" />}
    </Pressable>
  );
}
