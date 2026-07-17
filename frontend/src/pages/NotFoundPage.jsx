import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <section className="page centered-page">
      <h1>Page Not Found</h1>
      <p>The requested page does not exist.</p>

      <Link to="/" className="button-link">
        Return Home
      </Link>
    </section>
  );
}

export default NotFoundPage;