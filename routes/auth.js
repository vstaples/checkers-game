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

// Login route
router.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/login.html')); // Serve the login.html file
});

router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            console.error('Authentication error:', err);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
        if (!user) {
            console.warn('Authentication failed:', info.message);
            return res.status(401).json({ success: false, message: info.message || 'Invalid credentials' });
        }
        req.logIn(user, (err) => {
            if (err) {
                console.error('Login error:', err);
                return res.status(500).json({ success: false, message: 'Login failed' });
            }
            console.log('Authentication successful for user:', user.username, user.avatar);
            return res.json({ success: true });
        });
    })(req, res, next);
});
module.exports = router;
