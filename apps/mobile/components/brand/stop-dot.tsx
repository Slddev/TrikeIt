import type { Stop } from '@/lib/booking';
import { cn } from '@/lib/utils';
import { View } from 'react-native';

export function StopDot({ stop, className }: { stop: Stop; className?: string }) {
  return (
    <View
      className={cn(
        'h-4 w-4 rounded-full border-4',
        stop === 'pickup' ? 'border-brand-gold bg-white' : 'border-brand-navy bg-brand-navy',
        className
      )}
    />
  );
}
