import * as React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

type Props = ViewProps & {
  /** Colors from top to bottom, evenly spaced. */
  colors: string[];
};

// Built on react-native-svg rather than expo-linear-gradient to avoid a native rebuild.
export function Gradient({ colors, style, children, ...props }: Props) {
  const id = React.useId();
  return (
    <View style={style} {...props}>
      <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            {colors.map((color, i) => (
              <Stop key={i} offset={i / Math.max(colors.length - 1, 1)} stopColor={color} />
            ))}
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
      {children}
    </View>
  );
}
