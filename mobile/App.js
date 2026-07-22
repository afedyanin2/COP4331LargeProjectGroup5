import { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from './theme';
import { getToken, clearToken } from './api';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import NotesScreen from './screens/NotesScreen';
import NoteEditorScreen from './screens/NoteEditorScreen';

function Root() {
  const { colors, isDark } = useTheme();

  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  // Which auth screen when logged out: 'login' | 'register'
  const [authView, setAuthView] = useState('login');

  // Which screen when logged in: 'list' | 'editor'
  const [view, setView] = useState('list');
  const [editingNote, setEditingNote] = useState(null);

  // Bumping this remounts NotesScreen so it refetches after a save.
  const [refreshKey, setRefreshKey] = useState(0);

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
    setAuthView('login');
    setView('list');
  }

  function handleEditorDone() {
    setView('list');
    setEditingNote(null);
    setRefreshKey((k) => k + 1);
  }

  if (checking) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </View>
    );
  }

  if (!user) {
    return (
      <>
        {authView === 'login' ? (
          <LoginScreen
            onLoggedIn={setUser}
            onGoToRegister={() => setAuthView('register')}
          />
        ) : (
          <RegisterScreen
            onRegistered={setUser}
            onGoToLogin={() => setAuthView('login')}
          />
        )}
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </>
    );
  }

  return (
    <>
      {view === 'list' ? (
        <NotesScreen
          key={refreshKey}
          onOpenNote={(note) => {
            setEditingNote(note);
            setView('editor');
          }}
          onNewNote={() => {
            setEditingNote(null);
            setView('editor');
          }}
          onLogout={handleLogout}
        />
      ) : (
        <NoteEditorScreen
          note={editingNote}
          onDone={handleEditorDone}
          onCancel={() => {
            setView('list');
            setEditingNote(null);
          }}
        />
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
