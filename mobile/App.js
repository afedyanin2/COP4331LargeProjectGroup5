import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from './theme';
import { getToken, clearToken } from './api';
import LoginScreen from './screens/LoginScreen';

// Temporary placeholder — replaced by the real notes list next.
function NotesPlaceholder({ user, onLogout }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700' }}>
        Logged in{user?.firstName ? `, ${user.firstName}` : ''}
      </Text>
      <Text style={{ color: colors.textMuted, marginTop: 8 }}>
        Notes list goes here.
      </Text>
      <Pressable
        onPress={onLogout}
        style={[styles.btn, { backgroundColor: colors.primary }]}
      >
        <Text style={{ color: colors.onPrimary, fontWeight: '700' }}>Log Out</Text>
      </Pressable>
    </View>
  );
}

function Root() {
  const { colors, isDark } = useTheme();
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  // On launch, see if a token is already stored (stay logged in).
  useEffect(() => {
    getToken()
      .then((t) => {
        if (t) setUser({});
      })
      .finally(() => setChecking(false));
  }, []);

  async function handleLogout() {
    await clearToken();
    setUser(null);
  }

  if (checking) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </View>
    );
  }

  return (
    <>
      {user ? (
        <NotesPlaceholder user={user} onLogout={handleLogout} />
      ) : (
        <LoginScreen onLoggedIn={setUser} onGoToRegister={() => {}} />
      )}
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Root />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  btn: { marginTop: 24, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
});
