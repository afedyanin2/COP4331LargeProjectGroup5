const MongoClient = require('mongodb').MongoClient;
const url = 'mongodb+srv://katt:9izcScwQY%23jeC65@cluster0.iujdz4d.mongodb.net/?appName=Cluster0';

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


app.post('/api/login', async (req, res, next) =>
{
    // incoming: login, password
    // outgoing: id, firstName, lastName, error

    var error = '';

    const { login, password } = req.body;
    const db = client.db('COP4331Cards');
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

app.post('/api/register', async (req, res, next) =>
{
    // incoming: username, password, firstName, lastName
    // outgoing: id, firstName, lastName, error

    var error = '';

    const { username, password, firstName, lastName } = req.body;
    const db = client.db('COP4331Cards');

    try{
        const results = await db.collection('Users').insertOne({
            username,
            password,
            name,
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


app.listen(5000); // start Node + Express server on port 5000