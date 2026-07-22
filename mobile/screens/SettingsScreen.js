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
import { getMe, getEmail, resendVerification } from '../api';

export default function SettingsScreen({ onBack, onLogout }) {
  const { colors, mode, setMode } = useTheme();

  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    getMe()
      .then(setMe)
      .catch((e) => setError(e.message || 'Could not load account.'))
      .finally(() => setLoading(false));

    getEmail().then((saved) => {
      if (saved) setEmail(saved);
    });
  }, []);

  async function handleResend() {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Email needed', 'Enter the email you signed up with.');
      return;
    }
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
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.bar}>
        <Pressable onPress={onBack} hitSlop={10}>
          <Text style={{ color: colors.primary, fontSize: 16 }}>Back</Text>
        </Pressable>
        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>
          Settings
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          {error ? (
            <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
          ) : null}

          {/* Account */}
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            ACCOUNT
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Row
              label="Name"
              value={
                [me?.firstName, me?.lastName].filter(Boolean).join(' ') || '—'
              }
              colors={colors}
            />
            <Divider colors={colors} />
            <Row label="Username" value={me?.username || '—'} colors={colors} />
            <Divider colors={colors} />
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.textMuted }]}>
                Email status
              </Text>
              <Text
                style={{
                  color: verified ? colors.success : colors.warning,
                  fontWeight: '700',
                  fontSize: 15,
                }}
              >
                {verified ? 'Verified' : 'Not verified'}
              </Text>
            </View>
          </View>

          {/* Resend verification — only when unverified */}
          {!verified && (
            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.helpText, { color: colors.textMuted }]}>
                Verify your email to secure your account.
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
              />
              <Pressable
                onPress={handleResend}
                disabled={sending}
                style={({ pressed }) => [
                  styles.btn,
                  {
                    backgroundColor: colors.primary,
                    opacity: pressed || sending ? 0.7 : 1,
                  },
                ]}
              >
                {sending ? (
                  <ActivityIndicator color={colors.onPrimary} />
                ) : (
                  <Text style={{ color: colors.onPrimary, fontWeight: '700' }}>
                    {sent ? 'Sent — check your inbox' : 'Resend verification email'}
                  </Text>
                )}
              </Pressable>
            </View>
          )}

          {/* Appearance */}
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            APPEARANCE
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
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
                        backgroundColor: active ? colors.primary : 'transparent',
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: active ? colors.onPrimary : colors.text,
                        fontWeight: active ? '700' : '500',
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
              styles.logout,
              { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={{ color: colors.error, fontWeight: '700', fontSize: 15 }}>
              Log Out
            </Text>
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
      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>
        {value}
      </Text>
    </View>
  );
}

function Divider({ colors }) {
  return <View style={{ height: 1, backgroundColor: colors.border }} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 50 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 8,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLabel: { fontSize: 15 },
  helpText: { fontSize: 14, paddingHorizontal: 16, paddingTop: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    margin: 16,
    marginBottom: 8,
  },
  btn: {
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
    marginTop: 8,
    minHeight: 46,
  },
  segment: { flexDirection: 'row', padding: 8, gap: 8 },
  segmentBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  logout: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  error: { fontSize: 14, marginBottom: 12 },
});
