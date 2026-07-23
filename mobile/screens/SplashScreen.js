import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useTheme, fonts } from '../theme';
import { Logo } from '../components/Brand';

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
        style={{
          opacity: fade,
          transform: [{ translateY: rise }],
          alignItems: 'center',
        }}
      >
        <Logo size="lg" tile={false} />
        <Text
          style={{
            fontFamily: fonts.mono,
            fontSize: 11,
            letterSpacing: 1.6,
            color: colors.textMuted,
            marginTop: 22,
          }}
        >
          NOTES MADE SIMPLE
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});