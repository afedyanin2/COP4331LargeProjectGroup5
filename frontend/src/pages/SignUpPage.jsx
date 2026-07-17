import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

function SignupPage({ isLoggedIn }) {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [error, setError] = useState('');

  if (isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const { name, email, password, confirmPassword } = formData;

    if (
      !name.trim() ||
      !email.trim() ||
      !password ||
      !confirmPassword
    ) {
      setError('Please complete every field.');
      return;
    }

    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    // Replace these values with a backend signup request later.
    localStorage.setItem('noterietyUserName', name.trim());
    localStorage.setItem('noterietyUserEmail', email.trim());

    navigate('/confirm-email');
  }

  return (
    <section className="page form-page">
      <h1>Create an Account</h1>

      <form className="basic-form" onSubmit={handleSubmit}>
        {error && <p className="error-message">{error}</p>}

        <label htmlFor="signup-name">Username</label>
        <input
          id="signup-name"
          name="name"
          type="text"
          value={formData.name}
          onChange={handleChange}
          autoComplete="name"
        />

        <label htmlFor="signup-email">Email</label>
        <input
          id="signup-email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          autoComplete="email"
        />

        <label htmlFor="signup-password">Password</label>
        <input
          id="signup-password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          autoComplete="new-password"
        />

        <label htmlFor="confirm-password">Confirm Password</label>
        <input
          id="confirm-password"
          name="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={handleChange}
          autoComplete="new-password"
        />

        <button type="submit">Sign Up</button>
      </form>

      <p>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </section>
  );
}

export default SignupPage;