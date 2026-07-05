const MongoClient = require('mongodb').MongoClient;
require('dotenv').config();
const url = process.env.MONGODB_URI;

const client = new MongoClient(url);
client.connect();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use((req, res, next) =>
{
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );
    res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PATCH, DELETE, OPTIONS'
    );
    next();
});

// login a user
app.post('/api/login', async (req, res, next) =>
{
    // incoming: login, password
    // outgoing: id, firstName, lastName, error

    var error = '';

    const { login, password } = req.body;
    const db = client.db('notetaking_app');
    const results = await
    db.collection('Users').find({Login:login,Password:password}).toArray();

    var id = -1;
    var fn = '';
    var ln = '';

    if( results.length > 0 )
    {
        id = results[0].UserID;
        fn = results[0].FirstName;
        ln = results[0].LastName;
    }
    var ret = { id:id, firstName:fn, lastName:ln, error:''};
    res.status(200).json(ret);
});

// create a new user
app.post('/api/register', async (req, res, next) =>
{
    // incoming: username, password, firstName, lastName
    // outgoing: id, firstName, lastName, error

    var error = '';

    const { username, password, firstName, lastName } = req.body;
    const db = client.db('notetaking_app');

    try{
        // check if username already exists
        const existingUser = await db.collection('Users').findOne({ username: username });
        if (existingUser) {
            return res.status(200).json({
                id: -1,
                firstName: '',
                lastName: '',
                error: 'Username already exists'
            });
        }

        // if not, insert new user
        const results = await db.collection('Users').insertOne({
            username,
            password,
            firstName,
            lastName
        });

        var ret = { 
            id:results.insertedId, 
            firstName:firstName, 
            lastName:lastName, 
            error:''
        };

        res.status(200).json(ret);
    }
    catch(e){
        res.status(500).json({ 
            id: -1,
            firstName: '',
            lastName: '',
            error: 'Error registering user'
        });
    }
});

// get current user info
app.get('/api/me', async (req, res) => {
    const { userId } = req.query;
    try {
        const db = client.db('notetaking_app');
        const user = await db.collection('Users').findOne({ _id: new ObjectId(userId) });
        if (!user) {
            return res.status(200).json({ error: 'User not found' });
        }
        res.status(200).json({
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            error: ''
        });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

// get all notes
app.get('/api/notes', async (req, res) => {
    const { userId } = req.query;
    try {
        const db = client.db('notetaking_app');
        const notes = await db.collection('Notes').find({ userId: userId }).toArray();
        res.status(200).json({ notes: notes, error: '' });
    } catch (e) {
        res.status(500).json({ notes: [], error: e.toString() });
    }
});

// get a specific note by ID
app.get('/api/notes/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const db = client.db('notetaking_app');
        const note = await db.collection('Notes').findOne({ _id: new ObjectId(id) });
        if (!note) {
            return res.status(200).json({ note: null, error: 'Note not found' });
        }
        res.status(200).json({ note: note, error: '' });
    } catch (e) {
        res.status(500).json({ note: null, error: e.toString() });
    }
});

// create a new note
app.post('/api/notes', async (req, res) => {
    const { userId, title, body } = req.body;
    try {
        const db = client.db('notetaking_app');
        const result = await db.collection('Notes').insertOne({
            userId: userId,
            title: title,
            body: body
        });
        res.status(200).json({ id: result.insertedId, error: '' });
    } catch (e) {
        res.status(500).json({ id: -1, error: e.toString() });
    }
});

// update a note
app.put('/api/notes/:id', async (req, res) => {
    const { id } = req.params;
    const { title, body } = req.body;
    try {
        const db = client.db('notetaking_app');
        await db.collection('Notes').updateOne(
            { _id: new ObjectId(id) },
            { $set: { title: title, body: body } }
        );
        res.status(200).json({ error: '' });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});
app.delete('/api/notes/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const db = client.db('notetaking_app');
        await db.collection('Notes').deleteOne({ _id: new ObjectId(id) });
        res.status(200).json({ error: '' });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

// delete a note
app.delete('/api/notes/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const db = client.db('notetaking_app');
        await db.collection('Notes').deleteOne({ _id: new ObjectId(id) });
        res.status(200).json({ error: '' });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.listen(5000); // start Node + Express server on port 5000