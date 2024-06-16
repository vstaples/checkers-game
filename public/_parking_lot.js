    // Monitor changes to the New Game button's visibility
    //const observer = new MutationObserver((mutations) => {
    //    mutations.forEach((mutation) => {
    //        if (mutation.attributeName === 'style') {
    //            console.log('New Game button style changed:', newGameButton.style.display);
    //        }
    //    });
    //});

    //observer.observe(newGameButton, { attributes: true });

    // Check button visibility periodically
    // setInterval(() => {
    //     console.log('Periodic check - New Game button display:', newGameButton.style.display);
    // }, 1000);

    //new MutationObserver((mutationsList) => {
    //    for (const mutation of mutationsList) {
    //        if (mutation.type === 'childList' || mutation.type === 'characterData') {
    //            console.log("Mutation detected in playerRecord:", mutation);
    //        }
    //    }
    ///}).observe(playerRecord, { childList: true, characterData: true, subtree: true });
    
    function RECEIVE_switchTurn__G() {

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
        const HTML_leftWingWidget  = document.getElementById('left-wing');
        const HTML_rightWingWidget = document.getElementById('right-wing');
    
        if (currentPlayer === 'red') {
            console.log("From RECEIVE_switchTurn() - Setting RED active (LEFT) = GREEN: ", currentPlayer);
            HTML_leftWingWidget.classList.add('active');
            HTML_leftWingWidget.classList.remove('inactive');
            HTML_rightWingWidget.classList.add('inactive');
            HTML_rightWingWidget.classList.remove('active');
        } else {
            console.log("From RECEIVE_switchTurn() - Setting BLACK active (RIGHT) = GREEN: ", currentPlayer);
            HTML_leftWingWidget.classList.remove('active');
            HTML_leftWingWidget.classList.add('inactive');
            HTML_rightWingWidget.classList.remove('inactive');
            HTML_rightWingWidget.classList.add('active');
        }
    
        // Debugging output
        console.log('Left wing class:', HTML_leftWingWidget.className);
        console.log('Right wing class:', HTML_rightWingWidget.className);
    
        if (gameStarted) { // Start the timer only if the game has started
            startTimer(30); // Restart the timer with the desired duration
        }
    }

    function makeBestMove__P() {
        let anotherCapturePossible = false;
        let bestMove = null;
        let pieceToMove = null;
    
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
                
                // console.log("UID-001d: INFORMING SERVER OF MOVE: ", bestMove);
    
                // Logging the move details
                const pieceColor = bestMove.piece.classList.contains('red') ? 'Red' : 'Black';
                const fromSquare = `${bestMove.piece.dataset.row}-${bestMove.piece.dataset.col}`;
                const toSquare = `${bestMove.targetRow}-${bestMove.targetCol}`;
                const capturedInfo = bestMove.capturedPieceId ? `capturing piece ${bestMove.capturedPieceId} located on square ${toSquare}` : 'with no capture';
    
                alert(`Moving ${pieceColor} piece: ${bestMove.pieceId} from: ${fromSquare} to:  ${toSquare}, cap: ${capturedInfo}`);
    
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
    
                // Simulate the move
                movePieceTo(bestMove.piece, bestMove.targetRow, bestMove.targetCol);
                checkForCrowning(draggedElement);
                checkForWinner();
    
                socket.send(JSON.stringify({
                    type: 'AImovePiece',
                    pieceId: bestMove.pieceId,
                    targetRow: bestMove.targetRow,
                    targetCol: bestMove.targetCol,
                    capturedPieceId: bestMove.capturedPieceId
                }));
    
                // Check if another capture is possible for the same piece
                if (bestMove.capturedPieceId) {
                    const possibleMovesAfterCapture = getPossibleMoves(bestMove.piece);
                    if (possibleMovesAfterCapture.some(move => move.capturedPieceId !== null)) {
                        anotherCapturePossible = true;
                    }
                } else {
                    pieceToMove = null;
                }
    
            } else {
                console.error("UID-894: No valid moves available for AI");
            }
    
        } while (anotherCapturePossible);
    }
