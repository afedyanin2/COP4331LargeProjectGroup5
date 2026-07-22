import { Link } from 'react-router-dom';

function HomePage({ isLoggedIn }) {
  return (
    <section className="home-page">
      <div className="home-hero">
        <div className="home-hero-copy">
          <span className="home-eyebrow">
            Notes made simple
          </span>

          <h1>
            Capture ideas.
            <br />
            Organize everything.
          </h1>

          <p className="home-hero-text">
            Noteriety gives you a calm, organized place to write, search, pin, and manage your notes across desktop and mobile.
          </p>

          <div className="home-hero-actions">
            <Link
              to={isLoggedIn ? '/notes' : '/signup'}
              className="button-link home-primary-action"
            >
              {isLoggedIn
                ? 'Open My Workspace'
                : 'Create an Account'}
            </Link>

            <Link
              to={isLoggedIn ? '/settings' : '/login'}
              className="secondary-link home-secondary-action"
            >
              {isLoggedIn
                ? 'Account Settings'
                : 'Log In'}
            </Link>
          </div>

          <div className="home-trust-row">
            <span>Fast note creation</span>
            <span>Simple organization</span>
            <span>Accessible anywhere</span>
          </div>
        </div>

        <div
          className="home-preview"
          aria-label="Noteriety workspace preview"
        >
          <div className="home-preview-top">
            <div>
              <span className="preview-label">
                Your Workspace
              </span>

              <h2>
                {isLoggedIn
                  ? 'Welcome back'
                  : 'Stay organized'}
              </h2>
            </div>

            <span className="preview-status">
              {isLoggedIn ? 'Ready' : 'Preview'}
            </span>
          </div>

          <div className="preview-search">
            Search notes, categories, or tags
          </div>

          <div className="preview-note-grid">
            <article className="preview-note-card preview-note-card-featured">
              <span className="preview-chip">
                Pinned
              </span>

              <h3>Project Ideas</h3>

              <p>
                Keep your best ideas easy to find and ready to revisit.
              </p>

              <div className="preview-note-footer">
                <span>Ideas</span>
                <span>Today</span>
              </div>
            </article>

            <article className="preview-note-card">
              <span className="preview-chip">
                School
              </span>

              <h3>Study Notes</h3>

              <p>
                Sort classes, assignments, and reminders into categories.
              </p>

              <div className="preview-note-footer">
                <span>School</span>
                <span>Recent</span>
              </div>
            </article>

            <article className="preview-note-card">
              <span className="preview-chip">
                Personal
              </span>

              <h3>Daily Tasks</h3>

              <p>
                Search and review everything from one clean workspace.
              </p>

              <div className="preview-note-footer">
                <span>Personal</span>
                <span>Saved</span>
              </div>
            </article>
          </div>
        </div>
      </div>

      <section className="home-features">
        <div className="section-heading">
          <span className="home-eyebrow">
            Built for focus
          </span>

          <h2>
            Everything you need to keep moving
          </h2>

          <p>
            A clean note-taking experience that stays out of your way.
          </p>
        </div>

        <div className="feature-grid">
          <article className="feature-card">
            <span className="feature-number">
              01
            </span>

            <h3>Organize quickly</h3>

            <p>
              Use categories, tags, pinned notes, and recent activity to find what matters.
            </p>
          </article>

          <article className="feature-card">
            <span className="feature-number">
              02
            </span>

            <h3>Write comfortably</h3>

            <p>
              Create and edit notes in a focused workspace designed for both desktop and mobile.
            </p>
          </article>

          <article className="feature-card">
            <span className="feature-number">
              03
            </span>

            <h3>Acessible anywhere</h3>

            <p>
              Log in to your account anywhere and
              switch between light &amp; dark themes from your account settings.
            </p>
          </article>
        </div>
      </section>
    </section>
  );
}

export default HomePage;