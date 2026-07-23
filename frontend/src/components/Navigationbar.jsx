import {Link, NavLink, useLocation, useNavigate} from 'react-router-dom';

function Navbar({ isLoggedIn, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    onLogout();
    navigate('/');
  }

  function getLinkClass({ isActive }) {
    return isActive ? 'nav-link active-link' : 'nav-link';
  }

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="site-name">
          <img
            src="/noteriety-icon.png"
            alt=""
            className="mobile-site-logo"
            aria-hidden="true"
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

              {location.pathname !== '/settings' && (
                <button
                  type="button"
                  className="nav-button"
                  onClick={handleLogout}
                >
                  Log Out
                </button>
              )}
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