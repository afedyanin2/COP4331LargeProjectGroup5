const { MongoClient, ObjectId } = require('mongodb'); // pulls in mongoDB driver
require('dotenv').config(); // load environment variables from .env file
const bcrypt = require('bcrypt'); // for password hashing
const crypto = require('crypto'); // for generating random tokens
const jwt = require('jsonwebtoken'); // for JWT authentication
const rateLimit = require('express-rate-limit'); // for rate limiting requests

// Connect to MongoDB
const url = process.env.MONGODB_URI;
const client = new MongoClient(url);

// Set up Express server
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(bodyParser.json());


//-------- Configuration constants
const SALT_ROUNDS = 12; // bcrypt salt rounds for password hashing
const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;   // email verification token expires in 24 hours
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;         // password reset token expires in 1 hour
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5000'; // URL of the frontend application for email links
const JWT_SECRET = process.env.JWT_SECRET; // secret key for signing JWTs
const JWT_EXPIRES_IN = '7d'; // JWT expiration time (7 days)

// Warn if JWT_SECRET is not set, since it's critical for security
if (!JWT_SECRET)
{
    console.warn('WARNING: JWT_SECRET is not set. Set it in your .env file before running in production.');
}

// Emails are sent via Resend's HTTP API (not SMTP) - see sendMail() below.
// This avoids DigitalOcean's default outbound SMTP port block on 465/587.
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';

if (!RESEND_API_KEY)
{
    console.warn('WARNING: RESEND_API_KEY is not set. Emails will fail to send.');
}

//------- helper functions

// Generates a random token for email verification or password reset
function generateToken()
{
    return crypto.randomBytes(32).toString('hex');
}

// Signs a JWT for the given user, including their userId in the payload
function signJwt(user)
{
    return jwt.sign({ userId: user._id.toString() }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Sends an email using the Resend API. Throws an error if the request fails.
async function sendMail(to, subject, html)
{
    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: EMAIL_FROM,
            to,
            subject,
            html
        })
    });

    if (!response.ok)
    {
        const errorBody = await response.text();
        throw new Error(`Resend API error (${response.status}): ${errorBody}`);
    }
}

// ---------- rate limiters ----------

// Limit login attempts to 10 per 15 minutes to prevent brute-force attacks
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { id: -1, firstName: '', lastName: '', error: 'Too many login attempts. Please try again later.' }
});

// Limit account registration attempts to 5 per hour to prevent abuse
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { id: -1, firstName: '', lastName: '', error: 'Too many accounts created from this IP. Please try again later.' }
});

// Limit password reset requests to 5 per 15 minutes to prevent abuse
const forgotPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many password reset requests. Please try again later.' }
});

// Limit verification email resends to 5 per 15 minutes to prevent abuse
const resendVerificationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many verification emails requested. Please try again later.' }
});

