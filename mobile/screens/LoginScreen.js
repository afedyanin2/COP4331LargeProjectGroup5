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
import { commonStyles, createThemedStyles, shadows, spacing, typography } from '../styles';
import { login, saveToken } from '../api';

export default function LoginScreen({ onLoggedIn, onGoToRegister, onForgotPassword }) {
  const { colors } = useTheme();
  const themed = createThemedStyles(colors);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleLogin() {
    setError('');
    if (!username.trim() || !password.trim())
      return setError('Please enter your username and password.');
    setBusy(true);
    try {
      const data = await login(username.trim(), password);
      await saveToken(data.token);
      onLoggedIn(data);
    } catch (e) {
      setError(e.message || 'Could not log in. Try again.');
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
        <View style={[styles.brandMark, themed.alternateCard, shadows.small]}>
          <Text style={[styles.brandMarkText, themed.primaryText]}>N</Text>
        </View>
        <Text style={[styles.brand, themed.text]}>Noteriety</Text>
        <Text style={[styles.subtitle, themed.mutedText]}>
          A calmer place for your busiest ideas.
        </Text>

        <View style={[commonStyles.card, themed.surfaceCard, shadows.small, styles.formCard]}>
          <Text style={[typography.sectionTitle, themed.text]}>Welcome back</Text>
          <Text style={[typography.bodySmall, themed.mutedText, styles.helper]}>
            Sign in to continue to your notes.
          </Text>
          {error ? <Text style={[styles.error, themed.errorText]}>{error}</Text> : null}

          <Text style={[styles.label, themed.text]}>USERNAME</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="username"
            placeholderTextColor={colors.textMuted}
            style={[commonStyles.input, themed.input]}
          />
          <Text style={[styles.label, themed.text]}>PASSWORD</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            placeholder="password"
            placeholderTextColor={colors.textMuted}
            style={[commonStyles.input, themed.input]}
          />

          <Pressable
            onPress={handleLogin}
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
              <Text style={[typography.button, themed.primaryButtonText]}>Log In</Text>
            )}
          </Pressable>
          <Pressable onPress={onForgotPassword} style={styles.linkButton}>
            <Text style={[styles.link, themed.primaryText]}>Forgot password?</Text>
          </Pressable>
        </View>

        <Pressable onPress={onGoToRegister} style={styles.bottomLink}>
          <Text style={[typography.bodySmall, themed.mutedText]}>
            Don't have an account? <Text style={[styles.link, themed.primaryText]}>Sign up</Text>
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 22, paddingVertical: 38 },
  brandMark: {
    width: 66,
    height: 66,
    borderWidth: 1,
    borderRadius: 18,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkText: { fontSize: 31, fontWeight: '800' },
  brand: {
    marginTop: 14,
    fontSize: 34,
    lineHeight: 39,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.7,
  },
  subtitle: { marginTop: 7, marginBottom: 28, textAlign: 'center', ...typography.bodySmall },
  formCard: { padding: 22 },
  helper: { marginTop: 6, marginBottom: 10 },
  label: { marginTop: 16, marginBottom: 7, ...typography.label },
  button: { marginTop: 24 },
  linkButton: { alignSelf: 'center', marginTop: 17, padding: 6 },
  bottomLink: { alignSelf: 'center', marginTop: 21, padding: 6 },
  link: { fontWeight: '700', textDecorationLine: 'underline' },
  error: { marginTop: 12, padding: 10, borderRadius: 9, fontSize: 14, textAlign: 'center' },
});