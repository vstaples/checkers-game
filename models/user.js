// models/user.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    avatar: { type: String, default: 'default_avatar.png' }, // Default avatar
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    rank: { type: Number, default: 0 }
});

const User = mongoose.model('User', userSchema);
module.exports = User;