// ---------- auth middleware ----------
function authenticateToken(req, res, next)
{
    // checks the header exists and starts with "Bearer ", then strips those 7 characters to get just the token string
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    // If no token is provided, return a 401 Unauthorized response
    if (!token)
    {
        return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    // Verify the JWT using the secret key. If valid, attach the userId to the request object and call next() to proceed to the next middleware or route handler.
    jwt.verify(token, JWT_SECRET, (err, payload) =>
    {
        if (err)
        {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
        req.userId = payload.userId;
        next();
    });
}

// ---------- auth routes ----------

// login a user
app.post('/api/login', loginLimiter, async (req, res) =>
{
    // incoming: username, password
    // outgoing: id, firstName, lastName, emailVerified, token, error

    const { username, password } = req.body;

    // Validate that both username and password are provided in the request body. 
    // If either is missing, return a 200 OK response with an error message indicating that both fields are required.
    if (!username || !password)
    {
        return res.status(200).json({ id: -1, firstName: '', lastName: '', error: 'Username and password are required' });
    }

    // Attempt to find the user in the database and verify their password
    try
    {
        // grabs the database and looks for a user with the provided username
        const db = client.db('notetaking_app');
        const user = await db.collection('Users').findOne({ username: username });

        // If no user is found with the provided username, return a 200 OK response with an error message indicating invalid credentials.
        if (!user)
        {
            return res.status(200).json({ id: -1, firstName: '', lastName: '', error: 'Invalid username or password' });
        }

        // Use bcrypt to compare the provided password with the hashed password stored in the database.
        const passwordMatches = await bcrypt.compare(password, user.password);
        if (!passwordMatches)
        {
            return res.status(200).json({ id: -1, firstName: '', lastName: '', error: 'Invalid username or password' });
        }

        const token = signJwt(user); // Generate a JWT for the authenticated user

        // Return a successful response with the user's ID, first name, last name, email verification status, and the generated JWT.
        const ret = {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            emailVerified: !!user.emailVerified,
            token: token,
            error: ''
        };
        res.status(200).json(ret);
    }
    catch (e)
    {
        res.status(500).json({ id: -1, firstName: '', lastName: '', error: e.toString() });
    }
});

// create a new user
app.post('/api/register', registerLimiter, async (req, res) =>
{
    // incoming: username, password, firstName, lastName, email
    // outgoing: id, firstName, lastName, token, error

    const { username, password, firstName, lastName, email } = req.body;

    // Validate that username, password, and email are provided in the request body.
    if (!username || !password || !email)
    {
        return res.status(200).json({ id: -1, firstName: '', lastName: '', error: 'Username, password, and email are required' });
    }

    const db = client.db('notetaking_app');

    try
    {
        // check if username or email already exists
        const existingUser = await db.collection('Users').findOne({
            $or: [{ username: username }, { email: email }] // $or operator checks if either the username or email already exists in the Users collection
        });
        if (existingUser)
        {
            return res.status(200).json({
                id: -1,
                firstName: '',
                lastName: '',
                error: 'Username or email already in use'
            });
        }

        // hash the password and generate a verification token
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const verificationToken = generateToken();
        const verificationTokenExpiry = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);

        // insert the new user into the database
        const results = await db.collection('Users').insertOne({
            username,
            password: hashedPassword,
            firstName,
            lastName,
            email,
            emailVerified: false,
            verificationToken,
            verificationTokenExpiry,
            resetToken: null,
            resetTokenExpiry: null
        });

        // build the verification link and send the email
        const verifyLink = `${FRONTEND_URL}/verify-email?token=${verificationToken}`;
        try
        {
            await sendMail(
                email,
                'Verify your email',
                `<p>Hi ${firstName},</p>
                 <p>Thanks for signing up. Please verify your email by clicking the link below:</p>
                 <p><a href="${verifyLink}">${verifyLink}</a></p>
                 <p>This link expires in 24 hours.</p>`
            );
        }
        catch (mailErr)
        {
            // Registration still succeeds even if the email fails to send;
            // log it so it can be resent/investigated.
            console.error('Failed to send verification email:', mailErr);
        }

        const token = signJwt({ _id: results.insertedId }); // logs the user in immediately after registration by generating a JWT for the new user

        // returns the new users id/name plus their session token
        const ret = {
            id: results.insertedId,
            firstName: firstName,
            lastName: lastName,
            token: token,
            error: ''
        };

        res.status(200).json(ret);
    }
    catch (e)
    {
        console.error('Error registering user:', e);
        res.status(500).json({
            id: -1,
            firstName: '',
            lastName: '',
            error: 'Error registering user'
        });
    }
});

// verify a user's email
app.get('/api/verify-email', async (req, res) =>
{
    // incoming: token (query param)
    // outgoing: error

    const { token } = req.query;

    // Validate that the verification token is provided in the query parameters. 
    // If not, return a 200 OK response with an error message indicating that the token is missing.
    if (!token)
    {
        return res.status(200).json({ error: 'Missing verification token' });
    }

    // Attempt to find the user associated with the provided verification token and verify their email
    try
    {
        // grabs the database and looks for a user with the provided verification token
        const db = client.db('notetaking_app');
        const user = await db.collection('Users').findOne({ verificationToken: token });

        // validate that the user exists and that the verification token has not expired
        if (!user)
        {
            return res.status(200).json({ error: 'Invalid or expired verification link' });
        }

        // Check if the verification token has expired by comparing the current date with the stored expiry date.
        if (!user.verificationTokenExpiry || new Date(user.verificationTokenExpiry) < new Date())
        {
            return res.status(200).json({ error: 'Verification link has expired' });
        }

        // If the token is valid and not expired, update the user's record in the database to mark their email as verified.
        await db.collection('Users').updateOne(
            { _id: user._id },
            {
                $set: { emailVerified: true },
                $unset: { verificationToken: '', verificationTokenExpiry: '' }
            }
        );

        res.status(200).json({ error: '' });
    }
    catch (e)
    {
        res.status(500).json({ error: e.toString() });
    }
});

// resend the verification email
// only works if the user exists and hasn't verified their email yet. Otherwise, it returns a generic success message to avoid leaking which emails are registered.
app.post('/api/resend-verification', resendVerificationLimiter, async (req, res) =>
{
    // incoming: email
    // outgoing: error

    const { email } = req.body;

    // Validate that the email is provided in the request body
    if (!email)
    {
        return res.status(200).json({ error: 'Email is required' });
    }

    try
    {
        const db = client.db('notetaking_app');
        const user = await db.collection('Users').findOne({ email: email });

        // Always return a generic success message, even if the email isn't found or is already verified to avoid leaking which emails are registered
        if (user && !user.emailVerified)
        {
            // Generate a new verification token and set its expiry time
            const verificationToken = generateToken();
            const verificationTokenExpiry = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);

            // Update the user's record in the database with the new verification token and expiry time
            await db.collection('Users').updateOne(
                { _id: user._id },
                { $set: { verificationToken, verificationTokenExpiry } }
            );

            // Build the verification link and send the email
            const verifyLink = `${FRONTEND_URL}/verify-email?token=${verificationToken}`;
            try
            {
                await sendMail(
                    email,
                    'Verify your email',
                    `<p>Hi ${user.firstName},</p>
                     <p>Here's a fresh verification link:</p>
                     <p><a href="${verifyLink}">${verifyLink}</a></p>
                     <p>This link expires in 24 hours.</p>`
                );
            }
            catch (mailErr)
            {
                console.error('Failed to send verification email:', mailErr);
            }
        }

        res.status(200).json({ error: '' });
    }
    catch (e)
    {
        res.status(500).json({ error: e.toString() });
    }
});

