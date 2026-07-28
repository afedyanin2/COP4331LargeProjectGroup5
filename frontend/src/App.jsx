import {
  useEffect,
  useState,
} from 'react';

import {
  Route,
  Routes,
} from 'react-router-dom';

import Navbar from './components/Navigationbar';
import ProtectedRoute from './components/ProtectedRoute';

import AboutPage from './pages/AboutPage';
import ConfirmEmailPage from './pages/ConfirmEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import NoteTakingPage from './pages/NoteTakingPage';
import NotFoundPage from './pages/NotFoundPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import SettingsPage from './pages/SettingsPage';
import SignupPage from './pages/SignUpPage';
import VerifyEmailPage from './pages/VerifyEmailPage';

import './App.css';

function clearAuthenticationStorage() {
  localStorage.removeItem(
    'noterietyLoggedIn'
  );

  localStorage.removeItem(
    'noterietyToken'
  );

  localStorage.removeItem(
    'noterietyUserName'
  );

  localStorage.removeItem(
    'noterietyUserEmail'
  );

  localStorage.removeItem(
    'noterietyFirstName'
  );

  localStorage.removeItem(
    'noterietyLastName'
  );

  localStorage.removeItem(
    'noterietyEmailVerified'
  );
}

function App() {
  /*
   * A user counts as logged in only when:
   *
   * 1. The logged-in flag exists.
   * 2. A JWT exists.
   * 3. The email has been verified.
   */
  const [isLoggedIn, setIsLoggedIn] =
    useState(
      () =>
        localStorage.getItem(
          'noterietyLoggedIn'
        ) === 'true' &&
        Boolean(
          localStorage.getItem(
            'noterietyToken'
          )
        ) &&
        localStorage.getItem(
          'noterietyEmailVerified'
        ) === 'true'
    );

  const [theme, setTheme] =
    useState(
      () =>
        localStorage.getItem(
          'noterietyTheme'
        ) || 'light'
    );

  useEffect(() => {
    document.documentElement.setAttribute(
      'data-theme',
      theme
    );

    localStorage.setItem(
      'noterietyTheme',
      theme
    );
  }, [theme]);

  function handleThemeChange(newTheme) {
    setTheme(
      newTheme === 'dark'
        ? 'dark'
        : 'light'
    );
  }

  function handleLogin() {
    localStorage.setItem(
      'noterietyLoggedIn',
      'true'
    );

    setIsLoggedIn(true);
  }

  function handleLogout() {
    clearAuthenticationStorage();
    setIsLoggedIn(false);
  }

  return (
    <div className="app">
      <Navbar
        isLoggedIn={isLoggedIn}
        onLogout={handleLogout}
        theme={theme}
      />

      <main className="main-content">
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                isLoggedIn={isLoggedIn}
              />
            }
          />

          <Route
            path="/about"
            element={
              <AboutPage
                isLoggedIn={isLoggedIn}
              />
            }
          />

          <Route
            path="/login"
            element={
              <LoginPage
                isLoggedIn={isLoggedIn}
                onLogin={handleLogin}
              />
            }
          />

          <Route
            path="/signup"
            element={
              <SignupPage
                isLoggedIn={isLoggedIn}
              />
            }
          />

          <Route
            path="/confirm-email"
            element={
              <ConfirmEmailPage />
            }
          />

          <Route
            path="/verify-email"
            element={
              <VerifyEmailPage />
            }
          />

          <Route
            path="/notes"
            element={
              <ProtectedRoute
                isLoggedIn={isLoggedIn}
              >
                <NoteTakingPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute
                isLoggedIn={isLoggedIn}
              >
                <SettingsPage
                  onLogout={handleLogout}
                  theme={theme}
                  onThemeChange={
                    handleThemeChange
                  }
                />
              </ProtectedRoute>
            }
          />

          <Route
            path="/forgot-password"
            element={
              <ForgotPasswordPage />
            }
          />

          <Route
            path="/reset-password"
            element={
              <ResetPasswordPage />
            }
          />

          <Route
            path="*"
            element={
              <NotFoundPage />
            }
          />
        </Routes>
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <span />

          <p>
            Simple note-taking for everyday ideas.
          </p>

          <span className="footer-copyright">
            © 2026 Noteriety
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;