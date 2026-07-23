import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme';

// The backend requires 8+ characters. The rest are suggestions.
export const MIN_PASSWORD_LENGTH = 8;

export function checkPassword(password) {
  return {
    length: password.length >= MIN_PASSWORD_LENGTH,
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };
}

// Only length rule blocks submission.
export function isPasswordValid(password) {
  return checkPassword(password).length;
}

function Rule({ met, label, required }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <Text
        style={{
          fontSize: 13,
          width: 18,
          color: met ? colors.success : required ? colors.error : colors.textMuted,
        }}
      >
        {met ? '✓' : '✗'}
      </Text>
      <Text
        style={{
          fontSize: 13,
          color: met ? colors.text : colors.textMuted,
          flex: 1,
        }}
      >
        {label}
        {required ? '' : '  (recommended)'}
      </Text>
    </View>
  );
}

export default function PasswordRules({ password }) {
  const { colors } = useTheme();
  if (!password) return null;

  const c = checkPassword(password);
  const strength = [c.length, c.upper, c.number, c.symbol].filter(Boolean).length;

  return (
    <View
      style={[
        styles.box,
        { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
      ]}
    >
      <View style={styles.bars}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.bar,
              {
                backgroundColor:
                  i < strength
                    ? strength <= 1
                      ? colors.error
                      : strength <= 2
                        ? colors.warning
                        : colors.success
                    : colors.border,
              },
            ]}
          />
        ))}
      </View>

      <Rule met={c.length} required label={`At least ${MIN_PASSWORD_LENGTH} characters`} />
      <Rule met={c.upper} label="An uppercase letter" />
      <Rule met={c.number} label="A number" />
      <Rule met={c.symbol} label="A symbol" />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    gap: 4,
  },
  bars: { flexDirection: 'row', gap: 5, marginBottom: 10 },
  bar: { flex: 1, height: 4, borderRadius: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});