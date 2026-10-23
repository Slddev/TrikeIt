import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { StoreIcon, type LucideIcon } from 'lucide-react-native';
import * as React from 'react';
import { Image, View } from 'react-native';

/** A merchant-supplied photo, or a placeholder when there's none or it fails to load. */
export function RemoteImage({
  url,
  className,
  fallbackIcon = StoreIcon,
}: {
  url: string;
  className?: string;
  fallbackIcon?: LucideIcon;
}) {
  const [failedUrl, setFailedUrl] = React.useState<string | null>(null);

  if (!url || failedUrl === url) {
    return (
      <View className={cn('items-center justify-center bg-brand-cream', className)}>
        <Icon as={fallbackIcon} size={28} className="text-brand-navy/30" />
      </View>
    );
  }
  return (
    <Image
      source={{ uri: url }}
      onError={() => setFailedUrl(url)}
      resizeMode="cover"
      className={className}
    />
  );
}
