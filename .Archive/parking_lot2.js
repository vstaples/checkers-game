// ------------------------------------------------------
// GLOBAL VARIABLE DECLARATION SECTION
// ------------------------------------------------------

// ------------------------------------------------------
// Start the game once all DOM Content is loaded
// ------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {

    const board = document.getElementById('board');
    let draggedElement = null;
    let encounteredElement = null;
    let startX, startY;
    let origCenterX, origCenterY;
    let origLeft = 0;
    let origTop = 0;
    
    // Function to create the board and pieces
    function createBoard() {
        
        let pieceId  = 1; // Start piece numbering from 1
        let squareId = 1; // Start piece numbering from 1
        
        for (let row = 0; row < 8; row++) {
        
            for (let col = 0; col < 8; col++) {
        
                // Create a SQUARE element
                const square = document.createElement('div');
                      square.classList.add('square');
                      square.dataset.id = squareId++;
        
                // Append a LIGHT item to the Square; these are VOIDs on the gameboard
                if ((row + col) % 2 === 0) {
        
                    square.classList.add('light');
        
                // Append a DARK item to the Square
                } else {
                    square.classList.add('dark');
                    
                    // Rows 1-3 are for the RED pieces
                    // Rows 4-5 is the open land between the competing forces
                    // Rows 6-8 are for the BLACK pieces
                    if (row < 3) {
                        
                        // Add a checker to the square; these are inserted via styles.css ".piece.red"
                        const piece = document.createElement('div');
                              piece.classList.add('piece', 'red');
                              piece.dataset.firstname = "Vaughn";
                              piece.dataset.row = row;
                              piece.dataset.col = col;
                              piece.dataset.id = pieceId++;
                              piece.draggable = true;
                        
                        // Create a text label to overlay on top of the gamepiece & assign it the gamepiece's ID
                        const number = document.createElement('span');
                              number.textContent = piece.dataset.id;
                        
                        // Add the "number" and a "mousedown" event to the GAMEPIECE
                        piece.appendChild(number);
 
                        // Add the gamepiece to the SQUARE
                        square.appendChild(piece);
                    }

                    // In the BLACK zone now ....
                    if (row > 4) {

                        // Add a checker to the square; these are inserted via styles.css ".piece.black"
                        const piece = document.createElement('div');
                              piece.classList.add('piece', 'black');
                              piece.dataset.firstname = "Vaughn";
                              piece.dataset.row = row;
                              piece.dataset.col = col;
                              piece.dataset.id = pieceId++;
                              piece.draggable = true;

                        // Create a text label to overlay on top of the gamepiece & assign it the gamepiece's ID
                        const number = document.createElement('span');
                              number.textContent = piece.dataset.id;
                        
                        // Add the "number" and a "mousedown" event to the GAMEPIECE
                        piece.appendChild(number);

                        // Add the gamepiece to the SQUARE
                        square.appendChild(piece);
                    }
                }

                // Assign the ROW and COLUMN to the SQUARE
                square.dataset.row = row;
                square.dataset.col = col;

                // Add the square to the BOARD
                board.appendChild(square);
            }
        }
    }

    function dragEnter(event){
        //console.log("Dragging into " + event.target.classList)
    }

    function dragLeave(event){
        //console.log("Drag leaving " + event.target.classList)
    }

    function dragDrop(event){
        //console.log("Drag dropping " + event.target.classList)
    }

    function dragEnd(event){
        //console.log("Drag ending " + event.target.classList)
    }

    // Function to handle the drag start event
    function dragStart(event) {
        
        console.log("Inside DragStart()");
        
        draggedElement = event.target;
        
        startX = event.clientX;
        startY = event.clientY;
        event.dataTransfer.setData('text/plain', ''); // Necessary for Firefox to enable drag

        // Create a custom drag image
        const dragImage = event.target.cloneNode(true);
        dragImage.style.position = 'absolute';
        dragImage.style.top = '-1000px'; // Move it off-screen
        document.body.appendChild(dragImage);

        // Set the custom drag image
        event.dataTransfer.setDragImage(dragImage, 30, 30); // Center of the 60x60 piece

        // Cleanup after drag ends
        event.target.addEventListener('dragend', () => {
            document.body.removeChild(dragImage);
        });
    }

    function dragOver(event) {
        
        event.preventDefault(); // Prevent default behavior to allow drop

        const offsetX = event.clientX - startX;
        const offsetY = event.clientY - startY;

        // Constrain movement to 45-degree angles
        if (Math.abs(offsetX) > Math.abs(offsetY)) {
            event.dataTransfer.dropEffect = 'none';
        } else {
            event.dataTransfer.dropEffect = 'move';
        }
    }

    // Function to handle the dragging piece event (move piece at 45 degrees)
    function draggingPiece(event) {

        if (!draggedElement) return;

        event.preventDefault();

        let Xupdate = event.clientX - startX;
        let Yupdate = event.clientY - startY;

        if (Math.abs(Xupdate) > Math.abs(Yupdate)) {
            Yupdate = Xupdate * Math.sign(Yupdate);
        } else {
            Xupdate = Yupdate * Math.sign(Xupdate);
        }

        draggedElement.style.transform = `translate(${Xupdate}px, ${Yupdate}px)`;

        /*
        if (event.clientX > startX) {
            draggedElement.style.left = 35 + Xupdate + 'px';
            if (startY > event.clientY) {
                draggedElement.style.top = 35 - Xupdate + 'px';
            } else {
                draggedElement.style.top = 35 + Xupdate + 'px';
            }
        } else {
            draggedElement.style.left = 35 + Xupdate + 'px';
            if (event.clientY < startY) {
                draggedElement.style.top = 35 + Xupdate + 'px';
            } else {
                draggedElement.style.top = 35 - Xupdate + 'px';
            }
        }
        */

        console.log("Inside DraggingPiece()", event.clientX, event.clientY, Xupdate, Yupdate);
    }

    // Function to handle the drop event
    function drop(event) {
        console.log("Inside drop()");
        event.preventDefault();

        const targetSquare = event.target.closest('.square');
        if (targetSquare) {
            const targetRow = parseInt(targetSquare.dataset.row);
            const targetCol = parseInt(targetSquare.dataset.col);
            const draggedRow = parseInt(draggedElement.dataset.row);
            const draggedCol = parseInt(draggedElement.dataset.col);

            // Check if the move is diagonal by 1 square
            if (Math.abs(targetRow - draggedRow) === 1 && Math.abs(targetCol - draggedCol) === 1) {
                targetSquare.appendChild(draggedElement);
                draggedElement.dataset.row = targetRow;
                draggedElement.dataset.col = targetCol;
            }
        }
    }

    // Add event listener to the button
    // document.getElementById('movePieceButton').addEventListener('click', movePiece9);

    createBoard();

    const pieces  = document.querySelectorAll(".piece");
    const squares = document.querySelectorAll(".square");

    // Add event listener for drag start on each draggable piece
    pieces.forEach(piece => {
        piece.addEventListener('dragstart', dragStart);
    });

    // Add event listeners for to each square
    squares.forEach(square => {
        console.log("Square: ", square.dataset.id);
        square.addEventListener("dragover",  squareEvent);
        square.addEventListener('drop', drop);
        // square.addEventListener("dragenter", dragEnter);
        // square.addEventListener("dragleave", dragLeave);
        // square.addEventListener("dragdrop",  dragDrop);
        // square.addEventListener("dragend",   dragEnd);
    });
});
