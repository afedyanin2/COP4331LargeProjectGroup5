import { useState } from 'react';
import { Link } from 'react-router-dom';

/*
 * Safely reads the backend response.
 *
 * This produces a useful error when the server returns
 * an empty response or something other than JSON.
 */
async function readJsonResponse(response) {
  const responseText = await response.text();

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

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setError('');
    setMessage('');

    const normalizedEmail =
      email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError(
        'Please enter your email address.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      /*
       * The backend:
       * 1. Finds the account by email.
       * 2. Creates a reset token.
       * 3. Emails a link containing the token.
       */
      const response = await fetch(
        '/api/forgot-password',
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

      const data =
        await readJsonResponse(response);

      if (!response.ok || data.error) {
        throw new Error(
          data.error ||
            'Unable to request a password reset.'
        );
      }

      /*
       * The message is intentionally generic.
       *
       * It should not reveal whether an account
       * exists for a particular email address.
       */
      setMessage(
        'If an account exists for that email address, a password reset link has been sent.'
      );
    } catch (requestError) {
      console.error(
        'Forgot-password request failed:',
        requestError
      );

      setError(
        requestError.message ||
          'Unable to request a password reset.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="page form-page">
      <h1>Forgot Password</h1>

      <p>
        Enter the email address connected
        to your Noteriety account.
      </p>

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

        <label htmlFor="forgot-password-email">
          Email
        </label>

        <input
          id="forgot-password-email"
          name="email"
          type="email"
          value={email}
          onChange={(event) =>
            setEmail(event.target.value)
          }
          autoComplete="email"
          required
        />

        <button
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? 'Sending...'
            : 'Send Reset Link'}
        </button>
      </form>

      <p>
        <Link to="/login">
          Return to Log In
        </Link>
      </p>
    </section>
  );
}

export default ForgotPasswordPage;