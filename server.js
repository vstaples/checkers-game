// ==========================================================
// STEP 1: Define required external resources to IMPORT
// $ mongod --dbpath c:/mongodb/data/db
// ==========================================================
console.log("From Server.js: ");
console.log(".... Step 1: Defining required external resources to IMPORT");

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const passport = require('passport');
const session = require('express-session');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const User = require('./models/user');
const authRoutes = require('./routes/auth');
const { v4: uuidv4 } = require('uuid');

// ==========================================================
// Step 2: Create the "express" APP to support HTTP and WebSocket servers
// ==========================================================
console.log(".... Step 2: Creating EXPRESS application");

const app = express();

// ==========================================================
// Step 3: Initialize the HTTP + WebSocket servers + PORT
// ==========================================================
console.log(".... Step 3: Initializing HTTP + WebSocket servers + PORT");

const HTTPServer = http.createServer(app);
const WebSocketServer = new WebSocket.Server({ server: HTTPServer });
const PORT = process.env.PORT || 3000;

// ==========================================================
// Step 4: Define global server variables 
// ==========================================================
console.log(".... Step 4: Setting up global variables");

const activeUsers = new Map();
let waitingPlayerQueue = [];
let firstUser = null;
let secondUser = null;
let color;
let redPlayerUsername = '';
let blackPlayerUsername = '';

