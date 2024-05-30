document.addEventListener('DOMContentLoaded', () => {
    const board = document.getElementById('board');
    let draggedElement = null;
    let startX, startY;
    let offsetX, offsetY;
    let encounteredElement  = null;
    let origLeft, origTop;
    let redWins = 0;
    let blackWins = 0;
    let capturedRed = 0;
    let capturedBlack = 0;

    // Function to create the board and pieces
    function createBoard() {

        let pieceId = 1; // Start piece numbering from 1
        let squareId = 1; // Start piece numbering from 1

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                // Create a SQUARE element
                const square = document.createElement('div');
                square.classList.add('square');
                square.dataset.row = row;
                square.dataset.col = col;
                square.dataset.id = squareId++;
                square.dataset.type = "square"

                // Append a LIGHT or DARK item to the Square
                if ((row + col) % 2 === 0) {
                    square.classList.add('light');
                } else {
                    square.classList.add('dark');

                    // Add game pieces
                    if (row < 3 || row > 4) {
                        const piece = document.createElement('div');
                        piece.classList.add('piece', row < 3 ? 'red' : 'black');
                        piece.dataset.row = row;
                        piece.dataset.col = col;
                        piece.dataset.id = pieceId++;
                        piece.dataset.type = "checker"
                        piece.draggable = true;

                        // Create a text label for the gamepiece
                        const number = document.createElement('span');
                        number.textContent = piece.dataset.id;
                        piece.appendChild(number);

                        square.appendChild(piece);

                        // Add mousedown event listener for custom drag handling
                        piece.addEventListener('mousedown', startDrag);
                    }
                }
                board.appendChild(square);
            }
        }
    }

    // Function to handle the drag start event
    function startDrag(event) {

        event.preventDefault();
        
        draggedElement = event.target;
        
        startX = event.clientX;
        startY = event.clientY;
        
        const rect = draggedElement.getBoundingClientRect();
        origLeft = 0;
        origTop  = 0;

        const boardRect = board.getBoundingClientRect();
        offsetX = 0; /*rect.left - boardRect.left;*/
        offsetY = 0; /*rect.top - boardRect.top;*/

        // Raise the z-index of the dragged element to ensure it stays on top
        draggedElement.style.zIndex = '1000';
        draggedElement.style.position = 'absolute';

        document.addEventListener('mousemove', draggingPiece);
        document.addEventListener('mouseup', dropPiece);
    }

    // Function to handle the dragging piece event (move piece at 45 degrees)
    function draggingPiece(event) {
   
        if (!draggedElement) return;

        event.preventDefault();

        encounteredElement  = null;

        const eucCollection = document.elementsFromPoint(event.clientX, event.clientY);
        const eucPtr        = eucCollection.find(el => el !== draggedElement);
        const eucPtrColor  = getItemColor(eucPtr);
        const eucPtrRow     = parseInt(eucPtr.dataset.row);
        const eucPtrCol     = parseInt(eucPtr.dataset.col);
        const eucPtrID      = eucPtr.dataset.id;
        const eucPtrType    = eucPtr.dataset.type;
        const draggedColor  = getItemColor(draggedElement);
        const draggedID     = draggedElement.dataset.id;
        const draggedRow    = parseInt(draggedElement.dataset.row);
        const draggedCol    = parseInt(draggedElement.dataset.col);

        console.log("Attributes: ");
        console.log(".... Dragged: ", draggedID, draggedRow, draggedCol);
        console.log(".... Encount: ", eucPtrID, eucPtrRow, eucPtrCol, eucPtrType);
        
        // Note: There will always be an element under the cursor which will
        //       be either a Square or Gamepiece.
        if (eucPtr) {
            // If it is a gamepiece ....
            if (eucPtr.classList.contains('piece')) {
                 // Exit stage left to disable further movement if it is
                // a brother of the same color ....
                console.log("Collision: ", draggedID, draggedColor, eucPtrID, eucPtrColor);

                if (eucPtrColor == draggedColor){
                    console.log(".... Family: ", draggedID, draggedColor, eucPtrID, eucPtrColor);
                 }
                encounteredElement = eucPtr;
                return;            
            }
        }

        let Xupdate = event.clientX - startX;
        let Yupdate = event.clientY - startY;

        // Ensure that non-crowned pieces cannot move backwards
        const isCrowned = draggedElement.classList.contains('crowned');
        if (!isCrowned) {
            if (draggedElement.classList.contains('red') && Yupdate < 0) {
                Yupdate = 0;
            }
            if (draggedElement.classList.contains('black') && Yupdate > 0) {
                Yupdate = 0;
            }
        }
    
        // Constrain movement to 45-degree angles
        if (Math.abs(Xupdate) > Math.abs(Yupdate)) {
            Yupdate = Math.abs(Xupdate) * Math.sign(Yupdate);
        } else {
            Xupdate = Math.abs(Yupdate) * Math.sign(Xupdate);
        }
    
        draggedElement.style.left = `${origLeft + Xupdate}px`;
        draggedElement.style.top = `${origTop + Yupdate}px`;
    
        console.log("Inside DraggingPiece()", Xupdate, Yupdate);
    }

    // Function to handle the drop event
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
    
            console.log("Dragged: ", draggedRow, draggedCol);
            console.log("Target: ", targetRow, targetCol);
    
            // Check if the move is diagonal by 1 square
            if (Math.abs(targetRow - draggedRow) === 1 && Math.abs(targetCol - draggedCol) === 1) {

                // if we landed on another element, capture it (by removing!)
                if (encounteredElement){
                    console.log("Capturing")
                    if (encounteredElement.classList.contains('red')) {
                        capturedRed++;
                    } else if (encounteredElement.classList.contains('black')) {
                        capturedBlack++;
                    }
                    encounteredElement.remove();
                    updateCapturedPieces();
                    }
            
                // Check if the piece is allowed to move backwards
                const isCrowned = draggedElement.classList.contains('crowned');
                if (!isCrowned) {
                    if (draggedElement.classList.contains('red') && targetRow < draggedRow) {
                        return; // Invalid move for red
                    }
                    if (draggedElement.classList.contains('black') && targetRow > draggedRow) {
                        return; // Invalid move for black
                    }
                }
    
                // Center the piece in the new square
                console.log("Centering on active square.")
                draggedElement.style.left = `${((targetRect.width - pieceRect.width) / 2) - 5}px`;
                draggedElement.style.top = `${((targetRect.height - pieceRect.height) / 2) - 5}px`;
                targetSquare.appendChild(draggedElement);
                draggedElement.dataset.row = targetRow;
                draggedElement.dataset.col = targetCol;
                draggedElement.style.transform = 'none';
    
                // Check for crowning
                checkForCrowning(draggedElement);
    
                // Check for winner
                checkForWinner();
            } else {
                // Reset the position if not a valid move
                console.log("Resetting back to original position - invalid move.", Math.abs(targetRow - draggedRow), Math.abs(targetCol - draggedCol));
                draggedElement.style.left = `${origLeft}px`;
                draggedElement.style.top = `${origTop}px`;
                draggedElement.style.transform = 'none';
            }
        } else {
            // Reset the position if dropped outside the board
            console.log("Resetting back to original position - outside the board.");
            draggedElement.style.left = `${origLeft}px`;
            draggedElement.style.top = `${origTop}px`;
            draggedElement.style.transform = 'none';
        }
    
        // Reset the z-index after the drop
        draggedElement.style.zIndex = '';
    
        document.removeEventListener('mousemove', draggingPiece);
        document.removeEventListener('mouseup', dropPiece);
        draggedElement = null;
    }
    
    function dropPiece__G(event) {
        if (!draggedElement) return;
    
        // Get the board's bounding rectangle
        const boardRect    = board.getBoundingClientRect();
        const targetSquare = getSquareAtCoordinates(event.clientX, event.clientY);

        // check for valid move condition
        if (targetSquare) {

            const targetRect   = targetSquare.getBoundingClientRect();
            const pieceRect    = draggedElement.getBoundingClientRect();
            const targetRow    = parseInt(targetSquare.dataset.row);
            const targetCol    = parseInt(targetSquare.dataset.col);
            const draggedRow   = parseInt(draggedElement.dataset.row);
            const draggedCol   = parseInt(draggedElement.dataset.col);
            const draggedColor = getItemColor(draggedElement);
    
            let sameColor = false;
            let eucPtrColor = "";

            if (encounteredElement){
                eucPtrColor  = getItemColor(encounteredElement);
                if (draggedColor == eucPtrColor) {sameColor = true; }
            }

            console.log("Dragged: ", draggedRow, draggedCol, draggedColor);
            console.log("Target: ", targetRow, targetCol, eucPtrColor);
    
            // Check if the move is diagonal by 1 square
            if (Math.abs(targetRow - draggedRow) === 1 && Math.abs(targetCol - draggedCol) === 1 && sameColor === false ) {

                // if we landed on another element, capture it (by removing!)
                if (encounteredElement){
                    console.log("Capturing")
 
                    if (encounteredElement.classList.contains('red')) {
                        capturedRed++;
                    } else if (encounteredElement.classList.contains('black')) {
                        capturedBlack++;
                    }
                    encounteredElement.remove();
                    updateCapturedPieces();
    
                }

                // Center the piece in the new square
                console.log("Centering on active square.")
                draggedElement.style.left = `${((targetRect.width - pieceRect.width) / 2) - 5}px`;
                draggedElement.style.top = `${((targetRect.height - pieceRect.height) / 2) -5}px`;
                targetSquare.appendChild(draggedElement);
                draggedElement.dataset.row = targetRow;
                draggedElement.dataset.col = targetCol;
                draggedElement.style.transform = 'none';

                // Check for crowning
                checkForCrowning(draggedElement);

                // Check for winner
                checkForWinner();

            } else {
                // Reset the position if not a valid move
                console.log("Resetting back to original position - invalid move.", Math.abs(targetRow - draggedRow), Math.abs(targetCol - draggedCol));
                draggedElement.style.left = `${offsetX}px`;
                draggedElement.style.top = `${offsetY}px`;
                draggedElement.style.transform = 'none';
            }
        } else {
            // Reset the position if dropped outside the board
            console.log("Resetting back to original position - outside the board.");
            draggedElement.style.left = `${offsetX}px`;
            draggedElement.style.top = `${offsetY}px`;
            draggedElement.style.transform = 'none';
        }
    
        // Reset the z-index after the drop
        draggedElement.style.zIndex = '';
    
        document.removeEventListener('mousemove', draggingPiece);
        document.removeEventListener('mouseup', dropPiece);
        draggedElement = null;
    }

    // Function to display the winner banner
    function displayWinner(winnerColor) {
        const banner = document.getElementById('winnerBanner');
        banner.textContent = `${winnerColor.charAt(0).toUpperCase() + winnerColor.slice(1)} wins!`;
        banner.classList.remove('hidden');
        banner.style.display = 'block'; // Show the banner
    
        if (winnerColor === 'red') {
            redWins++;
        } else if (winnerColor === 'black') {
            blackWins++;
        }
        updateScoreboard();
    }
    
    // Function to check if a player has won
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

    function updateCapturedPieces() {
        document.getElementById('capturedRed').textContent = capturedRed;
        document.getElementById('capturedBlack').textContent = capturedBlack;
    }
        
    function crownChecker(checker) {
        checker.classList.add('crowned');

        // Force a reflow to make the border appear immediately
        checker.offsetHeight;
    }
    
    // Example usage when a checker reaches the opposing side
    function checkForCrowning(checker) {
        const row = parseInt(checker.dataset.row);
        const color = checker.classList.contains('red') ? 'red' : 'black';
    
        if ((color === 'red' && row === 7) || (color === 'black' && row === 0)) {
            crownChecker(checker);
        }
    }
    
    function resetGame() {
        console.log("Resetting game..."); // Message to confirm function runs
        const board = document.getElementById('board');
        board.innerHTML = ''; // Clear the board
        capturedRed = 0;
        capturedBlack = 0;
        updateCapturedPieces();
        const winnerBanner = document.getElementById('winnerBanner');
        winnerBanner.classList.add('hidden'); // Hide the winner banner class
        winnerBanner.style.display = 'none'; // Ensure the display is set to none
        createBoard(); // Recreate the board and pieces
    }
        
    function getItemColor(objPtr){

        if (objPtr) {
            // If it is a gamepiece ....
            if (objPtr.classList.contains('piece')) {
                // Determine it's color ....
                const eucPtrID = objPtr.dataset.id;
                if (objPtr.classList.contains('red')) {
                    return 'red';
                } else if (objPtr.classList.contains('black')) {
                   return 'black';
                }
             }
        }
        return "";
    }

    function getSquareAtCoordinates(X, Y) {
        // Get the board's bounding rectangle
        const boardRect = board.getBoundingClientRect();
        
        // Check if the coordinates are within the board's boundaries
        if (X < boardRect.left || X > boardRect.right || Y < boardRect.top || Y > boardRect.bottom) {
            return null; // Coordinates are outside the board
        }
    
        // Calculate the relative coordinates within the board
        const relativeX = X - boardRect.left;
        const relativeY = Y - boardRect.top;
    
        // Calculate the size of each square
        const squareSize = boardRect.width / 8;
    
        // Compute the target row and column based on the relative coordinates
        const targetRow = Math.floor(relativeY / squareSize);
        const targetCol = Math.floor(relativeX / squareSize);
    
        // Return the square element at the computed row and column
        return document.querySelector(`.square[data-row='${targetRow}'][data-col='${targetCol}']`);
    }
    
    function squareEvent(event){
        console.log("Inside square event");
    }

    createBoard();

    // Add event listener to the "New Game" button
    document.getElementById('newGameButton').addEventListener('click', resetGame);

});
