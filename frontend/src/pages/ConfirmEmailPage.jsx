import { useState } from 'react';
import {
  Link,
  useLocation,
} from 'react-router-dom';

/*
 * Reads the server response safely.
 *
 * Why this was added:
 * response.json() throws an unclear JSON.parse error when the
 * server returns an empty response or an HTML error page.
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

function ConfirmEmailPage() {
  const location = useLocation();

  /*
   * The email is normally passed here by SignUpPage.
   * localStorage is used as a backup when the user refreshes the page.
   */
  const savedEmail =
    location.state?.email ||
    localStorage.getItem(
      'noterietyUserEmail'
    ) ||
    '';

  const [email, setEmail] =
    useState(savedEmail);

  const [code, setCode] =
    useState('');

  const [error, setError] =
    useState('');

  /*
   * SignUpPage passes emailSent=false when the account was created,
   * but Resend failed to send the first message.
   */
  const [message, setMessage] =
    useState(
      location.state?.emailSent === false
        ? 'Your account was created, but the first verification email could not be sent. Check the email configuration and then use Send New Code.'
        : ''
    );

  const [isVerifying, setIsVerifying] =
    useState(false);

  const [isResending, setIsResending] =
    useState(false);

  const [isVerified, setIsVerified] =
    useState(false);

  /*
   * Only allows digits and limits the value to six characters.
   */
  function handleCodeChange(event) {
    const numericCode =
      event.target.value
        .replace(/\D/g, '')
        .slice(0, 6);

    setCode(numericCode);
  }

  /*
   * Sends the email and six-digit code to the backend.
   */
  async function handleVerify(event) {
    event.preventDefault();

    setError('');
    setMessage('');

    const normalizedEmail =
      email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError(
        'Enter your email address.'
      );
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setError(
        'Enter the six-digit verification code.'
      );
      return;
    }

    setIsVerifying(true);

    try {
      const response = await fetch(
        '/api/verify-email-code',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            email: normalizedEmail,
            code,
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
            'Unable to verify email.'
        );
      }

      /*
       * This is only frontend display state.
       * The actual emailVerified value is stored in MongoDB
       * by the backend.
       */
      localStorage.setItem(
        'noterietyEmailVerified',
        'true'
      );

      localStorage.setItem(
        'noterietyUserEmail',
        normalizedEmail
      );

      setIsVerified(true);

      setMessage(
        'Your email has been verified.'
      );
    } catch (requestError) {
      console.error(
        'Verification request failed:',
        requestError
      );

      setError(
        requestError.message ||
          'Unable to verify email.'
      );
    } finally {
      setIsVerifying(false);
    }
  }

  /*
   * Requests a newly generated code.
   *
   * The old code becomes invalid when the backend creates the new one.
   */
  async function handleResend() {
    setError('');
    setMessage('');

    const normalizedEmail =
      email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError(
        'Enter your email address.'
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
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            email: normalizedEmail,
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
            'Unable to send a new code.'
        );
      }

      localStorage.setItem(
        'noterietyUserEmail',
        normalizedEmail
      );

      setCode('');

      setMessage(
        'A new verification code was requested. Check your email.'
      );
    } catch (requestError) {
      console.error(
        'Resend request failed:',
        requestError
      );

      setError(
        requestError.message ||
          'Unable to send a new code.'
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

        <Link
          to="/login"
          className="button-link"
        >
          Continue to Log In
        </Link>
      </section>
    );
  }

  return (
    <section className="page form-page">
      <h1>Verify Your Email</h1>

      <p>
        Enter the six-digit code sent
        to your email address.
      </p>

      <form
        className="basic-form"
        onSubmit={handleVerify}
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

        <label htmlFor="verification-email">
          Email
        </label>

        <input
          id="verification-email"
          name="email"
          type="email"
          value={email}
          onChange={(event) =>
            setEmail(event.target.value)
          }
          autoComplete="email"
          required
        />

        <label htmlFor="verification-code">
          Verification Code
        </label>

        <input
          id="verification-code"
          className="verification-code-input"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          value={code}
          onChange={handleCodeChange}
          placeholder="000000"
          required
        />

        <button
          type="submit"
          disabled={
            isVerifying ||
            code.length !== 6
          }
        >
          {isVerifying
            ? 'Verifying...'
            : 'Verify Email'}
        </button>

        <button
          type="button"
          onClick={handleResend}
          disabled={isResending}
        >
          {isResending
            ? 'Sending...'
            : 'Send New Code'}
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

export default ConfirmEmailPage;