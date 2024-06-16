let CHAT_MESSAGES = [];
let CLIENT_USERNAME = "";

document.addEventListener('DOMContentLoaded', async () => {

    // Usage example
    const clientUID = generateUID();
    console.log('Client UID:', clientUID);

    const board = document.getElementById('board');
    const throttledDraggingPiece = throttle(SEND_draggingPiece, 50);

    let RedPlayer   = null;
    let BlackPlayer = null;
    let currentPlayer = 'red';  
    let draggedElement = null;
    let gameStarted    = false; // Initialize gameStarted to false
    let hasCaptured    = false; // Track if a piece has captured another piece
    let origLeft = 0, origTop = 0;
    let startX, startY;
    let timerInterval;

    // -----------------------------------------------------------------------------
    // STEP #1: Fetch the logged in username from the SERVER (routes/auth.js)
    // -----------------------------------------------------------------------------
    CLIENT_USERNAME = await fetchUsernameFromSERVER();
    if (CLIENT_USERNAME) {
        console.log('Logged in as:', CLIENT_USERNAME);
    } else {
        window.location.href = '/login.html';
    }
    
    // -----------------------------------------------------------------------------
    // STEP #2: Open a WebSocket to the SERVER to enable interaction 
    //
    // NOTE - No commands issued yet from CLIENT to the SERVER
    // -----------------------------------------------------------------------------
    const socketUrl = `ws://${window.location.host}`;
    const socket = new WebSocket(socketUrl);

    // -----------------------------------------------------------------------------
    // STEP #3: Send initialization message to the SERVER that the USER has joined;
    //          the SERVER shall broadcast this event to all other connected clients
    //          so that each can show the user's information in their web browser.
    // -----------------------------------------------------------------------------
    socket.onopen = () => {
        
        console.log('WebSocket connection established');
        
        socket.send(JSON.stringify({ type: 'join', username: CLIENT_USERNAME }));        
        
        HTML_timerDisplayWidget(30); // Set the initial timer display to 00:30        
    };

    // -----------------------------------------------------------------------------
    // STEP 4: Setup the "onclose" and "onerror" event handlers
    // -----------------------------------------------------------------------------
    socket.onclose = () => {
        console.log('WebSocket connection closed');
        alert('WebSocket connection lost. Please refresh the page.');
    };

    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    // -----------------------------------------------------------------------------
    // STEP 5: Setup the event handlers for each of the types of communication expected
    //         to receive from the SERVER.  These must synch with the message tags the
    //         SERVER sends to each CLIENT.
    // -----------------------------------------------------------------------------
    socket.onmessage = (event) => {

        const data = JSON.parse(event.data);

        console.log("--------------------------------------------------------");
        console.log("Received -SERVER -Notification Keyword: ", data.type);
        console.log("--------------------------------------------------------");

        if (data.type === 'updateActiveUsers') {          // confirmed

            console.log(".... Keyword = updateActiveUsers");

            RECEIVE_updateActiveUsers(data.users);

        } else if (data.type === 'displayChat') {          // confirmed

            console.log(".... Keyword = displayChat");
            
            RECEIVE_DisplayChatMessage(data);
            
        } else if (data.type === 'displayWinner') { // confirmed

            console.log(".... Keyword = DisplayWinner");
            
            RECEIVE_DisplayWinner(data);

        } else if (data.type === 'move') {          // confirmed

            console.log(".... Keyword = Move");
            
            RECEIVE_MovePiece(data);

        } else if (data.type === 'drag') {          // confirmed

            console.log(".... Keyword = Drag");
            
            RECEIVE_DragPiece(data);

        } else if (data.type === 'remove') {        // confirmed

            console.log(".... Keyword = Remove");
            
            RECEIVE_RemovePiece(data);

        } else if (data.type === 'resetGame') {       // confirmed

            console.log(".... Keyword = resetGame");
            
            RECEIVE_resetGame();

        } else if (data.type === 'updatePlayerQueue') {   // confirmed
           
            console.log(".... Keyword = updatePlayerQueue");
            
            RECEIVE_updateQueueStatus(data.queue);

        } else if (data.type === 'switchTurn') {       // confirmed
            
            //console.log(".... Keyword = switchTurn");
            
            RECEIVE_switchTurn();

        } else if (data.type === 'updatePlayerStatus') {     // confirmed

            //console.log(".... Keyword = updatePlayerStatus");
            
            RECEIVE_updateFlashingWingHeader(data); 

        } else if (data.type === 'updateCapture') { // confirmed

            console.log(".... Keyword = UpdateCapture");
            
            RECEIVE_updateCapturedPiecesScore(data);

        } else {
            console.log("!!! Error, received unknown command from server: ", data);
        }
    };

    
    // ==============================================================
    // SUPPORTING FUNCTIONS DEFINED BELOW THIS POINT
    // ==============================================================

    function generateUID() {
        // Create a string of alphanumeric characters
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    
        // Generate a random string of 8 characters
        let randomString = '';
        for (let i = 0; i < 8; i++) {
            randomString += chars.charAt(Math.floor(Math.random() * chars.length));
        }
    
        // Get the current time in milliseconds and convert it to a string
        const timestamp = Date.now().toString(36).slice(-4);
    
        // Combine the timestamp with the random string
        return randomString + timestamp;
    }
        
    // Function to fetch the logged in username from the SERVER
    async function fetchUsernameFromSERVER() {
        try {
            const response = await fetch('/current-username');
            if (response.ok) {
                const data = await response.json();
                return data.username;
            } else {
                throw new Error('Failed to fetch username');
            }
        } catch (error) {
            console.error('Error fetching username:', error);
            return null;
        }
    }
        
    
    // ==============================================================
    // CLIENT COUNTDOWN TIMER ROUTINES BELOW THIS POINT
    // ==============================================================

    
    // Function to start a countdown timer from 30 seconds ....
    function startTimer(duration) {

        let timer = duration, minutes, seconds;
        const HTML_timerDisplayWidget = document.getElementById('timer');
 
        clearInterval(timerInterval);

        timerInterval = setInterval(() => {
            minutes = parseInt(timer / 60, 10);
            seconds = parseInt(timer % 60, 10);

            minutes = minutes < 10 ? "0" + minutes : minutes;
            seconds = seconds < 10 ? "0" + seconds : seconds;

            HTML_timerDisplayWidget.textContent = minutes + ":" + seconds;

            if (--timer < 0) {
                stopTimer();
                return;                
                 HTML_timerDisplayWidget.textContent = "Time's Up";
                SEND_switchTurn(); // Switch the turn when the timer runs out
            }
        }, 1000);
    }

    function stopTimer() {
        // Your existing code to stop the timer
        clearInterval(timerInterval);
        console.log('Timer stopped');
    }
    
    // Function to update the display of the HTML object on the CLIENT page
    function HTML_timerDisplayWidget(duration) {

        console.log("Initializing timer ....");

        const HTML_timerDisplayWidget = document.getElementById('timer');
        let minutes = parseInt(duration / 60, 10);
        let seconds = parseInt(duration % 60, 10);
    
        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;
    
        HTML_timerDisplayWidget.textContent = minutes + ":" + seconds;
    }

    
    // ==============================================================
    // CLIENT USER INTERFACE UPDATE ROUTINES BELOW THIS POINT
    // ==============================================================


    // 
    async function RECEIVE_updateFlashingWingHeader(data) {

        RedPlayer   = data.redPlayerRecord;
        BlackPlayer = data.blackPlayerRecord;

        //console.log("From UpdateFlashingWing() - RED + BLACK Players: ", data);
        //console.log(".... Red Player  : ", RedPlayer.username, RedPlayer.captured );
        //console.log(".... BLACK Player: ", BlackPlayer.username, BlackPlayer.captured);

        RedPlayer   = data.redPlayerRecord;
        BlackPlayer = data.blackPlayerRecord;

        const HTML_leftWingWidget = document.getElementById('left-wing');        
              HTML_leftWingWidget.classList.remove('active', 'inactive');
              HTML_leftWingWidget.classList.add('active'); // Initialize the left wing as inactive (green)

        const HTML_rightWingWidget = document.getElementById('right-wing');
              HTML_rightWingWidget.classList.remove('active', 'inactive');
              HTML_rightWingWidget.classList.add('inactive'); // Initialize the right wing as active (red)
    
        //console.log("From RECEIVE_updateFlashingWingHeader():");
        //console.log(`.... RedPlayer  : ${RedPlayer.username}, Color: ${RedPlayer.color}, Wins: ${RedPlayer.wins}, Losses: ${RedPlayer.losses}`);
        //console.log(`.... BlackPlayer: ${BlackPlayer.username}, Color: ${BlackPlayer.color}, Wins: ${BlackPlayer.wins}, Losses: ${BlackPlayer.losses}`);
        //console.log(".... LEFT :",  HTML_leftWingWidget.className ); // Debugging line
        //console.log(".... RIGHT :", HTML_rightWingWidget.className); // Debugging line
          
        // Update the captured pieces text content
        const HTML_capturedRedWidget = document.getElementById('capturedRed');
              HTML_capturedRedWidget.style.zIndex   = '10';
              HTML_capturedRedWidget.textContent = i18next.t('capturedRedDynamic', {
                username: RedPlayer.username,
                count: 0
              });
        const HTML_capturedBlackWidget = document.getElementById('capturedBlack');
              HTML_capturedBlackWidget.style.zIndex = '10';
              HTML_capturedBlackWidget.textContent = i18next.t('capturedBlackDynamic', {
                username: BlackPlayer.username,
                count: 0
              });
    
        // Update the logged in username
        const HTML_loginUserWidget = document.getElementById('loginUser');
              HTML_loginUserWidget.textContent = i18next.t('loggedInAs', { loginame: CLIENT_USERNAME });
    
        // Update player records
        const HTML_redPlayerRecordWidget   = document.getElementById('redPlayerRecord');
        const HTML_blackPlayerRecordWidget = document.getElementById('blackPlayerRecord');
        
        if (HTML_redPlayerRecordWidget) {
            HTML_redPlayerRecordWidget.innerText = i18next.t('redPlayerRecord', {
                wins: RedPlayer.wins, losses: RedPlayer.losses
            });
        }
        if (HTML_blackPlayerRecordWidget) {
            HTML_blackPlayerRecordWidget.innerText = i18next.t('blackPlayerRecord', {
                wins: BlackPlayer.wins, losses: BlackPlayer.losses
            });
        }
    
        //console.log(".... .... Red TEXT:", HTML_capturedRedWidget.innerText); // Debugging line
        //console.log(".... .... Black TEXT:", HTML_capturedBlackWidget.innerText); // Debugging line
    }
        
    function RECEIVE_updateCapturedPiecesScore(data) {

        RedPlayer = data.redPlayerRecord;
        BlackPlayer = data.blackPlayerRecord;
    
        console.log("RECEIVED RED + BLACK Players: ", RedPlayer.username, RedPlayer.captured, BlackPlayer.username, BlackPlayer.captured);

        const HTML_capturedRedWidget   = document.getElementById('capturedRed');
              HTML_capturedRedWidget.textContent   = i18next.t('capturedRedDynamic', { username: RedPlayer.username, count: RedPlayer.captured });
              HTML_capturedRedWidget.style.zIndex = '10';
              HTML_capturedRedWidget.style.visibility = 'visible';
        
              const HTML_capturedBlackWidget = document.getElementById('capturedBlack');
              HTML_capturedBlackWidget.textContent = i18next.t('capturedBlackDynamic', { username: BlackPlayer.username, count: BlackPlayer.captured });
              HTML_capturedBlackWidget.style.zIndex = '10';
              HTML_capturedBlackWidget.style.visibility = 'visible';      
    
        console.log("Updated captured pieces:", HTML_capturedRedWidget.innerText, HTML_capturedBlackWidget.innerText);
    }
    
    function SEND_updateCapturedPieces(middlePiece) {

        console.log("From SEND_updateCapturedPieces() - RED + BLACK Players: ");
        console.log(".... Red Player  : ", RedPlayer.username, RedPlayer.captured );
        console.log(".... BLACK Player: ", BlackPlayer.username, BlackPlayer.captured);
        console.log(`.... Captured Piece: #${middlePiece.dataset.id} @ Loc: ${middlePiece.dataset.row}-${middlePiece.dataset.col}, ${middlePiece.dataset.color}`);

        if (!middlePiece) {
            console.error('middlePiece is undefined');
            return;
        }

        const pieceColor = middlePiece.classList.contains('red') ? 'Red' : 'Black';

        console.log(".... MiddlePiece Color: ", pieceColor);

        //if (middlePiece.classList.contains('red')) {
        if (pieceColor === 'Red') {
            BlackPlayer.captured++;
        //} else if (middlePiece.classList.contains('black')) {
        } else if (pieceColor === 'Black') {
            RedPlayer.captured++;
        }

        console.log("SENDING TO SERVER RED + BLACK Players: ", RedPlayer.username, RedPlayer.captured, BlackPlayer.username, BlackPlayer.captured);

        // Send the capture update to the server
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: 'updateCapture',
                redPlayerRecord: RedPlayer,
                blackPlayerRecord: BlackPlayer,
            }));
        }
    }
        
    
    // ==============================================================
    // CLIENT LANGUAGE TRANSLATION ROUTINES BELOW THIS POINT
    // ==============================================================


    // Define the function to handle the click event for the US flag
    function EVENT_USFlagClick() {
        console.log("Clicked ENGLISH");
        changeLanguage('en-US');
    }

    // Define the function to handle the click event for the China flag
    function EVENT_ChinaFlagClick() {
        console.log("Clicked CHINESE");
        changeLanguage('zh-CN');
    }

    async function changeLanguage(language) {

        i18next.changeLanguage(language, async (err, t) => {
            if (err) {
                console.error('Error changing language:', err);
                return;
            }
            
            console.log('Language changed to', language);
            
            updateContent();
    
            console.log("");
            console.log("-------------------------------------------");

            const HTML_redPlayerRecordWidget   = document.getElementById(`redPlayerRecord`);
            const HTML_blackPlayerRecordWidget = document.getElementById(`blackPlayerRecord`);

            if (RedPlayer) {
                if (HTML_redPlayerRecordWidget) {
                    HTML_redPlayerRecordWidget.innerText = i18next.t('redPlayerRecord', { wins: RedPlayer.wins, losses: RedPlayer.Losses });
                }
            } else{
                HTML_redPlayerRecordWidget.innerText = i18next.t('redPlayerRecord', { wins: 0, losses: 0 });
            }
    
            if (BlackPlayer) {
                if (HTML_blackPlayerRecordWidget) {
                    HTML_blackPlayerRecordWidget.innerText = i18next.t('blackPlayerRecord', { wins: BlackPlayer.wins, losses: BlackPlayer.losses });
                }
            } else{
                HTML_blackPlayerRecordWidget.innerText = i18next.t('blackPlayerRecord', { wins: 0, losses: 0 });
            }
    
            console.log("-------------------------------------------");
            console.log("");
        });
    }

    
    // ==============================================================
    // CLIENT "Play Next Button" ROUTINES BELOW THIS POINT
    // ==============================================================


    function RECEIVE_switchTurn() {

        //console.log(">>>> RECEIVE_switchTurn: ", currentPlayer);

        if (hasCaptured) {
            // Player can move again if they captured a piece
            //console.log('.... RECEIVE_switchTurn():  Player has captured, allowing another move');
            startTimer(30); // Restart the timer for the next move
            return;
        }
    
        // console.log(".... RECEIVE_switchTurn():  clearInterval");

        clearInterval(timerInterval); // Stop the current timer
    
        // Switch the current player
        currentPlayer = currentPlayer === 'red' ? 'black' : 'red';
        hasCaptured = false; // Reset capture flag
    
        // console.log(".... RECEIVE_switchTurn():  color switched to: ", currentPlayer);

        // Update the UI indicators for the turn
        const HTML_leftWingWidget  = document.getElementById('left-wing');
        const HTML_rightWingWidget = document.getElementById('right-wing');
    
        if (currentPlayer === 'red') {
            //console.log("From RECEIVE_switchTurn() - Setting RED active (LEFT) = GREEN: ", currentPlayer);
            HTML_leftWingWidget.classList.add('active');
            HTML_leftWingWidget.classList.remove('inactive');
            HTML_rightWingWidget.classList.add('inactive');
            HTML_rightWingWidget.classList.remove('active');
        } else {
            //console.log("From RECEIVE_switchTurn() - Setting BLACK active (RIGHT) = GREEN: ", currentPlayer);
            HTML_leftWingWidget.classList.remove('active');
            HTML_leftWingWidget.classList.add('inactive');
            HTML_rightWingWidget.classList.remove('inactive');
            HTML_rightWingWidget.classList.add('active');
        }
    
        // Debugging output
        //console.log('Left wing class:', HTML_leftWingWidget.className);
        //console.log('Right wing class:', HTML_rightWingWidget.className);
    
        if (gameStarted) { // Start the timer only if the game has started
            // console.log(".... RECEIVE_switchTurn():  startTimer");
            startTimer(30); // Restart the timer with the desired duration
        }

        //console.log(".... RECEIVE_switchTurn():  CURRENT PLAYER: ", currentPlayer);

        // Handle AI turn if it's the AI's turn
        if (currentPlayer === 'black' && BlackPlayer.username === 'Wizard') {
            //console.log(".... RECEIVE_switchTurn():  Calling mkBestMove");
            makeBestMove();
            // checkForCrowning(draggedElement);
            // checkForWinner();
            //console.log(".... RECEIVE_switchTurn():  After mkBestMove -->> Calling SEND_switchTurn");
            SEND_switchTurn(currentPlayer);
        }
        //console.log("<<<< RECEIVE_switchTurn: ", currentPlayer);
    }
        
                            
    function canMovePiece(pieceColor) {
        
        // console.log("From canMovePiece - Colors are: ", pieceColor, currentPlayer);

        return (currentPlayer === 'red' && pieceColor === 'red') || (currentPlayer === 'black' && pieceColor === 'black');
    }

    // Define the function to handle the play next button click
    function SEND_playNextButtonClick() {
        
        const DOM_QueueList = document.getElementById('queueList');
        const button = document.getElementById('playNextButton');
        const action = button.dataset.action;

        console.log("---------------------------------------------------");
        console.log("HTML_playNextButtonWidget triggered by LMB click: ", action);
        console.log("---------------------------------------------------");

        if (action === 'playNext') {
            for (let i = 0; i < DOM_QueueList.children.length; i++) {
                const listItem = DOM_QueueList.children[i];
                const listItemUsername = listItem.querySelector('.username').textContent;
                if (listItemUsername === CLIENT_USERNAME) {
                    console.log(`User ${CLIENT_USERNAME} is already in the waiting list.`);
                    return;
                }
            }

            socket.send(JSON.stringify({ type: 'joinQueue', username: CLIENT_USERNAME, avatar: `images/${CLIENT_USERNAME}.png` }));

            button.textContent = i18next.t('dontPlayNext');
            button.dataset.action = 'dontWantToPlay';

        } else if (action === 'dontWantToPlay') {

            socket.send(JSON.stringify({ type: 'leaveQueue', username: CLIENT_USERNAME }));

            button.textContent = i18next.t('playNext');
            button.dataset.action = 'playNext';

        } else {
            console.log("From HTML_playNextButtonWidget() - Unhandled action type: ", action);
        }

        // Ensure the button is displayed
        button.style.display = 'block';
        console.log('Button display set to:', button.style.display);
    }

    async function RECEIVE_updateQueueStatus(queue) {

        if (!Array.isArray(queue)) {
            console.error("Received queue is not an array:", queue);
            return;
        }
    
        console.log("---------------------------------------------------");
        console.log("Received Player Queue notification from: ", CLIENT_USERNAME);
        console.log("---------------------------------------------------");
    
        const HTML_playNextButtonWidget = document.getElementById('playNextButton');
    
        if (queue.some(user => user.username === CLIENT_USERNAME)) {
            HTML_playNextButtonWidget.textContent = i18next.t('dontPlayNext');
            HTML_playNextButtonWidget.dataset.action = 'dontWantToPlay';
            console.log(`Set button to "don't want to play": ${HTML_playNextButtonWidget.textContent}`);
        } else {
            HTML_playNextButtonWidget.textContent = i18next.t('playNext');
            HTML_playNextButtonWidget.dataset.action = 'playNext';
            console.log(`Set button to "play next": ${HTML_playNextButtonWidget.textContent}`);
        }
    
        // Ensure the button is displayed
        HTML_playNextButtonWidget.style.display = 'block';
        console.log('Button display set to:', HTML_playNextButtonWidget.style.display);
    
        const queueList = document.getElementById('queueList');
        queueList.innerHTML = '';
    
        queue.forEach(user => {
            const userLi = document.createElement('li');
    
            const avatarDiv = document.createElement('div');
            avatarDiv.className = 'avatar';
            avatarDiv.style.backgroundImage = `url(${user.avatar})`;
    
            const HTML_usernameDiv = document.createElement('div');
            HTML_usernameDiv.className = 'username';
            HTML_usernameDiv.innerText = user.username;
    
            userLi.appendChild(avatarDiv);
            userLi.appendChild(HTML_usernameDiv);
            queueList.appendChild(userLi);
        });
    
        console.log('Updated queue list');
    }

    
    // ==============================================================
    // CLIENT Game Board + Drag & Drop ROUTINES BELOW THIS POINT
    // ==============================================================


    function createBoard() {
        let pieceId = 1;
        let squareId = 1;

        for (let row = 1; row <= 8; row++) {
            for (let col = 1; col <= 8; col++) {
                const square = document.createElement('div');
                square.classList.add('square');
                square.dataset.row = row;
                square.dataset.col = col;
                square.dataset.id = squareId++;
                square.dataset.type = "square";

                if ((row + col) % 2 === 0) {
                    square.classList.add('light');
                } else {
                    square.classList.add('dark');

                    if (row < 4 || row > 5) {
                        const piece = document.createElement('div');
                        piece.classList.add('piece', row < 4 ? 'red' : 'black');
                        piece.dataset.row = row;
                        piece.dataset.col = col;
                        piece.dataset.id = pieceId++;
                        piece.dataset.type = "checker";
                        piece.draggable = true;

                        const number = document.createElement('span');
                              number.textContent = piece.dataset.id;
                        piece.appendChild(number);

                        square.appendChild(piece);

                        piece.addEventListener('mousedown', startDrag);

                        piece.addEventListener('click', () => {
                            if (canMovePiece(piece.classList.contains('red') ? 'red' : 'black')) {
                                console.log('Move allowed');
                            } else {
                                console.log("From AttachedEvent: It's not your turn.");
                            }
                        });
                    }
                }
                board.appendChild(square);
            }
        }

        //console.log("-------------------------------------------------------");
        //console.log("SETTING UP BOARD");
        const boardRect = board.getBoundingClientRect();
        //console.log(".... BOARD RECT: ", boardRect.left, boardRect.right, boardRect.top, boardRect.bottom);

        const squares = document.querySelectorAll('.square');
        squares.forEach(square => {
            // Calculate the center X and Y coordinates
            const rect    = square.getBoundingClientRect();
            let left = rect.left - boardRect.left;
            let top  = rect.top  - boardRect.top;

            square.dataset.centerX = Math.floor(left + rect.width / 2);
            square.dataset.centerY = Math.floor(top + rect.height / 2); 
            //console.log(".... Square ID: ", square.dataset.id, square.dataset.centerX, square.dataset.centerY)           ;
        });
        //console.log("BOARD SETUP COMPLETE");            
        //console.log("-------------------------------------------------------");
    }

    function startDrag(event) {

        const piece      = event.target;
        const pieceColor = piece.classList.contains('red') ? 'red' : 'black';
    
        if (!canMovePiece(pieceColor)) {
            console.log("From startDrag: It's not your turn - ", pieceColor);
            return;
        }

        event.preventDefault();

        draggedElement = event.target;

        startX = event.clientX;
        startY = event.clientY;

        const rect = draggedElement.getBoundingClientRect();
        origLeft = 0;
        origTop = 0;

        offsetX = startX - rect.left;
        offsetY = startY - rect.top;

        draggedElement.style.zIndex   = '1000';
        draggedElement.style.position = 'absolute';

        document.addEventListener('mousemove', throttledDraggingPiece);
        document.addEventListener('mouseup', dropPiece);
    }

    function SEND_draggingPiece(event) {
        
        if (!draggedElement) return;        // draggedElement is set by StartDrag()
    
        event.preventDefault();
    
        const pieceColor = draggedElement.classList.contains('red') ? 'red' : 'black';
    
        if (!canMovePiece(pieceColor)) {
            return;
        }
    
        let Xupdate = event.clientX - startX;
        let Yupdate = event.clientY - startY;
    
        const isCrowned = draggedElement.classList.contains('crowned');
        if (!isCrowned) {
            if (draggedElement.classList.contains('red') && Yupdate < 0) Yupdate = 0;
            if (draggedElement.classList.contains('black') && Yupdate > 0) Yupdate = 0;
        }
    
        if (Math.abs(Xupdate) > Math.abs(Yupdate)) {
            Yupdate = Math.abs(Xupdate) * Math.sign(Yupdate);
        } else {
            Xupdate = Math.abs(Yupdate) * Math.sign(Xupdate);
        }
    
        draggedElement.style.left = `${origLeft + Xupdate}px`;
        draggedElement.style.top = `${origTop + Yupdate}px`;
    
        if (socket.readyState === WebSocket.OPEN) {
            const dragData = {
                type: 'drag',
                pieceId: draggedElement.dataset.id,
                x: origLeft + Xupdate,
                y: origTop + Yupdate
            };
            
            // console.log('Sending drag data:', dragData);
            
            socket.send(JSON.stringify(dragData));
        }
    }

    function dropPiece(event) {

        if (!draggedElement) return; // draggedElement is set by startDrag()
    
        const pieceColor = draggedElement.classList.contains('red') ? 'red' : 'black';
        draggedElement.dataset.color = pieceColor;

        console.log(">>>> DROP PIECE START --> ", pieceColor);
        
        if (!canMovePiece(pieceColor)) {
            console.log("From dropPiece: It's not your turn - ", pieceColor);
            resetDraggedElementPosition();
            return;
        }
        
        const rect = draggedElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        console.log('.... dropPiece(): Dropping piece:', draggedElement.dataset.id);
        //console.log(".... dropPiece(): Rect Params     : ", Math.trunc(rect.left), Math.trunc(rect.top), Math.trunc(rect.height), Math.trunc(rect.width));
        //console.log(".... dropPiece(): GMPC Center X, Y: ", Math.trunc(centerX), Math.trunc(centerY));

        const targetSquare = getSquareAtCoordinates(centerX, centerY);

        if (targetSquare) {

            const targetRect = targetSquare.getBoundingClientRect();
            const pieceRect = draggedElement.getBoundingClientRect();
            const targetRow = parseInt(targetSquare.dataset.row);
            const targetCol = parseInt(targetSquare.dataset.col);
            const draggedRow = parseInt(draggedElement.dataset.row);
            const draggedCol = parseInt(draggedElement.dataset.col);
    
            //console.log('Target square:', targetSquare, targetRow, targetCol);
            //console.log('Dragged element:', draggedRow, draggedCol);
    
            const { isValid, capturedPiece } = validateMove(draggedElement, targetRow, targetCol, draggedRow, draggedCol);
            
            if (isValid) {

                // Move the piece first
                if (socket.readyState === WebSocket.OPEN) {
                    const moveData = {
                        type: 'move',
                        clientUID: clientUID,
                        pieceId: draggedElement.dataset.id,
                        targetRow: targetRow,
                        targetCol: targetCol,
                        capturedPieceId: capturedPiece ? capturedPiece.dataset.id : null
                    };
    
                    SEND_movePiece(moveData);
                } else {
                    console.error('WebSocket connection not open');
                }

                // Update piece position
                draggedElement.style.left = `${((targetRect.width - pieceRect.width) / 2) - 5}px`;
                draggedElement.style.top = `${((targetRect.height - pieceRect.height) / 2) - 5}px`;
                targetSquare.appendChild(draggedElement);
                draggedElement.dataset.row = targetRow;
                draggedElement.dataset.col = targetCol;
    
                if (capturedPiece) {
                    hasCaptured = true; // Mark that a capture has occurred
                    // Handle captured piece
                    SEND_updateCapturedPieces(capturedPiece);
                    capturedPiece.remove();
                } else {
                    console.log(".... dropPiece(): DID NOT CAPTURE PLAYER");
                    hasCaptured = false;
                }

                console.log('.... dropPiece(): Calling checkForCrowning()');
                checkForCrowning(draggedElement);
                console.log('.... dropPiece(): Calling checkForWinner()');
                checkForWinner();
    
                const nextPlayer = getItemColor(draggedElement); // === 'red' ? 'black' : 'red';
    
                if (hasCaptured) {
                    
                    const possibleMoves = getPossibleMoves(draggedElement);
                    if (possibleMoves.length =0) {
                        // Allow the same player to move again
                        console.log(`.... dropPiece(): Player has captured - #Possible Moves: ${possibleMoves.length}`);
                        startTimer(30); // Restart the timer for the next move
                    } else {
                        console.log('.... dropPiece(): Player captured, but no Possible Moves');
                        hasCaptured = false;
                        SEND_switchTurn(nextPlayer);
                    }
                } else {
                    console.log('.... dropPiece(): NO PIECE CAPTURED ... calling SEND_switchTurn()');
                    SEND_switchTurn(nextPlayer);
                }
    
            } else {
                console.log('.... dropPiece(): Invalid move');
                resetDraggedElementPosition();
            }
        } else {
            console.log('.... dropPiece(): No target square found');
            resetDraggedElementPosition();
        }
    
        draggedElement.style.zIndex = '';
        document.removeEventListener('mousemove', throttledDraggingPiece);
        document.removeEventListener('mouseup', dropPiece);
        draggedElement = null;

        console.log("<<<< DROP PIECE END");
    }

