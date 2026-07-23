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

  // Check for a stored token, but hold the splash for a minimum beat
  // so it doesn't flash by on fast devices.
  useEffect(() => {
    const started = Date.now();
    
    async function restoreSession() {
      try {
        const token = await getToken();

        if (token) {
          const account = await getMe();
          setUser(account);
        }
      } catch {
        await clearToken();
        setUser(null);
      } finally {
        const elapsed = Date.now() - started;
        const wait = Math.max(0, SPLASH_MS - elapsed);

        setTimeout(() => {
          setBooting(false);
        }, wait);
      }
    }
    
    getToken()
      .then((t) => {
        if (t) setUser({});
      })
      .finally(() => {
        const elapsed = Date.now() - started;
        const wait = Math.max(0, SPLASH_MS - elapsed);
        setTimeout(() => setBooting(false), wait);
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

  if (!user) {
    return (
      <>
        {authView === 'login' && (
          <LoginScreen
            onLoggedIn={setUser}
            onGoToRegister={() => setAuthView('register')}
            onForgotPassword={() => setAuthView('forgot')}
          />
        )}
        {authView === 'register' && (
          <RegisterScreen
            onRegistered={setUser}
            onGoToLogin={() => setAuthView('login')}
          />
        )}
        {authView === 'forgot' && (
          <ForgotPasswordScreen onBack={() => setAuthView('login')} />
        )}
        {bar}
      </>
    );
  }

  return (
    <>
      {view === 'list' && (
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

      {view === 'editor' && (
        <NoteEditorScreen
          note={editingNote}
          onDone={handleEditorDone}
          onCancel={() => {
            setView('list');
            setEditingNote(null);
          }}
        />
      )}

      {view === 'settings' && (
        <SettingsScreen onBack={() => setView('list')} onLogout={handleLogout} />
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
