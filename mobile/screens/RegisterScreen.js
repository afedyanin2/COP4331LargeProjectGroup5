import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { useTheme } from '../theme';
import { Logo, Eyebrow, Display } from '../components/Brand';
import PasswordRules, {
  isPasswordValid,
  MIN_PASSWORD_LENGTH,
} from '../components/PasswordRules';
import { register, saveToken } from '../api';

export default function RegisterScreen({ onRegistered, onGoToLogin }) {
  const { colors } = useTheme();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function set(field, value) {
    setForm((cur) => ({ ...cur, [field]: value }));
  }

  async function handleRegister() {
    setError('');

    if (!form.username.trim() || !form.password.trim() || !form.email.trim()) {
      setError('Username, email, and password are required.');
      return;
    }
    if (!form.email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!isPasswordValid(form.password)) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setBusy(true);
    try {
      const data = await register({
        username: form.username.trim(),
        password: form.password,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
      });
      await saveToken(data.token);
      onRegistered(data);
    } catch (e) {
      setError(e.message || 'Could not create account.');
    } finally {
      setBusy(false);
    }
  }

  const inputStyle = [
    styles.input,
    {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      color: colors.text,
    },
  ];

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Logo />
        <Eyebrow style={{ marginTop: 26 }}>GET STARTED</Eyebrow>
        <Display size={30} style={{ marginTop: 10, marginBottom: 6 }}>
          Create your{'\n'}account.
        </Display>

        {error ? (
          <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
        ) : null}

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={[styles.label, { color: colors.text }]}>First name</Text>
            <TextInput
              value={form.firstName}
              onChangeText={(v) => set('firstName', v)}
              placeholder="First"
              placeholderTextColor={colors.textMuted}
              style={inputStyle}
            />
          </View>
          <View style={styles.half}>
            <Text style={[styles.label, { color: colors.text }]}>Last name</Text>
            <TextInput
              value={form.lastName}
              onChangeText={(v) => set('lastName', v)}
              placeholder="Last"
              placeholderTextColor={colors.textMuted}
              style={inputStyle}
            />
          </View>
        </View>

        <Text style={[styles.label, { color: colors.text }]}>Email</Text>
        <TextInput
          value={form.email}
          onChangeText={(v) => set('email', v)}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="you@example.com"
          placeholderTextColor={colors.textMuted}
          style={inputStyle}
        />

        <Text style={[styles.label, { color: colors.text }]}>Username</Text>
        <TextInput
          value={form.username}
          onChangeText={(v) => set('username', v)}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="username"
          placeholderTextColor={colors.textMuted}
          style={inputStyle}
        />

        <Text style={[styles.label, { color: colors.text }]}>Password</Text>
        <TextInput
          value={form.password}
          onChangeText={(v) => set('password', v)}
          secureTextEntry
          autoCapitalize="none"
          placeholder="At least 6 characters"
          placeholderTextColor={colors.textMuted}
          style={inputStyle}
        />

        <PasswordRules password={form.password} />

        <Pressable
          onPress={handleRegister}
          disabled={busy}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.primary, opacity: pressed || busy ? 0.7 : 1 },
          ]}
        >
          {busy ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={[styles.buttonText, { color: colors.onPrimary }]}>
              Create Account
            </Text>
          )}
        </Pressable>

        <Text style={[styles.note, { color: colors.textMuted }]}>
          We'll email you a verification link.
        </Text>

        <Pressable onPress={onGoToLogin} style={styles.linkWrap}>
          <Text style={[styles.link, { color: colors.textMuted }]}>
            Already have an account?{' '}
            <Text style={{ color: colors.primary }}>Log in</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  inner: { padding: 28, paddingTop: 70, paddingBottom: 40 },
  brand: { fontSize: 30, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 15, textAlign: 'center', marginTop: 6, marginBottom: 18 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  button: {
    marginTop: 26,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  buttonText: { fontSize: 16, fontWeight: '700' },
  error: { fontSize: 14, textAlign: 'center', marginBottom: 4 },
  note: { fontSize: 12, textAlign: 'center', marginTop: 12 },
  linkWrap: { marginTop: 20, alignItems: 'center' },
  link: { fontSize: 14 },
});