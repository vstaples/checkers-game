document.addEventListener('DOMContentLoaded', () => {
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

    const socketUrl = `ws://${window.location.host}`;
    const socket = new WebSocket(socketUrl);

    socket.onopen = () => {
        console.log('WebSocket connection established');
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Received data:', data);
        if (data.type === 'move') {
            movePiece(data);
        } else if (data.type === 'drag') {
            dragPiece(data);
        }
    };

    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    socket.onclose = () => {
        console.log('WebSocket connection closed');
    };

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
                    }
                }
                board.appendChild(square);
            }
        }
    }

    function startDrag(event) {
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

        encounteredElement = null;

        const eucCollection = document.elementsFromPoint(event.clientX, event.clientY);
        const eucPtr = eucCollection.find(el => el !== draggedElement);
        const eucPtrColor = getItemColor(eucPtr);
        const eucPtrRow = parseInt(eucPtr.dataset.row);
        const eucPtrCol = parseInt(eucPtr.dataset.col);
        const eucPtrID = eucPtr.dataset.id;
        const eucPtrType = eucPtr.dataset.type;
        const draggedColor = getItemColor(draggedElement);
        const draggedID = draggedElement.dataset.id;
        const draggedRow = parseInt(draggedElement.dataset.row);
        const draggedCol = parseInt(draggedElement.dataset.col);

        if (eucPtr && eucPtr.classList.contains('piece') && eucPtrColor === draggedColor) {
            encounteredElement = eucPtr;
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

    function dropPiece(event) {
        if (!draggedElement) return;

        const targetSquare = getSquareAtCoordinates(event.clientX, event.clientY);
        if (targetSquare) {
            const targetRect = targetSquare.getBoundingClientRect();
            const pieceRect = draggedElement.getBoundingClientRect();
            const targetRow = parseInt(targetSquare.dataset.row);
            const targetCol = parseInt(targetSquare.dataset.col);
            const draggedRow = parseInt(draggedElement.dataset.row);
            const draggedCol = parseInt(draggedElement.dataset.col);

            const isValidMove = validateMove(draggedElement, targetRow, targetCol, draggedRow, draggedCol);
            if (isValidMove) {
                draggedElement.style.left = `${((targetRect.width - pieceRect.width) / 2) - 5}px`;
                draggedElement.style.top = `${((targetRect.height - pieceRect.height) / 2) - 5}px`;
                targetSquare.appendChild(draggedElement);
                draggedElement.dataset.row = targetRow;
                draggedElement.dataset.col = targetCol;

                checkForCrowning(draggedElement);
                checkForWinner();

                if (socket.readyState === WebSocket.OPEN) {
                    const moveData = {
                        type: 'move',
                        pieceId: draggedElement.dataset.id,
                        targetRow: targetRow,
                        targetCol: targetCol
                    };
                    console.log('Sending move data:', moveData);
                    socket.send(JSON.stringify(moveData));
                } else {
                    console.error('WebSocket connection not open');
                }
            } else {
                resetDraggedElementPosition();
            }
        } else {
            resetDraggedElementPosition();
        }

        draggedElement.style.zIndex = '';
        document.removeEventListener('mousemove', throttledDraggingPiece);
        document.removeEventListener('mouseup', dropPiece);
        draggedElement = null;
    }

    function resetDraggedElementPosition() {
        draggedElement.style.left = `${origLeft}px`;
        draggedElement.style.top = `${origTop}px`;
    }

    function validateMove(piece, targetRow, targetCol, draggedRow, draggedCol) {
        const rowDiff = Math.abs(targetRow - draggedRow);
        const colDiff = Math.abs(targetCol - draggedCol);

        // Ensure the move is diagonal by one square
        if (rowDiff === 1 && colDiff === 1) {
            return true;
        }

        // Check for capturing move (diagonal by two squares)
        if (rowDiff === 2 && colDiff === 2) {
            const middleRow = (targetRow + draggedRow) / 2;
            const middleCol = (targetCol + draggedCol) / 2;
            const middleSquare = document.querySelector(`.square[data-row='${middleRow}'][data-col='${middleCol}']`);
            const middlePiece = middleSquare && middleSquare.querySelector('.piece');

            if (middlePiece && getItemColor(middlePiece) !== getItemColor(piece)) {
                console.log("Capturing piece at:", middleRow, middleCol);
                middlePiece.remove();
                updateCapturedPieces(middlePiece);
                return true;
            }
        }

        return false;
    }

    function updateCapturedPieces(piece) {
        if (piece.classList.contains('red')) {
            capturedRed++;
        } else if (piece.classList.contains('black')) {
            capturedBlack++;
        }
        document.getElementById('capturedRed').textContent = capturedRed;
        document.getElementById('capturedBlack').textContent = capturedBlack;
    }

    function movePiece(data) {
        const piece = document.querySelector(`.piece[data-id='${data.pieceId}']`);
        if (piece) {
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

    function updateScoreboard() {
        document.getElementById('redWins').textContent = redWins;
        document.getElementById('blackWins').textContent = blackWins;
    }

    function crownChecker(checker) {
        checker.classList.add('crowned');
        checker.offsetHeight;
    }

    function checkForCrowning(checker) {
        const row = parseInt(checker.dataset.row);
        const color = checker.classList.contains('red') ? 'red' : 'black';

        if ((color === 'red' && row === 7) || (color === 'black' && row === 0)) {
            crownChecker(checker);
        }
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
    }

    function getItemColor(objPtr) {
        if (objPtr && objPtr.classList.contains('piece')) {
            if (objPtr.classList.contains('red')) {
                return 'red';
            } else if (objPtr.classList.contains('black')) {
                return 'black';
            }
        }
        return "";
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

    createBoard();

    document.getElementById('newGameButton').addEventListener('click', resetGame);
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
