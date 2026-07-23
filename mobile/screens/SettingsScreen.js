import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useTheme } from '../theme';
import { commonStyles, createThemedStyles, shadows, typography } from '../styles';
import { getMe, resendVerification } from '../api';

export default function SettingsScreen({ onBack, onLogout }) {
  const { colors, mode, setMode } = useTheme();
  const themed = createThemedStyles(colors);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  useEffect(() => {
    getMe()
      .then((account) => {
        setMe(account);
        if (account.email) setEmail(account.email);
      })
      .catch((e) => setError(e.message || 'Could not load account.'))
      .finally(() => setLoading(false));
  }, []);
  async function handleResend() {
    if (!email.trim() || !email.includes('@'))
      return Alert.alert('Email needed', 'Enter the email you signed up with.');
    setSending(true);
    try {
      await resendVerification(email.trim());
      setSent(true);
    } catch (e) {
      Alert.alert('Could not send', e.message);
    } finally {
      setSending(false);
    }
  }
  const verified = me?.emailVerified;

  return (
    <ScrollView
      style={themed.screen}
      contentContainerStyle={[styles.content, commonStyles.centered]}
    >
      <View style={[commonStyles.headerRow, styles.bar]}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={[styles.backText, themed.primaryText]}>Back</Text>
        </Pressable>
        <Text style={[typography.sectionTitle, themed.text]}>Settings</Text>
        <View style={styles.backButton} />
      </View>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          {error ? <Text style={[styles.error, themed.errorText]}>{error}</Text> : null}
          <Text style={[styles.sectionLabel, themed.primaryText]}>ACCOUNT</Text>
          <View style={[commonStyles.card, themed.surfaceCard, shadows.small, styles.card]}>
            <Row
              label="Name"
              value={[me?.firstName, me?.lastName].filter(Boolean).join(' ') || '—'}
              colors={colors}
            />
            <Divider colors={colors} />
            <Row label="Username" value={me?.username || '—'} colors={colors} />
            <Divider colors={colors} />
            <Row label="Email" value={me?.email || email || '—'} colors={colors} />
            <Divider colors={colors} />
            <View style={styles.row}>
              <Text style={[styles.rowLabel, themed.mutedText]}>Email status</Text>
              <View
                style={[
                  commonStyles.chip,
                  { backgroundColor: verified ? colors.primaryLight : colors.surfaceAlt },
                ]}
              >
                <Text
                  style={{
                    color: verified ? colors.primaryDark : colors.warning,
                    fontWeight: '800',
                    fontSize: 12,
                  }}
                >
                  {verified ? 'Verified' : 'Not verified'}
                </Text>
              </View>
            </View>
          </View>
          {!verified ? (
            <>
              <Text style={[styles.sectionLabel, themed.primaryText]}>EMAIL VERIFICATION</Text>
              <View style={[commonStyles.card, themed.surfaceCard, shadows.small, styles.card]}>
                <Text style={[typography.bodySmall, themed.mutedText, styles.helpText]}>
                  Verify your email to secure your account.
                </Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={[commonStyles.input, themed.input, styles.input]}
                />
                <Pressable
                  onPress={handleResend}
                  disabled={sending}
                  style={({ pressed }) => [
                    commonStyles.primaryButton,
                    themed.primaryButton,
                    styles.button,
                    { opacity: pressed || sending ? 0.75 : 1 },
                  ]}
                >
                  {sending ? (
                    <ActivityIndicator color={colors.onPrimary} />
                  ) : (
                    <Text style={[typography.button, themed.primaryButtonText]}>
                      {sent ? 'Sent — check your inbox' : 'Resend verification email'}
                    </Text>
                  )}
                </Pressable>
              </View>
            </>
          ) : null}
          <Text style={[styles.sectionLabel, themed.primaryText]}>APPEARANCE</Text>
          <View style={[commonStyles.card, themed.surfaceCard, shadows.small, styles.card]}>
            <Text style={[typography.bodySmall, themed.mutedText, styles.helpText]}>
              Choose how Noteriety should look.
            </Text>
            <View style={styles.segment}>
              {['system', 'light', 'dark'].map((option) => {
                const active = mode === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setMode(option)}
                    style={[
                      styles.segmentBtn,
                      {
                        backgroundColor: active ? colors.primary : colors.surfaceAlt,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: active ? colors.onPrimary : colors.text,
                        fontWeight: active ? '800' : '600',
                        fontSize: 14,
                        textTransform: 'capitalize',
                      }}
                    >
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <Pressable
            onPress={onLogout}
            style={({ pressed }) => [
              commonStyles.secondaryButton,
              styles.logout,
              { borderColor: colors.error, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[styles.logoutText, themed.errorText]}>Log Out</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}
function Row({ label, value, colors }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: colors.text }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
function Divider({ colors }) {
  return <View style={[commonStyles.divider, { backgroundColor: colors.border }]} />;
}
const styles = StyleSheet.create({
  content: { paddingTop: 52, paddingHorizontal: 20, paddingBottom: 48 },
  bar: { marginBottom: 28 },
  backButton: { width: 54, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 15, fontWeight: '700' },
  sectionLabel: { ...typography.label, marginTop: 10, marginBottom: 9 },
  card: { padding: 0, marginBottom: 22, overflow: 'hidden' },
  row: {
    minHeight: 54,
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 18,
  },
  rowLabel: { fontSize: 15 },
  rowValue: { flex: 1, textAlign: 'right', fontSize: 15, fontWeight: '700' },
  helpText: { paddingHorizontal: 16, paddingTop: 16 },
  input: { margin: 16, marginBottom: 8, width: 'auto' },
  button: { margin: 16, marginTop: 8 },
  segment: { flexDirection: 'row', padding: 10, gap: 8 },
  segmentBtn: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logout: { marginTop: 4, marginBottom: 12 },
  logoutText: { fontSize: 15, fontWeight: '800' },
  error: { marginBottom: 12, fontSize: 14 },
});