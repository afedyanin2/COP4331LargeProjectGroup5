import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function SettingsPage({
  onLogout,
  theme,
  onThemeChange
}) {
  const navigate = useNavigate();

  const [name, setName] = useState(
    () => localStorage.getItem('noterietyUserName') || ''
  );

  const [email, setEmail] = useState(
    () => localStorage.getItem('noterietyUserEmail') || ''
  );

  const [message, setMessage] = useState('');

  function handleSubmit(event) {
    event.preventDefault();

    localStorage.setItem('noterietyUserName', name.trim());
    localStorage.setItem('noterietyUserEmail', email.trim());

    setMessage('Your settings were saved.');
  }

  function handleThemeToggle() {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    onThemeChange(newTheme);
  }

  function handleLogout() {
    onLogout();
    navigate('/');
  }

  const isDarkMode = theme === 'dark';

  return (
    <section className="page form-page">
      <h1>Settings</h1>

      <form className="basic-form" onSubmit={handleSubmit}>
        {message && (
          <p className="success-message">
            {message}
          </p>
        )}

        <label htmlFor="settings-name">Name</label>
        <input
          id="settings-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

        <label htmlFor="settings-email">Email</label>
        <input
          id="settings-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <button type="submit">
          Save Settings
        </button>
      </form>

      <section className="content-section appearance-settings">
        <h2>Appearance</h2>

        <div className="mobile-theme-control">
          <span className="mobile-theme-label">
            {isDarkMode ? 'Dark Mode' : 'Light Mode'}
          </span>

          <button
            type="button"
            className={`mobile-theme-toggle ${
              isDarkMode ? 'is-dark' : ''
            }`}
            role="switch"
            aria-checked={isDarkMode}
            aria-label="Toggle theme"
            onClick={handleThemeToggle}
          >
            <span className="mobile-theme-toggle-thumb" />
          </button>
        </div>
      </section>

      <section className="content-section">
        <h2>Account</h2>

        <button
          type="button"
          className="delete-button"
          onClick={handleLogout}
        >
          Log Out
        </button>
      </section>
    </section>
  );
}

export default SettingsPage;
