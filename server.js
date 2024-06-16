// ==========================================================
// STEP 1: Define required external resources to IMPORT
// $ mongod --dbpath c:/mongodb/data/db
// ==========================================================
console.log("From Server.js: ");
console.log(".... Step 1: Defining required external resources to IMPORT");

const authRoutes = require('./routes/auth');
const bodyParser = require('body-parser');
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const path = require('path');
const passport = require('passport');
const Player = require('./public/player');         // Import the Player class
const session = require('express-session');
const User = require('./models/user');
const WebSocket = require('ws');
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

global.activeUsers = new Map();
let RedPlayer    = new Player();
let BlackPlayer  = new Player();
let color;
let firstUser      = null;
let secondUser     = null;
let waitingPlayerQueue = [];

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

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve locale files
app.use('/locales', express.static(path.join(__dirname, 'locales')));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json()); // Add JSON body parser
app.use(session({ secret: 'yourSecretKey', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());
app.use('/', authRoutes);

// ==========================================================
// Debugging middleware to log incoming requests
// ==========================================================
if (false) {
    app.use((req, res, next) => {
        console.log(`.... INCOMING Route Request: ${req.method} ${req.url}`);
        // console.log('Source:', req.headers['x-source']); // Log the custom header
        // console.log('Request Headers:', req.headers);
        // console.log('Query Parameters:', req.query);
        // console.log('Request Body:', req.body);
        // console.log('Client IP:', req.ip);
        // console.log('Request Protocol:', req.protocol);
        // console.log('Original URL:', req.originalUrl);
        // console.log('Request Path:', req.path);
        // console.log('Request Hostname:', req.hostname);
        // console.log('Request Cookies:', req.cookies);
        next();
    });

    // Print all defined routes
    console.log("NUMBER OF ROUTES: ", countRoutes() );
    let middlewareCntr = 0;
    let handlerCntr    = 0;

    app._router.stack.forEach((middleware) => {
        if (middleware.route) {
            console.log(".... ", ++middlewareCntr, ". MIDDLEWARE Route: ", middleware.route);
        } else if (middleware.name === 'router') {
            middleware.handle.stack.forEach((handler) => {
                if (handler.route) {
                    console.log(".... ", ++handlerCntr, ". HANDLER Route: ", handler.route);
                }
            });
        }
    });

    function countRoutes() {
        let routeCount = 0;
        app._router.stack.forEach((middleware) => {
            if (middleware.route) {
                routeCount++;
            } else if (middleware.name === 'router') {
                middleware.handle.stack.forEach((handler) => {
                    if (handler.route) {
                        routeCount++;
                    }
                });
            }
        });
        return routeCount;
    }
}

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
    console.log(`.... Step 10: Server is running on port ${PORT} with Server UID: ${uuidv4()}`);  // Ensure UID is printed after server starts

});

// ==========================================================
// Step 7: Establish LOCAL Mongoose database connection
// ==========================================================
console.log(".... Step 7: Establishing connection to Mongoose database (delayed results)");

mongoose.connect('mongodb://localhost:27017/checkers', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
        console.log('.... Step 11: Connected to MongoDB');
        console.log("From Server.js: HTTP + Mongoose services started successfully.")
        console.log("-------------------------------------------------------------------");
        console.log("");
}).catch(err => {
        console.error('.... Step 11: Error connecting to MongoDB', err);
        console.log("From Server.js: Unable to complete HTTP + Mongoose services.")
        console.log("-------------------------------------------------------------------");
        console.log("");
});

// ==========================================================
// Step 8: Setup Authentication & Construct "/user" route
// ==========================================================
console.log(".... Step 8: Setting up Authorization + /user route");

