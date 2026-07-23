import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useTheme } from '../theme';
import { createThemedStyles, shadows, typography } from '../styles';

export default function SplashScreen() {
  const { colors } = useTheme();
  const themed = createThemedStyles(colors);
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(14)).current;
  const scale = useRef(new Animated.Value(0.94)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(rise, {
        toValue: 0,
        duration: 520,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(scale, { toValue: 1, damping: 12, stiffness: 130, useNativeDriver: true }),
    ]).start();
  }, [fade, rise, scale]);
  return (
    <View style={[styles.screen, themed.screen]}>
      <Animated.View
        style={{
          opacity: fade,
          transform: [{ translateY: rise }, { scale }],
          alignItems: 'center',
        }}
      >
        <View style={[styles.mark, themed.alternateCard, shadows.medium]}>
          <Text style={[styles.markText, themed.primaryText]}>N</Text>
        </View>
        <Text style={[styles.brand, themed.text]}>Noteriety</Text>
        <Text style={[typography.bodySmall, themed.mutedText, styles.tagline]}>
          Capture ideas. Organize everything.
        </Text>
      </Animated.View>
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mark: {
    width: 88,
    height: 88,
    borderWidth: 1,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  markText: { fontSize: 43, fontWeight: '800' },
  brand: { fontSize: 34, lineHeight: 39, fontWeight: '700', letterSpacing: -0.7 },
  tagline: { marginTop: 8 },
});