import { useState } from 'react';
import { Route, Routes } from 'react-router-dom';

import Navbar from './components/Navigationbar';
import ProtectedRoute from './components/ProtectedRoute';

import AboutPage from './pages/AboutPage';
import ConfirmEmailPage from './pages/ConfirmEmailPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import NoteTakingPage from './pages/NoteTakingPage';
import NotFoundPage from './pages/NotFoundPage';
import SettingsPage from './pages/SettingsPage';
import SignupPage from './pages/SignUpPage';
import VerifyEmailPage from './pages/VerifyEmailPage';

import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => localStorage.getItem('noterietyLoggedIn') === 'true'
  );

  function handleLogin(email) {
    localStorage.setItem('noterietyLoggedIn', 'true');
    localStorage.setItem('noterietyUserEmail', email);
    setIsLoggedIn(true);
  }

  function handleLogout() {
    localStorage.removeItem('noterietyLoggedIn');
    setIsLoggedIn(false);
  }

  return (
    <div className="app">
      <Navbar
        isLoggedIn={isLoggedIn}
        onLogout={handleLogout}
      />

      <main className="main-content">
        <Routes>
          <Route
            path="/"
            element={<HomePage isLoggedIn={isLoggedIn} />}
          />

          <Route
            path="/about"
            element={<AboutPage isLoggedIn={isLoggedIn} />}
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
            element={<SignupPage isLoggedIn={isLoggedIn} />}
          />

          <Route
            path="/confirm-email"
            element={<ConfirmEmailPage />}
          />

          <Route
            path="/verify-email"
            element={<VerifyEmailPage />}
          />

          <Route
            path="/notes"
            element={
              <ProtectedRoute isLoggedIn={isLoggedIn}>
                <NoteTakingPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute isLoggedIn={isLoggedIn}>
                <SettingsPage onLogout={handleLogout} />
              </ProtectedRoute>
            }
          />

          <Route
            path="*"
            element={<NotFoundPage />}
          />
        </Routes>
      </main>

      <footer className="footer">
        <p>© 2026 Noteriety</p>
      </footer>
    </div>
  );
}

export default App;