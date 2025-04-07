document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const startScreen = document.getElementById('start-screen');
    const gameContainer = document.getElementById('game-container');
    const restartButton = document.getElementById('restart-button');
    const boardElement = document.getElementById('game-board');
    const scoreBlackElement = document.getElementById('score-black');
    const scoreWhiteElement = document.getElementById('score-white');
    const currentTurnElement = document.getElementById('current-turn');
    const turnInfoElement = gameContainer.querySelector('.turn');
    const messageAreaElement = document.getElementById('message-area');
    const pvpButton = document.getElementById('pvp-button');
    const pvcButton = document.getElementById('pvc-button');
    const difficultySelect = document.getElementById('difficulty-select');
    // Theme toggle elements removed - always using dark mode

    // --- Constants ---
    const BOARD_SIZE = 8;
    const EMPTY = 0;
    const BLACK = 1; // Player 1
    const WHITE = 2; // Player 2 or Computer
    const DIFFICULTIES = { VERY_EASY: 1, EASY: 2, MEDIUM: 3, HARD: 4 };
    const MAX_MINIMAX_DEPTH = 2; // Depth for Hard AI
    const directions = [ [-1, -1], [-1, 0], [-1, 1], [ 0, -1], [ 0, 1], [ 1, -1], [ 1, 0], [ 1, 1] ];
    const positionalWeights = [
        [120, -20, 20,  5,  5, 20, -20, 120], [-20, -40, -5, -5, -5, -5, -40, -20],
        [ 20,  -5, 15,  3,  3, 15,  -5,  20], [  5,  -5,  3,  3,  3,  3,  -5,   5],
        [  5,  -5,  3,  3,  3,  3,  -5,   5], [ 20,  -5, 15,  3,  3, 15,  -5,  20],
        [-20, -40, -5, -5, -5, -5, -40, -20], [120, -20, 20,  5,  5, 20, -20, 120]
    ];

    // --- Game State Variables ---
    let board = [];
    let currentPlayer = BLACK;
    let scores = { [BLACK]: 0, [WHITE]: 0 };
    let gameOver = false;
    let passCounter = 0;
    let gameMode = 'pvp';
    let difficultyLevel = DIFFICULTIES.EASY;
    let humanPlayer = BLACK;
    let computerPlayer = WHITE;
    let isComputerTurn = false;

    // --- Initialization and UI Switching ---
    function showScreen(screenToShow) {
        startScreen.classList.remove('active');
        gameContainer.classList.remove('active');
        if (screenToShow) {
           screenToShow.classList.add('active');
           // console.log(`Showing screen: #${screenToShow.id}`); // Debug log
        } else {
            console.error("showScreen called with null screen!");
        }
    }

    function initializeBoard() {
        // console.log("Initializing board array..."); // Debug log
        board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(EMPTY));
        board[3][3] = WHITE; board[3][4] = BLACK;
        board[4][3] = BLACK; board[4][4] = WHITE;
        // console.log("Board array initialized."); // Debug log
    }

    function createBoardUI() {
        // console.log("Creating board UI (cells)..."); // Debug log
        if (!boardElement) {
            console.error("createBoardUI Error: boardElement not found!");
            return;
        }
        boardElement.innerHTML = '';
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.row = r;
                cell.dataset.col = c;
                cell.addEventListener('click', handleCellClick);
                boardElement.appendChild(cell);
            }
        }
        // console.log(`createBoardUI finished. Cell count: ${boardElement.children.length}`); // Debug log
    }

    // --- Rendering and UI Updates ---
    function renderBoard() {
        // console.log("Rendering board pieces..."); // Debug log
        if (!boardElement) {
             console.error("renderBoard Error: boardElement not found!");
             return;
        }
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const cell = boardElement.querySelector(`[data-row="${r}"][data-col="${c}"]`);
                if (!cell) {
                    console.error(`RenderBoard Error: Cell [${r},${c}] element not found!`);
                    continue;
                }
                cell.innerHTML = '';
                cell.classList.remove('valid-move');

                if (board[r][c] !== EMPTY) {
                    const piece = document.createElement('div');
                    piece.classList.add('piece', board[r][c] === BLACK ? 'black' : 'white');
                    cell.appendChild(piece);
                }
            }
        }
        // console.log("Finished rendering pieces. Updating scores and turn."); // Debug log
        updateScores();
        updateTurnIndicator();

        if (!gameOver && (gameMode === 'pvp' || currentPlayer === humanPlayer)) {
             // console.log("Highlighting valid moves for player:", currentPlayer); // Debug log
             highlightValidMoves();
        } else {
            // console.log("Not highlighting moves (Game Over or Computer Turn)."); // Debug log
             boardElement.querySelectorAll('.valid-move').forEach(cell => cell.classList.remove('valid-move')); // Clear existing highlights if computer's turn
        }
    }

    function updateScores() {
        scores[BLACK] = 0; scores[WHITE] = 0;
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (board[r][c] === BLACK) scores[BLACK]++;
                if (board[r][c] === WHITE) scores[WHITE]++;
            }
        }
        scoreBlackElement.textContent = scores[BLACK];
        scoreWhiteElement.textContent = scores[WHITE];
    }

    function updateTurnIndicator() {
        let turnText;
        if (gameMode === 'pvc') {
            turnText = currentPlayer === humanPlayer ? 'Your Turn (Black)' : "Computer's Turn (White)";
        } else {
            turnText = currentPlayer === BLACK ? 'Black' : 'White';
        }
        currentTurnElement.textContent = turnText;
        turnInfoElement.className = 'turn ' + (currentPlayer === BLACK ? 'black' : 'white');
    }

    function clearMessage() { 
        messageAreaElement.textContent = ''; 
        messageAreaElement.className = 'message'; // Reset to base class
    }
    function showMessage(msg) { 
        messageAreaElement.textContent = msg; 
        // Keep any existing classes when showing regular messages
    }

    function highlightValidMoves() {
        try {
            if (!boardElement) return;
            boardElement.querySelectorAll('.valid-move').forEach(cell => cell.classList.remove('valid-move'));
            const validMoves = getValidMoves(currentPlayer);
            validMoves.forEach(move => {
                const cell = boardElement.querySelector(`[data-row="${move.row}"][data-col="${move.col}"]`);
                if (cell) {
                    cell.classList.add('valid-move');
                } else {
                    console.error(`Highlight Error: Cell not found for move ${JSON.stringify(move)}`);
                }
            });
        } catch (error) {
             console.error("Error during highlightValidMoves:", error);
        }
    }

    // --- Core Game Logic ---
    function isValid(row, col) {
        return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
    }

    function getDiscsToFlip(boardState, row, col, player) {
        if (!isValid(row, col) || boardState[row][col] !== EMPTY) return [];
        const opponent = player === BLACK ? WHITE : BLACK;
        const discsToFlip = [];
        for (const [dr, dc] of directions) {
            let r = row + dr; let c = col + dc;
            const currentLineFlips = [];
            let foundOpponent = false;
            while (isValid(r, c)) {
                if (boardState[r][c] === opponent) {
                    foundOpponent = true;
                    currentLineFlips.push({ row: r, col: c });
                } else if (boardState[r][c] === player) {
                    if (foundOpponent) { discsToFlip.push(...currentLineFlips); }
                    break;
                } else { break; }
                r += dr; c += dc;
            }
        }
        return discsToFlip;
    }

    function isValidMove(row, col, player) {
        return getDiscsToFlip(board, row, col, player).length > 0;
    }

    function getValidMoves(player, boardState = board) {
        const moves = [];
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (boardState[r][c] === EMPTY) {
                    const flips = getDiscsToFlip(boardState, r, c, player);
                    if (flips.length > 0) {
                        moves.push({ row: r, col: c, flips: flips.length });
                    }
                }
            }
        }
        return moves;
    }

    function placePiece(row, col) {
        const discsToFlip = getDiscsToFlip(board, row, col, currentPlayer);
        if (board[row][col] !== EMPTY || discsToFlip.length === 0) return false; // Cannot place if occupied or invalid move
        board[row][col] = currentPlayer;
        discsToFlip.forEach(piece => { board[piece.row][piece.col] = currentPlayer; });
        return true;
    }

    function switchPlayer() {
        currentPlayer = (currentPlayer === BLACK ? WHITE : BLACK);
    }

    // --- Game Flow and Turn Management ---
    function handleCellClick(event) {
        if (gameOver || isComputerTurn) return;
        const targetCell = event.target.closest('.cell');
        if (!targetCell) return;
        const row = parseInt(targetCell.dataset.row, 10);
        const col = parseInt(targetCell.dataset.col, 10);

        if (!isValidMove(row, col, currentPlayer)) {
            if (board[row][col] !== EMPTY) { showMessage("Cell occupied!"); }
            else { showMessage("Invalid move!"); }
            setTimeout(clearMessage, 1500);
            return;
        }
        clearMessage();
        if (placePiece(row, col)) { processTurnEnd(); }
    }

    function processTurnEnd() {
        renderBoard(); // Show result of the move
        switchPlayer(); // Switch to the next player

        // Check if game ended
        if (checkGameOver()) return;
        
        // Check if current player has valid moves
        const currentPlayerValidMoves = getValidMoves(currentPlayer);
        if (currentPlayerValidMoves.length === 0) {
            // Current player has no valid moves, but game is not over (opponent has moves)
            const passer = (gameMode === 'pvc' && currentPlayer === computerPlayer) ? 'Computer' : 
                          (gameMode === 'pvc' && currentPlayer === humanPlayer ? 'You' : 
                          (currentPlayer === BLACK ? 'Black' : 'White'));
            showMessage(`${passer} has no valid moves. Turn passes.`);
            switchPlayer(); // Pass turn to the other player
            passCounter++;
        } else {
            passCounter = 0;
        }

        renderBoard(); // Update UI for the new player (turn indicator, highlights)

        if (gameMode === 'pvc' && currentPlayer === computerPlayer) {
            isComputerTurn = true;
            document.body.classList.add('computer-thinking');
            showMessage("Computer is thinking...");
            setTimeout(computerTurn, 500); // Delay for AI turn
        } else {
            isComputerTurn = false;
            document.body.classList.remove('computer-thinking');
            // No explicit highlight needed, renderBoard handles it
        }
    }

    function computerTurn() {
        clearMessage();
        const validMoves = getValidMoves(computerPlayer);
        let moveMade = false;
        if (validMoves.length > 0) {
            const chosenMove = getComputerMove(validMoves);
            if (chosenMove && placePiece(chosenMove.row, chosenMove.col)) {
                 passCounter = 0;
                 moveMade = true;
            } else {
                 console.error("AI failed to make a valid move, trying fallback.");
                 if(placePiece(validMoves[0].row, validMoves[0].col)) { // Fallback: first valid move
                     passCounter = 0;
                     moveMade = true;
                 } else {
                     console.error("AI Fallback move also failed.");
                 }
            }
        }

        if (!moveMade) {
             // console.log("Computer has no moves."); // Debug log
             passCounter++;
             showMessage("Computer has no moves. Turn passes.");
        }

        isComputerTurn = false;
        document.body.classList.remove('computer-thinking');
        processTurnEnd(); // Continue the game loop
    }

    function checkGameOver() {
        const currentPlayerValidMoves = getValidMoves(currentPlayer);
        if (currentPlayerValidMoves.length > 0) {
            passCounter = 0;
            return false; // Game continues
        }
        const opponent = currentPlayer === BLACK ? WHITE : BLACK;
        const opponentValidMoves = getValidMoves(opponent);

        if (opponentValidMoves.length > 0) {
            passCounter++; // First player passes
            const passer = (gameMode === 'pvc' && currentPlayer === computerPlayer) ? 'Computer' : (gameMode === 'pvc' && currentPlayer === humanPlayer ? 'You' : (currentPlayer === BLACK ? 'Black' : 'White'));
            showMessage(`${passer} has no valid moves. Turn passes.`);
            // Turn will switch in processTurnEnd
            return false; // Let the opponent play
        } else {
            // Neither player has moves
            gameOver = true;
            determineWinner();
            return true; // Game is over
        }
    }

    function determineWinner() {
        let winnerMessage;
        let resultClass = 'game-over';
        updateScores();
        
        // Clear any existing classes
        messageAreaElement.className = 'message';
        
        if (scores[BLACK] > scores[WHITE]) {
            winnerMessage = `Game Over! ${gameMode === 'pvc' ? 'You win' : 'Black wins'} ${scores[BLACK]} to ${scores[WHITE]}!`;
            resultClass += gameMode === 'pvc' ? ' win' : '';
        } else if (scores[WHITE] > scores[BLACK]) {
            winnerMessage = `Game Over! ${gameMode === 'pvc' ? 'Computer wins' : 'White wins'} ${scores[WHITE]} to ${scores[BLACK]}!`;
            resultClass += gameMode === 'pvc' ? ' lose' : '';
        } else {
            winnerMessage = `Game Over! It's a draw ${scores[BLACK]} to ${scores[WHITE]}!`;
            resultClass += ' draw';
        }
        
        showMessage(winnerMessage);
        messageAreaElement.classList.add(...resultClass.split(' '));
        
        boardElement.querySelectorAll('.valid-move').forEach(cell => cell.classList.remove('valid-move'));
        // console.log("Game over."); // Debug log
        restartButton.disabled = false; // Ensure button is usable
    }

    // --- AI Logic ---
    function getComputerMove(validMoves) {
        if (!validMoves || validMoves.length === 0) return null;
        switch (difficultyLevel) {
            case DIFFICULTIES.VERY_EASY: return getRandomMove(validMoves);
            case DIFFICULTIES.EASY:      return getGreedyMove(validMoves);
            case DIFFICULTIES.MEDIUM:    return getPositionalMove(validMoves);
            case DIFFICULTIES.HARD:
                 const boardCopy = board.map(row => [...row]);
                 return minimaxRoot(boardCopy, computerPlayer, MAX_MINIMAX_DEPTH);
            default: return getRandomMove(validMoves);
        }
    }
    function getRandomMove(validMoves) {
         return validMoves[Math.floor(Math.random() * validMoves.length)];
    }
    function getGreedyMove(validMoves) {
        return [...validMoves].sort((a, b) => b.flips - a.flips)[0];
    }
    function getPositionalMove(validMoves) {
        let bestMove = validMoves[0];
        let bestScore = -Infinity;
        for (const move of validMoves) {
            const score = positionalWeights[move.row][move.col];
            if (score > bestScore) {
                bestScore = score; bestMove = move;
            } else if (score === bestScore && move.flips > (bestMove?.flips || 0)) { // Use optional chaining for safety
                 bestMove = move;
            }
        }
        return bestMove;
    }
    function evaluateBoard(boardState, player) {
        let score = 0; let opponent = player === BLACK ? WHITE : BLACK;
        let myPieces = 0; let opponentPieces = 0;
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (boardState[r][c] === player) { score += positionalWeights[r][c]; myPieces++; }
                else if (boardState[r][c] === opponent) { score -= positionalWeights[r][c]; opponentPieces++; }
            }
        }
         score += (myPieces - opponentPieces) * 5; // Piece difference bonus
        return score;
    }
    function simulateMove(boardState, move, player) {
        const nextBoard = boardState.map(row => [...row]);
        const discsToFlip = getDiscsToFlip(nextBoard, move.row, move.col, player);
        if(!isValid(move.row, move.col) || nextBoard[move.row][move.col] !== EMPTY) {
            console.warn("Simulate invalid move:", move); return nextBoard;
        }
        nextBoard[move.row][move.col] = player;
        discsToFlip.forEach(p => { nextBoard[p.row][p.col] = player; });
        return nextBoard;
    }
    function minimaxRoot(boardState, player, depth) {
        const validMoves = getValidMoves(player, boardState);
        if (validMoves.length === 0) return null;
        let bestScore = -Infinity;
        let bestMove = validMoves[0];
        for (const move of validMoves) {
             const nextBoard = simulateMove(boardState, move, player);
             const score = minimax(nextBoard, depth - 1, false, player); // Minimizing player's turn
             if (score > bestScore) { bestScore = score; bestMove = move; }
        }
        // console.log(`AI (Depth ${depth}) chose [${bestMove.row},${bestMove.col}], Score: ${bestScore}`); // Debug log
        return bestMove;
    }
    function minimax(boardState, depth, isMaximizingPlayer, aiPlayer) {
         const human = aiPlayer === BLACK ? WHITE : BLACK;
         const currentPlayer = isMaximizingPlayer ? aiPlayer : human;
         const terminalState = isGameOverState(boardState, aiPlayer, human);
         if (depth === 0 || terminalState) { return evaluateBoard(boardState, aiPlayer); }
         const validMoves = getValidMoves(currentPlayer, boardState);
         if (validMoves.length === 0) { return minimax(boardState, depth - 1, !isMaximizingPlayer, aiPlayer); } // Pass turn

         if (isMaximizingPlayer) {
             let maxEval = -Infinity;
             for (const move of validMoves) {
                 const nextBoard = simulateMove(boardState, move, currentPlayer);
                 maxEval = Math.max(maxEval, minimax(nextBoard, depth - 1, false, aiPlayer));
             } return maxEval;
         } else { // Minimizing Player
             let minEval = Infinity;
             for (const move of validMoves) {
                 const nextBoard = simulateMove(boardState, move, currentPlayer);
                 minEval = Math.min(minEval, minimax(nextBoard, depth - 1, true, aiPlayer));
             } return minEval;
         }
    }
    function isGameOverState(boardState, player1, player2) {
        return getValidMoves(player1, boardState).length === 0 && getValidMoves(player2, boardState).length === 0;
    }

    // --- Theme Management ---
    function initTheme() {
        // Always use dark mode
        document.body.classList.add('dark-mode');
        localStorage.setItem('reversiTheme', 'dark');
    }

        // Theme toggle removed - always using dark mode

    // --- Game Setup and Controls ---
    function updateGameSettings() {
        // Game mode is set by which button was clicked
        // Difficulty is read from the select dropdown
        difficultyLevel = parseInt(difficultySelect.value, 10) || DIFFICULTIES.EASY;
        
        if (gameMode === 'pvc') {
            humanPlayer = BLACK; computerPlayer = WHITE;
        }
        // console.log(`Settings Read - Mode: ${gameMode}, Difficulty: ${difficultyLevel}`); // Debug log
    }

    function startGame() {
        try {
            // console.log("startGame: Starting game initialization..."); // Debug log
            updateGameSettings();
            initializeBoard();
            currentPlayer = BLACK;
            gameOver = false;
            passCounter = 0;
            isComputerTurn = false;
            clearMessage();
            createBoardUI();
            renderBoard(); // This now handles initial highlight
            // console.log(`startGame: Game setup complete. Mode: ${gameMode}. Current Player: ${currentPlayer}`); // Debug log
            document.body.classList.remove('computer-thinking');

            // Initial computer move if computer is Black (not default)
            if (gameMode === 'pvc' && currentPlayer === computerPlayer) {
               // console.log("startGame: Triggering initial computer turn."); // Debug log
               isComputerTurn = true;
               document.body.classList.add('computer-thinking');
               showMessage("Computer is thinking...");
               setTimeout(computerTurn, 500);
            }
        } catch (error) {
            console.error("FATAL ERROR during startGame:", error);
            showMessage("Error starting game. Check console.");
        }
    }

    // --- Event Listeners ---
    // Mode selection buttons
    pvpButton.addEventListener('click', () => {
        // console.log("2 Players mode selected."); // Debug log
        gameMode = 'pvp';
        pvpButton.classList.add('selected');
        pvcButton.classList.remove('selected');
        showScreen(gameContainer);
        startGame();
    });

    pvcButton.addEventListener('click', (event) => {
        // Skip if the click was on the difficulty dropdown
        if (event.target === difficultySelect || difficultySelect.contains(event.target)) {
            return;
        }
        
        // console.log("1 Player mode selected."); // Debug log
        gameMode = 'pvc';
        pvcButton.classList.add('selected');
        pvpButton.classList.remove('selected');
        showScreen(gameContainer);
        startGame();
    });
    
    // Add specific event listeners for the difficulty dropdown
    difficultySelect.addEventListener('click', (event) => {
        // Stop the event from bubbling up to the parent button
        event.stopPropagation();
    });
    
    difficultySelect.addEventListener('change', (event) => {
        // Stop propagation and update the difficulty level
        event.stopPropagation();
        difficultyLevel = parseInt(difficultySelect.value, 10) || DIFFICULTIES.EASY;
        // console.log(`Difficulty changed to: ${difficultyLevel}`);
    });

    restartButton.addEventListener('click', () => {
        // console.log("Restart (New Game) button clicked."); // Debug log
        showScreen(startScreen);
        gameOver = true; // Ensure any ongoing game logic stops
    });

    // Set initial selection state
    pvpButton.classList.add('selected');
    
    // Difficulty dropdown doesn't need a change listener as we read its value when starting the game

    // --- Initial Page Load Setup ---
    // console.log("Page loaded. Setting up initial screen."); // Debug log
    initTheme(); // Initialize theme based on saved preference
    updateGameSettings(); // Read defaults & set initial difficulty visibility
    showScreen(startScreen); // Show the start screen first
});