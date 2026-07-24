import { useState } from 'react';
import {
  Link,
  useLocation,
} from 'react-router-dom';

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

function ConfirmEmailPage() {
  const location = useLocation();

  const email =
    location.state?.email ||
    localStorage.getItem(
      'noterietyPendingEmail'
    ) ||
    '';

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [isResending, setIsResending] =
    useState(false);

  const [isVerified, setIsVerified] =
    useState(false);

  function handleCodeChange(event) {
    const digitsOnly = event.target.value
      .replace(/\D/g, '')
      .slice(0, 6);

    setCode(digitsOnly);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError('');
    setMessage('');

    if (!email) {
      setError(
        'No pending registration was found. Please sign up again.'
      );
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setError(
        'Enter the complete six-digit verification code.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        '/api/verify-email',
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify({
            email,
            code,
          }),
        }
      );

      const data =
        await readJsonResponse(response);

      if (!response.ok || data.error) {
        throw new Error(
          data.error ||
            'Unable to verify your email.'
        );
      }

      localStorage.removeItem(
        'noterietyPendingEmail'
      );

      setIsVerified(true);
      setCode('');

      setMessage(
        data.message ||
          'Your email has been verified. You can now log in.'
      );
    } catch (requestError) {
      console.error(
        'Email verification failed:',
        requestError
      );

      setError(
        requestError.message ||
          'Unable to verify your email.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    setError('');
    setMessage('');

    if (!email) {
      setError(
        'No pending registration was found. Please sign up again.'
      );
      return;
    }

    setIsResending(true);

    try {
      const response = await fetch(
        '/api/resend-verification',
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify({
            email,
          }),
        }
      );

      const data =
        await readJsonResponse(response);

      if (!response.ok || data.error) {
        throw new Error(
          data.error ||
            'Unable to send another code.'
        );
      }

      setMessage(
        data.message ||
          'A new verification code was sent.'
      );
    } catch (requestError) {
      console.error(
        'Resend verification failed:',
        requestError
      );

      setError(
        requestError.message ||
          'Unable to send another code.'
      );
    } finally {
      setIsResending(false);
    }
  }

  if (isVerified) {
    return (
      <section className="page centered-page">
        <h1>Email Verified</h1>

        <p className="success-message">
          {message}
        </p>

        <p>
          Your account has now been created. Log in
          with the username and password you selected.
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

  if (!email) {
    return (
      <section className="page centered-page">
        <h1>No Pending Registration</h1>

        <p className="error-message">
          Your registration may have expired or this
          page was opened without signing up first.
        </p>

        <Link
          to="/signup"
          className="button-link"
        >
          Return to Sign Up
        </Link>
      </section>
    );
  }

  return (
    <section className="page verification-page">
      <div className="verification-card">
        <h1>Verify Your Email</h1>

        <p>
          Enter the six-digit code sent to:
        </p>

        <p className="verification-email">
          <strong>{email}</strong>
        </p>

        <p>
          The pending registration expires one hour
          after signup. Your account becomes active
          only after verification is complete.
        </p>

        <form
          className="basic-form verification-form"
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

          <label htmlFor="verification-code">
            Verification Code
          </label>

          <input
            id="verification-code"
            className="verification-code-input"
            name="verificationCode"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={handleCodeChange}
            placeholder="000000"
            aria-describedby="verification-code-help"
            required
          />

          <span
            id="verification-code-help"
            className="form-help-text"
          >
            Enter digits only.
          </span>

          <button
            type="submit"
            disabled={
              isSubmitting ||
              code.length !== 6
            }
          >
            {isSubmitting
              ? 'Verifying...'
              : 'Verify Email'}
          </button>
        </form>

        <div className="verification-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={handleResend}
            disabled={isResending}
          >
            {isResending
              ? 'Sending...'
              : 'Send Another Code'}
          </button>

          <Link
            to="/signup"
            className="secondary-link"
          >
            Return to Sign Up
          </Link>
        </div>
      </div>
    </section>
  );
}

export default ConfirmEmailPage;