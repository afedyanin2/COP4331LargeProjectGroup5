import { useState } from 'react';

import {
  Link,
  useSearchParams,
} from 'react-router-dom';

/*
 * Safely reads JSON from the backend.
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

function ResetPasswordPage() {
  /*
   * Reads the token from a URL such as:
   *
   * /reset-password?token=abc123
   */
  const [searchParams] =
    useSearchParams();

  const token =
    searchParams.get('token') || '';

  const [newPassword, setNewPassword] =
    useState('');

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('');

  const [error, setError] =
    useState('');

  const [message, setMessage] =
    useState('');

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [passwordChanged, setPasswordChanged] =
    useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setError('');
    setMessage('');

    if (!token) {
      setError(
        'This password reset link is missing its reset token.'
      );
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError(
        'Please complete both password fields.'
      );
      return;
    }

    /*
     * Your backend requires at least eight characters.
     */
    if (newPassword.length < 8) {
      setError(
        'Password must contain at least 8 characters.'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(
        'The passwords do not match.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      /*
       * Send the token from the email link
       * together with the new password.
       */
      const response = await fetch(
        '/api/reset-password',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            token,
            newPassword,
          }),
        }
      );

      const data =
        await readJsonResponse(response);

      if (!response.ok || data.error) {
        throw new Error(
          data.error ||
            'Unable to reset your password.'
        );
      }

      /*
       * The backend has now:
       * 1. Hashed the new password.
       * 2. Updated MongoDB.
       * 3. Deleted the used reset token.
       */
      setPasswordChanged(true);

      setMessage(
        'Your password has been changed successfully.'
      );

      setNewPassword('');
      setConfirmPassword('');
    } catch (requestError) {
      console.error(
        'Password reset failed:',
        requestError
      );

      setError(
        requestError.message ||
          'Unable to reset your password.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  /*
   * Displayed after the password has been changed.
   */
  if (passwordChanged) {
    return (
      <section className="page centered-page">
        <h1>Password Changed</h1>

        <p className="success-message">
          {message}
        </p>

        <p>
          You can now log in using your
          new password.
        </p>

        <Link
          to="/login"
          className="button-link"
        >
          Continue to Log In
        </Link>
      </section>
    );
  }

  /*
   * Displayed when someone opens the page
   * without a reset token.
   */
  if (!token) {
    return (
      <section className="page centered-page">
        <h1>Invalid Reset Link</h1>

        <p className="error-message">
          This password reset link is
          missing its reset token.
        </p>

        <Link
          to="/forgot-password"
          className="button-link"
        >
          Request Another Link
        </Link>
      </section>
    );
  }

  return (
    <section className="page form-page">
      <h1>Reset Your Password</h1>

      <p>
        Enter and confirm your new password.
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

        <label htmlFor="new-password">
          New Password
        </label>

        <input
          id="new-password"
          name="newPassword"
          type="password"
          value={newPassword}
          onChange={(event) =>
            setNewPassword(
              event.target.value
            )
          }
          autoComplete="new-password"
          minLength={8}
          required
        />

        <label htmlFor="confirm-new-password">
          Confirm New Password
        </label>

        <input
          id="confirm-new-password"
          name="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(event) =>
            setConfirmPassword(
              event.target.value
            )
          }
          autoComplete="new-password"
          minLength={8}
          required
        />

        <button
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? 'Changing Password...'
            : 'Change Password'}
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

export default ResetPasswordPage;