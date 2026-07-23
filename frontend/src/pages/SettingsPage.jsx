import {
  useEffect,
  useState,
} from 'react';

import {
  useNavigate,
} from 'react-router-dom';

/*
 * Safely reads JSON responses.
 *
 * This gives a useful error when the server returns
 * an empty response or HTML instead of JSON.
 */
async function readJsonResponse(response) {
  const responseText =
    await response.text();

  if (!responseText) {
    throw new Error(
      `Server returned an empty response (${response.status}).`
    );
  }

  try {
    return JSON.parse(responseText);
  } catch {
    throw new Error(
      `Server returned an invalid response (${response.status}).`
    );
  }
}

function SettingsPage({
  onLogout,

  /*
   * Optional callback for updating the username
   * displayed elsewhere in the application.
   */
  onUsernameChange,
}) {
  const navigate = useNavigate();

  /*
   * The page no longer trusts localStorage for account data.
   *
   * Username and email are loaded from MongoDB through /api/me.
   */
  const [username, setUsername] =
    useState('');

  const [email, setEmail] =
    useState('');

  const [
    emailVerified,
    setEmailVerified,
  ] = useState(false);

  const [message, setMessage] =
    useState('');

  const [error, setError] =
    useState('');

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  /*
   * Saves the user's theme preference locally.
   *
   * Theme preference is device/browser-specific,
   * so it does not need to be stored in MongoDB.
   */
  const [theme, setTheme] =
    useState(() => {
      return (
        localStorage.getItem(
          'noterietyTheme'
        ) || 'light'
      );
    });

  /*
   * Apply the theme whenever it changes.
   */
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

  /*
   * Load the real account information from MongoDB.
   *
   * This fixes the problem where the email field
   * incorrectly showed an old username from localStorage.
   */
  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      setError('');
      setIsLoading(true);

      const token =
        localStorage.getItem(
          'noterietyToken'
        );

      if (!token) {
        setError(
          'Your login session is missing. Please log in again.'
        );

        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(
          '/api/me',
          {
            method: 'GET',

            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

        const data =
          await readJsonResponse(
            response
          );

        if (
          !response.ok ||
          data.error
        ) {
          throw new Error(
            data.error ||
              'Unable to load account information.'
          );
        }

        if (!isMounted) {
          return;
        }

        setUsername(
          data.username || ''
        );

        setEmail(
          data.email || ''
        );

        setEmailVerified(
          Boolean(
            data.emailVerified
          )
        );

        /*
         * Correct any stale localStorage values
         * using the real MongoDB values.
         */
        localStorage.setItem(
          'noterietyUserName',
          data.username || ''
        );

        localStorage.setItem(
          'noterietyUserEmail',
          data.email || ''
        );

        localStorage.setItem(
          'noterietyEmailVerified',
          String(
            Boolean(
              data.emailVerified
            )
          )
        );
      } catch (requestError) {
        console.error(
          'Settings load failed:',
          requestError
        );

        if (isMounted) {
          setError(
            requestError.message ||
              'Unable to load account information.'
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  /*
   * Save the new username to MongoDB.
   *
   * The email is intentionally not editable here.
   * Changing an email should require another
   * email-verification process.
   */
  async function handleSubmit(event) {
    event.preventDefault();

    setMessage('');
    setError('');

    const normalizedUsername =
      username.trim();

    if (!normalizedUsername) {
      setError(
        'Username cannot be empty.'
      );
      return;
    }

    const token =
      localStorage.getItem(
        'noterietyToken'
      );

    if (!token) {
      setError(
        'Your login session is missing. Please log in again.'
      );
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(
        '/api/profile',
        {
          method: 'PUT',

          headers: {
            'Content-Type':
              'application/json',

            Authorization:
              `Bearer ${token}`,
          },

          body: JSON.stringify({
            username:
              normalizedUsername,
          }),
        }
      );

      const data =
        await readJsonResponse(
          response
        );

      if (
        !response.ok ||
        data.error
      ) {
        throw new Error(
          data.error ||
            'Unable to update username.'
        );
      }

      setUsername(data.username);

      /*
       * Keep localStorage synchronized with MongoDB.
       */
      localStorage.setItem(
        'noterietyUserName',
        data.username
      );

      localStorage.setItem(
        'noterietyUserEmail',
        data.email || email
      );

      /*
       * Update App.jsx state immediately when
       * the callback has been supplied.
       */
      if (onUsernameChange) {
        onUsernameChange(
          data.username
        );
      }

      setMessage(
        'Your username was updated.'
      );
    } catch (requestError) {
      console.error(
        'Settings update failed:',
        requestError
      );

      setError(
        requestError.message ||
          'Unable to update username.'
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleThemeChange(event) {
    setTheme(
      event.target.checked
        ? 'dark'
        : 'light'
    );
  }

  function handleLogout() {
    onLogout();
    navigate('/');
  }

  if (isLoading) {
    return (
      <section className="page form-page">
        <h1>Settings</h1>
        <p>Loading account...</p>
      </section>
    );
  }

  return (
    <section className="page form-page">
      <h1>Settings</h1>

      <form
        className="basic-form"
        onSubmit={handleSubmit}
      >
        {error && (
          <p className="error-message">
            {error}
          </p>
        )}

        {message && (
          <p className="success-message">
            {message}
          </p>
        )}

        <label htmlFor="settings-username">
          Username
        </label>

        <input
          id="settings-username"
          type="text"
          value={username}
          onChange={(event) =>
            setUsername(
              event.target.value
            )
          }
          autoComplete="username"
          required
        />

        <label htmlFor="settings-email">
          Email
        </label>

        <input
          id="settings-email"
          type="email"
          value={email}
          readOnly
        />

        <p className="settings-detail">
          Email status:{' '}
          <strong>
            {emailVerified
              ? 'Verified'
              : 'Not verified'}
          </strong>
        </p>

        <button
          type="submit"
          disabled={isSaving}
        >
          {isSaving
            ? 'Saving...'
            : 'Save Username'}
        </button>
      </form>

      <section className="content-section">
        <h2>Appearance</h2>

        <label
          htmlFor="dark-mode-toggle"
          className="theme-setting"
        >
          <input
            id="dark-mode-toggle"
            type="checkbox"
            checked={
              theme === 'dark'
            }
            onChange={
              handleThemeChange
            }
          />

          Use dark mode
        </label>
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
