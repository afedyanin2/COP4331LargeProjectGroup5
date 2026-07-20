const { MongoClient, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// -----------------------------------------------------------------------------
// Environment configuration
// -----------------------------------------------------------------------------

const PORT = Number(process.env.PORT || 5000);
const NODE_ENV = process.env.NODE_ENV || 'development';
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const FRONTEND_URL =
  process.env.FRONTEND_URL || 'http://localhost:5173';
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM =
  process.env.EMAIL_FROM || 'onboarding@resend.dev';

const allowedOrigins = (
  process.env.CORS_ORIGINS ||
  'https://noteriety-app.com,https://www.noteriety-app.com,http://localhost:5173'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI is missing from .env');
  process.exit(1);
}

if (
  !MONGODB_URI.startsWith('mongodb://') &&
  !MONGODB_URI.startsWith('mongodb+srv://')
) {
  console.error(
    'ERROR: MONGODB_URI must start with mongodb:// or mongodb+srv://'
  );
  process.exit(1);
}

if (!JWT_SECRET) {
  console.error('ERROR: JWT_SECRET is missing from .env');
  process.exit(1);
}

if (!RESEND_API_KEY) {
  console.warn(
    'WARNING: RESEND_API_KEY is not set. Verification and reset emails will not be sent.'
  );
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const SALT_ROUNDS = 12;
// Verification uses a six-digit code
const VERIFY_CODE_TTL_MS = 10 * 60 * 1000;
// Prevents unlimited guessing of the six-digit code
// Requesting a new code resets counter
const MAX_VERIFICATION_ATTEMPTS = 5;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const JWT_EXPIRES_IN = '7d';
const MIN_PASSWORD_LENGTH = 8;

// -----------------------------------------------------------------------------
// MongoDB and Express setup
// -----------------------------------------------------------------------------

const client = new MongoClient(MONGODB_URI);
const app = express();

// Needed when running behind DigitalOcean, Nginx, or another proxy.
app.set('trust proxy', 1);

app.use(
  cors({
    origin(origin, callback) {
      // Allows curl, Postman, and server-to-server requests.
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(
        new Error(`Origin not allowed by CORS: ${origin}`)
      );
    },

    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],

    allowedHeaders: [
      'Content-Type',
      'Authorization',
    ],
  })
);

app.use(express.json({ limit: '1mb' }));

// -----------------------------------------------------------------------------
// Helper functions
// -----------------------------------------------------------------------------

function getDatabase() {
  return client.db('notetaking_app');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

//Creates a secure number between 100000 and 999999.
function generateVerificationCode() {
  return crypto.randomInt(100000,1000000).toString();
}


// Stores a hash of the verification code instead of storing the readable code in MongoDB
function hashVerificationCode(code) {
  return crypto.createHmac('sha256',JWT_SECRET).update(String(code)).digest('hex');
}

// Uses timingSafeEqual to reduce timing-based comparisons
function verificationHashesMatch(storedHash, submittedHash) {
  if (!storedHash || !submittedHash) {
    return false;
  }

  const storedBuffer = Buffer.from(storedHash, 'hex');
  const submittedBuffer = Buffer.from(submittedHash, 'hex');

  return (storedBuffer.length === submittedBuffer.length && crypto.timingSafeEqual(storedBuffer, submittedBuffer));
}

function signJwt(userId) {
  return jwt.sign(
    {
      userId: userId.toString(),
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
    }
  );
}

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

function normalizeUsername(username) {
  return String(username || '').trim();
}

function isValidObjectId(id) {
  return (
    ObjectId.isValid(id) &&
    new ObjectId(id).toString() === id
  );
}

async function sendMail(to, subject, html) {
  if (!RESEND_API_KEY) {
    throw new Error(
      'RESEND_API_KEY is not configured'
    );
  }

  const response = await fetch(
    'https://api.resend.com/emails',
    {
      method: 'POST',

      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },

      body: JSON.stringify({
        from: EMAIL_FROM,
        to,
        subject,
        html,
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();

    throw new Error(
      `Resend API error (${response.status}): ${errorBody}`
    );
  }
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  const token =
    authHeader &&
    authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

  if (!token) {
    return res.status(401).json({
      error:
        'Missing or invalid Authorization header',
    });
  }

  jwt.verify(
    token,
    JWT_SECRET,
    (error, payload) => {
      if (error || !payload?.userId) {
        return res.status(401).json({
          error: 'Invalid or expired token',
        });
      }

      req.userId = payload.userId;
      next();
    }
  );
}

// -----------------------------------------------------------------------------
// Rate limiters
// -----------------------------------------------------------------------------

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,

  message: {
    id: -1,
    firstName: '',
    lastName: '',
    error:
      'Too many login attempts. Please try again later.',
  },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,

  message: {
    id: -1,
    firstName: '',
    lastName: '',
    error:
      'Too many accounts created from this IP. Please try again later.',
  },
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,

  message: {
    error:
      'Too many password reset requests. Please try again later.',
  },
});

const resendVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,

  message: {
    error:
      'Too many verification emails requested. Please try again later.',
  },
});