// Middleware to check if the user is authenticated
app.get('/auth-status', (req, res) => {
    
    let status;
    if (req.session.username) {
        res.json({ isAuthenticated: true });
        status = "True";
    } else {
        res.json({ isAuthenticated: false });
        status = "False";
    }
    console.log(".... Step 8-2: Returning auth-status of ", status);
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
        console.log(".... Step 8-3: Returning user record res.JSON ", res.json);
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

// Create a WebSocket server to listen for WebSocket connections on 
// the same port as the HTTP server
WebSocketServer.on('connection', (ACTIVE_CLIENT, req) => {

    const clientIP = req.socket.remoteAddress;

    console.log("");
    console.log('From SERVER - New client connected - WebSocket Client Properties:');
    console.log(`.... IP Address: ${clientIP}`);

    // Print client WebSocket properties
    console.log(`.... URL: ${req.url}`);
    console.log(`.... Protocol: ${req.protocol}`);
    console.log(`.... Ready State: ${ACTIVE_CLIENT.readyState}`);
    console.log(`.... Remote Address: ${req.connection.remoteAddress}`);
    console.log(`.... Remote Port: ${req.connection.remotePort}`);
    console.log(`.... Secure: ${req.connection.encrypted ? 'Yes' : 'No'}`);

    // Process the various CLIENT message types
    ACTIVE_CLIENT.on('message', async (message) => {

        const parsedMessage = JSON.parse(message.toString());

        // Print the entire parsed message object
        console.log("");
        console.log('From SERVER - Received message from CLIENT:', parsedMessage);
        console.log("");

        // CONDITION: User login successful & joining whoever is already present
        if (parsedMessage.type === 'initialization') {                  // not presently used
            
            console.log(parsedMessage.step);

        } else if (parsedMessage.type === 'join') {                     // confirmed
            
            processClientJoinRequest(ACTIVE_CLIENT, parsedMessage);

        // Broadcast received CHAT message to all clients
        } else if (parsedMessage.type === 'chat') {                     // confirmed

            broadcastChatMessage(parsedMessage.message, parsedMessage.from, parsedMessage.avatar);

        // Update the winner's record in the Mongoose database at conclusion of every game
        } else if (parsedMessage.type === 'gameResult') {               // confirmed

            handleGameResult(parsedMessage);

        // Process CLIENT request to join the Player queue
        } else if (parsedMessage.type === 'joinQueue') {                // confirmed

            console.log('Joining Queue:', parsedMessage);
            addToPlayerQueue(parsedMessage);

        // Process CLIENT request to be removed from PLAYER queue
        } else if (parsedMessage.type === 'leaveQueue') {               // confirmed

            removeFromPlayerQueue(parsedMessage.username);

        // Instruct all CLIENTS to mirror player gamepiece movements            
        } else if (parsedMessage.type === 'AImovePiece') {              // Confirmed
            
            broadcastAIGamepieceMovements(ACTIVE_CLIENT, parsedMessage)

            // Instruct all CLIENTS to mirror player gamepiece movements            
        } else if (parsedMessage.type === 'move' || parsedMessage.type === 'drag' || parsedMessage.type === 'remove') {     // Confirmed
            
            broadcastGamepieceMovements(ACTIVE_CLIENT, parsedMessage)

        // Instruct each connected client to reset the board for a new game
        } else if (parsedMessage.type === 'newGame') {                  // confirmed

            broadcastNewGame();

        } else if (parsedMessage.type === 'switchTurn') {               // confirmed

            broadcastTurn(parsedMessage.player);

        } else if (parsedMessage.type === 'updateCapture') {            // confirmed

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

            waitingPlayerQueue.push({
                username: user.username,
                avatar: user.avatar,
                wins: user.wins,
                losses: user.losses,
                rank: user.rank,
                ws: ACTIVE_CLIENT,
                color: null // Assign later
            });

            console.log(".... Caching Active User: ", username, color, firstUser, secondUser);

            // Broadcast usernames to all clients
            assignRoles();
        }
    }
}

// Process CLIENT disconnect notification
function processClientDisconnect(ACTIVE_CLIENT) {

    let disconnectedUser;

    global.activeUsers.forEach((value, key) => {

        if (value.ws === ACTIVE_CLIENT) {

            console.log("");
            console.log('From SERVER - CLIENT has disconnected:', value.username);
            console.log("");
        
            disconnectedUser = key;
        }
    });

    if (disconnectedUser) {

        const userData = global.activeUsers.get(disconnectedUser);
        global.activeUsers.delete(disconnectedUser);
        waitingPlayerQueue = waitingPlayerQueue.filter(user => user.username !== userData.username);
        
        assignRoles();
    }
}

async function assignRoles() {
    firstUser = null;
    secondUser = null;

    console.log("-------------------------------------------------------------");
    console.log(".... ASSIGNING user roles");

    // Ensure the Wizard is not in the waitingPlayerQueue before assigning roles
    waitingPlayerQueue = waitingPlayerQueue.filter(user => user.username !== 'Wizard');

    waitingPlayerQueue.forEach(user => {
        if (!firstUser) {
            firstUser = user.username;
            user.color = 'red';
            RedPlayer.username = user.username;
            RedPlayer.color = 'red';
            console.log(".... .... Assigning RED role to user: ", user.username);
        } else if (!secondUser) {
            secondUser = user.username;
            user.color = 'black';
            BlackPlayer.username = user.username;
            BlackPlayer.color = 'black';
            console.log(".... .... Assigning BLACK role to user: ", user.username);
        } else {
            user.color = 'spectator';
            console.log(".... .... Assigning SPECTATOR status to user: ", user.username);
        }
        global.activeUsers.set(user.username, user);
    });

    if (!secondUser) {
        await initializeWizard();
    } else {
        removeWizard();
    }

    broadcastActiveUsers();
    broadcastUsernames();
    printActiveUsers();

    console.log("-------------------------------------------------------------");
}

async function initializeWizard() {
    console.log(">>>> Starting initializeWizard");

    try {
        let player = await User.findOne({ username: 'Wizard' });
        if (!player) {
            console.error('Wizard player not found in the database.');
            return;
        }
        BlackPlayer = player;
        BlackPlayer.color = 'black';
        BlackPlayer.username = 'Wizard';

        global.activeUsers.set(BlackPlayer.username, BlackPlayer);

        // Only add the "Wizard" to the waitingPlayerQueue if not already present
        if (!waitingPlayerQueue.some(user => user.username === 'Wizard')) {
            waitingPlayerQueue.push({
                username: BlackPlayer.username,
                avatar: BlackPlayer.avatar,
                wins: BlackPlayer.wins,
                losses: BlackPlayer.losses,
                rank: BlackPlayer.rank,
                ws: null, // WebSocket reference, not needed for "Wizard"
                color: 'black'
            });
            console.log(".... .... Added Wizard to waitingPlayerQueue.");
        }

    } catch (err) {
        console.error('Error fetching Wizard player:', err);
    }

    console.log("<<<< Finished initializeWizard");
}

function removeWizard() {
    console.log(">>>> Starting removeWizard()");

    // Find the "Wizard" user in the activeUsers Map
    const wizardUser = global.activeUsers.get('Wizard');

    if (wizardUser) {
        // Remove the "Wizard" user from the activeUsers Map
        global.activeUsers.delete('Wizard');

        // Update the waitingPlayerQueue to exclude the "Wizard" user
        waitingPlayerQueue = waitingPlayerQueue.filter(user => user.username !== 'Wizard');

        console.log(".... .... Removed Wizard from active users and reassigned roles.");
    } else {
        console.log(".... .... Wizard not found in active users.");
    }

    console.log("<<<< Finished removeWizard()");
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

// Notify each CLIENT the list of connected users
function broadcastActiveUsers() {

    console.log(".... Broadcasting active users to each client:");

    const usersArray = Array.from(global.activeUsers.values());
    const activeUsersMessage = JSON.stringify({ type: 'updateActiveUsers', users: usersArray });

    WebSocketServer.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(activeUsersMessage);
        }
    });
}

// Diagnostic routine to output the list of connected users to the SERVER console
function printActiveUsers() {
    
    if (global.activeUsers.size === 0) {
        console.log(".... From printActiveUsers(): List of logged in users is EMPTY.");
        return;
    }

    console.log(".... From printActiveUsers():");

    let count = 1;
    global.activeUsers.forEach((value, key) => {
        console.log(`.... .... ${count}. Username: ${value.username}, Color: ${value.color}, Wins: ${value.wins}, Losses: ${value.losses}, Rank: ${value.rank}`);
        count++;
    });

    console.log("");
}

// Add this function to server.js
function broadcastCaptureUpdate(data) {

    RedPlayer = data.redPlayerRecord;
    BlackPlayer = data.blackPlayerRecord;
    
    console.log(">>>> broadcastCaptureUpdate():");
    console.log(`.... Red Player  : ${RedPlayer.username}, Captured: ${RedPlayer.captured}`);
    console.log(`.... Black Player: ${BlackPlayer.username}, Captured: ${BlackPlayer.captured}`);
    
    const captureUpdateMessage = JSON.stringify({
        type: 'updateCapture',
        redPlayerRecord: RedPlayer,
        blackPlayerRecord: BlackPlayer
    });

    WebSocketServer.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(captureUpdateMessage);
        }
    });
    console.log("<<<< broadcastCaptureUpdate() finished.");
}