// ==========================================================
// Step 5: Middleware Setup
// ... express.static:        Serves static files from the 'public' directory.
// ... bodyParser.urlencoded: Parses URL-encoded bodies.
// ... bodyParser.json:       Parses JSON bodies.
// ... session:               Configures session handling with a secret key, disables resaving 
//                            unmodified sessions, and ensures sessions are not saved until they are modified.
// ... passport.initialize:   Initializes Passport for authentication.
// ... passport.session:      Integrates Passport with Express sessions.
// ... app.use('/', authRoutes): Uses the authentication routes defined in authRoutes.
// ==========================================================
console.log(".... Step 5: Setting up Middleware");

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json()); // Add JSON body parser
app.use(session({ secret: 'yourSecretKey', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());
app.use('/', authRoutes);

// ==========================================================
// SPECIAL NOTE PERTAINING TO STEPS 6 + 7:  In Node.js, the main thread executes 
// the script line by line. When it encounters asynchronous functions like 
// HTTPServer.listen() and mongoose.connect(), it registers the provided callbacks 
// and immediately moves on to the next lines of code without waiting for these 
// asynchronous operations to complete.
// ==========================================================

// ==========================================================
// Step 6: Start the HTTP Server & begin listening for CLIENT messages.
// ==========================================================
console.log(".... Step 6: Initializing HTTP Server");

HTTPServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Server UID: ${uuidv4()}`); // Ensure UID is printed after server starts
});

// ==========================================================
// Step 7: Establish LOCAL Mongoose database connection
// ==========================================================
console.log(".... Step 7: Establishing connection to Mongoose database");

mongoose.connect('mongodb://localhost:27017/checkers', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
        console.log('Connected to MongoDB');
}).catch(err => {
        console.error('Error connecting to MongoDB', err);
});

// ==========================================================
// Step 8: Setup Authentication & Construct "/user" route
// ==========================================================
console.log(".... Step 8: Setting up Authorization + /user route");

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

app.get('/user', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({
            username: req.user.username,
            avatar: req.user.avatar,
            wins: req.user.wins,
            losses: req.user.losses,
            rank: req.user.rank
        });
    } else {
        res.status(401).json({ error: 'User not authenticated' });
    }
});

// ==================================================================
// Step 9: Setup Web Socket connection event handling for the CLIENT.
// .... ACTIVE_CLIENT.on('message')
// .... ACTIVE_CLIENT.on('close')
// ==================================================================
console.log(".... Step 9: Setting up Web Socket connection event handlers");

WebSocketServer.on('connection', (ACTIVE_CLIENT, req) => {

    console.log("");
    console.log('New client connected');

    // Process the various CLIENT message types
    ACTIVE_CLIENT.on('message', async (message) => {

        const parsedMessage = JSON.parse(message.toString());

        // CONDITION: User login successful & joining whoever is already present
        if (parsedMessage.type === 'join') {
            
            processClientJoinRequest(ACTIVE_CLIENT, parsedMessage);

        // Broadcast received CHAT message to all clients
        } else if (parsedMessage.type === 'chat') {

            broadcastChatMessage(parsedMessage.message, parsedMessage.from, parsedMessage.avatar);

        // Update the winner's record in the Mongoose database at conclusion of every game
        } else if (parsedMessage.type === 'gameResult') {

            handleGameResult(parsedMessage);

        // Process CLIENT request to join the Player queue
        } else if (parsedMessage.type === 'joinQueue') {

            console.log('Joining Queue:', parsedMessage);
            addToPlayerQueue(parsedMessage);

        // Process CLIENT request to be removed from PLAYER queue
        } else if (parsedMessage.type === 'leaveQueue') {

            removeFromPlayerQueue(parsedMessage.username);

        // Instruct each connected client to reset the board for a new game
        } else if (parsedMessage.type === 'newGame') {

            broadcastNewGame();

        // Instruct all CLIENTS to mirror player gamepiece movements            
        } else if (parsedMessage.type === 'move' || parsedMessage.type === 'drag' || parsedMessage.type === 'remove') {
         
            broadcastGamepieceMovements(ACTIVE_CLIENT, parsedMessage)

        } else if (parsedMessage.type === 'setTurn') {

            broadcastTurn(parsedMessage.player);

        } else if (parsedMessage.type === 'updateCapture') {

            broadcastCaptureUpdate(parsedMessage);

            // Broadcast to all clients
            // WebSocketServer.clients.forEach((client) => {
            //     if (client.readyState === WebSocket.OPEN) {
            //         client.send(JSON.stringify(parsedMessage));
            //     }
            //     });

        } else {
            console.log("WARNING - Unsupported CLIENT message received: ", parsedMessage.type);
        }
    });

    ACTIVE_CLIENT.on('close', () => {

        processClientDisconnect(ACTIVE_CLIENT);

    });
});

console.log("From Server.js:  Setup is now complete.");
console.log("-------------------------------------------------------------------");
console.log("");

// ==========================================================
// Step 10: Define all supporting functions below - here -
// ==========================================================

// Process CLIENT join request
async function processClientJoinRequest(ACTIVE_CLIENT, parsedMessage) {
    const username = parsedMessage.username;

    console.log(".... User joining session: ", username);

    if (username) {
        // Retrieve the USER record from the Mongoose database
        const user = await User.findOne({ username });

        if (user) {
            if (!firstUser) {
                firstUser = username;
                color = 'red';
                redPlayerUsername = username;
            } else if (!secondUser) {
                secondUser = username;
                color = 'black';
                blackPlayerUsername = username;
            } else {
                color = 'spectator';
            }

            console.log(".... Caching Active User: ", username, color, firstUser, secondUser);

            activeUsers.set(username, {
                username: user.username,
                avatar: user.avatar,
                wins: user.wins,
                losses: user.losses,
                rank: user.rank,
                color: color,               // Assuming color is stored in the user model
                ws: ACTIVE_CLIENT           // Store WebSocket in the user data
            });

            // Broadcast usernames to all clients
            broadcastActiveUsers();
            broadcastUsernames();
            printActiveUsers();
        }
    }
}

// Process CLIENT disconnect notification
function processClientDisconnect(ACTIVE_CLIENT) {

    console.log("Client Disconnected");

    let disconnectedUser;

    activeUsers.forEach((value, key) => {
        console.log(".... Active User: ", value.username);

        if (value.ws === ACTIVE_CLIENT) {
            disconnectedUser = key;
        }
    });

    if (disconnectedUser) {

        const userData = activeUsers.get(disconnectedUser);

        console.log(".... Disconnected User: ", userData.username, userData.color);

        activeUsers.delete(disconnectedUser);
        
        broadcastActiveUsers();
        removeFromPlayerQueue(userData.username);
        printActiveUsers();

        if (userData.color === "red") {
            firstUser = null;
        } else if (userData.color === "black") {
            secondUser = null;
        }
    }
}

function printActiveUsers() {

    console.log("");
    console.log("Current Active Users:");
    let count = 1;
    activeUsers.forEach((value, key) => {
        console.log(`  ${count}. Username: ${value.username}, Color: ${value.color}`);
        count++;
    });
    console.log("");
}

// Helper function to add a user to the queue
function addToPlayerQueue(user) {
    // Add user to the Player queue if not already
    if (!waitingPlayerQueue.some(u => u.username === user.username)) {
        console.log(".... From addToPlayerQueue(): ", user.username);
        waitingPlayerQueue.push(user);
        broadcastPlayerQueue();
    } else {
        console.log(`.... User ${user.username} is already in the queue.`);
        return; // Exit if the user is already in the queue
    }
}

function broadcastActiveUsers() {
    const usersArray = Array.from(activeUsers.values());
    const activeUsersMessage = JSON.stringify({ type: 'activeUsers', users: usersArray });

    WebSocketServer.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(activeUsersMessage);
        }
    });
}

// Add this function to server.js
function broadcastCaptureUpdate(data) {
    const captureUpdateMessage = JSON.stringify({
        type: 'updateCapture',
        redPlayerUsername: data.redPlayerUsername,
        blackPlayerUsername: data.blackPlayerUsername,
        capturedRed: data.capturedRed,
        capturedBlack: data.capturedBlack
    });

    WebSocketServer.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(captureUpdateMessage);
        }
    });
}

function broadcastChatMessage(message, from, avatar) {
    
    const chatMessage = JSON.stringify({ type: 'chat', message: `${from}: ${message}`, from: `${from}`, avatar: `${avatar}` });
    
    console.log("Sending CHAT: ", chatMessage);
    
    WebSocketServer.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(chatMessage);
        }
    });
}

function broadcastGamepieceMovements(ACTIVE_CLIENT, parsedMessage) {
    
    // Notify all CLIENTS that movement was received from ACTIVE_CLIENT
    WebSocketServer.clients.forEach((client) => {
        if (client !== ACTIVE_CLIENT && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(parsedMessage));
        }
    });
}

function broadcastNewGame() {
    
    // Create a JSON message token to send to all clients
    const newGameMessage = JSON.stringify({ type: 'newGame' });
    WebSocketServer.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(newGameMessage);
        }
    });
}

// Function to broadcast the current player queue
function broadcastPlayerQueue() {
    console.log(".... Running broadcastPlayerQueue()");

    // Check if the queue is empty
    if (waitingPlayerQueue.length === 0) {
        console.log(".... .... The queue is empty.");
    } else {
        console.log(".... .... The queue has this # records: ", waitingPlayerQueue.length);
    }

    const queueMessage = JSON.stringify({ type: 'queueStatus', queue: waitingPlayerQueue });

    WebSocketServer.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(queueMessage);
        }
    });
}

function broadcastTurn(player) {

    console.log("Informing client to setTurn()");
    
    const message = JSON.stringify({ type: 'setTurn', player: player });
    WebSocketServer.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

function broadcastUsernames() {
    const message = JSON.stringify({
        type: 'usernames',
        redPlayerUsername: redPlayerUsername,
        blackPlayerUsername: blackPlayerUsername
    });
    WebSocketServer.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

async function handleGameResult(result) {
    const winnerUsername = result.winner;

    const dbUser = await User.findOne({ username: winnerUsername });
    if (dbUser) {
        dbUser.wins += 1;
        await dbUser.save();
    }

    // Update losses for other users
    activeUsers.forEach(async (user, username) => {
        if (username !== winnerUsername) {
            const dbUser = await User.findOne({ username });
            if (dbUser) {
                dbUser.losses += 1;
                await dbUser.save();
            }
        }
    });

    console.log(`Game result processed. Winner: ${winnerUsername}`);
}

// Helper function to remove a user from the queue
function removeFromPlayerQueue(username) {
    console.log('Queue before removal:', waitingPlayerQueue);

    // Find and remove the target record
    waitingPlayerQueue = waitingPlayerQueue.filter(user => user.username !== username);

    console.log('Queue after removal:', waitingPlayerQueue);

    broadcastPlayerQueue();
}

function updateCapturedPieces(data) {
    if (data.pieceColor === 'red') {
        capturedBlack++;
    } else if (data.pieceColor === 'black') {
        capturedRed++;
    }

    // Broadcast the captured pieces update to all clients
    broadcastCaptureUpdate(capturedRed, capturedBlack);
}

function updateCapturedPiecesUI(redPlayerUsername, blackPlayerUsername, capturedRed, capturedBlack) {
    const capturedRedElement = document.getElementById('capturedRed');
    const capturedBlackElement = document.getElementById('capturedBlack');

    capturedRedElement.textContent = `${redPlayerUsername} Captured: ${capturedRed}`;
    capturedBlackElement.textContent = `${blackPlayerUsername} Captured: ${capturedBlack}`;

    // Ensure the elements remain visible
    capturedRedElement.style.zIndex = '10';
    capturedRedElement.style.visibility = 'visible';
    capturedBlackElement.style.zIndex = '10';
    capturedBlackElement.style.visibility = 'visible';

    console.log("Updated captured pieces:", capturedRedElement.textContent, capturedBlackElement.textContent);
}