// Limits repeated code guesses sent to the API
const verifyEmailLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    max: 10,

    standardHeaders: true,
    legacyHeaders: false,

    message: {
      emailVerified: false,

      error:
        'Too many verification attempts. Please try again later.',
    },
  });

// -----------------------------------------------------------------------------
// Health route
// -----------------------------------------------------------------------------

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    environment: NODE_ENV,
    frontendUrl: FRONTEND_URL,
    error: '',
  });
});

// -----------------------------------------------------------------------------
// Login
// -----------------------------------------------------------------------------

app.post(
  '/api/login',
  loginLimiter,
  async (req, res) => {
    const username =
      normalizeUsername(
        req.body.username
      );

    const password = String(
      req.body.password || ''
    );

    if (!username || !password) {
      return res
        .status(200)
        .json({
          id: -1,
          firstName: '',
          lastName: '',

          error:
            'Username and password are required',
        });
    }

    try {
      const db = getDatabase();

      const user = await db
        .collection('Users')
        .findOne({
          username,
        });

      if (!user) {
        return res
          .status(200)
          .json({
            id: -1,
            firstName: '',
            lastName: '',

            error:
              'Invalid username or password',
          });
      }

      const passwordMatches =
        await bcrypt.compare(
          password,
          user.password
        );

      if (!passwordMatches) {
        return res
          .status(200)
          .json({
            id: -1,
            firstName: '',
            lastName: '',

            error:
              'Invalid username or password',
          });
      }

      /*
       * CHANGED:
       * Correct passwords no longer allow login
       * when the email is unverified.
       *
       * The frontend uses this value to redirect
       * to /confirm-email.
       */
      if (!user.emailVerified) {
        return res
          .status(200)
          .json({
            id:
              user._id.toString(),

            firstName:
              user.firstName || '',

            lastName:
              user.lastName || '',

            username:
              user.username,

            email:
              user.email || '',

            emailVerified: false,

            requiresEmailVerification:
              true,

            error: '',
          });
      }

      /*
       * Only verified users receive a JWT.
       */
      const token =
        signJwt(user._id);

      return res
        .status(200)
        .json({
          id:
            user._id.toString(),

          firstName:
            user.firstName || '',

          lastName:
            user.lastName || '',

          username:
            user.username,

          email:
            user.email || '',

          emailVerified: Boolean(
            user.emailVerified
          ),

          token,
          error: '',
        });
    } catch (error) {
      console.error(
        'Login error:',
        error
      );

      return res
        .status(500)
        .json({
          id: -1,
          firstName: '',
          lastName: '',

          error:
            'Unable to log in right now',
        });
    }
  }
);

// -----------------------------------------------------------------------------
// Registration
// -----------------------------------------------------------------------------

