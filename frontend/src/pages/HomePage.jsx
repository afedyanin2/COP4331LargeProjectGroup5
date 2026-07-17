import { Link } from 'react-router-dom';

function HomePage({ isLoggedIn }) {
  if (isLoggedIn) {
    return (
      <section className="page">
        <h1>Welcome to Noteriety</h1>

        <p>You are currently logged in.</p>

        <div className="page-actions">
          <Link to="/notes" className="button-link">
            Open My Notes
          </Link>

          <Link to="/settings" className="secondary-link">
            Account Settings
          </Link>
        </div>

        <section className="content-section">
          <h2>Your Workspace</h2>
          <p>
            Your recent notes and account information appear here.
          </p>
        </section>
      </section>
    );
  }

  return (
    <section className="page">
      <h1>Welcome to Noteriety</h1>

      <p>
        Noteriety is a simple app for writing and managing
        your notes.
      </p>

      <div className="page-actions">
        <Link to="/signup" className="button-link">
          Create an Account
        </Link>

        <Link to="/login" className="secondary-link">
          Log In
        </Link>
      </div>

      <section className="content-section">
        <h2>Keep Your Notes Organized</h2>
        <p>
          Create notes, review your saved information, and manage your
          account from one place.
        </p>
      </section>
    </section>
  );
}

export default HomePage;