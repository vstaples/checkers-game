const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

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

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