app.post(
  '/api/register',
  registerLimiter,
  async (req, res) => {
    const username =
      normalizeUsername(
        req.body.username
      );

    const password = String(
      req.body.password || ''
    );

    const firstName = String(
      req.body.firstName || ''
    ).trim();

    const lastName = String(
      req.body.lastName || ''
    ).trim();

    const email =
      normalizeEmail(
        req.body.email
      );

    if (
      !username ||
      !password ||
      !email
    ) {
      return res
        .status(200)
        .json({
          id: -1,
          firstName: '',
          lastName: '',

          error:
            'Username, password, and email are required',
        });
    }

    if (
      password.length <
      MIN_PASSWORD_LENGTH
    ) {
      return res
        .status(200)
        .json({
          id: -1,
          firstName: '',
          lastName: '',

          error:
            `Password must contain at least ${MIN_PASSWORD_LENGTH} characters`,
        });
    }

    try {
      const db = getDatabase();

      const existingUser =
        await db
          .collection('Users')
          .findOne({
            $or: [
              {
                username,
              },
              {
                email,
              },
            ],
          });

      if (existingUser) {
        return res
          .status(200)
          .json({
            id: -1,
            firstName: '',
            lastName: '',

            error:
              'Username or email already in use',
          });
      }

      const hashedPassword =
        await bcrypt.hash(
          password,
          SALT_ROUNDS
        );

      /*
       * CHANGED:
       * Create a six-digit code instead of
       * a long link token.
       */
      const verificationCode =
        generateVerificationCode();

      /*
       * Only the hash is stored in MongoDB.
       */
      const verificationCodeHash =
        hashVerificationCode(
          verificationCode
        );

      const verificationCodeExpiry =
        new Date(
          Date.now() +
            VERIFY_CODE_TTL_MS
        );

      const result = await db
        .collection('Users')
        .insertOne({
          username,

          password:
            hashedPassword,

          firstName,
          lastName,
          email,

          emailVerified: false,

          verificationCodeHash,
          verificationCodeExpiry,

          /*
           * Tracks incorrect code guesses.
           */
          verificationCodeAttempts:
            0,

          resetToken: null,
          resetTokenExpiry: null,

          createdAt:
            new Date(),

          updatedAt:
            new Date(),
        });

      let verificationEmailSent =
        true;

      try {
        /*
         * CHANGED:
         * The email contains the numeric code
         * instead of a clickable verification URL.
         */
        await sendMail(
          email,

          'Your Noteriety verification code',

          `
            <div
              style="
                font-family: Arial, sans-serif;
                max-width: 500px;
                margin: 0 auto;
              "
            >
              <h2>
                Verify your Noteriety email
              </h2>

              <p>
                Hi ${
                  firstName ||
                  username
                },
              </p>

              <p>
                Enter this six-digit
                verification code on
                Noteriety:
              </p>

              <div
                style="
                  font-size: 32px;
                  font-weight: bold;
                  letter-spacing: 8px;
                  text-align: center;
                  margin: 30px 0;
                  padding: 18px;
                  background: #f3f3f3;
                  border-radius: 8px;
                "
              >
                ${verificationCode}
              </div>

              <p>
                This code expires in
                10 minutes.
              </p>

              <p>
                If you did not create
                this account, you can
                ignore this email.
              </p>
            </div>
          `
        );
      } catch (mailError) {
        verificationEmailSent =
          false;

        console.error(
          'Failed to send verification code:',
          mailError.message
        );
      }

      /*
       * CHANGED:
       * Registration does not return a JWT.
       * The user must verify the email and then log in.
       */
      return res
        .status(200)
        .json({
          id:
            result.insertedId
              .toString(),

          firstName,
          lastName,
          username,
          email,

          emailVerified: false,

          requiresEmailVerification:
            true,

          verificationEmailSent,

          error: '',
        });
    } catch (error) {
      console.error(
        'Registration error:',
        error
      );

      return res
        .status(500)
        .json({
          id: -1,
          firstName: '',
          lastName: '',

          error:
            'Unable to register right now',
        });
    }
  }
);

// -----------------------------------------------------------------------------
// Verify email using a six-digit code
// -----------------------------------------------------------------------------

