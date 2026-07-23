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
  onUsernameChange,
  theme,
  onThemeChange,
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

  const [
    isSendingVerification,
    setIsSendingVerification,
  ] = useState(false);

  const [
    verificationMessage,
    setVerificationMessage,
  ] = useState('');

  const [
    verificationError,
    setVerificationError,
  ] = useState('');

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
  
  function handleThemeToggle() {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    onThemeChange(newTheme);
  }

  async function handleSendVerificationLink() {
    setVerificationMessage('');
    setVerificationError('');

    /*
    * The email should already have been loaded from
    * MongoDB through GET /api/me.
    */
    const normalizedEmail =
      email.trim().toLowerCase();

    if (!normalizedEmail) {
      setVerificationError(
        'Your account does not have an email address.'
      );
      return;
    }

    if (emailVerified) {
      setVerificationMessage(
        'Your email is already verified.'
      );
      return;
    }

    setIsSendingVerification(true);

    try {
      /*
      * Uses the existing verification resend API.
      * No new backend route is required.
      */
      const response = await fetch(
        '/api/resend-verification',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            email: normalizedEmail,
          }),
        }
      );

      const responseText =
        await response.text();

      if (!responseText) {
        throw new Error(
          `Server returned an empty response (${response.status}).`
        );
      }

      let data;

      try {
        data =
          JSON.parse(responseText);
      } catch {
        throw new Error(
          `Server returned an invalid response (${response.status}).`
        );
      }

      if (
        !response.ok ||
        data.error
      ) {
        throw new Error(
          data.error ||
            'Unable to send verification link.'
        );
      }

      setVerificationMessage(
        `A verification link was sent to ${normalizedEmail}.`
      );
    } catch (requestError) {
      console.error(
        'Verification email failed:',
        requestError
      );

      setVerificationError(
        requestError.message ||
          'Unable to send verification link.'
      );
    } finally {
      setIsSendingVerification(false);
    }
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

        <div className="email-verification-setting">
          <p className="settings-detail">
            Email status:{' '}

            <strong>
              {emailVerified
                ? 'Verified'
                : 'Not verified'}
            </strong>
          </p>

          {verificationError && (
            <p className="error-message">
              {verificationError}
            </p>
          )}

          {verificationMessage && (
            <p className="success-message">
              {verificationMessage}
            </p>
          )}

          {!emailVerified && (
            <button
              type="button"
              onClick={
                handleSendVerificationLink
              }
              disabled={
                isSendingVerification ||
                !email
              }
            >
              {isSendingVerification
                ? 'Sending Link...'
                : 'Send Verification Link'}
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={isSaving}
        >
          {isSaving
            ? 'Saving...'
            : 'Save Username'}
        </button>
      </form>
      
      
      <section className="content-section appearance-settings">
        <h2>Appearance</h2>
        
        <div className="mobile-theme-control">
          <span className="mobile-theme-label">
            {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </span>
            
            <button type="button"
            className={`mobile-theme-toggle ${
              theme === 'dark' ? 'is-dark' : ''
            }`}
            role="switch"
            aria-checked={theme === 'dark'}
            aria-label="Toggle theme"
            onClick={handleThemeToggle}>
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