import { Link } from 'react-router-dom';

function ConfirmEmailPage() {
  const email =
    localStorage.getItem('noterietyUserEmail') || 'your email address';

  return (
    <section className="page centered-page">
      <h1>Confirm Your Email</h1>

      <p>
        A confirmation message has been sent to:
      </p>

      <p>
        <strong>{email}</strong>
      </p>

      <p>
        Please open the email and follow the confirmation instructions.
      </p>

      <Link to="/login" className="button-link">
        Return to Log In
      </Link>
    </section>
  );
}

export default ConfirmEmailPage;