app.post(
  '/api/verify-email-code',
  verifyEmailLimiter,
  async (req, res) => {
    const email =
      normalizeEmail(
        req.body.email
      );

    const code = String(
      req.body.code || ''
    ).trim();

    if (!email) {
      return res
        .status(200)
        .json({
          emailVerified: false,
          error:
            'Email is required',
        });
    }

    if (!/^\d{6}$/.test(code)) {
      return res
        .status(200)
        .json({
          emailVerified: false,

          error:
            'Enter the six-digit verification code',
        });
    }

    try {
      const db = getDatabase();

      const user = await db
        .collection('Users')
        .findOne({
          email,
        });

      /*
       * Use the same message when the account
       * or code is invalid.
       */
      if (!user) {
        return res
          .status(200)
          .json({
            emailVerified: false,

            error:
              'Invalid verification code',
          });
      }

      if (user.emailVerified) {
        return res
          .status(200)
          .json({
            emailVerified: true,
            error: '',
          });
      }

      const attempts =
        Number(
          user.verificationCodeAttempts
        ) || 0;

      if (
        attempts >=
        MAX_VERIFICATION_ATTEMPTS
      ) {
        return res
          .status(200)
          .json({
            emailVerified: false,

            error:
              'Too many incorrect attempts. Request a new code.',
          });
      }

      if (
        !user.verificationCodeHash ||
        !user.verificationCodeExpiry
      ) {
        return res
          .status(200)
          .json({
            emailVerified: false,

            error:
              'No active verification code. Request a new code.',
          });
      }

      if (
        new Date(
          user.verificationCodeExpiry
        ) < new Date()
      ) {
        return res
          .status(200)
          .json({
            emailVerified: false,

            error:
              'The verification code has expired. Request a new code.',
          });
      }

      const submittedHash =
        hashVerificationCode(
          code
        );

      const codeMatches =
        verificationHashesMatch(
          user.verificationCodeHash,
          submittedHash
        );

      if (!codeMatches) {
        /*
         * Add one to the failed-attempt count.
         */
        await db
          .collection('Users')
          .updateOne(
            {
              _id: user._id,
            },
            {
              $inc: {
                verificationCodeAttempts:
                  1,
              },

              $set: {
                updatedAt:
                  new Date(),
              },
            }
          );

        return res
          .status(200)
          .json({
            emailVerified: false,

            error:
              'Invalid verification code',
          });
      }

      /*
       * Correct code:
       * mark the account verified and delete all
       * verification data from the user record.
       */
      await db
        .collection('Users')
        .updateOne(
          {
            _id: user._id,
          },
          {
            $set: {
              emailVerified: true,

              updatedAt:
                new Date(),
            },

            $unset: {
              verificationCodeHash:
                '',

              verificationCodeExpiry:
                '',

              verificationCodeAttempts:
                '',

              /*
               * Also remove fields created by
               * the old link-based system.
               */
              verificationToken:
                '',

              verificationTokenExpiry:
                '',
            },
          }
        );

      return res
        .status(200)
        .json({
          emailVerified: true,
          error: '',
        });
    } catch (error) {
      console.error(
        'Email code verification error:',
        error
      );

      return res
        .status(500)
        .json({
          emailVerified: false,

          error:
            'Unable to verify email right now',
        });
    }
  }
);

// -----------------------------------------------------------------------------
// Resend verification code
// -----------------------------------------------------------------------------

app.post(
  '/api/resend-verification',
  resendVerificationLimiter,
  async (req, res) => {
    const email =
      normalizeEmail(
        req.body.email
      );

    if (!email) {
      return res
        .status(200)
        .json({
          error:
            'Email is required',
        });
    }

    try {
      const db = getDatabase();

      const user = await db
        .collection('Users')
        .findOne({
          email,
        });

      /*
       * The response remains generic so this
       * endpoint does not reveal whether an
       * email has an account.
       */
      if (
        user &&
        !user.emailVerified
      ) {
        const verificationCode =
          generateVerificationCode();

        const verificationCodeHash =
          hashVerificationCode(
            verificationCode
          );

        const verificationCodeExpiry =
          new Date(
            Date.now() +
              VERIFY_CODE_TTL_MS
          );

        /*
         * The new code replaces the old code,
         * resets the expiration, and resets
         * incorrect attempts.
         */
        await db
          .collection('Users')
          .updateOne(
            {
              _id: user._id,
            },
            {
              $set: {
                verificationCodeHash,

                verificationCodeExpiry,

                verificationCodeAttempts:
                  0,

                updatedAt:
                  new Date(),
              },

              $unset: {
                verificationToken:
                  '',

                verificationTokenExpiry:
                  '',
              },
            }
          );

        try {
          await sendMail(
            email,

            'Your new Noteriety verification code',

            `
              <div
                style="
                  font-family: Arial, sans-serif;
                  max-width: 500px;
                  margin: 0 auto;
                "
              >
                <h2>
                  Your new verification code
                </h2>

                <p>
                  Hi ${
                    user.firstName ||
                    user.username
                  },
                </p>

                <p>
                  Enter this six-digit
                  code on Noteriety:
                </p>

                <div
                  style="
                    font-size: 32px;
                    font-weight: bold;
                    letter-spacing: 8px;
                    text-align: center;
                    margin: 30px 0;
                    padding: 18px;
                    background: #f3f3f3;
                    border-radius: 8px;
                  "
                >
                  ${verificationCode}
                </div>

                <p>
                  This code expires in
                  10 minutes.
                </p>
              </div>
            `
          );
        } catch (mailError) {
          console.error(
            'Failed to resend verification code:',
            mailError.message
          );
        }
      }

      return res
        .status(200)
        .json({
          error: '',
        });
    } catch (error) {
      console.error(
        'Resend verification error:',
        error
      );

      return res
        .status(500)
        .json({
          error:
            'Unable to resend the verification code right now',
        });
    }
  }
);