function validateMove(piece, targetRow, targetCol, draggedRow, draggedCol) {
    const rowDiff = Math.abs(targetRow - draggedRow);
    const colDiff = Math.abs(targetCol - draggedCol);

    const fromSquare = `${draggedRow}-${draggedCol}`;
    const toSquare   = `${targetRow}-${targetCol}`;

    console.log(`>>>> ValidateMode: Shifted ${rowDiff} row, ${colDiff} column.`);
    console.log(`.... Moving From: ${fromSquare} --> To: ${toSquare}.`);

    if (rowDiff === 1 && colDiff === 1) {
        console.log("<<<< RETURNING -VALID- move state.");
        return { isValid: true, capturedPiece: null };
    }

    if (rowDiff === 2 && colDiff === 2) {
        const middleRow = Math.floor((targetRow + draggedRow) / 2);
        const middleCol = Math.floor((targetCol + draggedCol) / 2);
        const middleSquare = document.querySelector(`.square[data-row='${middleRow}'][data-col='${middleCol}']`);
        const middlePiece = middleSquare && middleSquare.querySelector('.piece');

        if (middlePiece && getItemColor(middlePiece) !== getItemColor(piece)) {
            console.log("<<<< RETURNING Capturing piece at:", middleRow, middleCol);
            return { isValid: true, capturedPiece: middlePiece };
        }
    }

    console.log("<<<< RETURNING invalid move state.");
    return { isValid: false, capturedPiece: null };
}


    function resetDraggedElementPosition() {
        console.log('Resetting position to:', origLeft, origTop);
        draggedElement.style.left = `${origLeft}px`;
        draggedElement.style.top = `${origTop}px`;
    }
                
    function SEND_movePiece(moveData) {

        console.log('>>>> SEND_movePiece(): Sending move data:', moveData.pieceId);
                    
        socket.send(JSON.stringify(moveData));

        console.log("<<<< SEND_movePiece() exiting.");

    }

    // function to request the SERVER to communication next player's turn
    function SEND_switchTurn(player) {
       
        console.log(">>>> SEND_switchTurn: ", player);
    
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'switchTurn', player: player }));
        }
    
        //if (player === 'black') {
        //    setTimeout(makeBestMove, 500); // Adding a slight delay to mimic thinking time
        //}
        console.log("<<<< SEND_switchTurn: ", player);
    }
            
    function checkForCrowning(checker) {

        const id    = parseInt(checker.dataset.id);
        const row   = parseInt(checker.dataset.row);
        const col   = parseInt(checker.dataset.col);
        const color = checker.classList.contains('red') ? 'red' : 'black';
        const location = `${row}-${col}`;

        console.log(`>>>> Checking for Crowning: GMPC ID: ${id}, Color: ${color} @Loc: ${location}.`);

        if ((color === 'red' && row === 8) || (color === 'black' && row === 1)) {
            console.log(".... CROWNING!");
            crownChecker(checker);
        } else {
            console.log(".... N/A at this time.");
        }
        console.log("<<<< Leaving Checking for Crowning");
    }

    function crownChecker(checker) {
        checker.classList.add('crowned');
        checker.offsetHeight;
    }

    function checkForWinner() {
        
        //console.log(">>>> checkForWinner");

        const redPieces   = document.querySelectorAll('.piece.red');
        const blackPieces = document.querySelectorAll('.piece.black');

        if (redPieces.length === 0) {
            SEND_recordWinner('black');
            stopTimer();
        } else if (blackPieces.length === 0) {
            SEND_recordWinner('red');
            stopTimer();
        } else {
            //console.log(".... N/A at this time.");
        }
        //console.log("<<<< checkForWinner");
    }


    function getSquareAtCoordinates(GamePiece_centerX, GamePiece_centerY) {
        
        const boardRect = board.getBoundingClientRect();
    
        if (GamePiece_centerX < boardRect.left || GamePiece_centerX > boardRect.right || GamePiece_centerY < boardRect.top || GamePiece_centerY > boardRect.bottom) {
            console.log("ERROR: values out of bound!");
            return null;
        }
    
        const relativeX = Math.trunc(GamePiece_centerX - boardRect.left);
        const relativeY = Math.trunc(GamePiece_centerY - boardRect.top);
    
        const squareSize = boardRect.width / 8;
    
        const targetRow = Math.trunc(relativeY / squareSize) + 1; // Adjusted for 1-based indexing
        const targetCol = Math.trunc(relativeX / squareSize) + 1; // Adjusted for 1-based indexing
            
        let result = document.querySelector(`.square[data-row='${targetRow}'][data-col='${targetCol}']`);

        // console.log("From getSquareAtCoordinates");
        //console.log(".... Game Piece Center X, Y: ", Math.trunc(GamePiece_centerX), Math.trunc(GamePiece_centerY));
        //console.log(".... Board Left,Right      : ", Math.trunc(boardRect.left), Math.trunc(boardRect.right));
        //console.log(".... Board Top,Bottom      : ", Math.trunc(boardRect.top), Math.trunc(boardRect.bottom));
        //console.log(".... Board HGT, Width      : ", boardRect.height, boardRect.width);
        //console.log(".... Relative X, Y         : ", relativeX, relativeY);
        //console.log(".... squareSize            : ", squareSize);
        //console.log(".... Target Row,Col        : ", targetRow, targetCol);
        console.log(">>>> From getSquareAtCoordinates(): Landed on Square: ", result.dataset.row, result.dataset.col, " <<<<");
        
        return result;
    }
    
    function getItemColor(element) {
        if (element && element.classList.contains('piece')) {
            if (element.classList.contains('red')) {
                return 'red';
            } else if (element.classList.contains('black')) {
                return 'black';
            }
        }
        return '';
    }

    function RECEIVE_DisplayWinner(data) {

        console.log("WINNER Received from SERVER: ", data.winnerColor);

        const banner = document.getElementById('winnerBanner');
              banner.textContent = `${data.winnerColor.charAt(0).toUpperCase() + data.winnerColor.slice(1)} wins!`;
              banner.classList.remove('hidden');
              banner.style.display = 'block';
    
        document.getElementById('redWins').textContent   = RedPlayer.wins;
        document.getElementById('blackWins').textContent = BlackPlayer.wins;
    
    }

    function SEND_recordWinner(winnerColor) {

        let winnerUsername = "";
        let loserUsername  = "";
        if (winnerColor === 'red') {
            
            RedPlayer.wins++;
            winnerUsername = RedPlayer.username;
            loserUsername  = BlackPlayer.username;

        } else if (winnerColor === 'black') {

            BlackPlayer.wins++;
            winnerUsername = BlackPlayer.username;
            loserUsername = RedPlayer.username;
        }

        if (socket.readyState === WebSocket.OPEN && winnerUsername) {
            const resultData = {
                type: 'gameResult',
                winningColor: winnerColor,
                winner: winnerUsername,
                loser: loserUsername,
                redPlayerRecord: RedPlayer,
                blackPlayerRecord: BlackPlayer,
                timestamp: new Date().toISOString()
            };
            
            console.log("INFORMING SERVER of Winning Color: ", winnerColor);
            
            socket.send(JSON.stringify(resultData));
        }
    }

    function updatePlayerInfo(user) {
        
        const playerName    = document.getElementById(`${user.color}PlayerName`);
        const playerWins    = document.getElementById(`${user.color}Wins`);
        const playerAvatar  = document.getElementById(`${user.color}PlayerAvatar`);
        const capturedCount = document.getElementById(`captured${user.color.charAt(0).toUpperCase() + user.color.slice(1)}`);
        const playerRecord  = document.getElementById(`${user.color}PlayerRecord`);
    
        console.log("");
        console.log("-------------------------------------------");
        console.log("Updating record info for user: ", user.username, `${user.color}PlayerRecord`);

        if (playerName)    playerName.textContent = user.username;
        if (playerWins)    playerWins.textContent = user.wins;
        if (playerAvatar)  playerAvatar.style.backgroundImage = `url(${user.avatar})`;
        if (capturedCount) capturedCount.textContent = user.captured;

        if (playerRecord)  {
            playerRecord.innerText = '';
            playerRecord.innerText = i18next.t(`${user.color}PlayerRecord`, { wins: user.wins, losses: user.losses });
            console.log(".... Inner Text: ", playerRecord.innerText);
        }

        console.log("-------------------------------------------");
        console.log("");
    }

    function throttle(func, limit) {
        let lastFunc;
        let lastRan;
        return function() {
            const context = this;
            const args = arguments;
            if (!lastRan) {
                func.apply(context, args);
                lastRan = Date.now();
            } else {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(function() {
                    if ((Date.now() - lastRan) >= limit) {
                        func.apply(context, args);
                        lastRan = Date.now();
                    }
                }, limit - (Date.now() - lastRan));
            }
        };
    }

    // ==============================================================
    // FUNCTIONS THAT RESPOND TO SERVER COMMANDS BELOW THIS POINT
    // ==============================================================


    function RECEIVE_DragPiece(data) {
        const piece = document.querySelector(`.piece[data-id='${data.pieceId}']`);
        if (piece) {
            console.log('Updating piece position:', data);
            piece.style.position = 'absolute';
            piece.style.left = `${data.x}px`;
            piece.style.top = `${data.y}px`;
        }
    }

    function RECEIVE_MovePiece(data) {

        console.log(">>>> RECEIVE_MovePiece: ", data);
        
        if (data.clientUID === clientUID) {
            //console.log(".... RECEIVE_MovePiece(): ClientUID Match - exiting!");
            //return;
        }

        const piece = document.querySelector(`.piece[data-id='${data.pieceId}']`);
    
        if (piece) {

            const pieceColor = piece.classList.contains('red') ? 'red' : 'black';
    
            // No need to check if canMovePiece here as it's synchronized
            const targetSquare = document.querySelector(`.square[data-row='${data.targetRow}'][data-col='${data.targetCol}']`);

            if (targetSquare) {

                const targetRect  = targetSquare.getBoundingClientRect();
                const pieceRect   = piece.getBoundingClientRect();
                piece.style.left  = `${((targetRect.width - pieceRect.width) / 2) - 5}px`;
                piece.style.top   = `${((targetRect.height - pieceRect.height) / 2) - 5}px`;
                targetSquare.appendChild(piece);
                piece.dataset.row = data.targetRow;
                piece.dataset.col = data.targetCol;
    
                checkForCrowning(piece);
                checkForWinner();
    
                if (data.capturedPieceId) {
                    RECEIVE_RemovePiece({ pieceId: data.capturedPieceId });
                }
            }
        } else {
            console.log("!!! ERROR: Unable to locate Piece ID: ", data.pieceId);
        }
        console.log("<<<< RECEIVE_MovePiece: Graceful exit.");
    }

    function RECEIVE_RemovePiece(data) {
        const piece = document.querySelector(`.piece[data-id='${data.pieceId}']`);
        if (piece) {
            console.log('Removing piece:', data);
            piece.remove();
        }
    }

    function RECEIVE_resetGame() {

        const board = document.getElementById('board');
              board.innerHTML = '';
        RedPlayer.captured = 0;
        BlackPlayer.captured = 0;
        gameStarted = true; // Set gameStarted to true when a new game is started
        
        const winnerBanner = document.getElementById('winnerBanner');
              winnerBanner.classList.add('hidden');
              winnerBanner.style.display = 'none';
              
        const HTML_capturedRed   = document.getElementById('capturedRed');
        const HTML_capturedBlack = document.getElementById('capturedBlack');
    
        if (HTML_capturedRed && HTML_capturedBlack) {
            HTML_capturedRed.classList.remove('highlight');
            HTML_capturedBlack.classList.remove('highlight');
        } else {
            console.error('Captured elements are undefined:', { HTML_capturedRed, HTML_capturedBlack });
        }
      
        createBoard();

        startTimer(30); // Start the timer when the new game button is clicked
    }

    // This function updates the "Active Users" panel (white) beneath the RED player's info.
    // NOTE - When a user logs in, a request is issued to the SERVER to "join" the list of
    //        "active users".  The SERVER will assign a color/role to this new person in the
    //        form of "red", "black", or "spectator".
    function RECEIVE_updateActiveUsers(users) {

        // get the pointer to the "active user list" widget that is beneath the RED player's information
        const HTML_activeUserList = document.getElementById('activeUserList');
              HTML_activeUserList.innerHTML = '';
    
        users.forEach(user => {

            console.log(`.... .... Adding user to Active User's list - User: ${user.username}, Color: ${user.color}, Wins: ${user.wins}, Losses: ${user.losses}`);

            // get the pointer to the web page's "game area" so we can set/unset the yellow "spectator" outline
            const HTML_gameArea   = document.getElementById('gameArea');
            if ( !HTML_gameArea ) {
                console.error("HTML_gameArea not found");
                return;
            }
    
            // construct an HTML element to construct a user picture (avatar) and name label
            const HTML_userItem = document.createElement('div');
                  HTML_userItem.classList.add('user');
    
            const HTML_avatar = document.createElement('div');
                  HTML_avatar.classList.add('avatar');
                  HTML_avatar.style.backgroundImage = `url(${user.avatar})`;
    
            const HTML_usernameDiv = document.createElement('div');
                  HTML_usernameDiv.classList.add('username');
                  HTML_usernameDiv.textContent = user.username;
    
            // add the avatar & name label to the "active users list"
            HTML_userItem.appendChild(HTML_avatar);
            HTML_userItem.appendChild(HTML_usernameDiv);
            HTML_activeUserList.appendChild(HTML_userItem);

            // if the user from is a RED or BLACK player
            if (user.color === 'red' || user.color === 'black') {
                
                updatePlayerInfo(user);  // update the player info 
            }

            // if the user in the FOR loop in the logged in user
            if (user.username === CLIENT_USERNAME) {
                
                // if the user is a RED or BLACK player, hide the yellow outline
                if (user.color === 'red' || user.color === 'black') {
                    HTML_playNextButtonWidget.style.display = 'none';
                    HTML_gameArea.style.outline = 'none';
                } else {
                HTML_playNextButtonWidget.style.display = 'block';
                HTML_gameArea.style.outline = '3px solid yellow';    
                }
            }
        });
    }
    
    function RECEIVE_DisplayChatMessage(data) {

        console.log("Data Fields: ", data.avatar, data.from);
    
        const chatMessagesContainer = document.getElementById('chatMessages');
        const messageElement = document.createElement('div');    
              messageElement.classList.add('chat-message');

        const isOwnMessage = data.from === CLIENT_USERNAME;
        if (isOwnMessage) {
            messageElement.classList.add('own-message');
        } else {
            messageElement.classList.add('other-message');
        }
    
        const messageText = data.message;
        CHAT_MESSAGES.push({ from: data.from, message: messageText });
    
        messageElement.innerHTML = `
            ${!isOwnMessage ? `<img src="${data.avatar}" alt="${data.from}" class="chat-avatar">` : ''}
            <div class="chat-text">${data.message}</div>
            ${isOwnMessage ? `<img src="images/${CLIENT_USERNAME}.png" alt="${CLIENT_USERNAME}" class="chat-avatar">` : ''}
        `;
    
        console.log("HTML Message: ", messageElement.innerHTML);
    
        chatMessagesContainer.appendChild(messageElement);
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    }
    
    
    // ==============================================================
    // SUPPORTING Event Handlers BELOW THIS POINT
    // ==============================================================

    
    function SEND_chatMessageBtnClick() {
        const chatInput = document.getElementById('chatInput');
        const message = chatInput.value;
        
        if (message.trim() !== '') {
            socket.send(JSON.stringify({
                type: 'chat',
                message: message,
                from: CLIENT_USERNAME,
                avatar: `images/${CLIENT_USERNAME}.png`
            }));
    
            chatInput.value = '';
        }
    }

    function SEND_chatMessageKeyDown(event) {
        if (event.key === 'Enter') {
            const chatInput = document.getElementById('chatInput');
            const message = chatInput.value;
            
            if (message.trim() !== '') {
                socket.send(JSON.stringify({
                    type: 'chat',
                    message: message,
                    from: CLIENT_USERNAME,
                    avatar: `images/${CLIENT_USERNAME}.png`
                }));
                chatInput.value = '';
            }
        }
    }

    function SEND_newGameButtonClick() {
        gameStarted = true;
        
        socket.send(JSON.stringify({ type: 'newGame' }));
    }

    // Setup the event listener for the play next button
    const HTML_playNextButtonWidget = document.getElementById('playNextButton');
        HTML_playNextButtonWidget.dataset.action = 'playNext';
        HTML_playNextButtonWidget.textContent = 'Play Next';
        HTML_playNextButtonWidget.addEventListener('click', SEND_playNextButtonClick);


    function reportBoardState() {
        const squares = document.querySelectorAll('.square');
        squares.forEach(square => {
            const row = square.dataset.row;
            const col = square.dataset.col;
            const id = square.dataset.id;
            const piece = square.querySelector('.piece');
    
            // Calculate the center X and Y coordinates
            const rect = square.getBoundingClientRect();
            const centerX = Math.floor(rect.left + rect.width / 2);
            const centerY = Math.floor(rect.top + rect.height / 2);
    
            if (piece) {
                const pieceId = piece.dataset.id;
                const pieceColor = piece.classList.contains('red') ? 'red' : 'black';
                console.log(`Square ${id} at row ${row}, col ${col} contains ${pieceColor} piece with id ${pieceId}. Center: (${centerX}, ${centerY})`);
            } else {
                console.log(`Square ${id} at row ${row}, col ${col} is empty. Center: (${centerX}, ${centerY})`);
            }
        });
    }
            
    
