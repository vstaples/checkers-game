const express = require('express');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const path = require('path');
const User = require('../models/user'); // Ensure this path is correct

const router = express.Router();

// Configure Passport to use the local strategy
passport.use(new LocalStrategy(
    async (username, password, done) => {
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

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});

// Game route
router.get('/game', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/game.html')); // Serve the game.html file
});

// Register route
router.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/register.html')); // Serve the register.html file
});

router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();
        res.redirect('/login'); // Redirect to login page after successful registration
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login route
router.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/login.html')); // Serve the login.html file
});

router.post('/login', passport.authenticate('local', {
    successRedirect: '/game', // Redirect to game page after successful login
    failureRedirect: '/login'
}));

module.exports = router;