// -----------------------------------------------------------------------------
// Forgot password
// -----------------------------------------------------------------------------

app.post(
  '/api/forgot-password',
  forgotPasswordLimiter,
  async (req, res) => {
    const email = normalizeEmail(
      req.body.email
    );

    if (!email) {
      return res.status(200).json({
        error: 'Email is required',
      });
    }

    try {
      const db = getDatabase();

      const user = await db
        .collection('Users')
        .findOne({
          email,
        });

      // Always returns success so registered
      // emails are not exposed.
      if (user) {
        const resetToken =
          generateToken();

        const resetTokenExpiry =
          new Date(
            Date.now() +
              RESET_TOKEN_TTL_MS
          );

        await db
          .collection('Users')
          .updateOne(
            {
              _id: user._id,
            },
            {
              $set: {
                resetToken,
                resetTokenExpiry,
                updatedAt: new Date(),
              },
            }
          );

        const resetLink =
          `${FRONTEND_URL}/reset-password` +
          `?token=${encodeURIComponent(
            resetToken
          )}`;

        try {
          await sendMail(
            email,
            'Reset your Noteriety password',
            `
              <p>
                Hi ${
                  user.firstName ||
                  user.username
                },
              </p>

              <p>
                We received a request to
                reset your password.
              </p>

              <p>
                <a href="${resetLink}">
                  ${resetLink}
                </a>
              </p>

              <p>
                This link expires in one
                hour.
              </p>

              <p>
                If you did not request
                this, you can ignore this
                email.
              </p>
            `
          );
        } catch (mailError) {
          console.error(
            'Failed to send reset email:',
            mailError.message
          );
        }
      }

      return res.status(200).json({
        error: '',
      });
    } catch (error) {
      console.error(
        'Forgot-password error:',
        error
      );

      return res.status(500).json({
        error:
          'Unable to process the password reset request right now',
      });
    }
  }
);

// -----------------------------------------------------------------------------
// Reset password
// -----------------------------------------------------------------------------

app.post(
  '/api/reset-password',
  async (req, res) => {
    const token = String(
      req.body.token || ''
    ).trim();

    const newPassword = String(
      req.body.newPassword || ''
    );

    if (!token || !newPassword) {
      return res.status(200).json({
        error:
          'Token and new password are required',
      });
    }

    if (
      newPassword.length <
      MIN_PASSWORD_LENGTH
    ) {
      return res.status(200).json({
        error:
          `Password must contain at least ${MIN_PASSWORD_LENGTH} characters`,
      });
    }

    try {
      const db = getDatabase();

      const user = await db
        .collection('Users')
        .findOne({
          resetToken: token,
        });

      if (!user) {
        return res.status(200).json({
          error:
            'Invalid or expired reset link',
        });
      }

      if (
        !user.resetTokenExpiry ||
        new Date(
          user.resetTokenExpiry
        ) < new Date()
      ) {
        return res.status(200).json({
          error:
            'Reset link has expired',
        });
      }

      const hashedPassword =
        await bcrypt.hash(
          newPassword,
          SALT_ROUNDS
        );

      await db
        .collection('Users')
        .updateOne(
          {
            _id: user._id,
          },
          {
            $set: {
              password: hashedPassword,
              updatedAt: new Date(),
            },

            $unset: {
              resetToken: '',
              resetTokenExpiry: '',
            },
          }
        );

      return res.status(200).json({
        error: '',
      });
    } catch (error) {
      console.error(
        'Reset-password error:',
        error
      );

      return res.status(500).json({
        error:
          'Unable to reset the password right now',
      });
    }
  }
);

