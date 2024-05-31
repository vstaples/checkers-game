const authRoutes = require('./routes/auth');
const bodyParser = require('body-parser');
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const passport = require('passport');
const path = require('path');
const session = require('express-session');
const socketIo = require('socket.io');
const WebSocket = require('ws');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const wss = new WebSocket.Server({ server });
const PORT = process.env.PORT || 3000;
const { v4: uuidv4 } = require('uuid');

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({ secret: 'yourSecretKey', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

// Use routes
app.use('/', authRoutes);

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/checkers', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('Error connecting to MongoDB', err);
});

// When a client connects
io.on('connection', (socket) => {
    console.log('A user connected');

    // Listen for a move
    socket.on('move', (data) => {
        // Broadcast the move to all other clients
        socket.broadcast.emit('move', data);
    });

    // When the client disconnects
    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

const serverUID = uuidv4();
console.log(`Server UID: ${serverUID}`);

wss.on('connection', (ws) => {
    console.log('New client connected');

    ws.on('message', (message) => {
        const parsedMessage = JSON.parse(message.toString());
        console.log('Received message:', parsedMessage);

        // Broadcast the received message to all connected clients
        wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(parsedMessage));
            }
        });
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Server UID: ${serverUID}`); // Ensure UID is printed after server starts
});
