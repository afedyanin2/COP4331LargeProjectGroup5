import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useTheme } from '../theme';

export default function SplashScreen() {
  const { colors } = useTheme();

  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(rise, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, rise]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Animated.View
        style={{ opacity: fade, transform: [{ translateY: rise }], alignItems: 'center' }}
      >
        <View style={[styles.mark, { backgroundColor: colors.primary }]}>
          <Text style={[styles.markText, { color: colors.onPrimary }]}>N</Text>
        </View>
        <Text style={[styles.brand, { color: colors.text }]}>Noteriety</Text>
        <Text style={[styles.tagline, { color: colors.textMuted }]}>
          Your notes, everywhere.
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mark: {
    width: 84,
    height: 84,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  markText: { fontSize: 44, fontWeight: '800' },
  brand: { fontSize: 32, fontWeight: '700', letterSpacing: -0.5 },
  tagline: { fontSize: 15, marginTop: 8 },
});
