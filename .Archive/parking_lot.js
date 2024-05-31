   // --------------------------------------------------
    // startDrag()
    // --------------------------------------------------
    function startDrag(event) {

        console.log("Inside StartDrag()");

        // Capture the X,Y of the current mouse position
        startX = event.clientX; 
        startY = event.clientY; 

        // assign required info to the selected gamepiece
        draggedElement = event.target;
        draggedElement.style.position = 'absolute';
        draggedElement.style.left = 35 + 'px';
        draggedElement.style.top = 35 + 'px'; 
        draggedElement.style.zIndex = 1000;

        document.addEventListener('mousemove', draggingPiece);
        document.addEventListener('mouseup', enddraggingPiece);

        console.log("Parent Square: ", event.target.parentNode.dataset.row, event.target.parentNode.dataset.col)
    }
    
    // --------------------------------------------------------------
    // draggingPiece():  
    // 
    // This function is called when the LMB is pressed down
    //               on checker & a movement begins.
    //
    // The gamepiece shall slide at a 45 degree slope (diagonal) both
    // left/right + up/down.  The gamepiece is also limited to no 
    // more than 1 row of travel up or down at all times.
    // --------------------------------------------------------------
    // NOTE: In JavaScript, mathematical operations involving variables 
    //       retrieved from HTML data attributes are treated as strings, 
    //       not numbers. parseInt() must be used to convert them to
    //       integer values.
    // --------------------------------------------------------------
    function draggingPiece(event) {

        if (!draggedElement) return;

        event.preventDefault();

        infoDisplay.textContent = "Dragging checker #" + draggedElement.dataset.id;

        // console.log(`Cursor position: (${event.clientX}, ${event.clientY})`);
        // console.log("Offsets: ", draggedElement.offsetTop, draggedElement.offsetLeft);
        // console.log(event.target);

        // Get the dragged item COLOR and ID
        const draggedID    = draggedElement.dataset.id;
        const draggedRow   = parseInt(draggedElement.dataset.row);
        const draggedCol   = parseInt(draggedElement.dataset.col);
        
        let draggedColor = "";
        if (draggedElement.classList.contains('red')) {
            draggedColor = 'red';
        } else if (draggedElement.classList.contains('black')) {
            draggedColor = 'black';
        }

        // Block further movement under the following conditions:
        // 1. Cursor shall not drag beyond 1 row up or down.
        // 2. Gamepiece collides with a brother of the same color.
        
        const eucCollection = document.elementsFromPoint(event.clientX, event.clientY);
        const eucPtr        = eucCollection.find(el => el !== draggedElement);
        const eucPtrRow     = parseInt(eucPtr.dataset.row);
        const eucPtrCol     = parseInt(eucPtr.dataset.col);
        let   eucPtrColor   = "";
        let   encounteredElement  = null;

        console.log("Attributes: ")
        console.log(".... Dragged: ", draggedID, draggedRow, draggedCol)
        console.log(".... Encount: ", eucPtrRow, eucPtrCol)
        
        // If the "encountered row/column " is more than -1- greater or less than
        // the dragged chess piece, exit stage left to limit further movement.
        if (eucPtrRow > (draggedRow + 1) || eucPtrRow < (draggedRow - 1) ) { 
            console.log("Stopping Row: ", eucPtrRow, limitRow);
            return; 
        }
        if (eucPtrCol > (draggedCol + 1) || eucPtrCol < (draggedCol - 1) ) { 
            console.log("Stopping Col: ", eucPtrCol, draggedCol);
            return; 
        }
        
        // Note: There will always be an element under the cursor which will
        //       be either a Square or Gamepiece.
        if (eucPtr) {
            // If it is a gamepiece ....
            if (eucPtr.classList.contains('piece')) {
                // Determine it's color ....
                const eucPtrID = eucPtr.dataset.id;
                if (eucPtr.classList.contains('red')) {
                    eucPtrColor = 'red';
                } else if (eucPtr.classList.contains('black')) {
                    eucPtrColor = 'black';
                }
                // Exit stage left to disable further movement if it is
                // a brother of the same color ....
                console.log("Collision: ", draggedID, draggedColor, eucPtrID, eucPtrColor);

                if (eucPtrColor == draggedColor){
                    console.log(".... Family: ", draggedID, draggedColor, eucPtrID, eucPtrColor);
                    return;
                }
                encounteredElement = eucPtr;
                return;            
            }
        }

        let Xupdate = event.clientX - startX;
        let Yupdate = event.clientY - startY;

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
     }
    
    // -------------------------------------------------------------
    // enddraggingPiece():  This function is called when the LMB is released.
    //
    // The "draggingPiece()" function forces the gamepiece to slide at a
    // 45 degree slope (diagonal) left/right + up/down.  This keeps
    // the gamepiece solidly on dark squares at all times.  In doing
    // so, the gamepiece is also limited to no more than 1 row of 
    // travel up or down at all times.
    // -------------------------------------------------------------
    function enddraggingPiece(event) {
        
        if (!draggedElement) return;
    
        console.log("Dragged item: ", draggedElement.dataset.id)
        
        // disable parent event handlers
        event.stopPropagation();

        // Add the gamepiece to the SQUARE landed on
        // event.target.parentNode.append(draggedElement);

        document.removeEventListener('mousemove', draggingPiece);
        document.removeEventListener('mouseup', enddraggingPiece);


        const UID = 'END_DRAG_DEBUG_V22'; // Unique identifier for this code version
        const boardRect = document.getElementById('board').getBoundingClientRect();
        const endX = event.clientX - boardRect.left;
        const endY = event.clientY - boardRect.top;
    
        const squareSize = boardRect.width / 8;
        const targetRow = Math.floor(endY / squareSize) + 1;
        const targetCol = Math.floor(endX / squareSize) + 1;
    
        const currentRow = parseInt(draggedElement.dataset.row) + 1;
        const currentCol = parseInt(draggedElement.dataset.col) + 1;
    
        const rowDiff = targetRow - currentRow;
        const colDiff = targetCol - currentCol;
    
        const validMove = Math.abs(rowDiff) === 1 && Math.abs(colDiff) === 1;
    
        const targetSquare = Array.from(document.querySelectorAll('.square')).find(sq =>
            parseInt(sq.dataset.row) === targetRow - 1 && parseInt(sq.dataset.col) === targetCol - 1
        );
    
        const targetPiece = targetSquare ? targetSquare.querySelector('.piece') : null;

        // const element = document.querySelector('.your-element-class'); // Replace with your element selector

        // Loop through the classList and print each class by index
        for (let i = 0; i < targetPiece.classList.length; i++) {
            console.log(`Class at index ${i}: ${targetPiece.classList[i]}`);
        }
                
        console.log(UID, "END DRAG");
        console.log(UID, ".... TGT  SQR: ", targetSquare ? targetSquare.dataset.row : 'null', targetSquare ? targetSquare.dataset.col : 'null');
        console.log(UID, ".... END  X,Y: ", endX, endY);
        console.log(UID, ".... ORIG ROW: ", currentRow, currentCol);
        console.log(UID, ".... TGT  ROW: ", targetRow, targetCol);
        console.log(UID, ".... Decision: ", validMove, targetSquare && targetSquare.classList.contains('dark'));
        console.log(UID, ".... TargetPC: ", targetPiece);
        console.log(UID, ".... Compare : ", targetPiece ? targetPiece.classList[1] : 'none', draggedElement.classList[1]);
    
        if (validMove && targetSquare && targetSquare.classList.contains('dark') &&
            (!targetPiece || targetPiece.classList[1] !== draggedElement.classList[1])) {
            
            // Add the gamepiece to the SQUARE landed on
            event.target.parentNode.append(draggedElement);

            // if we landed on another element, capture it (by removing!)
            if (encounteredElement){
                encounteredElement.remove();
                encounteredElement = null;
            }
            /*
            const targetRect = targetSquare.getBoundingClientRect();
            const pieceRect = draggedElement.getBoundingClientRect();
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
            console.log(UID, ".... Initial Style   L,T: (", draggedElement.style.left || 'none', ") (", draggedElement.style.top || 'none', ")");
    
            // Ensure initial style.left and style.top are set based on the current piece position
            draggedElement.style.position = 'absolute';
            //draggedElement.style.left = `${pieceRect.left - boardRect.left}px`;
            //draggedElement.style.top = `${pieceRect.top - boardRect.top}px`;
    
            console.log(UID, ".... Pre-adjust Style   L,T: (", draggedElement.style.left, ") (", draggedElement.style.top, ")");
            console.log(UID, ".... Calculated adjustX, adjustY: ", adjustX, adjustY);
            console.log(UID, ".... Calculated parseFloat values: ", parseFloat(draggedElement.style.left), parseFloat(draggedElement.style.top));
    
            // Adjust the piece position to center it in the target square
            draggedElement.style.left = `${parseFloat(draggedElement.style.left) + adjustX}px`;
            draggedElement.style.top = `${parseFloat(draggedElement.style.top) + adjustY}px`;
    
            // Log information for debugging after adjustment
            console.log(UID, "POST-ADJUST");
            console.log(UID, ".... Style   L,T: (", draggedElement.style.left, ") (", draggedElement.style.top, ")");
    
            // Update the piece's data attributes
            draggedElement.dataset.row = targetRow - 1;
            draggedElement.dataset.col = targetCol - 1;
    
            // Calculate the final center position based on the updated style values
            const finalPieceRect = draggedElement.getBoundingClientRect();
            const finalPieceCenterX = Math.round(finalPieceRect.left + (finalPieceRect.width / 2));
            const finalPieceCenterY = Math.round(finalPieceRect.top + (finalPieceRect.height / 2));
    
            // Expected location: Target square center adjusted to board top-left corner
            console.log(UID, "EXPECTED POSITION: Center(", Math.round(tgtRectCenterX), ",", Math.round(tgtRectCenterY), ")");
            // Actual location: Style values after adjustment
            console.log(UID, "ACTUAL POSITION: Center(", finalPieceCenterX, ",", finalPieceCenterY, ")");
            */

        } else {
            // If the move is invalid, reset the piece to its original position
            console.log(UID, "Resetting piece to original position at:", origLeft - boardRect.left, origTop - boardRect.top);

            //draggedElement.style.left = `${origLeft - boardRect.left}px`;
            //draggedElement.style.top = `${origTop - boardRect.top}px`;    
        }
    
        // Log information before setting zIndex to identify any potential side effects
        console.log(UID, "Before setting zIndex: ", draggedElement.style.zIndex);
        //draggedElement.style.zIndex = '';
        console.log(UID, "After setting zIndex: ", draggedElement.style.zIndex);
    
        draggedElement = null;
    }

        // --------------------------------------------------
    // movePiece9()
    // --------------------------------------------------
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