function broadcastChatMessage(message, from, avatar) {
    
    const chatMessage = JSON.stringify({ type: 'displayChat', message: `${from}: ${message}`, from: `${from}`, avatar: `${avatar}` });
    
    console.log("Sending CHAT: ", chatMessage);
    
    WebSocketServer.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(chatMessage);
        }
    });
}

function broadcastAIGamepieceMovements(ACTIVE_CLIENT, parsedMessage) {
    
    // Notify all CLIENTS that movement was received from ACTIVE_CLIENT
    // NOTE: "parsedMessage" may be a drag, move, or remove instruction
    console.log("");
    console.log("NOTIFYING Client of Movement: ", parsedMessage);
    
    parsedMessage.type = "move";
    
    WebSocketServer.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(parsedMessage));
            console.log(".... MESSAGE SENT: ", parsedMessage);
         }
    });
    console.log("");
}

function broadcastGamepieceMovements(ACTIVE_CLIENT, parsedMessage) {
    
    // Notify all CLIENTS that movement was received from ACTIVE_CLIENT
    // NOTE: "parsedMessage" may be a drag, move, or remove instruction
    WebSocketServer.clients.forEach((client) => {
        if (client !== ACTIVE_CLIENT && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(parsedMessage));
         }
    });
}

function broadcastNewGame() {
    
    // Create a JSON message token to send to all clients
    const newGameMessage = JSON.stringify({ type: 'resetGame' });
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

    const queueMessage = JSON.stringify({ type: 'updatePlayerQueue', queue: waitingPlayerQueue });

    WebSocketServer.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(queueMessage);
        }
    });
}

