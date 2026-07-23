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
import { commonStyles, createThemedStyles, shadows, typography } from '../styles';
import { register, saveToken } from '../api';

export default function RegisterScreen({ onRegistered, onGoToLogin }) {
  const { colors } = useTheme();
  const themed = createThemedStyles(colors);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (field, value) => setForm((cur) => ({ ...cur, [field]: value }));

  async function handleRegister() {
    setError('');
    if (!form.username.trim() || !form.password.trim() || !form.email.trim())
      return setError('Username, email, and password are required.');
    if (!form.email.includes('@')) return setError('Please enter a valid email address.');
    if (form.password.length < 8) return setError('Password must be at least 8 characters.');
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

  const inputStyle = [commonStyles.input, themed.input];
  return (
    <KeyboardAvoidingView
      style={themed.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.inner, commonStyles.centered]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.eyebrow, themed.primaryText]}>START YOUR WORKSPACE</Text>
        <Text style={[typography.pageTitle, themed.text]}>Create your account</Text>
        <Text style={[typography.body, themed.mutedText, styles.subtitle]}>
          Capture ideas, organize notes, and keep everything close at hand.
        </Text>

        <View style={[commonStyles.card, themed.surfaceCard, shadows.small, styles.formCard]}>
          {error ? <Text style={[styles.error, themed.errorText]}>{error}</Text> : null}
          <View style={styles.nameRow}>
            <View style={styles.half}>
              <Text style={[styles.label, themed.text]}>FIRST NAME</Text>
              <TextInput
                value={form.firstName}
                onChangeText={(v) => set('firstName', v)}
                placeholder="First"
                placeholderTextColor={colors.textMuted}
                style={inputStyle}
              />
            </View>
            <View style={styles.half}>
              <Text style={[styles.label, themed.text]}>LAST NAME</Text>
              <TextInput
                value={form.lastName}
                onChangeText={(v) => set('lastName', v)}
                placeholder="Last"
                placeholderTextColor={colors.textMuted}
                style={inputStyle}
              />
            </View>
          </View>
          <Text style={[styles.label, themed.text]}>EMAIL</Text>
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
          <Text style={[styles.label, themed.text]}>USERNAME</Text>
          <TextInput
            value={form.username}
            onChangeText={(v) => set('username', v)}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="username"
            placeholderTextColor={colors.textMuted}
            style={inputStyle}
          />
          <Text style={[styles.label, themed.text]}>PASSWORD</Text>
          <TextInput
            value={form.password}
            onChangeText={(v) => set('password', v)}
            secureTextEntry
            autoCapitalize="none"
            placeholder="At least 8 characters"
            placeholderTextColor={colors.textMuted}
            style={inputStyle}
          />
          <Pressable
            onPress={handleRegister}
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
              <Text style={[typography.button, themed.primaryButtonText]}>Create Account</Text>
            )}
          </Pressable>
          <Text style={[styles.note, themed.mutedText]}>We'll email you a verification link.</Text>
        </View>
        <Pressable onPress={onGoToLogin} style={styles.bottomLink}>
          <Text style={[typography.bodySmall, themed.mutedText]}>
            Already have an account? <Text style={[styles.link, themed.primaryText]}>Log in</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  inner: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 58, paddingBottom: 40 },
  eyebrow: { ...typography.label, marginBottom: 10 },
  subtitle: { marginTop: 10, marginBottom: 24 },
  formCard: { padding: 20 },
  nameRow: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  label: { marginTop: 15, marginBottom: 7, ...typography.label },
  button: { marginTop: 25 },
  note: { ...typography.meta, textAlign: 'center', marginTop: 12 },
  bottomLink: { alignSelf: 'center', marginTop: 21, padding: 6 },
  link: { fontWeight: '700', textDecorationLine: 'underline' },
  error: { marginBottom: 5, padding: 10, borderRadius: 9, fontSize: 14, textAlign: 'center' },
});