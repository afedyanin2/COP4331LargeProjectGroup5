import { Link } from 'react-router-dom';

function AboutPage({ isLoggedIn }) {
  return (
    <section className="page">
      <h1>About Us</h1>

      <p>
        Noteriety is a web application that helps users create,
        manage, and review notes.
      </p>

      <section className="content-section">
        <h2>Our Purpose</h2>
        <p>
          Our purpose is to provide a straightforward place for users
          to keep important information.
        </p>
      </section>

      {isLoggedIn ? (
        <section className="content-section">
          <h2>Continue Writing Notes</h2>
          <p>You are currently signed in to your Noteriety account.</p>

          <Link to="/notes" className="button-link">
            Open Notes
          </Link>
        </section>
      ) : (
        <section className="content-section">
          <h2>Get Started</h2>
          <p>Create an account to begin writing notes.</p>

          <Link to="/signup" className="button-link">
            Sign Up
          </Link>
        </section>
      )}
    </section>
  );
}

export default AboutPage;