// -----------------------------------------------------------------------------
// Current user
// -----------------------------------------------------------------------------

app.get(
  '/api/me',
  authenticateToken,
  async (req, res) => {
    try {
      if (
        !isValidObjectId(req.userId)
      ) {
        return res.status(401).json({
          error:
            'Invalid user session',
        });
      }

      const db = getDatabase();

      const user = await db
        .collection('Users')
        .findOne({
          _id: new ObjectId(
            req.userId
          ),
        });

      if (!user) {
        return res.status(200).json({
          error: 'User not found',
        });
      }

      return res.status(200).json({
        id: user._id.toString(),
        firstName:
          user.firstName || '',
        lastName:
          user.lastName || '',
        username: user.username,
        email: user.email || '',
        emailVerified: Boolean(
          user.emailVerified
        ),
        error: '',
      });
    } catch (error) {
      console.error(
        'Current-user error:',
        error
      );

      return res.status(500).json({
        error:
          'Unable to load the current user',
      });
    }
  }
);

// -----------------------------------------------------------------------------
// Update profile/settings
// -----------------------------------------------------------------------------

app.put(
  '/api/profile',
  authenticateToken,
  async (req, res) => {
    const firstName = String(
      req.body.firstName || ''
    ).trim();

    const lastName = String(
      req.body.lastName || ''
    ).trim();

    try {
      if (
        !isValidObjectId(req.userId)
      ) {
        return res.status(401).json({
          error:
            'Invalid user session',
        });
      }

      const db = getDatabase();

      const result = await db
        .collection('Users')
        .updateOne(
          {
            _id: new ObjectId(
              req.userId
            ),
          },
          {
            $set: {
              firstName,
              lastName,
              updatedAt: new Date(),
            },
          }
        );

      if (result.matchedCount === 0) {
        return res.status(200).json({
          error: 'User not found',
        });
      }

      return res.status(200).json({
        firstName,
        lastName,
        error: '',
      });
    } catch (error) {
      console.error(
        'Profile update error:',
        error
      );

      return res.status(500).json({
        error:
          'Unable to update profile right now',
      });
    }
  }
);

// -----------------------------------------------------------------------------
// Get all notes
// -----------------------------------------------------------------------------

app.get(
  '/api/notes',
  authenticateToken,
  async (req, res) => {
    try {
      const db = getDatabase();

      const notes = await db
        .collection('Notes')
        .find({
          userId: req.userId,
        })
        .sort({
          updatedAt: -1,
          createdAt: -1,
        })
        .toArray();

      return res.status(200).json({
        notes,
        error: '',
      });
    } catch (error) {
      console.error(
        'Get notes error:',
        error
      );

      return res.status(500).json({
        notes: [],
        error:
          'Unable to load notes right now',
      });
    }
  }
);

// -----------------------------------------------------------------------------
// Get one note
// -----------------------------------------------------------------------------

app.get(
  '/api/notes/:id',
  authenticateToken,
  async (req, res) => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(200).json({
        note: null,
        error: 'Invalid note ID',
      });
    }

    try {
      const db = getDatabase();

      const note = await db
        .collection('Notes')
        .findOne({
          _id: new ObjectId(id),
          userId: req.userId,
        });

      if (!note) {
        return res.status(200).json({
          note: null,
          error: 'Note not found',
        });
      }

      return res.status(200).json({
        note,
        error: '',
      });
    } catch (error) {
      console.error(
        'Get note error:',
        error
      );

      return res.status(500).json({
        note: null,
        error:
          'Unable to load the note right now',
      });
    }
  }
);

// -----------------------------------------------------------------------------
// Create note
// -----------------------------------------------------------------------------

app.post(
  '/api/notes',
  authenticateToken,
  async (req, res) => {
    const title = String(
      req.body.title || ''
    ).trim();

    const body = String(
      req.body.body || ''
    );

    if (!title) {
      return res.status(200).json({
        id: -1,
        note: null,
        error:
          'Note title is required',
      });
    }

    try {
      const db = getDatabase();
      const now = new Date();

      const note = {
        userId: req.userId,
        title,
        body,
        createdAt: now,
        updatedAt: now,
      };

      const result = await db
        .collection('Notes')
        .insertOne(note);

      note._id = result.insertedId;

      return res.status(200).json({
        id:
          result.insertedId.toString(),
        note,
        error: '',
      });
    } catch (error) {
      console.error(
        'Create note error:',
        error
      );

      return res.status(500).json({
        id: -1,
        note: null,
        error:
          'Unable to create the note right now',
      });
    }
  }
);

