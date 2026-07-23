import { Platform, StyleSheet } from 'react-native';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
};

export const radius = {
  small: 9,
  medium: 12,
  large: 16,
  xlarge: 20,
  round: 999,
};

export const typography = {
  display: { fontSize: 42, lineHeight: 44, fontWeight: '700', letterSpacing: -1.4 },
  pageTitle: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.6 },
  sectionTitle: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  cardTitle: { fontSize: 17, lineHeight: 22, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 25, fontWeight: '400' },
  bodySmall: { fontSize: 14, lineHeight: 21, fontWeight: '400' },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '800', letterSpacing: 1.2 },
  button: { fontSize: 16, lineHeight: 20, fontWeight: '700' },
  monoMeta: { fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 0.4 },
};

export const shadows = StyleSheet.create({
  small: Platform.select({
    ios: {
      shadowColor: '#1A2B22',
      shadowOpacity: 0.07,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
    },
    android: { elevation: 2 },
    default: {},
  }),
  medium: Platform.select({
    ios: {
      shadowColor: '#1A2B22',
      shadowOpacity: 0.10,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 8 },
    },
    android: { elevation: 5 },
    default: {},
  }),
  button: Platform.select({
    ios: {
      shadowColor: '#3AA675',
      shadowOpacity: 0.20,
      shadowRadius: 9,
      shadowOffset: { width: 0, height: 7 },
    },
    android: { elevation: 4 },
    default: {},
  }),
});

export const commonStyles = StyleSheet.create({
  screen: { flex: 1 },
  safeContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  centeredContent: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  eyebrowLine: {
    width: 28,
    height: 2,
    borderRadius: 999,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
  },
  compactCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  input: {
    width: '100%',
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 180,
    textAlignVertical: 'top',
  },
  primaryButton: {
    minHeight: 50,
    paddingHorizontal: 18,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  secondaryButton: {
    minHeight: 46,
    paddingHorizontal: 16,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 9,
  },
  chip: {
    minHeight: 28,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  horizontalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

export function createThemedStyles(colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    surfaceCard: { backgroundColor: colors.surface, borderColor: colors.border },
    alternateCard: { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
    text: { color: colors.text },
    mutedText: { color: colors.textMuted },
    primaryText: { color: colors.primaryDark },
    input: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      color: colors.text,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    primaryButtonText: { color: colors.onPrimary },
    secondaryButton: {
      backgroundColor: 'transparent',
      borderColor: colors.borderStrong,
    },
    secondaryButtonText: { color: colors.primaryDark },
    chip: { backgroundColor: colors.primaryLight },
    chipText: { color: colors.primaryDark },
    divider: { backgroundColor: colors.border },
    errorText: { color: colors.error },
    successText: { color: colors.success },
  });
}
