import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../theme';
import { commonStyles, createThemedStyles, shadows, typography } from '../styles';
import { forgotPassword } from '../api';

export default function ForgotPasswordScreen({ onBack }) {
  const { colors } = useTheme();
  const themed = createThemedStyles(colors);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    setError('');
    if (!email.trim() || !email.includes('@'))
      return setError('Please enter a valid email address.');
    setBusy(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (e) {
      setError(e.message || 'Could not send reset email.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={themed.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.inner, commonStyles.centered]}>
        <View style={[commonStyles.card, themed.surfaceCard, shadows.small, styles.card]}>
          <View style={[styles.icon, themed.alternateCard]}>
            <Text style={[styles.iconText, themed.primaryText]}>{sent ? '✓' : '?'}</Text>
          </View>
          <Text style={[typography.pageTitle, themed.text, styles.heading]}>
            {sent ? 'Check your inbox' : 'Reset password'}
          </Text>
          <Text style={[typography.body, themed.mutedText, styles.body]}>
            {sent
              ? `If an account exists for ${email.trim()}, we've sent a reset link.`
              : "Enter the email on your account and we'll send you a reset link."}
          </Text>
          {!sent && error ? <Text style={[styles.error, themed.errorText]}>{error}</Text> : null}
          {!sent ? (
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={[commonStyles.input, themed.input]}
            />
          ) : null}
          <Pressable
            onPress={sent ? onBack : handleSend}
            disabled={busy}
            style={({ pressed }) => [
              commonStyles.primaryButton,
              themed.primaryButton,
              shadows.button,
              styles.button,
              { opacity: pressed || busy ? 0.75 : 1 },
            ]}
          >
            {busy ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={[typography.button, themed.primaryButtonText]}>
                {sent ? 'Back to log in' : 'Send reset link'}
              </Text>
            )}
          </Pressable>
          {!sent ? (
            <Pressable onPress={onBack} style={styles.backLink}>
              <Text style={[styles.link, themed.mutedText]}>Back to log in</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 22, paddingVertical: 36 },
  card: { padding: 23 },
  icon: {
    width: 58,
    height: 58,
    borderRadius: 16,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  iconText: { fontSize: 27, fontWeight: '800' },
  heading: { textAlign: 'center' },
  body: { textAlign: 'center', marginTop: 10, marginBottom: 22 },
  button: { marginTop: 22 },
  backLink: { alignSelf: 'center', marginTop: 16, padding: 6 },
  link: { fontSize: 14, fontWeight: '600' },
  error: { marginBottom: 12, textAlign: 'center', fontSize: 14 },
});