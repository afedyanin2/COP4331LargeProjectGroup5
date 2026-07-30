import { useState } from 'react';

import {
  Link,
  useSearchParams,
} from 'react-router-dom';

const MIN_PASSWORD_LENGTH = 8;

function validatePassword(password) {
  const passwordErrors = [];

  if (password.length < MIN_PASSWORD_LENGTH) {
    passwordErrors.push(
      `Password must contain at least ${MIN_PASSWORD_LENGTH} characters.`
    );
  }

  if (!/[A-Z]/.test(password)) {
    passwordErrors.push(
      'Password must contain at least one uppercase letter.'
    );
  }

  if (!/[a-z]/.test(password)) {
    passwordErrors.push(
      'Password must contain at least one lowercase letter.'
    );
  }

  if (!/[^A-Za-z0-9\s]/.test(password)) {
    passwordErrors.push(
      'Password must contain at least one special character.'
    );
  }

  if (/\s/.test(password)) {
    passwordErrors.push(
      'Password cannot contain spaces.'
    );
  }

  return passwordErrors;
}

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

  const [
    showPasswords,
    setShowPasswords,
  ] = useState(false);

  const [errors, setErrors] =
    useState([]);

  const [message, setMessage] =
    useState('');

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [
    passwordChanged,
    setPasswordChanged,
  ] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    const validationErrors = [];

    setMessage('');

    if (!token) {
      validationErrors.push(
        'This password reset link is missing its reset token.'
      );
    }

    if (!newPassword) {
      validationErrors.push(
        'Please enter a new password.'
      );
    } else {
      validationErrors.push(
        ...validatePassword(newPassword)
      );
    }

    if (!confirmPassword) {
      validationErrors.push(
        'Please confirm your new password.'
      );
    }

    if (
      newPassword &&
      confirmPassword &&
      newPassword !== confirmPassword
    ) {
      validationErrors.push(
        'The passwords do not match.'
      );
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    setIsSubmitting(true);

    try {
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

      setPasswordChanged(true);

      setMessage(
        'Your password has been changed successfully.'
      );

      setNewPassword('');
      setConfirmPassword('');
      setShowPasswords(false);
    } catch (requestError) {
      console.error(
        'Password reset failed:',
        requestError
      );

      setErrors([
        requestError.message ||
          'Unable to reset your password.',
      ]);
    } finally {
      setIsSubmitting(false);
    }
  }

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
        noValidate
      >
        {errors.length > 0 && (
          <div className="error-message">
            <strong>
              Please correct the following:
            </strong>

            <ul>
              {errors.map((error, index) => (
                <li key={`${error}-${index}`}>
                  {error}
                </li>
              ))}
            </ul>
          </div>
        )}

        <label htmlFor="new-password">
          New Password
        </label>

        <input
          id="new-password"
          name="newPassword"
          type={
            showPasswords
              ? 'text'
              : 'password'
          }
          value={newPassword}
          onChange={(event) =>
            setNewPassword(
              event.target.value
            )
          }
          autoComplete="new-password"
          required
        />

        <label htmlFor="confirm-new-password">
          Confirm New Password
        </label>

        <input
          id="confirm-new-password"
          name="confirmPassword"
          type={
            showPasswords
              ? 'text'
              : 'password'
          }
          value={confirmPassword}
          onChange={(event) =>
            setConfirmPassword(
              event.target.value
            )
          }
          autoComplete="new-password"
          required
        />

        <label
          htmlFor="reset-show-passwords"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
          }}
        >
          <input
            id="reset-show-passwords"
            type="checkbox"
            checked={showPasswords}
            onChange={(event) =>
              setShowPasswords(
                event.target.checked
              )
            }
            style={{
              width: 'auto',
              margin: 0,
            }}
          />

          Show passwords
        </label>

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