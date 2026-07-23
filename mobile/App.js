import { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from './theme';
import { getToken, clearToken } from './api';
import SplashScreen from './screens/SplashScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import NotesScreen from './screens/NotesScreen';
import NoteEditorScreen from './screens/NoteEditorScreen';
import SettingsScreen from './screens/SettingsScreen';

const SPLASH_MS = 1400;

function Root() {
  const { isDark } = useTheme();

  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  // Logged out: 'login' | 'register' | 'forgot'
  const [authView, setAuthView] = useState('login');

  // Logged in: 'list' | 'editor' | 'settings'
  const [view, setView] = useState('list');
  const [editingNote, setEditingNote] = useState(null);

  // Bumping this remounts NotesScreen so it refetches after a save.
  const [refreshKey, setRefreshKey] = useState(0);

  // Check for a stored token, holding the splash for a minimum beat.
  useEffect(() => {
    const started = Date.now();
    getToken()
      .then((t) => {
        if (t) setUser({});
      })
      .finally(() => {
        const elapsed = Date.now() - started;
        setTimeout(() => setBooting(false), Math.max(0, SPLASH_MS - elapsed));
      });
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

  const bar = <StatusBar style={isDark ? 'light' : 'dark'} />;

  if (booting) {
    return (
      <>
        <SplashScreen />
        {bar}
      </>
    );
  }

  // ---- Logged out ----
  if (!user) {
    return (
      <>
        {authView === 'register' ? (
          <RegisterScreen
            onRegistered={(data) => setUser(data || {})}
            onGoToLogin={() => setAuthView('login')}
          />
        ) : authView === 'forgot' ? (
          <ForgotPasswordScreen onBack={() => setAuthView('login')} />
        ) : (
          <LoginScreen
            onLoggedIn={(data) => setUser(data || {})}
            onGoToRegister={() => setAuthView('register')}
            onForgotPassword={() => setAuthView('forgot')}
          />
        )}
        {bar}
      </>
    );
  }

  // ---- Logged in ----
  return (
    <>
      {view === 'editor' ? (
        <NoteEditorScreen
          note={editingNote}
          onDone={handleEditorDone}
          onCancel={() => {
            setView('list');
            setEditingNote(null);
          }}
        />
      ) : view === 'settings' ? (
        <SettingsScreen onBack={() => setView('list')} onLogout={handleLogout} />
      ) : (
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
          onOpenSettings={() => setView('settings')}
        />
      )}
      {bar}
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