// -----------------------------------------------------------------------------
// Update note
// -----------------------------------------------------------------------------

app.put(
  '/api/notes/:id',
  authenticateToken,
  async (req, res) => {
    const { id } = req.params;

    const title = String(
      req.body.title || ''
    ).trim();

    const body = String(
      req.body.body || ''
    );

    if (!isValidObjectId(id)) {
      return res.status(200).json({
        note: null,
        error: 'Invalid note ID',
      });
    }

    if (!title) {
      return res.status(200).json({
        note: null,
        error:
          'Note title is required',
      });
    }

    try {
      const db = getDatabase();

      const result = await db
        .collection('Notes')
        .findOneAndUpdate(
          {
            _id: new ObjectId(id),
            userId: req.userId,
          },
          {
            $set: {
              title,
              body,
              updatedAt: new Date(),
            },
          },
          {
            returnDocument: 'after',
          }
        );

      /*
       * MongoDB driver versions may return either:
       * - the updated document directly, or
       * - an object containing a value property.
       */
      const updatedNote =
        result?.value ?? result;

      if (!updatedNote) {
        return res.status(200).json({
          note: null,
          error: 'Note not found',
        });
      }

      return res.status(200).json({
        note: updatedNote,
        error: '',
      });
    } catch (error) {
      console.error(
        'Update note error:',
        error
      );

      return res.status(500).json({
        note: null,
        error:
          'Unable to update the note right now',
      });
    }
  }
);

// -----------------------------------------------------------------------------
// Delete note
// -----------------------------------------------------------------------------

app.delete(
  '/api/notes/:id',
  authenticateToken,
  async (req, res) => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(200).json({
        error: 'Invalid note ID',
      });
    }

    try {
      const db = getDatabase();

      const result = await db
        .collection('Notes')
        .deleteOne({
          _id: new ObjectId(id),
          userId: req.userId,
        });

      if (
        result.deletedCount === 0
      ) {
        return res.status(200).json({
          error: 'Note not found',
        });
      }

      return res.status(200).json({
        error: '',
      });
    } catch (error) {
      console.error(
        'Delete note error:',
        error
      );

      return res.status(500).json({
        error:
          'Unable to delete the note right now',
      });
    }
  }
);

// -----------------------------------------------------------------------------
// API 404
// -----------------------------------------------------------------------------

app.use('/api', (req, res) => {
  res.status(404).json({
    error: 'API route not found',
  });
});

// -----------------------------------------------------------------------------
// Server error handler
// -----------------------------------------------------------------------------

app.use(
  (error, req, res, next) => {
    console.error(
      'Unhandled server error:',
      error
    );

    if (
      error.message?.startsWith(
        'Origin not allowed by CORS'
      )
    ) {
      return res.status(403).json({
        error: error.message,
      });
    }

    return res.status(500).json({
      error:
        'Internal server error',
    });
  }
);

// -----------------------------------------------------------------------------
// Startup and graceful shutdown
// -----------------------------------------------------------------------------

let server;

async function startServer() {
  try {
    await client.connect();

    await client
      .db('admin')
      .command({
        ping: 1,
      });

    console.log(
      'MongoDB connected successfully'
    );

    console.log(
      `Allowed CORS origins: ${allowedOrigins.join(
        ', '
      )}`
    );

    console.log(
      `Frontend URL for email links: ${FRONTEND_URL}`
    );

    server = app.listen(
      PORT,
      () => {
        console.log(
          `Server listening on port ${PORT}`
        );
      }
    );
  } catch (error) {
    console.error(
      'MongoDB connection failed at startup:',
      error
    );

    process.exit(1);
  }
}

async function shutdown(signal) {
  console.log(
    `${signal} received. Shutting down...`
  );

  if (server) {
    server.close();
  }

  await client.close();
  process.exit(0);
}

process.on(
  'SIGINT',
  () => shutdown('SIGINT')
);

process.on(
  'SIGTERM',
  () => shutdown('SIGTERM')
);

startServer();