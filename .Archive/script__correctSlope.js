document.addEventListener('DOMContentLoaded', () => {
    const board = document.getElementById('board');
    let selectedPiece = null;
    let offsetX, offsetY;
    let origLeft, origTop;
    let origCenterX, origCenterY;

    // Function to create the board and pieces
    function createBoard() {
        let pieceId = 1; // Start piece numbering from 1
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
                        const number = document.createElement('span');
                        number.textContent = pieceId++;
                        piece.appendChild(number);
                        square.appendChild(piece);
                        piece.addEventListener('mousedown', startDrag);
                    }
                    if (row > 4) {
                        const piece = document.createElement('div');
                        piece.classList.add('piece', 'black');
                        piece.dataset.row = row;
                        piece.dataset.col = col;
                        const number = document.createElement('span');
                        number.textContent = pieceId++;
                        piece.appendChild(number);
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

        console.log(`Cursor position: (${event.clientX}, ${event.clientY})`);

        origCenterX = selectedPiece.getBoundingClientRect().left + (selectedPiece.getBoundingClientRect().width / 2);
        origCenterY = selectedPiece.getBoundingClientRect().top + (selectedPiece.getBoundingClientRect().height / 2);
        origLeft = selectedPiece.getBoundingClientRect().left;
        origTop = selectedPiece.getBoundingClientRect().top;
        
        console.log("ORIG-X,Y: ",  origCenterX, origCenterY);
        console.log("ORIG-T,L: ",  origTop, origLeft);

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
                selectedPiece.style.top = 35 - Xupdate + 'px';
            } else {
                selectedPiece.style.top = 35 + Xupdate + 'px';
            }
        } else {
            selectedPiece.style.left = 35 + Xupdate + 'px';
            if (event.clientY < offsetY) {
                selectedPiece.style.top = 35 + Xupdate + 'px';
            } else {
                selectedPiece.style.top = 35 - Xupdate + 'px';
            }
        }
        console.log(`Cursor position: (${event.clientX}, ${event.clientY})`);
    }

    function endDrag(event) {
        if (!selectedPiece) return;
    
        document.removeEventListener('mousemove', dragPiece);
        document.removeEventListener('mouseup', endDrag);
    
        const UID = 'END_DRAG_DEBUG'; // Unique identifier for this code version
        const boardRect = board.getBoundingClientRect();
        const endX = event.clientX - boardRect.left;
        const endY = event.clientY - boardRect.top;
    
        const squareSize = boardRect.width / 8;
        const targetRow = Math.floor(endY / squareSize) + 1;
        const targetCol = Math.floor(endX / squareSize) + 1;
    
        const currentRow = parseInt(selectedPiece.dataset.row) + 1;
        const currentCol = parseInt(selectedPiece.dataset.col) + 1;
    
        const rowDiff = targetRow - currentRow;
        const colDiff = targetCol - currentCol;
    
        const validMove = Math.abs(rowDiff) === 1 && Math.abs(colDiff) === 1;
    
        const targetSquare = Array.from(document.querySelectorAll('.square')).find(sq =>
            parseInt(sq.dataset.row) === targetRow - 1 && parseInt(sq.dataset.col) === targetCol - 1
        );
    
        const targetPiece = targetSquare ? targetSquare.querySelector('.piece') : null;
    
        console.log(UID, "END DRAG");
        console.log(UID, ".... TGT  SQR: ", targetSquare ? targetSquare.dataset.row : 'null', targetSquare ? targetSquare.dataset.col : 'null');
        console.log(UID, ".... END  X,Y: ", endX, endY);
        console.log(UID, ".... ORIG ROW: ", currentRow, currentCol);
        console.log(UID, ".... TGT  ROW: ", targetRow, targetCol);
        console.log(UID, ".... Decision: ", validMove, targetSquare && targetSquare.classList.contains('dark'));
        console.log(UID, ".... TargetPC: ", targetPiece);
        console.log(UID, ".... Compare : ", targetPiece ? targetPiece.classList[1] : 'none', selectedPiece.classList[1]);
    
        if (validMove && targetSquare && targetSquare.classList.contains('dark') &&
            (!targetPiece || targetPiece.classList[1] !== selectedPiece.classList[1])) {
    
            const targetRect = targetSquare.getBoundingClientRect();
    
            const pieceRect = selectedPiece.getBoundingClientRect();
            const pieceCenterX = pieceRect.left + (pieceRect.width / 2);
            const pieceCenterY = pieceRect.top + (pieceRect.height / 2);
    
            const tgtRectCenterX = targetRect.left + (targetRect.width / 2);
            const tgtRectCenterY = targetRect.top + (targetRect.height / 2);
    
            const adjustX = tgtRectCenterX - pieceCenterX;
            const adjustY = tgtRectCenterY - pieceCenterY;
    
            // Log information for debugging before adjustment
            console.log(UID, "TARGET SQUARE");
            console.log(UID, ".... Left, Right: ", Math.round(targetRect.left), Math.round(targetRect.left + targetRect.width));
            console.log(UID, ".... Top, Bottom: ", Math.round(targetRect.top), Math.round(targetRect.top + targetRect.height));
            console.log(UID, ".... Center  X/Y: ", Math.round(tgtRectCenterX), Math.round(tgtRectCenterY));
    
            console.log(UID, "GAME PIECE");
            console.log(UID, ".... Left, Right: ", Math.round(pieceRect.left), Math.round(pieceRect.left + pieceRect.width));
            console.log(UID, ".... Top, Bottom: ", Math.round(pieceRect.top), Math.round(pieceRect.top + pieceRect.height));
            console.log(UID, ".... Center  X/Y: ", Math.round(pieceCenterX), Math.round(pieceCenterY));
    
            console.log(UID, "ADJUSTMENT");
            console.log(UID, ".... Adjust  X/Y: ", Math.round(adjustX), Math.round(adjustY));
            console.log(UID, ".... Initial Style   L,T: (", selectedPiece.style.left || 'none', ") (", selectedPiece.style.top || 'none', ")");
    
            // Ensure initial style.left and style.top are set based on the current piece position
            selectedPiece.style.position = 'absolute';
            selectedPiece.style.left = `${pieceRect.left - boardRect.left}px`;
            selectedPiece.style.top = `${pieceRect.top - boardRect.top}px`;
    
            console.log(UID, ".... Pre-adjust Style   L,T: (", selectedPiece.style.left, ") (", selectedPiece.style.top, ")");
    
            // Append the piece to the target square first
            targetSquare.appendChild(selectedPiece);
    
            // Convert piece.style.left and piece.style.top to float and then adjust
            selectedPiece.style.left = `${parseFloat(selectedPiece.style.left) + adjustX}px`;
            selectedPiece.style.top = `${parseFloat(selectedPiece.style.top) + adjustY}px`;
    
            // Log information for debugging after adjustment
            console.log(UID, "POST-ADJUST");
            console.log(UID, ".... Style   L,T: (", selectedPiece.style.left, ") (", selectedPiece.style.top, ")");
    
            // Update the piece's data attributes
            selectedPiece.dataset.row = targetRow - 1;
            selectedPiece.dataset.col = targetCol - 1;
    
            // Calculate the final center position based on the updated style values
            const finalPieceRect = selectedPiece.getBoundingClientRect();
            const finalPieceCenterX = Math.round(finalPieceRect.left + (finalPieceRect.width / 2));
            const finalPieceCenterY = Math.round(finalPieceRect.top + (finalPieceRect.height / 2));
    
            // Expected location: Target square center adjusted to board top-left corner
            console.log(UID, "EXPECTED POSITION: Center(", Math.round(tgtRectCenterX), ",", Math.round(tgtRectCenterY), ")");
            // Actual location: Style values after adjustment
            console.log(UID, "ACTUAL POSITION: Center(", finalPieceCenterX, ",", finalPieceCenterY, ")");
        } else {
            // If the move is invalid, reset the piece to its original position
            selectedPiece.style.left = `${origLeft - boardRect.left}px`;
            selectedPiece.style.top = `${origTop - boardRect.top}px`;
    
            console.log(UID, "Resetting piece to original position at:", origLeft - boardRect.left, origTop - boardRect.top);
        }
    
        selectedPiece.style.zIndex = '';
        selectedPiece = null;
    }
    
    function movePiece9() {
        const UID = 'DEBUG_4'; // Unique identifier for this code version
        const piece = document.querySelector('.piece[data-id="9"]');
        const targetSquare = document.querySelector('.square[data-row="3"][data-col="2"]');
        const boardRect = board.getBoundingClientRect();
        const targetRect = targetSquare.getBoundingClientRect();
    
        const pieceRect = piece.getBoundingClientRect();
        const pieceCenterX = pieceRect.left + (pieceRect.width / 2);
        const pieceCenterY = pieceRect.top + (pieceRect.height / 2);
    
        const tgtRectCenterX = targetRect.left + (targetRect.width / 2);
        const tgtRectCenterY = targetRect.top + (targetRect.height / 2);
    
        const adjustX = tgtRectCenterX - pieceCenterX;
        const adjustY = tgtRectCenterY - pieceCenterY;
    
        // Log information for debugging before adjustment
        console.log(UID, "TARGET SQUARE");
        console.log(UID, ".... Left, Right: ", Math.round(targetRect.left), Math.round(targetRect.left + targetRect.width));
        console.log(UID, ".... Top, Bottom: ", Math.round(targetRect.top), Math.round(targetRect.top + targetRect.height));
        console.log(UID, ".... Center  X/Y: ", Math.round(tgtRectCenterX), Math.round(tgtRectCenterY));
    
        console.log(UID, "GAME PIECE");
        console.log(UID, ".... Left, Right: ", Math.round(pieceRect.left), Math.round(pieceRect.left + pieceRect.width));
        console.log(UID, ".... Top, Bottom: ", Math.round(pieceRect.top), Math.round(pieceRect.top + pieceRect.height));
        console.log(UID, ".... Center  X/Y: ", Math.round(pieceCenterX), Math.round(pieceCenterY));
    
        console.log(UID, "ADJUSTMENT");
        console.log(UID, ".... Adjust  X/Y: ", Math.round(adjustX), Math.round(adjustY));
        console.log(UID, ".... Initial Style   L,T: (", piece.style.left || 'none', ") (", piece.style.top || 'none', ")");
    
        // Ensure initial style.left and style.top are set before adjusting
        piece.style.position = 'absolute';
        piece.style.left = "-35px";
        piece.style.top = "-35px";
    
        console.log(UID, ".... Pre-adjust Style   L,T: (", piece.style.left, ") (", piece.style.top, ")");
    
        // Convert piece.style.left and piece.style.top to float and then adjust
        piece.style.left = `${parseFloat(piece.style.left) + adjustX}px`;
        piece.style.top = `${parseFloat(piece.style.top) + adjustY}px`;
    
        // Log information for debugging after adjustment
        console.log(UID, "DEBUG_4 POST-ADJUST");
        console.log(UID, ".... Style   L,T: (", piece.style.left, ") (", piece.style.top, ")");
    
        // Update the piece's data attributes
        piece.dataset.row = "3";
        piece.dataset.col = "2";
    
        targetSquare.appendChild(piece);
    
        // Calculate the final center position based on the updated style values
        const finalPieceRect = piece.getBoundingClientRect();
        const finalPieceCenterX = Math.round(finalPieceRect.left + (finalPieceRect.width / 2));
        const finalPieceCenterY = Math.round(finalPieceRect.top + (finalPieceRect.height / 2));
    
        // Expected location: Target square center adjusted to board top-left corner
        console.log(UID, "EXPECTED POSITION: Center(", Math.round(tgtRectCenterX), ",", Math.round(tgtRectCenterY), ")");
        // Actual location: Style values after adjustment
        console.log(UID, "ACTUAL POSITION: Center(", finalPieceCenterX, ",", finalPieceCenterY, ")");
    }
    
    createBoard();
});
