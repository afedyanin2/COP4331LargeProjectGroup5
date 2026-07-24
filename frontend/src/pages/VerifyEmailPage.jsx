import { Link } from 'react-router-dom';

function VerifyEmailPage() {
  return (
    <section className="page centered-page">
      <h1>Use Your Verification Code</h1>

      <p>
        Noteriety now verifies new accounts with a
        six-digit code instead of an email link.
      </p>

      <div className="page-actions verification-link-actions">
        <Link
          to="/confirm-email"
          className="button-link"
        >
          Enter Verification Code
        </Link>

        <Link
          to="/signup"
          className="secondary-link"
        >
          Start a New Registration
        </Link>
      </div>
    </section>
  );
}

export default VerifyEmailPage;