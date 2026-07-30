import { useState } from 'react';
import {
  Link,
  Navigate,
  useNavigate,
} from 'react-router-dom';

const MIN_PASSWORD_LENGTH = 8;

function validatePassword(password) {
  const passwordErrors = [];

  if (password.length < MIN_PASSWORD_LENGTH) {
    passwordErrors.push(
      `Password must contain at least ${MIN_PASSWORD_LENGTH} characters.`
    );
  }

  if (!/[A-Z]/.test(password)) {
    passwordErrors.push(
      'Password must contain at least one uppercase letter.'
    );
  }

  if (!/[^A-Za-z0-9\s]/.test(password)) {
    passwordErrors.push(
      'Password must contain at least one special character.'
    );
  }

  if (/\s/.test(password)) {
    passwordErrors.push(
      'Password cannot contain spaces.'
    );
  }

  return passwordErrors;
}

function SignupPage({ isLoggedIn }) {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState([]);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [showPasswords, setShowPasswords] =
    useState(false);

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

    const validationErrors = [];

    const {
      name,
      email,
      password,
      confirmPassword,
    } = formData;

    if (!name.trim()) {
      validationErrors.push(
        'Please enter a username.'
      );
    }

    if (!email.trim()) {
      validationErrors.push(
        'Please enter an email address.'
      );
    }

    if (!password) {
      validationErrors.push(
        'Please enter a password.'
      );
    } else {
      validationErrors.push(
        ...validatePassword(password)
      );
    }

    if (!confirmPassword) {
      validationErrors.push(
        'Please confirm your password.'
      );
    }

    if (
      password &&
      confirmPassword &&
      password !== confirmPassword
    ) {
      validationErrors.push(
        'The passwords do not match.'
      );
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    setIsSubmitting(true);

    try {
      const response = await fetch(
        '/api/register',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            username: name.trim(),
            password,
            firstName: '',
            lastName: '',
            email: email
              .trim()
              .toLowerCase(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(
          data.error ||
            'Unable to create account.'
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

      setErrors([
        requestError.message ||
          'Unable to create account.',
      ]);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="page form-page">
      <h1>Create an Account</h1>

      <form
        className="basic-form"
        onSubmit={handleSubmit}
        noValidate
      >
        {errors.length > 0 && (
          <div className="error-message">
            <strong>
              Please correct the following:
            </strong>

            <ul>
              {errors.map((error, index) => (
                <li key={`${error}-${index}`}>
                  {error}
                </li>
              ))}
            </ul>
          </div>
        )}

        <label htmlFor="signup-name">
          Username
        </label>

        <input
          id="signup-name"
          name="name"
          type="text"
          value={formData.name}
          onChange={handleChange}
          autoComplete="username"
          required
        />

        <label htmlFor="signup-email">
          Email
        </label>

        <input
          id="signup-email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          autoComplete="email"
          required
        />

        <label htmlFor="signup-password">
          Password
        </label>

        <input
          id="signup-password"
          name="password"
          type={
            showPasswords
              ? 'text'
              : 'password'
          }
          value={formData.password}
          onChange={handleChange}
          autoComplete="new-password"
          required
        />

        <label htmlFor="confirm-password">
          Confirm Password
        </label>

        <input
          id="confirm-password"
          name="confirmPassword"
          type={
            showPasswords
              ? 'text'
              : 'password'
          }
          value={
            formData.confirmPassword
          }
          onChange={handleChange}
          autoComplete="new-password"
          required
        />

        <label
          htmlFor="signup-show-passwords"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
          }}
        >
          <input
            id="signup-show-passwords"
            type="checkbox"
            checked={showPasswords}
            onChange={(event) =>
              setShowPasswords(
                event.target.checked
              )
            }
            style={{
              width: 'auto',
              margin: 0,
            }}
          />

          Show passwords
        </label>

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
        Already have an account?{' '}
        <Link to="/login">
          Log in
        </Link>
      </p>
    </section>
  );
}

export default SignupPage;