document.addEventListener('DOMContentLoaded', async () => {
    const board = document.getElementById('board');
    let draggedElement = null;
    let startX, startY;
    let offsetX, offsetY;
    let encounteredElement = null;
    let origLeft = 0, origTop = 0;
    let redWins = 0;
    let blackWins = 0;
    let capturedRed = 0;
    let capturedBlack = 0;
    let currentPlayer = 'red';  
    let timerInterval;
    let gameStarted = false; // Initialize gameStarted to false
    let username;
    let redPlayerUsername;
    let blackPlayerUsername;
    let hasCaptured = false; // Track if a piece has captured another piece

    const { username: fetchedUsername, redPlayerUsername: fetchedRedPlayerUsername, blackPlayerUsername: fetchedBlackPlayerUsername } = await fetchUsernames();

    if (!fetchedUsername) {
        alert('From Global: Error fetching username. Please try again.');
        return;
    }

    username = fetchedUsername;
    redPlayerUsername = fetchedRedPlayerUsername;
    blackPlayerUsername = fetchedBlackPlayerUsername;


    console.log("Username: ", username);
    console.log("Red Player Username: ", redPlayerUsername);
    console.log("Black Player Username: ", blackPlayerUsername);

    // Display the logged in username
    const loginUserElement = document.getElementById('loginUser');
          loginUserElement.textContent = `Logged in as: ${username}`;

    const socketUrl = `ws://${window.location.host}`;
    const socket = new WebSocket(socketUrl);


    socket.onopen = () => {
        console.log('WebSocket connection established');
        socket.send(JSON.stringify({ type: 'join', username: username }));        
        setTimerDisplay(30); // Set the initial timer display to 01:30
        initializeWings(redPlayerUsername, blackPlayerUsername); // Initialize wings on game start
    };

    socket.onclose = () => {
        console.log('WebSocket connection closed');
        alert('WebSocket connection lost. Please refresh the page.');
    };

    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);

        console.log('Received data:', data);

        if (data.type === 'activeUsers') {
            updateActiveUsers(data.users);
        } else if (data.type === 'chat') {
            displayChatMessage(data);
        } else if (data.type === 'move') {
            movePiece(data);
        } else if (data.type === 'drag') {
            dragPiece(data);
        } else if (data.type === 'remove') {
            removePiece(data);
        } else if (data.type === 'newGame') {
            resetGame();
            startTimer(30); // Start the timer when the new game button is clicked
        } else if (data.type === 'queueStatus') {
            updateQueueStatus(data.queue);
        } else if (data.type === 'setTurn') {
            // currentPlayer = data.player; // Update current player before calling switchTurn
            switchTurn();
        } else if (data.type === 'usernames') {

            redPlayerUsername = data.redPlayerUsername;
            blackPlayerUsername = data.blackPlayerUsername;
            initializeWings(redPlayerUsername, blackPlayerUsername); // Initialize wings after receiving usernames

        } else if (data.type === 'updateCapture') {
            capturedRed = data.capturedRed;

            capturedBlack = data.capturedBlack;
            updateCapturedPiecesUI(data.redPlayerUsername, data.blackPlayerUsername, data.capturedRed, data.capturedBlack);

        }
    };

    function afterMove(player) {
        
        console.log("From AfterMove: ", player);

        //switchTurn();

        socket.send(JSON.stringify({ type: 'setTurn', player: player }));
    }

    function startTimer(duration) {
        let timer = duration, minutes, seconds;
        const timerDisplay = document.getElementById('timer');
 
        clearInterval(timerInterval);

        timerInterval = setInterval(() => {
            minutes = parseInt(timer / 60, 10);
            seconds = parseInt(timer % 60, 10);

            minutes = minutes < 10 ? "0" + minutes : minutes;
            seconds = seconds < 10 ? "0" + seconds : seconds;

            timerDisplay.textContent = minutes + ":" + seconds;

            if (--timer < 0) {
                 timerDisplay.textContent = "Time's Up";
                switchTurn(); // Switch the turn when the timer runs out
            }
        }, 1000);
    }

    function setTimerDisplay(duration) {
        const timerDisplay = document.getElementById('timer');
        let minutes = parseInt(duration / 60, 10);
        let seconds = parseInt(duration % 60, 10);
    
        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;
    
        timerDisplay.textContent = minutes + ":" + seconds;
    }


    async function fetchUsernames() {
        try {
            const response = await fetch('/user');
            if (!response.ok) throw new Error('Network response was not ok');
    
            const data = await response.json();
            return { 
                username: data.username, 
                redPlayerUsername: 'Red Player', // Default value, you can fetch this dynamically if needed
                blackPlayerUsername: 'Black Player' // Default value, you can fetch this dynamically if needed
            };
        } catch (error) {
            console.error('Error fetching usernames:', error);
            return { username: null, redPlayerUsername: null, blackPlayerUsername: null };
        }
    }
            
    function initializeWings(redPlayerUsername, blackPlayerUsername) {
        const leftWing = document.getElementById('left-wing');
        const rightWing = document.getElementById('right-wing');
        leftWing.classList.remove('active', 'inactive');
        rightWing.classList.remove('active', 'inactive');
        leftWing.classList.add('active'); // Initialize the left wing as inactive (green)
        rightWing.classList.add('inactive');  // Initialize the right wing as active (red)
    
        const capturedRedElement = document.getElementById('capturedRed');
        const capturedBlackElement = document.getElementById('capturedBlack');
        capturedRedElement.textContent = `${redPlayerUsername} Captured: 0`;
        capturedBlackElement.textContent = `${blackPlayerUsername} Captured: 0`;
    
        // Ensure the elements are visible
        capturedRedElement.style.zIndex = '10';
        capturedBlackElement.style.zIndex = '10';
    
        console.log("From InitializeWings():");
        console.log(".... LEFT :", leftWing.className); // Debugging line
        console.log(".... .... TEXT:", capturedRedElement.textContent); // Debugging line
        console.log(".... RIGHT :", rightWing.className); // Debugging line
        console.log(".... .... TEXT:", capturedBlackElement.textContent); // Debugging line
    }
    
    function updateCapturedPieces(middlePiece) {
        if (!middlePiece) {
            console.error('middlePiece is undefined');
            return;
        }
    
        if (middlePiece.classList.contains('red')) {
            capturedBlack++;
        } else if (middlePiece.classList.contains('black')) {
            capturedRed++;
        }
    
        // Send the capture update to the server
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: 'updateCapture',
                redPlayerUsername: redPlayerUsername,
                blackPlayerUsername: blackPlayerUsername,
                capturedRed: capturedRed,
                capturedBlack: capturedBlack
            }));
        }
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
    
    setTimeout(() => {
        const capturedRedElement = document.getElementById('capturedRed');
        const capturedBlackElement = document.getElementById('capturedBlack');
        
        console.log("After delay:");
        console.log("Captured Red:", capturedRedElement.textContent, "Visibility:", window.getComputedStyle(capturedRedElement).visibility);
        console.log("Captured Black:", capturedBlackElement.textContent, "Visibility:", window.getComputedStyle(capturedBlackElement).visibility);
    }, 5000); // Check after 5 seconds
    
    function switchTurn() {

        if (hasCaptured) {
            // Player can move again if they captured a piece
            console.log('Player has captured, allowing another move');
            startTimer(30); // Restart the timer for the next move
            return;
        }
    
        clearInterval(timerInterval); // Stop the current timer
    
        // Switch the current player
        currentPlayer = currentPlayer === 'red' ? 'black' : 'red';
        hasCaptured = false; // Reset capture flag
    
        // Update the UI indicators for the turn
        const leftWing = document.getElementById('left-wing');
        const rightWing = document.getElementById('right-wing');
    
        if (currentPlayer === 'red') {
            console.log("From switchTurn() - Setting RED active (LEFT) = GREEN: ", currentPlayer);
            leftWing.classList.add('active');
            leftWing.classList.remove('inactive');
            rightWing.classList.add('inactive');
            rightWing.classList.remove('active');
        } else {
            console.log("From switchTurn() - Setting BLACK active (RIGHT) = GREEN: ", currentPlayer);
            leftWing.classList.remove('active');
            leftWing.classList.add('inactive');
            rightWing.classList.remove('inactive');
            rightWing.classList.add('active');
        }
    
        // Debugging output
        console.log('Left wing class:', leftWing.className);
        console.log('Right wing class:', rightWing.className);
    
        if (gameStarted) { // Start the timer only if the game has started
            startTimer(30); // Restart the timer with the desired duration
        }
    }
                            
            
    function canMovePiece(pieceColor) {
        
        console.log("From canMovePiece - Colors are: ", pieceColor, currentPlayer);

        return (currentPlayer === 'red' && pieceColor === 'red') || (currentPlayer === 'black' && pieceColor === 'black');
    }

    const playNextButton = document.getElementById('playNextButton');
    playNextButton.dataset.action = 'playNext';
    playNextButton.textContent = 'Play Next';

    playNextButton.addEventListener('click', () => {
        const DOM_QueueList = document.getElementById('queueList');
        const button = document.getElementById('playNextButton');
        const action = button.dataset.action;

        console.log("PlayNextButton triggered by LMB click: ", action);

        if (action === 'playNext') {
            for (let i = 0; i < DOM_QueueList.children.length; i++) {
                const listItem = DOM_QueueList.children[i];
                const listItemUsername = listItem.querySelector('.username').textContent;
                if (listItemUsername === username) {
                    console.log(`User ${username} is already in the waiting list.`);
                    return;
                }
            }

            socket.send(JSON.stringify({ type: 'joinQueue', username: username, avatar: `images/${username}.png` }));
            button.textContent = "Don't Want to Play";
            button.dataset.action = 'dontWantToPlay';
        } else if (action === 'dontWantToPlay') {
            socket.send(JSON.stringify({ type: 'leaveQueue', username: username }));
            button.textContent = "Play Next";
            button.dataset.action = 'playNext';
        } else {
            console.log("From playNextButton() - Unhandled action type: ", action);
        }
    });

    async function updateQueueStatus(queue) {
        if (!Array.isArray(queue)) {
            console.error("Received queue is not an array:", queue);
            return;
        }

        console.log("Received Player Queue notification from: ", username);

        if (queue.some(user => user.username === username)) {
            playNextButton.textContent = 'Don\'t Want to Play';
            playNextButton.dataset.action = 'dontWantToPlay';
        } else {
            playNextButton.textContent = 'Play Next';
            playNextButton.dataset.action = 'playNext';
        }

        const queueList = document.getElementById('queueList');
        queueList.innerHTML = '';

        queue.forEach(user => {
            const userLi = document.createElement('li');

            const avatarDiv = document.createElement('div');
            avatarDiv.className = 'avatar';
            avatarDiv.style.backgroundImage = `url(${user.avatar})`;

            const usernameDiv = document.createElement('div');
            usernameDiv.className = 'username';
            usernameDiv.innerText = user.username;

            userLi.appendChild(avatarDiv);
            userLi.appendChild(usernameDiv);
            queueList.appendChild(userLi);
        });
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
    
    function createBoard() {
        let pieceId = 1;
        let squareId = 1;

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
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

                    if (row < 3 || row > 4) {
                        const piece = document.createElement('div');
                        piece.classList.add('piece', row < 3 ? 'red' : 'black');
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
    }

    function startDrag(event) {
        const piece = event.target;
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

        draggedElement.style.zIndex = '1000';
        draggedElement.style.position = 'absolute';

        document.addEventListener('mousemove', throttledDraggingPiece);
        document.addEventListener('mouseup', dropPiece);
    }

    const throttledDraggingPiece = throttle(draggingPiece, 50);

    function draggingPiece(event) {
        if (!draggedElement) return;
    
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
            console.log('Sending drag data:', dragData);
            socket.send(JSON.stringify(dragData));
        }
    }
    
    function getSquareAtCoordinates(X, Y) {
        const boardRect = board.getBoundingClientRect();
    
        if (X < boardRect.left || X > boardRect.right || Y < boardRect.top || Y > boardRect.bottom) {
            return null;
        }
    
        const relativeX = X - boardRect.left;
        const relativeY = Y - boardRect.top;
    
        const squareSize = boardRect.width / 8;
    
        const targetRow = Math.floor(relativeY / squareSize);
        const targetCol = Math.floor(relativeX / squareSize);
    
        return document.querySelector(`.square[data-row='${targetRow}'][data-col='${targetCol}']`);
    }
    
    function dropPiece(event) {
        if (!draggedElement) return;
    
        const pieceColor = draggedElement.classList.contains('red') ? 'red' : 'black';
    
        if (!canMovePiece(pieceColor)) {
            console.log("From DropPiece: It's not your turn - ", pieceColor);
            resetDraggedElementPosition();
            return;
        }
    
        console.log('Dropping piece:', draggedElement.dataset.id);
    
        const rect = draggedElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
    
        const targetSquare = getSquareAtCoordinates(centerX, centerY);
        if (targetSquare) {
            const targetRect = targetSquare.getBoundingClientRect();
            const pieceRect = draggedElement.getBoundingClientRect();
            const targetRow = parseInt(targetSquare.dataset.row);
            const targetCol = parseInt(targetSquare.dataset.col);
            const draggedRow = parseInt(draggedElement.dataset.row);
            const draggedCol = parseInt(draggedElement.dataset.col);
    
            console.log('Target square:', targetRow, targetCol);
            console.log('Dragged element:', draggedRow, draggedCol);
    
            const { isValid, capturedPiece } = validateMove(draggedElement, targetRow, targetCol, draggedRow, draggedCol);
            if (isValid) {
                // Update piece position
                draggedElement.style.left = `${((targetRect.width - pieceRect.width) / 2) - 5}px`;
                draggedElement.style.top = `${((targetRect.height - pieceRect.height) / 2) - 5}px`;
                targetSquare.appendChild(draggedElement);
                draggedElement.dataset.row = targetRow;
                draggedElement.dataset.col = targetCol;
    
                if (capturedPiece) {
                    hasCaptured = true; // Mark that a capture has occurred
                    // Handle captured piece
                    updateCapturedPieces(capturedPiece);
                    capturedPiece.remove();
                } else {
                    console.log("DID NOT CAPTURE PLAYER");
                    hasCaptured = false;
                }
    
                checkForCrowning(draggedElement);
                checkForWinner();
    
                const nextPlayer = getItemColor(draggedElement) === 'red' ? 'black' : 'red';
    
                if (hasCaptured) {
                    // Allow the same player to move again
                    console.log('Player has captured, allowing another move');
                    startTimer(30); // Restart the timer for the next move
                } else {
                    console.log('NO PIECE CAPTURED ... preventing further move');
                    afterMove(nextPlayer);
                }
    
                if (socket.readyState === WebSocket.OPEN) {
                    const moveData = {
                        type: 'move',
                        pieceId: draggedElement.dataset.id,
                        targetRow: targetRow,
                        targetCol: targetCol,
                        capturedPieceId: capturedPiece ? capturedPiece.dataset.id : null
                    };
                    console.log('Sending move data:', moveData);
                    socket.send(JSON.stringify(moveData));
                } else {
                    console.error('WebSocket connection not open');
                }
            } else {
                console.log('Invalid move');
                resetDraggedElementPosition();
            }
        } else {
            console.log('No target square found');
            resetDraggedElementPosition();
        }
    
        draggedElement.style.zIndex = '';
        document.removeEventListener('mousemove', throttledDraggingPiece);
        document.removeEventListener('mouseup', dropPiece);
        draggedElement = null;
    }
                
    function validateMove(piece, targetRow, targetCol, draggedRow, draggedCol) {
        const rowDiff = Math.abs(targetRow - draggedRow);
        const colDiff = Math.abs(targetCol - draggedCol);
    
        if (rowDiff === 1 && colDiff === 1) {
            return { isValid: true, capturedPiece: null };
        }
    
        if (rowDiff === 2 && colDiff === 2) {
            const middleRow = (targetRow + draggedRow) / 2;
            const middleCol = (targetCol + draggedCol) / 2;
            const middleSquare = document.querySelector(`.square[data-row='${middleRow}'][data-col='${middleCol}']`);
            const middlePiece = middleSquare && middleSquare.querySelector('.piece');
    
            if (middlePiece && getItemColor(middlePiece) !== getItemColor(piece)) {
                console.log("Capturing piece at:", middleRow, middleCol);
                return { isValid: true, capturedPiece: middlePiece };
            }
        }
    
        return { isValid: false, capturedPiece: null };
    }
    
    function resetDraggedElementPosition() {
        console.log('Resetting position to:', origLeft, origTop);
        draggedElement.style.left = `${origLeft}px`;
        draggedElement.style.top = `${origTop}px`;
    }
        
    
    function movePiece(data) {
        const piece = document.querySelector(`.piece[data-id='${data.pieceId}']`);
    
        if (piece) {
            const pieceColor = piece.classList.contains('red') ? 'red' : 'black';
    
            // No need to check if canMovePiece here as it's synchronized
            const targetSquare = document.querySelector(`.square[data-row='${data.targetRow}'][data-col='${data.targetCol}']`);
            if (targetSquare) {
                const targetRect = targetSquare.getBoundingClientRect();
                const pieceRect = piece.getBoundingClientRect();
                piece.style.left = `${((targetRect.width - pieceRect.width) / 2) - 5}px`;
                piece.style.top = `${((targetRect.height - pieceRect.height) / 2) - 5}px`;
                targetSquare.appendChild(piece);
                piece.dataset.row = data.targetRow;
                piece.dataset.col = data.targetCol;
    
                checkForCrowning(piece);
                checkForWinner();
    
                if (data.capturedPieceId) {
                    removePiece({ pieceId: data.capturedPieceId });
                }
            }
        }
    }
    
    function dragPiece(data) {
        const piece = document.querySelector(`.piece[data-id='${data.pieceId}']`);
        if (piece) {
            console.log('Updating piece position:', data);
            piece.style.position = 'absolute';
            piece.style.left = `${data.x}px`;
            piece.style.top = `${data.y}px`;
        }
    }

    function removePiece(data) {
        const piece = document.querySelector(`.piece[data-id='${data.pieceId}']`);
        if (piece) {
            console.log('Removing piece:', data);
            piece.remove();
        }
    }

    function checkForCrowning(checker) {
        const row = parseInt(checker.dataset.row);
        const color = checker.classList.contains('red') ? 'red' : 'black';

        if ((color === 'red' && row === 7) || (color === 'black' && row === 0)) {
            crownChecker(checker);
        }
    }

    function crownChecker(checker) {
        checker.classList.add('crowned');
        checker.offsetHeight;
    }

    function checkForWinner() {
        const redPieces = document.querySelectorAll('.piece.red');
        const blackPieces = document.querySelectorAll('.piece.black');

        if (redPieces.length === 0) {
            displayWinner('black');
        } else if (blackPieces.length === 0) {
            displayWinner('red');
        }
        updateScoreboard();
    }

    function displayWinner(winnerColor) {
        const banner = document.getElementById('winnerBanner');
        banner.textContent = `${winnerColor.charAt(0).toUpperCase() + winnerColor.slice(1)} wins!`;
        banner.classList.remove('hidden');
        banner.style.display = 'block';
    
        if (winnerColor === 'red') {
            redWins++;
        } else if (winnerColor === 'black') {
            blackWins++;
        }
        updateScoreboard();
    
        const winnerUsername = activeUsers.find(user => user.color === winnerColor)?.username;
    
        if (socket.readyState === WebSocket.OPEN && winnerUsername) {
            const resultData = {
                type: 'gameResult',
                winner: winnerUsername,
                timestamp: new Date().toISOString()
            };
            console.log('Sending game result:', resultData);
            socket.send(JSON.stringify(resultData));
        }
    }

    function updateScoreboard() {
        document.getElementById('redWins').textContent = redWins;
        document.getElementById('blackWins').textContent = blackWins;
    }

    function resetGame() {

        const board = document.getElementById('board');
        board.innerHTML = '';
        capturedRed = 0;
        capturedBlack = 0;
        updateCapturedPieces();
        const winnerBanner = document.getElementById('winnerBanner');
        winnerBanner.classList.add('hidden');
        winnerBanner.style.display = 'none';
        createBoard();
        gameStarted = true; // Set gameStarted to true when a new game is started
        startTimer(30); // Start the timer when the new game button is clicked
    }

    function updateActiveUsers(users) {
        const userList = document.getElementById('userList');
        userList.innerHTML = '';
    
        users.forEach(user => {
            const userItem = document.createElement('div');
            userItem.classList.add('user');
    
            const avatar = document.createElement('div');
            avatar.classList.add('avatar');
            avatar.style.backgroundImage = `url(${user.avatar})`;
    
            const usernameDiv = document.createElement('div');
            usernameDiv.classList.add('username');
            usernameDiv.textContent = user.username;
    
            userItem.appendChild(avatar);
            userItem.appendChild(usernameDiv);
            userList.appendChild(userItem);
    
            if (user.color === 'red') {
                updatePlayerInfo('red', user);
            } else if (user.color === 'black') {
                updatePlayerInfo('black', user);
            }
            
            if (user.username === username && (user.color === 'red' || user.color === 'black')) {
                playNextButton.style.display = 'none';
            } else if (user.username === username && user.color === 'spectator') {
                playNextButton.style.display = 'block';
            }
        });
    }
    
    function updatePlayerInfo(color, user) {
        const playerName = document.getElementById(`${color}PlayerName`);
        const playerWins = document.getElementById(`${color}Wins`);
        const playerAvatar = document.getElementById(`${color}PlayerAvatar`);
        const capturedCount = document.getElementById(`captured${color.charAt(0).toUpperCase() + color.slice(1)}`);
        const playerRecord = document.getElementById(`${color}PlayerRecord`);
    
        if (playerName) playerName.textContent = user.username;
        if (playerWins) playerWins.textContent = user.wins;
        if (playerAvatar) playerAvatar.style.backgroundImage = `url(${user.avatar})`;
        if (capturedCount) capturedCount.textContent = user.captured;
        if (playerRecord) playerRecord.innerText = `Wins: ${user.wins}   Loss: ${user.losses}`;
    }
      
    function displayChatMessage(data) {
        console.log("Data Fields: ", data.avatar, data.from)

        const chatMessages = document.getElementById('chatMessages');
        const messageElement = document.createElement('div');
        const isOwnMessage = data.from === username;
    
        messageElement.classList.add('chat-message');
        if (isOwnMessage) {
            messageElement.classList.add('own-message');
        } else {
            messageElement.classList.add('other-message');
        }
    
        messageElement.innerHTML = `
            ${!isOwnMessage ? `<img src="${data.avatar}" alt="${data.from}" class="chat-avatar">` : ''}
            <div class="chat-text">${data.message}</div>
            ${isOwnMessage ? `<img src="images/${username}.png" alt="${username}" class="chat-avatar">` : ''}
        `;
    
        console.log("HTML Message: ", messageElement.innerHTML);

        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
   
    document.getElementById('sendChat').addEventListener('click', () => {
        const chatInput = document.getElementById('chatInput');
        const message = chatInput.value;
        
        if (message.trim() !== '') {
            socket.send(JSON.stringify({
                type: 'chat',
                message: message,
                from: username,
                avatar: `images/${username}.png`
            }));

            chatInput.value = '';
        }
    });
    
    document.getElementById('chatInput').addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            const chatInput = document.getElementById('chatInput');
            const message = chatInput.value;
            if (message.trim() !== '') {
                socket.send(JSON.stringify({
                    type: 'chat',
                    message: message,
                    from: username,
                    avatar: `images/${username}.png`
                }));
                chatInput.value = '';
            }
        }
    });
        
    document.getElementById('newGameButton').addEventListener('click', () => {
        gameStarted = true;
        socket.send(JSON.stringify({ type: 'newGame' }));
    });

   createBoard();
});

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
