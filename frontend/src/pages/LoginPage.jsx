import { useState } from 'react';
import {
  Link,
  Navigate,
  useNavigate,
} from 'react-router-dom';

/*
 * Safely handles empty and invalid server responses.
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

function LoginPage({
  isLoggedIn,
  onLogin,
}) {
  const navigate = useNavigate();

  const [formData, setFormData] =
    useState({
      username: '',
      password: '',
    });

  const [error, setError] =
    useState('');

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  if (isLoggedIn) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  function handleChange(event) {
    const { name, value } =
      event.target;

    setFormData(
      (currentData) => ({
        ...currentData,
        [name]: value,
      })
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (
      !formData.username.trim() ||
      !formData.password
    ) {
      setError(
        'Please enter your username and password.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        '/api/login',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            username:
              formData.username.trim(),

            password:
              formData.password,
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
            'Unable to log in.'
        );
      }

      /*
       * The password was correct, but the email
       * has not been verified yet.
       *
       * Do not log the user in. Send the user to
       * the code-entry page instead.
       */
      if (
        data.requiresEmailVerification
      ) {
        localStorage.removeItem(
          'noterietyToken'
        );

        localStorage.setItem(
          'noterietyUserEmail',
          data.email || ''
        );

        localStorage.setItem(
          'noterietyUserName',
          data.username ||
            formData.username.trim()
        );

        localStorage.setItem(
          'noterietyEmailVerified',
          'false'
        );

        navigate('/confirm-email', {
          state: {
            email: data.email || '',
          },
        });

        return;
      }

      /*
       * Only verified users receive and store a JWT.
       */
      localStorage.setItem(
        'noterietyToken',
        data.token
      );

      localStorage.setItem(
        'noterietyUserName',
        data.username
      );

      localStorage.setItem(
        'noterietyUserEmail',
        data.email || ''
      );

      localStorage.setItem(
        'noterietyFirstName',
        data.firstName || ''
      );

      localStorage.setItem(
        'noterietyLastName',
        data.lastName || ''
      );

      localStorage.setItem(
        'noterietyEmailVerified',
        String(data.emailVerified)
      );

      onLogin(data.username);
      navigate('/');
    } catch (requestError) {
      console.error(
        'Login request failed:',
        requestError
      );

      setError(
        requestError.message ||
          'Unable to log in.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="page form-page">
      <h1>Log In</h1>

      <form
        className="basic-form"
        onSubmit={handleSubmit}
      >
        {error && (
          <p className="error-message">
            {error}
          </p>
        )}

        <label htmlFor="login-username">
          Username
        </label>

        <input
          id="login-username"
          name="username"
          type="text"
          value={formData.username}
          onChange={handleChange}
          autoComplete="username"
          required
        />

        <label htmlFor="login-password">
          Password
        </label>

        <input
          id="login-password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          autoComplete="current-password"
          required
        />

        <button
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? 'Logging In...'
            : 'Log In'}
        </button>
      </form>

      <p>
        Don't have an account?{' '}
        <Link to="/signup">
          Sign up
        </Link>
      </p>
    </section>
  );
}

export default LoginPage;