// =================================================================
// AI implementation of Minimax algorithm with Alpha-Beta pruning
// =================================================================


        function getPossibleMoves(piece) {

            const pieceColor = piece.classList.contains('red') ? 'Red' : 'Black';

            console.log(`<<<< From GPM: #${piece.dataset.id}, Color: ${pieceColor}`);

            const moves = [];
            const row = parseInt(piece.dataset.row);
            const col = parseInt(piece.dataset.col);
        
            const directions = piece.classList.contains('crowned') ? 
                [[1, -1], [1, 1], [-1, -1], [-1, 1]] : 
                (piece.classList.contains('red') ? [[1, -1], [1, 1]] : [[-1, -1], [-1, 1]]);
        
            directions.forEach(direction => {
                const newRow = row + direction[0];
                const newCol = col + direction[1];
                const captureRow = newRow + direction[0];
                const captureCol = newCol + direction[1];
        
                if (newRow < 1 || newCol < 1 || newRow > 8 || newCol > 8) {
                    return; // Skip to the next direction
                }
        
                const targetSquare = document.querySelector(`.square[data-row='${newRow}'][data-col='${newCol}']`);
                
                if (targetSquare && !targetSquare.querySelector('.piece')) {
                    
                    moves.push({ targetRow: newRow, targetCol: newCol, capturedPieceId: null });
                    
                    console.log(`>>>> getPossMoves() - From: ${row}-${col} --> To: ${newRow}-${newCol}, NULL <<<<`);
                
                } else {
                
                    const middlePiece = targetSquare.querySelector('.piece');
                
                    if (middlePiece && getItemColor(middlePiece) !== getItemColor(piece)) {
                
                        if (captureRow >= 1 && captureRow <= 8 && captureCol >= 1 && captureCol <= 8) {
                
                            const captureSquare = document.querySelector(`.square[data-row='${captureRow}'][data-col='${captureCol}']`);
                
                            if (captureSquare && !captureSquare.querySelector('.piece')) {
                
                                moves.push({ targetRow: captureRow, targetCol: captureCol, capturedPieceId: middlePiece.dataset.id });
                
                                console.log(`>>>> getPossibleMoves() - Location: ${captureRow}-${captureCol}, Capture: ${middlePiece.dataset.id} <<<<`);
                            }
                        }
                    }
                }
            });
        
            return moves;
        }

