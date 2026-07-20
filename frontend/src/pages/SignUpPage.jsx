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
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const {
      name,
      email,
      password,
      confirmPassword,
    } = formData;

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

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          username: name.trim(),
          password,
          firstName: '',
          lastName: '',
          email: email.trim().toLowerCase(),
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(
          data.error || 'Unable to create account.'
        );
      }

      localStorage.setItem(
        'noterietyToken',
        data.token
      );

      localStorage.setItem(
        'noterietyUserName',
        data.username
      );

      localStorage.setItem(
        'noterietyUserEmail',
        data.email
      );

      localStorage.setItem(
        'noterietyEmailVerified',
        String(data.emailVerified)
      );

      navigate('/confirm-email', {
        state: {
          email: data.email,
        },
      });
    } catch (requestError) {
      console.error(
        'Signup request failed:',
        requestError
      );

      setError(
        requestError.message ||
          'Unable to create account.'
      );
    } finally {
      setIsSubmitting(false);
    }
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

        <button
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? 'Creating Account...'
            : 'Sign Up'}
        </button>
      </form>

      <p>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </section>
  );
}

export default SignupPage;