/*
Serialization in Passport.js

Serialization in the context of Passport.js refers to the process of converting a user object into a 
unique identifier (usually the user's ID) that can be stored in the session. This unique identifier 
is then used to look up the full user object in the database during subsequent requests.

Why Serialization?
When a user logs in, the session middleware needs to store some form of user identification to know 
which user is associated with the session. Instead of storing the entire user object (which could be 
large and sensitive), Passport.js stores a unique identifier for the user. This minimizes the amount 
of data stored in the session and reduces the risk of exposing sensitive information.

What Data is Serialized?
User ID: Typically, the only piece of data that is serialized is the user’s ID. This is a unique 
         identifier for the user in your database.
System-Generated ID: The ID is usually system-generated (e.g., a primary key in your database). 
         If you’re using MongoDB with Mongoose, this ID is the _id field.


*/

// CONST express = require('express');
// This imports the Express module, which is a popular web framework for Node.js.
// It is not a customized file in your local project; it is a third-party library.
const express = require('express');

// CONST passport = require('passport');
// This imports the Passport.js module, which is used for authentication.
// It is also a third-party library, not a customized file in your local project.
const passport = require('passport');

// CONST LocalStrategy = require('passport-local').Strategy;
// This imports the local strategy from the Passport.js library.
// Again, it is a third-party library, not a customized file in your local project.
const LocalStrategy = require('passport-local').Strategy;

// CONST bcrypt = require('bcrypt');
// This imports the bcrypt library, which is used for hashing passwords.
// This is a third-party library, not a customized file in your local project.
const bcrypt = require('bcrypt');

// CONST path = require('path');
// This imports the path module from Node.js, which provides utilities for working with file and directory paths.
// This is a built-in module in Node.js, not a customized file in your local project.
const path = require('path');

// CONST User = require('../models/user');
// This imports the User model, which is defined in your local project in the models/user.js file.
// This is a customized file in your local project.
const User = require('../models/user'); // Ensure this path is correct

// CONST router = express.Router();
// This initializes an Express router instance.
// It is a method provided by the Express library, not a customized file.
const router = express.Router();

// -------------------------------------------------------------------------------------
// LOGIN STEP #1: User clicks on a link to the login page; router serves up the pathname
//                to the HTML file to display
// -------------------------------------------------------------------------------------
router.get('/login', (req, res) => {

    console.log("From 'routes/auth.js':")
    console.log(".... Passport Marker #1: SERVER sending login.html");

    res.sendFile(path.join(__dirname, '../public/login.html')); // Serve the login.html file
});

// -------------------------------------------------------------------------------------
// LOGIN STEP #2: User presses the login button to start the authentication process.
// -------------------------------------------------------------------------------------
router.post('/login', (req, res, next) => {

    console.log(".... Passport Marker #2: SERVER performing login authentication");

    passport.authenticate('local', (err, user, info) => {
        if (err) {
            console.error('.... .... Authentication error:', err);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
        if (!user) {
            console.warn('.... .... Authentication failed:', info.message);
            return res.status(401).json({ success: false, message: info.message || 'Invalid credentials' });
        }

        // Check if the user is already logged in
        if (global.activeUsers.has(user.username)) {
            return res.status(400).json({ success: false, message: 'User already logged in' });
        }
        
        req.logIn(user, (err) => {
            if (err) {
                console.error('.... .... Login error:', err);
                return res.status(500).json({ success: false, message: 'Login failed' });
            }

            // Add the user to active users
            global.activeUsers.set(user.username, user);

            // Set a global variable for the logged-in user (this is generally not recommended for scalability)
            global.currentUsername = user.username;

            console.log('.... .... Authentication successful for user:', user.username, user.avatar);
            return res.json({ success: true });
        });
    })(req, res, next);
});

// -------------------------------------------------------------------------------------
// LOGIN STEP #3: System looks up the "LocalStrategy" that retrieves the USER record
//                from the MongoDB database if one exists.  If the user record is NOT
//                found, a message will be reported to the user.  If a USER record IS
//                found, it will check for a password match.
//
// NOTICE the return data will be in one of these forms:
//                 (null, false, { message: 'Incorrect username.' })
//       - OR -    (null, user)
// -------------------------------------------------------------------------------------
passport.use(new LocalStrategy(

    async (username, password, done) => {

        console.log(".... Passport Marker #3: SERVER Setting up LocalStrategy");

        try {
            const user = await User.findOne({ username });
            if (!user) {
                return done(null, false, { message: 'Incorrect username.' });
            }
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return done(null, false, { message: 'Incorrect password.' });
            }
            return done(null, user);
        } catch (err) {
            return done(err);
        }
    }
));