// Get the modal
const modal = document.getElementById('moveModal');
const moveText = document.getElementById('moveText');
const closeModal = document.getElementsByClassName('close')[0];

// Function to remove glowing outline
function removeGlowingOutline() {
    const glowingElement = document.querySelector('.glowing-outline');
    if (glowingElement) {
        glowingElement.classList.remove('glowing-outline');
    }
}

// When the user clicks on <span> (x), close the modal and remove glowing outline
closeModal.onclick = function() {
    modal.style.display = "none";
    removeGlowingOutline();
}

// When the user clicks anywhere outside of the modal, close it and remove glowing outline
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
        removeGlowingOutline();
    }
}

        function makeBestMove() {
            console.log(">>>> Make Best Move");
        
            let anotherCapturePossible = false;
            let bestMove = null;
            let pieceToMove = null;
            let safetyCntr = 0;
        
            do {
                anotherCapturePossible = false;
                const blackPieces = pieceToMove ? [pieceToMove] : Array.from(document.querySelectorAll('.piece.black'));
                bestMove = null;
                let bestScore = -Infinity;
        
                blackPieces.forEach(piece => {
                    const possibleMoves = getPossibleMoves(piece);
        
                    possibleMoves.forEach(move => {
                        const simulatedBoard = simulateMove(piece, move.targetRow, move.targetCol);
                        const moveScore = evaluateBoard(simulatedBoard) + (move.capturedPieceId ? 100 : 0); // Prioritize capturing moves
        
                        if (moveScore > bestScore) {
                            bestScore = moveScore;
                            bestMove = { piece, pieceId: piece.dataset.id, targetRow: move.targetRow, targetCol: move.targetCol, capturedPieceId: move.capturedPieceId };
                        }
                    });
                });
        
                if (bestMove) {
                    const pieceColor = bestMove.piece.classList.contains('red') ? 'Red' : 'Black';
                    const fromSquare = `${bestMove.piece.dataset.row}-${bestMove.piece.dataset.col}`;
                    const toSquare = `${bestMove.targetRow}-${bestMove.targetCol}`;
                    const capturedInfo = bestMove.capturedPieceId ? `capturing #${bestMove.capturedPieceId} on square ${toSquare}` : 'with no capture';
        
                    // Highlight the target square
                    const targetSquare = document.querySelector(`.square[data-row='${bestMove.targetRow}'][data-col='${bestMove.targetCol}']`);
                          targetSquare.classList.add('glowing-outline');
        
                    moveText.innerText  = `Moving ${pieceColor} #${bestMove.pieceId} from: ${fromSquare} to: ${toSquare}, ${capturedInfo}`;
                    modal.style.display = "block";
                            
                    console.log(`>>>> >>>> MBM(): .... CapturedInfo: ${capturedInfo}`);
        
                    // Set draggedElement to the piece being moved
                    draggedElement = bestMove.piece;
                    pieceToMove = bestMove.piece;
        
                    // Simulate the starting drag position
                    const rect = draggedElement.getBoundingClientRect();
                    origLeft = rect.left;
                    origTop = rect.top;
                    startX = origLeft;
                    startY = origTop;
        
                    offsetX = 0;
                    offsetY = 0;
        
                    draggedElement.style.zIndex = '1000';
                    draggedElement.style.position = 'absolute';
        
                    console.log(".... MBM(): Moving Piece & Checking 4 Winner");
        
                    // Simulate the move
                    movePieceTo(bestMove.piece, bestMove.targetRow, bestMove.targetCol);
                    checkForCrowning(draggedElement);
                    checkForWinner();
        
                    console.log(".... MBM(): AImovePiece");
        
                    socket.send(JSON.stringify({
                        type: 'AImovePiece',
                        clientUID: clientUID,
                        pieceId: bestMove.pieceId,
                        targetRow: bestMove.targetRow,
                        targetCol: bestMove.targetCol,
                        capturedPieceId: bestMove.capturedPieceId
                    }));
        
                    console.log(".... MBM(): Checking Another Possible Move");
        
                    // Check if another capture is possible for the same piece
                    if (bestMove.capturedPieceId) {
                        const capturedPiece = document.querySelector(`.piece[data-id='${bestMove.capturedPieceId}']`);
                        const capturedPieceColor = capturedPiece.classList.contains('red') ? 'red' : 'black';
        
                        console.log(".... MBM(): .... Confirmed captured piece: ", bestMove.capturedPieceId, capturedPieceColor);
        
                        SEND_updateCapturedPieces(capturedPiece);
        
                        const possibleMovesAfterCapture = getPossibleMoves(bestMove.piece);
                        if (possibleMovesAfterCapture.some(move => move.capturedPieceId !== null)) {
                            anotherCapturePossible = true;
                            console.log(".... MBM(): .... .... Going ANOTHER Round");
                        } else {
                            console.log(".... MBM(): .... .... Blocked from further moves");
                        }
                    } else {
                        console.log(".... MMBM(): (single move) - DID NOT CAPTURE ANYTHING");
                        pieceToMove = null;
                    }
        
                } else {
                    console.error("MBM(): No valid moves available for AI");
                }
                safetyCntr++;
                if (safetyCntr === 5) {
                    console.log("");
                    console.log("!!! STOPPED RECURSIVE MOVES !!!");
                    console.log("");
                    return;
                }
            } while (anotherCapturePossible);
        
            console.log("<<<< Make Best Move - Exiting gracefully.");
        }
                                                      
        function movePieceTo(piece, targetRow, targetCol) {
            const targetSquare = document.querySelector(`.square[data-row="${targetRow}"][data-col="${targetCol}"]`);
            if (targetSquare) {
                targetSquare.appendChild(piece);
                piece.dataset.row = targetRow;
                piece.dataset.col = targetCol;
                const targetRect = targetSquare.getBoundingClientRect();
                piece.style.left = `${targetRect.left}px`;
                piece.style.top = `${targetRect.top}px`;
            }
            reportBoardState();
        }
        
        function simulateMove(piece, targetRow, targetCol) {
            const simulatedBoard = document.createElement('div');
            simulatedBoard.innerHTML = board.innerHTML;
        
            const simulatedPiece = simulatedBoard.querySelector(`.piece[data-id='${piece.dataset.id}']`);
            const targetSquare = simulatedBoard.querySelector(`.square[data-row='${targetRow}'][data-col='${targetCol}']`);
        
            if (simulatedPiece && targetSquare) {
                targetSquare.appendChild(simulatedPiece);
                simulatedPiece.dataset.row = targetRow;
                simulatedPiece.dataset.col = targetCol;
            }
        
            return simulatedBoard;
        }
        
        function evaluateBoard(board) {
            let score = 0;
            const pieces = board.querySelectorAll('.piece');
        
            pieces.forEach(piece => {
                if (piece.classList.contains('red')) {
                    score -= 1;
                } else if (piece.classList.contains('black')) {
                    score += 1;
                }
        
                if (piece.classList.contains('crowned')) {
                    if (piece.classList.contains('red')) {
                        score -= 2;
                    } else if (piece.classList.contains('black')) {
                        score += 2;
                    }
                }
            });
        
            return score;
        }
                



    
// =================================================================
// Various event handlers below this point
// =================================================================
    
    document.getElementById('flag_us').addEventListener('click', EVENT_USFlagClick);                // Setup the event listener for the US flag
    
    document.getElementById('flag_china').addEventListener('click', EVENT_ChinaFlagClick);          // Setup the event listener for the China flag
    
    document.getElementById('newGameButton').addEventListener('click', SEND_newGameButtonClick);
    
    document.getElementById('chatInput').addEventListener('keydown', SEND_chatMessageKeyDown);
    
    document.getElementById('sendChat').addEventListener('click', SEND_chatMessageBtnClick);                

   createBoard();
});