function broadcastTurn(player) {

    console.log("Informing client to setTurn()");
    
    const message = JSON.stringify({ type: 'switchTurn', player: player });
    WebSocketServer.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

function broadcastUsernames() {

    console.log("From broadcastUsernames():");
    console.log(`.... RedPlayer  : ${RedPlayer.username}, Color: ${RedPlayer.color}, Wins: ${RedPlayer.wins}, Losses: ${RedPlayer.losses}`);
    console.log(`.... BlackPlayer: ${BlackPlayer.username}, Color: ${BlackPlayer.color}, Wins: ${BlackPlayer.wins}, Losses: ${BlackPlayer.losses}`);

    const message = JSON.stringify({
        type: 'updatePlayerStatus',
        redPlayerRecord: RedPlayer,
        blackPlayerRecord: BlackPlayer
    });
    WebSocketServer.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

async function handleGameResult(result) {
    
    let dbUser = await User.findOne({ username: result.winner });
    if (dbUser) {
        dbUser.wins += 1;
        await dbUser.save();
    }

    dbUser = await User.findOne({ username: result.loser });
    if (dbUser) {
        dbUser.wins -= 1;
        await dbUser.save();
    }

    console.log(`Game result processed. Winning Color: ${result.winningColor}, Winner: ${result.winner}, Loser: ${result.loser}`);

    const message = JSON.stringify({
        type: 'displayWinner',
        winnerColor: result.winningColor
    });
    WebSocketServer.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// Helper function to remove a user from the queue
function removeFromPlayerQueue(username) {
    
    console.log('Queue before removal:', waitingPlayerQueue);

    waitingPlayerQueue = waitingPlayerQueue.filter(user => user.username !== parsedMessage.username);

    assignRoles();

    console.log('Queue after removal:', waitingPlayerQueue);

}