// -------------------------------------------------------------------------------------
// LOGIN STEP #4: Assigning "user.id" as unique identifier for session (key identifier)
//                that will be used to request related user information from the MongoDB 
// -------------------------------------------------------------------------------------
passport.serializeUser((user, done) => {

    console.log(".... Passport Marker #4: SERVER SerializingUser (defining) 'user.id' as MongoDB key");

    done(null, user.id);
});

// -------------------------------------------------------------------------------------
// LOGIN STEP #5: This method receives the "user.id" as input & returns the USER record
//                from the MongoDB if one exists.
//
// PLEASE CONSULT "models/user.js" to see the exact USER record structure returned.
// -------------------------------------------------------------------------------------
passport.deserializeUser(async (id, done) => {

    console.log(".... Passport Marker #5: SERVER DeserializingUser (returning 'user' record if found by user.id in MongoDB)");

    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});

// -------------------------------------------------------------------------------------
// LOGIN STEP #6: Last step ... returns TRUE or FALSE status from authentication.
// -------------------------------------------------------------------------------------
router.get('/auth-status', (req, res) => {

    let status;

    if (req.isAuthenticated()) {
        res.json({ isAuthenticated: true });
        status = "True";
    } else {
        res.json({ isAuthenticated: false });
        status = "False";
    }

    console.log(".... Passport Marker #6: SERVER returning authentication status of ", status);
    console.log("-------------------------------------------------------------------");

});

// Game route
router.get('/game', (req, res) => {

    console.log("Passport Marker #7");

    res.sendFile(path.join(__dirname, '../public/game.html')); // Serve the game.html file
});

// Register route
router.get('/register', (req, res) => {

    console.log("Passport Marker #8");

    res.sendFile(path.join(__dirname, '../public/register.html')); // Serve the register.html file
});

router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log('Registering user:', username);
        const hashedPassword = await bcrypt.hash(password, 10);
        const avatarPath = `images/${username}.png`;
        const newUser = new User({
            username,
            password: hashedPassword,
            avatar: avatarPath,
            wins: 0,
            losses: 0,
            rank: 0
        });
        await newUser.save();
        console.log('User registered successfully:', username);
        res.redirect('/login');
    } catch (err) {
        console.error('Error registering user:', err);
        res.status(500).json({ error: err.message });
    }
});

// New route to fetch user record
router.get('/user-record', (req, res, next) => {
    
    console.log('Passport Marker #9 - Received request for user record:', req.query.username);

    if (req.isAuthenticated()) {
        console.log('User is authenticated');
        next();
    } else {
        console.log('User not authenticated');
        res.status(401).json({ error: 'User not authenticated' });
    }
}, async (req, res) => {
    const username = req.query.username; // Get the username from query parameters
    console.log('Fetching record for username:', username);

    if (!username) {
        console.log('No username provided');
        return res.status(400).json({ error: 'Username is required' });
    }

    try {
        const user = await User.findOne({ username });
        if (!user) {
            console.log('User not found');
            return res.status(404).json({ error: 'User not found' });
        }
        console.log('User record found:', user);
        res.json({ wins: user.wins, losses: user.losses });
    } catch (err) {
        console.error('Error fetching user record:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/current-username', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ username: global.currentUsername });
    } else {
        res.status(401).json({ error: 'User not authenticated' });
    }
});

module.exports = router;