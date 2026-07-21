import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Link,
  useSearchParams,
} from 'react-router-dom';

/*
 * Safely reads the backend response.
 *
 * This avoids unclear JSON.parse errors when the server
 * returns an empty response or non-JSON content.
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

function VerifyEmailPage() {
  /*
   * Reads the query parameters from the URL.
   *
   * Example:
   * /verify-email?token=abc123
   */
  const [searchParams] =
    useSearchParams();

  const verificationStarted =
    useRef(false);

  const [status, setStatus] =
    useState('verifying');

  const [message, setMessage] =
    useState(
      'Please wait while we verify your email.'
    );

  useEffect(() => {
    /*
     * Sets the browser-tab title.
     */
    document.title =
      'Verify Email | Noteriety';

    /*
     * React Strict Mode can run effects twice during
     * local development.
     *
     * This prevents the verification request from
     * being sent twice.
     */
    if (
      verificationStarted.current
    ) {
      return;
    }

    verificationStarted.current =
      true;

    const token =
      searchParams.get('token');

    /*
     * The email link must contain a token.
     */
    if (!token) {
      setStatus('error');

      setMessage(
        'This verification link is missing its verification token.'
      );

      return;
    }

    async function verifyEmail() {
      try {
        /*
         * Send the token from the URL to the backend.
         */
        const response = await fetch(
          `/api/verify-email?token=${encodeURIComponent(
            token
          )}`,
          {
            method: 'GET',
          }
        );

        const data =
          await readJsonResponse(
            response
          );

        /*
         * Your backend may return status 200 with
         * an error property, so both values must be checked.
         */
        if (
          !response.ok ||
          data.error
        ) {
          throw new Error(
            data.error ||
              'Unable to verify your email.'
          );
        }

        /*
         * The backend has now changed emailVerified
         * to true in MongoDB.
         *
         * This updates the frontend's saved display state.
         */
        localStorage.setItem(
          'noterietyEmailVerified',
          'true'
        );

        setStatus('success');

        setMessage(
          'Your email has been verified successfully.'
        );
      } catch (requestError) {
        console.error(
          'Email verification failed:',
          requestError
        );

        setStatus('error');

        setMessage(
          requestError.message ||
            'Unable to verify your email.'
        );
      }
    }

    verifyEmail();
  }, [searchParams]);

  /*
   * Displayed while the backend request is running.
   */
  if (status === 'verifying') {
    return (
      <section className="page centered-page">
        <h1>Verify Your Email</h1>

        <p>{message}</p>
      </section>
    );
  }

  /*
   * Displayed after successful verification.
   */
  if (status === 'success') {
    return (
      <section className="page centered-page">
        <h1>Email Verified</h1>

        <p className="success-message">
          {message}
        </p>

        <p>
          You may now log in to your
          Noteriety account.
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
   * Displayed for an invalid, expired, or missing link.
   */
  return (
    <section className="page centered-page">
      <h1>Verification Failed</h1>

      <p className="error-message">
        {message}
      </p>

      <p>
        The link may be invalid or expired.
        You can return to the confirmation
        page and request another email.
      </p>

      <div className="page-actions">
        <Link
          to="/confirm-email"
          className="button-link"
        >
          Request Another Link
        </Link>

        <Link
          to="/login"
          className="secondary-link"
        >
          Return to Log In
        </Link>
      </div>
    </section>
  );
}

export default VerifyEmailPage;