// request a password reset
app.post('/api/forgot-password', forgotPasswordLimiter, async (req, res) =>
{
    // incoming: email
    // outgoing: error

    const { email } = req.body;

    // Validate that the email is provided in the request body
    if (!email)
    {
        return res.status(200).json({ error: 'Email is required' });
    }

    // Attempt to find the user associated with the provided email and send a password reset email if they exist
    try
    {
        // grabs the database and looks for a user with the provided email
        const db = client.db('notetaking_app');
        const user = await db.collection('Users').findOne({ email: email });

        // Always return a generic success message, even if the email isn't found to avoid leaking which emails are registered
        if (user)
        {
            // Generate a new reset token and set its expiry time
            const resetToken = generateToken();
            const resetTokenExpiry = new Date(Date.now() + RESET_TOKEN_TTL_MS);

            // Update the user's record in the database with the new reset token and expiry time
            await db.collection('Users').updateOne(
                { _id: user._id },
                { $set: { resetToken, resetTokenExpiry } }
            );

            // Build the password reset link and send the email
            const resetLink = `${FRONTEND_URL}/reset-password?token=${resetToken}`;
            try
            {
                await sendMail(
                    email,
                    'Reset your password',
                    `<p>Hi ${user.firstName},</p>
                     <p>We received a request to reset your password. Click the link below to choose a new one:</p>
                     <p><a href="${resetLink}">${resetLink}</a></p>
                     <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>`
                );
            }
            catch (mailErr)
            {
                console.error('Failed to send reset email:', mailErr);
            }
        }

        res.status(200).json({ error: '' });
    }
    catch (e)
    {
        res.status(500).json({ error: e.toString() });
    }
});

