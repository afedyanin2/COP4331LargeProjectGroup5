import { useState } from 'react';
import {
  Link,
  Navigate,
  useNavigate,
} from 'react-router-dom';

/*
 * Safely handles empty or non-JSON responses.
 *
 * This prevents:
 * JSON.parse: unexpected end of data
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

function SignupPage({ isLoggedIn }) {
  const navigate = useNavigate();

  const [formData, setFormData] =
    useState({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
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

    const {
      name,
      email,
      password,
      confirmPassword,
    } = formData;

    if (
      !name.trim() ||
      !email.trim() ||
      !password ||
      !confirmPassword
    ) {
      setError(
        'Please complete every field.'
      );
      return;
    }

    if (
      password !== confirmPassword
    ) {
      setError(
        'The passwords do not match.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      /*
       * Uses a relative /api URL.
       *
       * Local development:
       * Vite forwards it to localhost:5000.
       *
       * Production:
       * Nginx forwards it to the Express backend.
       */
      const response = await fetch(
        '/api/register',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            /*
             * The form currently calls this field "name",
             * but the backend expects "username".
             */
            username: name.trim(),

            password,

            /*
             * Your current form does not have separate
             * first-name and last-name fields.
             */
            firstName: '',
            lastName: '',

            email: email
              .trim()
              .toLowerCase(),
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
            'Unable to create account.'
        );
      }

      /*
       * We intentionally do not store a JWT here.
       *
       * The user should not receive an authentication
       * token until the email address has been verified
       * and the user logs in.
       */
      localStorage.removeItem(
        'noterietyToken'
      );

      localStorage.setItem(
        'noterietyUserName',
        data.username
      );

      localStorage.setItem(
        'noterietyUserEmail',
        data.email
      );

      localStorage.setItem(
        'noterietyEmailVerified',
        'false'
      );

      /*
       * Sends the email to ConfirmEmailPage so it
       * is already filled into the verification form.
       */
      navigate('/confirm-email', {
        state: {
          email: data.email,

          /*
           * Lets the confirmation page warn the user
           * when registration succeeded but Resend failed.
           */
          emailSent:
            data.verificationEmailSent !==
            false,
        },
      });
    } catch (requestError) {
      console.error(
        'Signup request failed:',
        requestError
      );

      setError(
        requestError.message ||
          'Unable to create account.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="page form-page">
      <h1>Create an Account</h1>

      <form
        className="basic-form"
        onSubmit={handleSubmit}
      >
        {error && (
          <p className="error-message">
            {error}
          </p>
        )}

        <label htmlFor="signup-name">
          Username
        </label>

        <input
          id="signup-name"
          name="name"
          type="text"
          value={formData.name}
          onChange={handleChange}
          autoComplete="username"
          required
        />

        <label htmlFor="signup-email">
          Email
        </label>

        <input
          id="signup-email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          autoComplete="email"
          required
        />

        <label htmlFor="signup-password">
          Password
        </label>

        <input
          id="signup-password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          autoComplete="new-password"
          required
        />

        <label htmlFor="confirm-password">
          Confirm Password
        </label>

        <input
          id="confirm-password"
          name="confirmPassword"
          type="password"
          value={
            formData.confirmPassword
          }
          onChange={handleChange}
          autoComplete="new-password"
          required
        />

        <button
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? 'Creating Account...'
            : 'Sign Up'}
        </button>
      </form>

      <p>
        Already have an account?{' '}
        <Link to="/login">
          Log in
        </Link>
      </p>
    </section>
  );
}

export default SignupPage;