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
import { forgotPassword } from '../api';

export default function ForgotPasswordScreen({ onBack }) {
  const { colors } = useTheme();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    setError('');
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

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
      style={[styles.screen, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        {sent ? (
          <>
            <Text style={[styles.heading, { color: colors.text }]}>
              Check your inbox
            </Text>
            <Text style={[styles.body, { color: colors.textMuted }]}>
              If an account exists for {email.trim()}, we've sent a link to reset
              your password. Open it on this device or your computer.
            </Text>
            <Pressable
              onPress={onBack}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: colors.primary, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[styles.buttonText, { color: colors.onPrimary }]}>
                Back to log in
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={[styles.heading, { color: colors.text }]}>
              Reset password
            </Text>
            <Text style={[styles.body, { color: colors.textMuted }]}>
              Enter the email on your account and we'll send you a reset link.
            </Text>

            {error ? (
              <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
            ) : null}

            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
            />

            <Pressable
              onPress={handleSend}
              disabled={busy}
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: colors.primary,
                  opacity: pressed || busy ? 0.7 : 1,
                },
              ]}
            >
              {busy ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={[styles.buttonText, { color: colors.onPrimary }]}>
                  Send reset link
                </Text>
              )}
            </Pressable>

            <Pressable onPress={onBack} style={styles.linkWrap}>
              <Text style={{ color: colors.textMuted, fontSize: 14 }}>
                Back to log in
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  inner: { flex: 1, justifyContent: 'center', padding: 28 },
  heading: { fontSize: 26, fontWeight: '700', textAlign: 'center' },
  body: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
    lineHeight: 21,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  button: {
    marginTop: 22,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  buttonText: { fontSize: 16, fontWeight: '700' },
  error: { fontSize: 14, textAlign: 'center', marginBottom: 10 },
  linkWrap: { marginTop: 20, alignItems: 'center' },
});