// reset password using a token
app.post('/api/reset-password', async (req, res) =>
{
    // incoming: token, newPassword
    // outgoing: error

    const { token, newPassword } = req.body;

    // Validate that both the reset token and new password are provided in the request body.
    if (!token || !newPassword)
    {
        return res.status(200).json({ error: 'Token and new password are required' });
    }

    // Attempt to find the user associated with the provided reset token and update their password if the token is valid and not expired
    try
    {
        // grabs the database and looks for a user with the provided reset token
        const db = client.db('notetaking_app');
        const user = await db.collection('Users').findOne({ resetToken: token });

        // validate that the user exists and that the reset token has not expired
        if (!user)
        {
            return res.status(200).json({ error: 'Invalid or expired reset link' });
        }

        // Check if the reset token has expired by comparing the current date with the stored expiry date.
        if (!user.resetTokenExpiry || new Date(user.resetTokenExpiry) < new Date())
        {
            return res.status(200).json({ error: 'Reset link has expired' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS); // Hash the new password using bcrypt before storing it in the database

        // Update the user's password in the database and remove the reset token and its expiry time to prevent reuse
        await db.collection('Users').updateOne(
            { _id: user._id },
            {
                $set: { password: hashedPassword },
                $unset: { resetToken: '', resetTokenExpiry: '' }
            }
        );

        res.status(200).json({ error: '' });
    }
    catch (e)
    {
        res.status(500).json({ error: e.toString() });
    }
});

// get current user info
app.get('/api/me', authenticateToken, async (req, res) =>
{
    // incoming: none
    // outgoing: firstName, lastName, username, emailVerified, error

    try
    {
        // grabs the database and looks for a user with the provided userId from the JWT
        const db = client.db('notetaking_app');
        const user = await db.collection('Users').findOne({ _id: new ObjectId(req.userId) });

        // validate that the user exists
        if (!user)
        {
            return res.status(200).json({ error: 'User not found' });
        }
        res.status(200).json({
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            emailVerified: !!user.emailVerified,
            error: ''
        });
    }
    catch (e)
    {
        res.status(500).json({ error: e.toString() });
    }
});

// ---------- notes ----------
// All notes routes require a valid JWT

// get all notes for the logged-in user
app.get('/api/notes', authenticateToken, async (req, res) =>
{
    // incoming: none
    // outgoing: notes (array of note objects), error

    try
    {
        // grabs the database and retrieves all notes associated with the logged-in user's userId from the JWT
        const db = client.db('notetaking_app');
        const notes = await db.collection('Notes').find({ userId: req.userId }).toArray();
        res.status(200).json({ notes: notes, error: '' });
    }
    catch (e)
    {
        res.status(500).json({ notes: [], error: e.toString() });
    }
});

// get a specific note by ID
app.get('/api/notes/:id', authenticateToken, async (req, res) =>
{
    // incoming: none
    // outgoing: note (note object), error

    const { id } = req.params;
    try
    {
        // grabs the database and retrieves the note with the specified ID
        const db = client.db('notetaking_app');
        const note = await db.collection('Notes').findOne({ _id: new ObjectId(id) });

        // validate that the note exists and belongs to the logged-in user
        if (!note || note.userId !== req.userId)
        {
            return res.status(200).json({ note: null, error: 'Note not found' });
        }
        res.status(200).json({ note: note, error: '' });
    }
    catch (e)
    {
        res.status(500).json({ note: null, error: e.toString() });
    }
});

// create a new note
app.post('/api/notes', authenticateToken, async (req, res) =>
{
    // incoming: title, body
    // outgoing: id (new note ID), error
    
    const { title, body } = req.body;
    try
    {
        // grabs the database and inserts a new note associated with the logged-in user's userId from the JWT
        const db = client.db('notetaking_app');
        const result = await db.collection('Notes').insertOne({
            userId: req.userId,
            title: title,
            body: body
        });
        res.status(200).json({ id: result.insertedId, error: '' });
    }
    catch (e)
    {
        res.status(500).json({ id: -1, error: e.toString() });
    }
});

// update a note
app.put('/api/notes/:id', authenticateToken, async (req, res) =>
{
    // incoming: title, body
    // outgoing: error

    const { id } = req.params;
    const { title, body } = req.body;
    try
    {
        // grabs the database and retrieves the note with the specified ID
        const db = client.db('notetaking_app');
        const note = await db.collection('Notes').findOne({ _id: new ObjectId(id) });

        // validate that the note exists and belongs to the logged-in user
        if (!note || note.userId !== req.userId)
        {
            return res.status(200).json({ error: 'Note not found' });
        }

        // Update the note's title and body in the database
        await db.collection('Notes').updateOne(
            { _id: new ObjectId(id) },
            { $set: { title: title, body: body } }
        );
        res.status(200).json({ error: '' });
    }
    catch (e)
    {
        res.status(500).json({ error: e.toString() });
    }
});

// delete a note
app.delete('/api/notes/:id', authenticateToken, async (req, res) =>
{
    // incoming: none
    // outgoing: error

    const { id } = req.params;
    try
    {
        // grabs the database and retrieves the note with the specified ID
        const db = client.db('notetaking_app');
        const note = await db.collection('Notes').findOne({ _id: new ObjectId(id) });

        // validate that the note exists and belongs to the logged-in user
        if (!note || note.userId !== req.userId)
        {
            return res.status(200).json({ error: 'Note not found' });
        }

        // Delete the note from the database
        await db.collection('Notes').deleteOne({ _id: new ObjectId(id) });
        res.status(200).json({ error: '' });
    }
    catch (e)
    {
        res.status(500).json({ error: e.toString() });
    }
});

const PORT = process.env.PORT || 5000;

// Connect to MongoDB and start the server
// server only starts after MongoDB confirms its connected
client.connect()
    .then(() =>
    {
        console.log('MongoDB connected successfully');
        app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
    })
    .catch((err) =>
    {
        console.error('MongoDB connection failed at startup:', err);
        process.exit(1); // fail fast and loud instead of running with a dead DB connection
    });