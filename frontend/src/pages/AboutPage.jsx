import { Link } from 'react-router-dom';

function AboutPage({ isLoggedIn }) {
  return (
    <section className="page about-page">
      <div className="about-hero">
        <span className="home-eyebrow">
          About Noteriety
        </span>

        <h1>
          The best place for your busiest ideas.
        </h1>

        <p>
          Noteriety is a note-taking workspace designed to help users create, organize, search, and revisit important information without unnecessary clutter.
        </p>
      </div>

      <div className="about-grid">
        <article className="about-card">
          <span className="about-card-label">
            Our purpose
          </span>

          <h2>Simple by design</h2>

          <p>
            We want note-taking to feel straightforward. Every part of the experience is designed to keep writing, organization, and navigation easy to understand.
          </p>
        </article>

        <article className="about-card">
          <span className="about-card-label">
            Our approach
          </span>

          <h2>Built around focus</h2>

          <p>
            Categories, tags, pinned notes, search, and a clean editor help users spend more time thinking and less time managing their workspace.
          </p>
        </article>

        <article className="about-card">
          <span className="about-card-label">
            Your experience
          </span>

          <h2>Ready wherever you work</h2>

          <p>
            The interface is responsive across desktop and mobile and supports both light and dark themes.
          </p>
        </article>
      </div>

      <section className="about-cta">
        <div>
          <span className="home-eyebrow">
            {isLoggedIn
              ? 'Your workspace is ready'
              : 'Start writing'}
          </span>

          <h2>
            {isLoggedIn
              ? 'Continue where you left off.'
              : 'Create your first organized note.'}
          </h2>
        </div>

        <Link
          to={isLoggedIn ? '/notes' : '/signup'}
          className="button-link"
        >
          {isLoggedIn
            ? 'Open Notes'
            : 'Get Started'}
        </Link>
      </section>
    </section>
  );
}

export default AboutPage;