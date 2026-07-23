import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme, fonts, eyebrow } from '../theme';

// The rounded logo mark + serif wordmark used on splash and auth screens.
// `tile` draws the rounded background square behind the logo (matches web).
// Set tile={false} if the logo art already has its own shape/background.
export function Logo({ size = 'md', tile = false }) {
  const { colors, isDark } = useTheme();
  const box = size === 'lg' ? 76 : 44;
  const radius = size === 'lg' ? 20 : 12;
  const art = Math.round(box * (tile ? 0.62 : 1));
  const word = size === 'lg' ? 34 : 22;

  return (
    <View style={styles.row}>
      <View
        style={{
          width: box,
          height: box,
          borderRadius: radius,
          backgroundColor: tile ? colors.surfaceAlt : 'transparent',
          borderWidth: tile ? 1 : 0,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Image
          source={
            isDark
              ? require('../assets/logo-dark.png')
              : require('../assets/logo-light.png')
          }
          style={{ width: art, height: art }}
          resizeMode="contain"
        />
      </View>
      <Text
        style={{
          fontFamily: fonts.display,
          fontSize: word,
          fontWeight: '700',
          color: colors.text,
          marginLeft: 12,
          letterSpacing: -0.4,
        }}
      >
        Noteriety
      </Text>
    </View>
  );
}

// The small monospace label with a leading rule, e.g. "—— WORKSPACE"
export function Eyebrow({ children, style }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.eyebrowRow, style]}>
      <View style={[styles.rule, { backgroundColor: colors.primary }]} />
      <Text style={[eyebrow, { color: colors.primary }]}>{children}</Text>
    </View>
  );
}

// Serif page heading.
export function Display({ children, style, size = 30 }) {
  const { colors } = useTheme();
  return (
    <Text
      style={[
        {
          fontFamily: fonts.display,
          fontSize: size,
          fontWeight: '700',
          color: colors.text,
          letterSpacing: -0.6,
          lineHeight: size * 1.15,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rule: { width: 22, height: 2, borderRadius: 1 },
});