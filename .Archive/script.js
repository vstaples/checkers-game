document.addEventListener('DOMContentLoaded', () => {
    const board = document.getElementById('board');
    let selectedPiece = null;
    let offsetX, offsetY;

    // Function to create the board and pieces
    function createBoard() {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.classList.add('square');
                if ((row + col) % 2 === 0) {
                    square.classList.add('light');
                } else {
                    square.classList.add('dark');
                    if (row < 3) {
                        const piece = document.createElement('div');
                        piece.classList.add('piece', 'red');
                        piece.dataset.row = row;
                        piece.dataset.col = col;
                        square.appendChild(piece);
                        piece.addEventListener('mousedown', startDrag);
                    }
                    if (row > 4) {
                        const piece = document.createElement('div');
                        piece.classList.add('piece', 'black');
                        piece.dataset.row = row;
                        piece.dataset.col = col;
                        square.appendChild(piece);
                        piece.addEventListener('mousedown', startDrag);
                    }
                }
                square.dataset.row = row;
                square.dataset.col = col;
                board.appendChild(square);
            }
        }
    }

    function startDrag(event) {

        selectedPiece = event.target;

        offsetX = event.clientX; 
        offsetY = event.clientY; 

        selectedPiece.style.position = 'absolute';
        selectedPiece.style.left = 35 + 'px';
        selectedPiece.style.top = 35 + 'px'; 
        selectedPiece.style.zIndex = 1000;

        document.addEventListener('mousemove', dragPiece);
        document.addEventListener('mouseup', endDrag);
    }

    function dragPiece(event) {

        if (!selectedPiece) return;

        let Xupdate = event.clientX - offsetX;
        let Yupdate = event.clientY - offsetY;

        if (event.clientX > offsetX) {
            selectedPiece.style.left = 35 + Xupdate + 'px';
            if (offsetY > event.clientY) {
                console.log("Moving UP to the LEFT", offsetX, "-->", event.clientX, event.clientY, "^", offsetY)
                selectedPiece.style.top  = 35 - Xupdate + 'px';
            } else {
                console.log("Moving DOWN to the LEFT", offsetX, "-->", event.clientX, event.clientY, "-", offsetY)
                selectedPiece.style.top  = 35 + Xupdate + 'px';
            }
        }
        else {
            selectedPiece.style.left = 35 + Xupdate + 'px';
            if (event.clientY < offsetY) {
                console.log("Moving UP to the RIGHT", offsetX, "-->", event.clientX, event.clientY,  "^", offsetY)
                selectedPiece.style.top  = 35 + Xupdate + 'px';
            } else {
                console.log("Moving DOWN to the RIGHT", offsetX, "-->", event.clientX, event.clientY,  "-", offsetY)
                selectedPiece.style.top  = 35 - Xupdate + 'px';
            }
        }
    }

    function endDrag(event) {

        if (!selectedPiece) return;
        
        document.removeEventListener('mousemove', dragPiece);
        document.removeEventListener('mouseup', endDrag);

        const boardRect = board.getBoundingClientRect();
        const endX = event.clientX - boardRect.left;
        const endY = event.clientY - boardRect.top;

        const squareSize = boardRect.width / 8;
        const targetRow = Math.floor(endY / squareSize);
        const targetCol = Math.floor(endX / squareSize);

        const currentRow = parseInt(selectedPiece.dataset.row);
        const currentCol = parseInt(selectedPiece.dataset.col);

        const rowDiff = targetRow - currentRow;
        const colDiff = targetCol - currentCol;

        const validMove = Math.abs(rowDiff) === 1 && Math.abs(colDiff) === 1;

        const targetSquare = Array.from(document.querySelectorAll('.square')).find(sq => 
            parseInt(sq.dataset.row) === targetRow && parseInt(sq.dataset.col) === targetCol
        );

        // Center the piece within the target square
        const targetRect = targetSquare.getBoundingClientRect();
        const pieceRect = selectedPiece.getBoundingClientRect();
        const centerX = targetRect.left + (targetRect.width - pieceRect.width) / 2;
        const centerY = targetRect.top + (targetRect.height - pieceRect.height) / 2;

        if (validMove && targetSquare && targetSquare.classList.contains('dark') &&
            !targetSquare.querySelector('.piece')) {
            targetSquare.appendChild(selectedPiece);
            
            selectedPiece.dataset.row = targetRow;
            selectedPiece.dataset.col = targetCol;

            selectedPiece.style.position = 'absolute';
        /* selectedPiece.style.left = (centerX - boardRect.left) + 'px';
            selectedPiece.style.top = (centerY - boardRect.top) + 'px'; */
            
        } else {
            // If the move is invalid, reset the piece to its original position
        /*  selectedPiece.style.left = (currentCol * squareSize + (squareSize - pieceRect.width) / 2) + 'px';
            selectedPiece.style.top = (currentRow * squareSize + (squareSize - pieceRect.height) / 2) + 'px'; */
        }

        selectedPiece.style.zIndex = '';
        selectedPiece = null;
    }

    createBoard();
});
