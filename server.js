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
const VERIFICATION_CODE_TTL_MS = 60 * 60 * 1000;
const VERIFICATION_CODE_LENGTH = 6;
const MAX_VERIFICATION_ATTEMPTS = 5;
const VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;
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

function generateVerificationCode() {
  const upperLimit = 10 ** VERIFICATION_CODE_LENGTH;

  return crypto
    .randomInt(0, upperLimit)
    .toString()
    .padStart(VERIFICATION_CODE_LENGTH, '0');
}

function hashVerificationCode(email, code) {
  return crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${normalizeEmail(email)}:${String(code)}`)
    .digest('hex');
}

function verificationCodeMatches(
  email,
  submittedCode,
  expectedHash
) {
  if (!expectedHash) {
    return false;
  }

  const submittedHash = hashVerificationCode(
    email,
    submittedCode
  );

  const submittedBuffer = Buffer.from(
    submittedHash,
    'hex'
  );

  const expectedBuffer = Buffer.from(
    expectedHash,
    'hex'
  );

  return (
    submittedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(
      submittedBuffer,
      expectedBuffer
    )
  );
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
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

async function sendVerificationCodeEmail(
  email,
  displayName,
  verificationCode,
  expiresAt
) {
  const safeDisplayName = escapeHtml(
    displayName || 'there'
  );

  const expirationTime = new Intl.DateTimeFormat(
    'en-US',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/New_York',
    }
  ).format(expiresAt);

  await sendMail(
    email,
    'Your Noteriety verification code',
    `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1a2b22;">
        <p>Hi ${safeDisplayName},</p>

        <p>
          Enter this six-digit code to verify your
          Noteriety email address:
        </p>

        <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; margin: 24px 0;">
          ${verificationCode}
        </p>

        <p>
          This registration expires at
          ${escapeHtml(expirationTime)} ET, one hour after it was created.
        </p>

        <p>
          If you did not create a Noteriety account,
          you can ignore this email.
        </p>
      </div>
    `
  );
}

async function authenticateToken(req, res, next) {
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

  try {
    const payload = jwt.verify(
      token,
      JWT_SECRET
    );

    if (
      !payload?.userId ||
      !isValidObjectId(payload.userId)
    ) {
      return res.status(401).json({
        error: 'Invalid or expired token',
      });
    }

    const user = await getDatabase()
      .collection('Users')
      .findOne(
        {
          _id: new ObjectId(
            payload.userId
          ),
        },
        {
          projection: {
            emailVerified: 1,
          },
        }
      );

    if (!user) {
      return res.status(401).json({
        error: 'User account not found',
      });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        error:
          'Please verify your email before accessing your account.',
      });
    }

    req.userId = payload.userId;
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Invalid or expired token',
    });
  }
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

const verifyEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,

  message: {
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
    const username = normalizeUsername(
      req.body.username
    );

    const password = String(
      req.body.password || ''
    );

    if (!username || !password) {
      return res.status(400).json({
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
        return res.status(401).json({
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
        return res.status(401).json({
          id: -1,
          firstName: '',
          lastName: '',
          error:
            'Invalid username or password',
        });
      }

      if (!user.emailVerified) {
        const registrationExpired =
          !user.createdAt ||
          new Date(user.createdAt).getTime() <=
            Date.now() -
              VERIFICATION_CODE_TTL_MS;

        if (registrationExpired) {
          await db
            .collection('Users')
            .deleteOne({
              _id: user._id,
              emailVerified: {
                $ne: true,
              },
            });
        }

        return res.status(403).json({
          id: -1,
          firstName: '',
          lastName: '',
          error: registrationExpired
            ? 'Your unverified registration expired. Please sign up again.'
            : 'Please verify your email before logging in.',
        });
      }

      const token = signJwt(user._id);

      return res.status(200).json({
        id: user._id.toString(),
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        username: user.username,
        email: user.email || '',
        emailVerified: true,
        token,
        error: '',
      });
    } catch (error) {
      console.error('Login error:', error);

      return res.status(500).json({
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
    const username = normalizeUsername(
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

    const email = normalizeEmail(
      req.body.email
    );

    if (!username || !password || !email) {
      return res.status(400).json({
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
      return res.status(400).json({
        id: -1,
        firstName: '',
        lastName: '',
        error:
          `Password must contain at least ${MIN_PASSWORD_LENGTH} characters`,
      });
    }

    try {
      const db = getDatabase();
      const users = db.collection('Users');
      const pendingRegistrations =
        db.collection(
          'PendingRegistrations'
        );

      const now = new Date();

      await pendingRegistrations.deleteMany({
        expiresAt: {
          $lte: now,
        },
      });

      const existingUser = await users.findOne({
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
        return res.status(409).json({
          id: -1,
          firstName: '',
          lastName: '',
          error:
            'Username or email already in use',
        });
      }

      const existingPending =
        await pendingRegistrations.findOne({
          $or: [
            {
              username,
            },
            {
              email,
            },
          ],
        });

      if (
        existingPending &&
        (
          existingPending.username !== username ||
          existingPending.email !== email
        )
      ) {
        return res.status(409).json({
          id: -1,
          firstName: '',
          lastName: '',
          error:
            'Username or email is temporarily reserved by another pending registration',
        });
      }

      const hashedPassword =
        await bcrypt.hash(
          password,
          SALT_ROUNDS
        );

      const verificationCode =
        generateVerificationCode();

      const expiresAt = new Date(
        Date.now() +
          VERIFICATION_CODE_TTL_MS
      );

      const pendingRegistration = {
        username,
        password: hashedPassword,
        firstName,
        lastName,
        email,
        verificationCodeHash:
          hashVerificationCode(
            email,
            verificationCode
          ),
        verificationAttempts: 0,
        lastCodeSentAt: now,
        createdAt: now,
        updatedAt: now,
        expiresAt,
      };

      let pendingId;

      if (existingPending) {
        pendingId = existingPending._id;

        await pendingRegistrations.updateOne(
          {
            _id: existingPending._id,
          },
          {
            $set: pendingRegistration,
          }
        );
      } else {
        const result =
          await pendingRegistrations.insertOne(
            pendingRegistration
          );

        pendingId = result.insertedId;
      }

      try {
        await sendVerificationCodeEmail(
          email,
          firstName || username,
          verificationCode,
          expiresAt
        );
      } catch (mailError) {
        await pendingRegistrations.deleteOne({
          _id: pendingId,
        });

        console.error(
          'Failed to send verification code:',
          mailError.message
        );

        return res.status(503).json({
          id: -1,
          firstName: '',
          lastName: '',
          error:
            'The account was not created because the verification email could not be sent. Please try again.',
        });
      }

      return res.status(200).json({
        id: null,
        firstName,
        lastName,
        username,
        email,
        emailVerified: false,
        expiresAt: expiresAt.toISOString(),
        message:
          'A six-digit verification code was sent to your email.',
        error: '',
      });
    } catch (error) {
      console.error(
        'Registration error:',
        error
      );

      if (error?.code === 11000) {
        return res.status(409).json({
          id: -1,
          firstName: '',
          lastName: '',
          error:
            'Username or email already in use',
        });
      }

      return res.status(500).json({
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
// Verify email code and create the real user
// -----------------------------------------------------------------------------

app.post(
  '/api/verify-email',
  verifyEmailLimiter,
  async (req, res) => {
    const email = normalizeEmail(
      req.body.email
    );

    const code = String(
      req.body.code || ''
    ).trim();

    if (
      !email ||
      !new RegExp(
        `^\\d{${VERIFICATION_CODE_LENGTH}}$`
      ).test(code)
    ) {
      return res.status(400).json({
        error:
          'Email and a valid six-digit verification code are required',
      });
    }

    try {
      const db = getDatabase();
      const users = db.collection('Users');
      const pendingRegistrations =
        db.collection(
          'PendingRegistrations'
        );

      const pending =
        await pendingRegistrations.findOne({
          email,
        });

      if (!pending) {
        return res.status(410).json({
          error:
            'This registration is invalid or has expired. Please sign up again.',
        });
      }

      if (
        !pending.expiresAt ||
        new Date(pending.expiresAt) <=
          new Date()
      ) {
        await pendingRegistrations.deleteOne({
          _id: pending._id,
        });

        return res.status(410).json({
          error:
            'This registration expired after one hour. Please sign up again.',
        });
      }

      const codeMatches =
        verificationCodeMatches(
          email,
          code,
          pending.verificationCodeHash
        );

      if (!codeMatches) {
        const nextAttemptCount =
          Number(
            pending.verificationAttempts || 0
          ) + 1;

        if (
          nextAttemptCount >=
          MAX_VERIFICATION_ATTEMPTS
        ) {
          await pendingRegistrations.deleteOne({
            _id: pending._id,
          });

          return res.status(429).json({
            error:
              'Too many incorrect codes. This pending registration was deleted; please sign up again.',
          });
        }

        await pendingRegistrations.updateOne(
          {
            _id: pending._id,
          },
          {
            $set: {
              verificationAttempts:
                nextAttemptCount,
              updatedAt: new Date(),
            },
          }
        );

        return res.status(400).json({
          error:
            `Incorrect verification code. ${MAX_VERIFICATION_ATTEMPTS - nextAttemptCount} attempts remaining.`,
        });
      }

      const conflict = await users.findOne({
        $or: [
          {
            username: pending.username,
          },
          {
            email: pending.email,
          },
        ],
      });

      if (conflict) {
        await pendingRegistrations.deleteOne({
          _id: pending._id,
        });

        return res.status(409).json({
          error:
            'That username or email is already registered. Please log in or choose different account details.',
        });
      }

      const now = new Date();

      let result;

      try {
        result = await users.insertOne({
          username: pending.username,
          password: pending.password,
          firstName:
            pending.firstName || '',
          lastName:
            pending.lastName || '',
          email: pending.email,
          emailVerified: true,
          resetToken: null,
          resetTokenExpiry: null,
          registrationStartedAt:
            pending.createdAt || now,
          createdAt: now,
          updatedAt: now,
        });
      } catch (insertError) {
        if (insertError?.code !== 11000) {
          throw insertError;
        }

        const alreadyVerifiedUser =
          await users.findOne({
            username: pending.username,
            email: pending.email,
            emailVerified: true,
          });

        if (!alreadyVerifiedUser) {
          throw insertError;
        }

        await pendingRegistrations.deleteOne({
          _id: pending._id,
        });

        return res.status(200).json({
          id:
            alreadyVerifiedUser._id.toString(),
          username: pending.username,
          email: pending.email,
          emailVerified: true,
          message:
            'Your email has already been verified. You can now log in.',
          error: '',
        });
      }

      try {
        await pendingRegistrations.deleteOne({
          _id: pending._id,
        });
      } catch (cleanupError) {
        console.error(
          'Verified user created, but pending registration cleanup failed:',
          cleanupError
        );
      }

      return res.status(200).json({
        id: result.insertedId.toString(),
        username: pending.username,
        email: pending.email,
        emailVerified: true,
        message:
          'Your email has been verified. You can now log in.',
        error: '',
      });
    } catch (error) {
      console.error(
        'Email verification error:',
        error
      );

      if (error?.code === 11000) {
        return res.status(409).json({
          error:
            'That username or email is already registered.',
        });
      }

      return res.status(500).json({
        error:
          'Unable to verify email right now',
      });
    }
  }
);

// Old email links are intentionally no longer accepted.
app.get('/api/verify-email', (req, res) => {
  return res.status(410).json({
    error:
      'Verification links are no longer used. Enter the six-digit code from your email instead.',
  });
});

// -----------------------------------------------------------------------------
// Resend verification code
// -----------------------------------------------------------------------------

app.post(
  '/api/resend-verification',
  resendVerificationLimiter,
  async (req, res) => {
    const email = normalizeEmail(
      req.body.email
    );

    if (!email) {
      return res.status(400).json({
        error: 'Email is required',
      });
    }

    try {
      const db = getDatabase();
      const pendingRegistrations =
        db.collection(
          'PendingRegistrations'
        );

      const pending =
        await pendingRegistrations.findOne({
          email,
        });

      if (!pending) {
        return res.status(410).json({
          error:
            'No active registration was found. Please sign up again.',
        });
      }

      if (
        !pending.expiresAt ||
        new Date(pending.expiresAt) <=
          new Date()
      ) {
        await pendingRegistrations.deleteOne({
          _id: pending._id,
        });

        return res.status(410).json({
          error:
            'This registration expired after one hour. Please sign up again.',
        });
      }

      const lastCodeSentAt = pending.lastCodeSentAt
        ? new Date(
            pending.lastCodeSentAt
          ).getTime()
        : 0;

      const millisecondsSinceLastCode =
        Date.now() - lastCodeSentAt;

      if (
        millisecondsSinceLastCode <
        VERIFICATION_RESEND_COOLDOWN_MS
      ) {
        const secondsRemaining = Math.ceil(
          (
            VERIFICATION_RESEND_COOLDOWN_MS -
            millisecondsSinceLastCode
          ) / 1000
        );

        return res.status(429).json({
          error:
            `Please wait ${secondsRemaining} seconds before requesting another code.`,
        });
      }

      const verificationCode =
        generateVerificationCode();

      const previousCodeHash =
        pending.verificationCodeHash;

      const previousLastCodeSentAt =
        pending.lastCodeSentAt || null;

      const now = new Date();

      await pendingRegistrations.updateOne(
        {
          _id: pending._id,
        },
        {
          $set: {
            verificationCodeHash:
              hashVerificationCode(
                email,
                verificationCode
              ),
            verificationAttempts: 0,
            lastCodeSentAt: now,
            updatedAt: now,
          },
        }
      );

      try {
        await sendVerificationCodeEmail(
          email,
          pending.firstName ||
            pending.username,
          verificationCode,
          new Date(pending.expiresAt)
        );
      } catch (mailError) {
        await pendingRegistrations.updateOne(
          {
            _id: pending._id,
          },
          {
            $set: {
              verificationCodeHash:
                previousCodeHash,
              lastCodeSentAt:
                previousLastCodeSentAt,
              updatedAt: new Date(),
            },
          }
        );

        console.error(
          'Failed to resend verification code:',
          mailError.message
        );

        return res.status(503).json({
          error:
            'Unable to send another verification code right now.',
        });
      }

      return res.status(200).json({
        expiresAt: new Date(
          pending.expiresAt
        ).toISOString(),
        message:
          'A new verification code was sent.',
        error: '',
      });
    } catch (error) {
      console.error(
        'Resend verification error:',
        error
      );

      return res.status(500).json({
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

    const username = normalizeUsername(
      req.body.username
    );

    if (!username) {
      return res.status(200).json({
        error: 'Username is required',
      });
    }

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

      const existingUser = await db
        .collection('Users')
        .findOne({
          username,
          _id: {
            $ne: new ObjectId(
              req.userId
            ),
          },
        });

      if (existingUser) {
        return res.status(200).json({
          error:
            'Username is already in use',
        });
      }

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
              username,
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
        username,
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
// Get all categories
// -----------------------------------------------------------------------------

app.get(
  '/api/categories',
  authenticateToken,
  async (req, res) => {
    try {
      const db = getDatabase();

      const categories = await db
        .collection('Categories')
        .find({
          userId: req.userId,
        })
        .sort({
          name: 1,
        })
        .toArray();

      return res.status(200).json({
        categories,
        error: '',
      });
    } catch (error) {
      console.error(
        'Get categories error:',
        error
      );

      return res.status(500).json({
        categories: [],
        error:
          'Unable to load categories right now',
      });
    }
  }
);

// -----------------------------------------------------------------------------
// Create category
// -----------------------------------------------------------------------------

app.post(
  '/api/categories',
  authenticateToken,
  async (req, res) => {
    const name = String(
      req.body.name || ''
    ).trim();

    if (!name) {
      return res.status(200).json({
        id: -1,
        category: null,
        error:
          'Category name is required',
      });
    }

    try {
      const db = getDatabase();

      const existingCategory = await db
        .collection('Categories')
        .findOne({
          userId: req.userId,
          name,
        });

      if (existingCategory) {
        return res.status(200).json({
          id: -1,
          category: null,
          error:
            'A category with that name already exists',
        });
      }

      const now = new Date();

      const category = {
        userId: req.userId,
        name,
        createdAt: now,
        updatedAt: now,
      };

      const result = await db
        .collection('Categories')
        .insertOne(category);

      category._id = result.insertedId;

      return res.status(200).json({
        id:
          result.insertedId.toString(),
        category,
        error: '',
      });
    } catch (error) {
      console.error(
        'Create category error:',
        error
      );

      return res.status(500).json({
        id: -1,
        category: null,
        error:
          'Unable to create the category right now',
      });
    }
  }
);

// -----------------------------------------------------------------------------
// Rename category
// -----------------------------------------------------------------------------

app.put(
  '/api/categories/:id',
  authenticateToken,
  async (req, res) => {
    const { id } = req.params;

    const name = String(
      req.body.name || ''
    ).trim();

    if (!isValidObjectId(id)) {
      return res.status(200).json({
        category: null,
        error: 'Invalid category ID',
      });
    }

    if (!name) {
      return res.status(200).json({
        category: null,
        error:
          'Category name is required',
      });
    }

    try {
      const db = getDatabase();

      const existingCategory = await db
        .collection('Categories')
        .findOne({
          userId: req.userId,
          name,
          _id: {
            $ne: new ObjectId(id),
          },
        });

      if (existingCategory) {
        return res.status(200).json({
          category: null,
          error:
            'A category with that name already exists',
        });
      }

      const result = await db
        .collection('Categories')
        .findOneAndUpdate(
          {
            _id: new ObjectId(id),
            userId: req.userId,
          },
          {
            $set: {
              name,
              updatedAt: new Date(),
            },
          },
          {
            returnDocument: 'after',
          }
        );

      const updatedCategory =
        result?.value ?? result;

      if (!updatedCategory) {
        return res.status(200).json({
          category: null,
          error: 'Category not found',
        });
      }

      return res.status(200).json({
        category: updatedCategory,
        error: '',
      });
    } catch (error) {
      console.error(
        'Rename category error:',
        error
      );

      return res.status(500).json({
        category: null,
        error:
          'Unable to rename the category right now',
      });
    }
  }
);

// -----------------------------------------------------------------------------
// Delete category
// -----------------------------------------------------------------------------

app.delete(
  '/api/categories/:id',
  authenticateToken,
  async (req, res) => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(200).json({
        error: 'Invalid category ID',
      });
    }

    try {
      const db = getDatabase();

      const result = await db
        .collection('Categories')
        .deleteOne({
          _id: new ObjectId(id),
          userId: req.userId,
        });

      if (
        result.deletedCount === 0
      ) {
        return res.status(200).json({
          error: 'Category not found',
        });
      }

      await db
        .collection('Notes')
        .updateMany(
          {
            userId: req.userId,
            categoryId: id,
          },
          {
            $set: {
              categoryId: null,
              updatedAt: new Date(),
            },
          }
        );

      return res.status(200).json({
        error: '',
      });
    } catch (error) {
      console.error(
        'Delete category error:',
        error
      );

      return res.status(500).json({
        error:
          'Unable to delete the category right now',
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
    const categoryId = String(
      req.query.categoryId || ''
    ).trim();

    try {
      const db = getDatabase();

      const filter = {
        userId: req.userId,
      };

      if (categoryId === 'uncategorized') {
        filter.categoryId = null;
      } else if (categoryId) {
        if (!isValidObjectId(categoryId)) {
          return res.status(200).json({
            notes: [],
            error: 'Invalid category ID',
          });
        }

        filter.categoryId = categoryId;
      }

      const notes = await db
        .collection('Notes')
        .find(filter)
        .sort({
          isPinned: -1,
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

    const categoryId = String(
      req.body.categoryId || ''
    ).trim();

    if (!title) {
      return res.status(200).json({
        id: -1,
        note: null,
        error:
          'Note title is required',
      });
    }

    if (
      categoryId &&
      !isValidObjectId(categoryId)
    ) {
      return res.status(200).json({
        id: -1,
        note: null,
        error: 'Invalid category ID',
      });
    }

    try {
      const db = getDatabase();

      if (categoryId) {
        const category = await db
          .collection('Categories')
          .findOne({
            _id: new ObjectId(categoryId),
            userId: req.userId,
          });

        if (!category) {
          return res.status(200).json({
            id: -1,
            note: null,
            error: 'Category not found',
          });
        }
      }

      const now = new Date();

      const note = {
        userId: req.userId,
        title,
        body,
        categoryId: categoryId || null,
        isPinned: false,
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

    const categoryId = String(
      req.body.categoryId || ''
    ).trim();

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

    if (
      categoryId &&
      !isValidObjectId(categoryId)
    ) {
      return res.status(200).json({
        note: null,
        error: 'Invalid category ID',
      });
    }

    try {
      const db = getDatabase();

      if (categoryId) {
        const category = await db
          .collection('Categories')
          .findOne({
            _id: new ObjectId(categoryId),
            userId: req.userId,
          });

        if (!category) {
          return res.status(200).json({
            note: null,
            error: 'Category not found',
          });
        }
      }

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
              categoryId: categoryId || null,
              updatedAt: new Date(),
            },
          },
          {
            returnDocument: 'after',
          }
        );

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
// Update pinned status
// -----------------------------------------------------------------------------

app.put(
  '/api/notes/:id/pin',
  authenticateToken,
  async (req, res) => {
    const { id } = req.params;
    const isPinned = Boolean(req.body.isPinned);

    if (!isValidObjectId(id)) {
      return res.status(200).json({
        note: null,
        error: 'Invalid note ID',
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
              isPinned,
              updatedAt: new Date(),
            },
          },
          {
            returnDocument: 'after',
          }
        );

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
        'Update pinned status error:',
        error
      );

      return res.status(500).json({
        note: null,
        error:
          'Unable to update the pinned status right now',
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

async function ensureDatabaseIndexes() {
  const db = getDatabase();
  const users = db.collection('Users');

  const pendingRegistrations =
    db.collection('PendingRegistrations');

  await users.createIndex(
    {
      username: 1,
    },
    {
      unique: true,
      name: 'users_unique_username',
      partialFilterExpression: {
        username: {
          $type: 'string',
        },
      },
    }
  );

  await users.createIndex(
    {
      email: 1,
    },
    {
      unique: true,
      name: 'users_unique_email',
      partialFilterExpression: {
        email: {
          $type: 'string',
        },
      },
    }
  );

  /*
   * Removes old-style unverified Users documents
   * one hour after their creation.
   *
   * New registrations are kept in
   * PendingRegistrations instead.
   */
  await users.createIndex(
    {
      createdAt: 1,
    },
    {
      expireAfterSeconds:
        VERIFICATION_CODE_TTL_MS / 1000,

      name:
        'delete_legacy_unverified_users_after_one_hour',

      partialFilterExpression: {
        emailVerified: false,
      },
    }
  );

  await pendingRegistrations.createIndex(
    {
      username: 1,
    },
    {
      unique: true,
      name:
        'pending_registrations_unique_username',
    }
  );

  await pendingRegistrations.createIndex(
    {
      email: 1,
    },
    {
      unique: true,
      name:
        'pending_registrations_unique_email',
    }
  );

  /*
   * MongoDB automatically removes each pending
   * registration after its expiresAt date.
   *
   * TTL cleanup may occur shortly after the exact
   * expiration time. The API also checks expiresAt
   * itself, so an expired registration cannot be used
   * while waiting for MongoDB's cleanup worker.
   */
  await pendingRegistrations.createIndex(
    {
      expiresAt: 1,
    },
    {
      expireAfterSeconds: 0,
      name:
        'delete_expired_pending_registrations',
    }
  );

  /*
   * Immediately removes legacy unverified accounts
   * that are already older than one hour.
   */
  const legacyCutoff = new Date(
    Date.now() -
      VERIFICATION_CODE_TTL_MS
  );

  await users.deleteMany({
    emailVerified: {
      $ne: true,
    },

    $or: [
      {
        createdAt: {
          $lte: legacyCutoff,
        },
      },
      {
        createdAt: {
          $exists: false,
        },
      },
      {
        createdAt: null,
      },
    ],
  });
}

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

    await ensureDatabaseIndexes();

    console.log(
      'MongoDB indexes ready'
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