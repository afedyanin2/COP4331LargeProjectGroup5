import { Link, NavLink, useLocation, useNavigate,} from 'react-router-dom';

function Navbar({ isLoggedIn, onLogout, theme }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isNotesPage = location.pathname === '/notes';

  function handleLogout() {
    onLogout();
    navigate('/');
  }

  function getLinkClass({ isActive }) {
    return isActive ? 'nav-link active-link' : 'nav-link';
  }

  return (
    <header className={`navbar ${ isNotesPage ? 'notes-page-navbar' : ''}`} >
      <div className="navbar-inner">
        <Link to="/" className="site-name">
        <img
          src={theme === 'dark' ? '/dark-theme.webp' : '/light-theme.webp'}
          alt="Noteriety logo"
          className="site-logo"
          width="42"
          height="42"
          decoding="async"
        />
          <span>Noteriety</span>
        </Link>

        <nav className="nav-links" aria-label="Main navigation">
          <NavLink to="/" className={getLinkClass}>
            Home
          </NavLink>

          <NavLink to="/about" className={getLinkClass}>
            About Us
          </NavLink>

          {isLoggedIn ? (
            <>
              <NavLink to="/notes" className={getLinkClass}>
                Notes
              </NavLink>

              <NavLink to="/settings" className={getLinkClass}>
                Settings
              </NavLink>

              <button
                type="button"
                className="nav-button"
                onClick={handleLogout}
              >
                Log Out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={getLinkClass}>
                Log In
              </NavLink>

              <NavLink to="/signup" className={getLinkClass}>
                Sign Up
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Navbar;