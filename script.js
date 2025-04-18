document.addEventListener('DOMContentLoaded', () => {
    // --- URL Parameter Handling ---
    function getUrlParams() {
        const params = {};
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        
        // Check for join parameter
        if (urlParams.has('join')) {
            params.join = urlParams.get('join');
        }
        
        // Check for error parameter
        if (urlParams.has('error')) {
            params.error = urlParams.get('error');
        }
        
        return params;
    }
    
    // Process URL parameters
    const urlParams = getUrlParams();
    
    // Handle error parameter
    if (urlParams.error) {
        if (urlParams.error === 'gamenotfound') {
            alert('Game not found. The game may have ended or never existed.');
        }
    }
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
    const onlineButton = document.getElementById('online-button');
    const difficultySelect = document.getElementById('difficulty-select');
    // Online multiplayer elements
    const createGameButton = document.getElementById('create-game-button');
    const joinGameButton = document.getElementById('join-game-button');
    const gameIdInput = document.getElementById('game-id-input');
    const playerNameInput = document.getElementById('player-name-input');
    const gameIdDisplay = document.getElementById('game-id-display');
    const playerColorDisplay = document.getElementById('player-color');
    const opponentNameDisplay = document.getElementById('opponent-name');
    const onlineInfoContainer = document.getElementById('online-info');
    const waitingMessage = document.getElementById('waiting-message');
    const shareLinkButton = document.getElementById('share-link-button');
    const linkCopiedMessage = document.getElementById('link-copied-message');
    // Theme toggle elements removed - always using dark mode
    
    // --- Sound Elements ---
    const soundToggleBtn = document.getElementById('sound-toggle');
    const placePieceSound = new Audio('audio/place-piece.mp3');
    const turnChangeSound = new Audio('audio/turn-change.mp3');
    const gameOverSound = new Audio('audio/game-over.mp3');

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
    let soundEnabled = localStorage.getItem('reversiSoundEnabled') !== 'false'; // Default to true
    
    // --- Multiplayer Variables ---
    let isOnlineGame = false;
    let socket = null;
    let gameId = null;
    let playerColor = null;
    let opponentName = null;
    let isMyTurn = false;
    let waitingForOpponent = false;
    let opponentInfoElement = null;

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
        if (isOnlineGame) {
            turnText = isMyTurn ? 'Your Turn' : "Opponent's Turn";
        } else if (gameMode === 'pvc') {
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
        playSound(placePieceSound); // Play sound when piece is placed
        return true;
    }

    function switchPlayer() {
        currentPlayer = (currentPlayer === BLACK ? WHITE : BLACK);
    }

    // --- Game Flow and Turn Management ---
    function handleCellClick(event) {
        if (gameOver || isComputerTurn || (isOnlineGame && !isMyTurn)) return;
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
        
        if (isOnlineGame) {
            // Send move to server
            socket.emit('makeMove', {
                gameId: gameId,
                row: row,
                col: col,
                playerColor: playerColor
            });
        } else {
            // Local game
            if (placePiece(row, col)) { processTurnEnd(); }
        }
    }

    function processTurnEnd() {
        renderBoard(); // Show result of the move
        switchPlayer(); // Switch to the next player
        playSound(turnChangeSound); // Play sound when turn changes

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
        
        // Play game over sound
        playSound(gameOverSound);
        
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

    // --- Theme and Sound Management ---
    function initTheme() {
        // Always use dark mode
        document.body.classList.add('dark-mode');
        localStorage.setItem('reversiTheme', 'dark');
    }
    
    function toggleSound() {
        soundEnabled = !soundEnabled;
        localStorage.setItem('reversiSoundEnabled', soundEnabled);
        updateSoundToggleIcon();
    }
    
    function updateSoundToggleIcon() {
        if (soundToggleBtn) {
            soundToggleBtn.innerHTML = soundEnabled ? 
                '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>' : 
                '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>';
            soundToggleBtn.setAttribute('aria-label', soundEnabled ? 'Sound On' : 'Sound Off');
            soundToggleBtn.setAttribute('title', soundEnabled ? 'Sound On' : 'Sound Off');
        }
    }
    
    function playSound(sound) {
        if (soundEnabled && sound) {
            // Reset the sound to the beginning if it's already playing
            sound.pause();
            sound.currentTime = 0;
            sound.play().catch(error => {
                console.error("Error playing sound:", error);
                // Don't show error to user as sound is not critical
            });
        }
    }

        // --- Sound Management ---
    function toggleSound() {
        soundEnabled = !soundEnabled;
        localStorage.setItem('reversiSoundEnabled', soundEnabled);
        updateSoundToggleIcon();
    }

    function updateSoundToggleIcon() {
        if (!soundToggleBtn) return;
        
        // Update the icon based on sound state
        if (soundEnabled) {
            soundToggleBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
            soundToggleBtn.setAttribute('aria-label', 'Sound On');
            soundToggleBtn.setAttribute('title', 'Sound On');
        } else {
            soundToggleBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>';
            soundToggleBtn.setAttribute('aria-label', 'Sound Off');
            soundToggleBtn.setAttribute('title', 'Sound Off');
        }
    }

    // playSound function is already defined above

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
            
            // Handle online game specifics
            if (isOnlineGame) {
                // Show online info container
                onlineInfoContainer.style.display = 'block';
                
                // Set current player based on player color
                if (playerColor === 'BLACK') {
                    currentPlayer = BLACK;
                    isMyTurn = true;
                } else {
                    currentPlayer = WHITE;
                    isMyTurn = false;
                }
            } else {
                // Hide online info for local games
                onlineInfoContainer.style.display = 'none';
            }
            
            renderBoard(); // This now handles initial highlight
            // console.log(`startGame: Game setup complete. Mode: ${gameMode}. Current Player: ${currentPlayer}`); // Debug log
            document.body.classList.remove('computer-thinking');

            // Initial computer move if computer is Black (not default)
            if (!isOnlineGame && gameMode === 'pvc' && currentPlayer === computerPlayer) {
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
        isOnlineGame = false;
        pvpButton.classList.add('selected');
        pvcButton.classList.remove('selected');
        onlineButton.classList.remove('selected');
        showScreen(gameContainer);
        startGame();
    });
    
    // Share link button event listener
    shareLinkButton.addEventListener('click', () => {
        if (gameId) {
            const shareUrl = `${window.location.origin}/join/${gameId}`;
            navigator.clipboard.writeText(shareUrl)
                .then(() => {
                    // Show copied message
                    linkCopiedMessage.style.display = 'block';
                    setTimeout(() => {
                        linkCopiedMessage.style.display = 'none';
                    }, 3000);
                })
                .catch(err => {
                    console.error('Failed to copy link: ', err);
                    alert('Failed to copy link. Please copy this URL manually: ' + shareUrl);
                });
        }
    });
    
    // Check if we should auto-join a game from URL parameter
    if (urlParams.join) {
        const gameIdToJoin = urlParams.join;
        // Show the online options first
        onlineButton.click();
        // Auto-fill the game ID input
        gameIdInput.value = gameIdToJoin;
        // Focus on the player name input
        playerNameInput.focus();
    }
    
    // Online multiplayer button
    onlineButton.addEventListener('click', (event) => {
        // Don't trigger if clicking on child elements
        if (event.target !== onlineButton && !onlineButton.contains(event.target)) {
            return;
        }
        
        onlineButton.classList.add('selected');
        pvpButton.classList.remove('selected');
        pvcButton.classList.remove('selected');
    });
    
    // Create online game
    createGameButton.addEventListener('click', () => {
        const playerName = playerNameInput.value.trim() || 'Player 1';
        createOnlineGame(playerName);
    });
    
    // Join online game
    joinGameButton.addEventListener('click', () => {
        const gameId = gameIdInput.value.trim().toUpperCase();
        const playerName = playerNameInput.value.trim() || 'Player 2';
        
        if (!gameId) {
            alert('Please enter a valid Game ID');
            return;
        }
        
        joinOnlineGame(gameId, playerName);
    });
    
    // Sound toggle button
    if (soundToggleBtn) {
        soundToggleBtn.addEventListener('click', toggleSound);
    }

    pvcButton.addEventListener('click', (event) => {
        // Skip if the click was on the difficulty dropdown
        if (event.target === difficultySelect || difficultySelect.contains(event.target)) {
            return;
        }
        
        // console.log("1 Player mode selected."); // Debug log
        gameMode = 'pvc';
        isOnlineGame = false;
        pvcButton.classList.add('selected');
        pvpButton.classList.remove('selected');
        onlineButton.classList.remove('selected');
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
        
        // Reset online game state if applicable
        if (isOnlineGame) {
            isOnlineGame = false;
            gameId = null;
            playerColor = null;
            opponentName = null;
            isMyTurn = false;
            
            // Reset join button if we're returning from a game
            if (joinGameButton) {
                joinGameButton.disabled = false;
                joinGameButton.textContent = 'Join Game';
            }
            
            // Clear opponent info
            if (opponentInfoElement) {
                opponentInfoElement.textContent = '';
            }
            
            // Disconnect from socket if connected
            if (socket && socket.connected) {
                socket.disconnect();
            }
        }

    // Set initial selection state
    pvpButton.classList.add('selected');
    
    // Difficulty dropdown doesn't need a change listener as we read its value when starting the game

    // --- Online Multiplayer Functions ---
    function initSocketConnection() {
        // Connect to the server
        socket = io();
        
        // Socket event handlers
        socket.on('connect', () => {
            console.log('Connected to server');
        });
        
        socket.on('error', (data) => {
            alert(data.message);
            if (waitingForOpponent) {
                waitingForOpponent = false;
                waitingMessage.style.display = 'none';
            }
        });
        
        socket.on('gameCreated', (data) => {
            // Game created successfully
            gameId = data.gameId;
            playerColor = data.playerColor;
            isMyTurn = playerColor === 'BLACK'; // Black goes first
            waitingForOpponent = true;
            
            // Update UI
            gameIdDisplay.textContent = gameId;
            playerColorDisplay.textContent = playerColor;
            waitingMessage.style.display = 'block';
            onlineInfoContainer.style.display = 'block';
            
            // Start the game
            showScreen(gameContainer);
            startGame();
        });
        
        socket.on('gameJoined', (data) => {
            // Successfully joined a game
            gameId = data.gameId;
            playerColor = data.playerColor;
            opponentName = data.opponentName;
            isMyTurn = playerColor === 'BLACK'; // Black goes first
            
            // Update UI
            gameIdDisplay.textContent = gameId;
            playerColorDisplay.textContent = playerColor;
            opponentNameDisplay.textContent = opponentName;
            onlineInfoContainer.style.display = 'block';
            
            // Start the game
            showScreen(gameContainer);
            startGame();
            
            // Disable the join button
            joinGameButton.disabled = true;
            joinGameButton.textContent = 'Game Joined';
        });
        
        socket.on('opponentJoined', (data) => {
            // Opponent joined our game
            opponentName = data.opponentName;
            waitingForOpponent = false;
            
            // Update UI
            opponentNameDisplay.textContent = opponentName;
            waitingMessage.style.display = 'none';
            
            // Show message
            showMessage(`${opponentName} joined the game!`);
            setTimeout(clearMessage, 3000);
        });
        
        socket.on('moveMade', (data) => {
            // Process move from either player
            const { row, col, playerColor: moveColor, board: serverBoard, currentTurn } = data;
            
            // Update the local board to match server state
            updateBoardFromServer(serverBoard);
            
            // Update turn
            isMyTurn = currentTurn === playerColor;
            
            // Play sound
            playSound(placePieceSound);
            
            // Render the updated board
            renderBoard();
            
            // Play turn change sound if it's now our turn
            if (isMyTurn) {
                playSound(turnChangeSound);
            }
        });
        
        socket.on('playerPassed', (data) => {
            // A player had to pass their turn
            const { playerColor: passedColor, nextTurn } = data;
            
            // Update the local board to match server state
            updateBoardFromServer(data.board);
            
            // Update turn
            isMyTurn = nextTurn === playerColor;
            
            // Show message
            const passedPlayer = passedColor === playerColor ? 'You have' : 'Opponent has';
            showMessage(`${passedPlayer} no valid moves. Turn passes.`);
            
            // Render the updated board
            renderBoard();
            
            // Play turn change sound if it's now our turn
            if (isMyTurn) {
                playSound(turnChangeSound);
            }
        });
        
        socket.on('gameOver', (data) => {
            // Game is over
            gameOver = true;
            
            // Update the local board to match server state
            updateBoardFromServer(data.board);
            
            // Determine winner message
            let winnerMessage;
            let resultClass = 'game-over';
            
            if (data.winner === playerColor) {
                winnerMessage = `Game Over! You win ${data.scores[playerColor]} to ${data.scores[playerColor === 'BLACK' ? 'WHITE' : 'BLACK']}!`;
                resultClass += ' win';
            } else if (data.winner === 'DRAW') {
                winnerMessage = `Game Over! It's a draw ${data.scores.BLACK} to ${data.scores.WHITE}!`;
                resultClass += ' draw';
            } else {
                winnerMessage = `Game Over! Opponent wins ${data.scores[playerColor === 'BLACK' ? 'WHITE' : 'BLACK']} to ${data.scores[playerColor]}!`;
                resultClass += ' lose';
            }
            
            // Play game over sound
            playSound(gameOverSound);
            
            // Show message
            showMessage(winnerMessage);
            messageAreaElement.className = 'message';
            messageAreaElement.classList.add(...resultClass.split(' '));
            
            // Render the final board
            renderBoard();
        });
        
        socket.on('opponentLeft', (data) => {
            // Opponent disconnected
            showMessage(`${data.opponentName || 'Opponent'} left the game.`);
            messageAreaElement.className = 'message game-over';
            
            // End the game
            gameOver = true;
            
            // Disable further interaction
            boardElement.querySelectorAll('.cell').forEach(cell => {
                cell.removeEventListener('click', handleCellClick);
            });
        });
        
        socket.on('disconnect', () => {
            console.log('Disconnected from server');
            
            if (isOnlineGame && !gameOver) {
                showMessage('Disconnected from server. Please refresh the page.');
                messageAreaElement.className = 'message game-over';
                gameOver = true;
            }
        });
    }
    
    function createOnlineGame(playerName) {
        if (!socket) {
            initSocketConnection();
        }
        
        // Set game mode to online
        gameMode = 'online';
        isOnlineGame = true;
        
        // Send create game request to server
        socket.emit('createGame', playerName);
    }
    
    function joinOnlineGame(gameId, playerName) {
        if (!socket) {
            initSocketConnection();
        }
        
        // Set game mode to online
        gameMode = 'online';
        isOnlineGame = true;
        
        // Send join game request to server
        socket.emit('joinGame', { gameId, playerName });
    }
    
    function updateBoardFromServer(serverBoard) {
        // Convert server board format to local format
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (serverBoard[r][c] === 'BLACK') {
                    board[r][c] = BLACK;
                } else if (serverBoard[r][c] === 'WHITE') {
                    board[r][c] = WHITE;
                } else {
                    board[r][c] = EMPTY;
                }
            }
        }
    }
    
    // --- Initial Page Load Setup ---
    // console.log("Page loaded. Setting up initial screen."); // Debug log
    initTheme(); // Initialize theme based on saved preference
    updateSoundToggleIcon(); // Initialize sound toggle icon based on saved preference
    updateGameSettings(); // Read defaults & set initial difficulty visibility
    showScreen(startScreen); // Show the start screen first
    // Close the restart button event listener
    });
});
