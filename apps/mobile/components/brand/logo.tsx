import { Image, type ImageStyle, type StyleProp } from 'react-native';

const LOGO = require('@/assets/logo.png');

/** The source PNG is black on transparent, so any `color` tints it. */
export function Logo({
  size = 96,
  color = '#0B0F3F',
  style,
}: {
  size?: number;
  color?: string;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      source={LOGO}
      style={[{ width: size, height: size, tintColor: color }, style]}
      resizeMode="contain"
      accessibilityLabel="TrikeIt!"
    />
  );
}
