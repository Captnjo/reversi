const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from the current directory
app.use(express.static(path.join(__dirname, '/')));

// Route for joining a game via URL
app.get('/join/:gameId', (req, res) => {
    const gameId = req.params.gameId;
    // Check if the game exists
    if (!gameRooms[gameId]) {
        // Game not found, redirect to home with error parameter
        return res.redirect('/?error=gamenotfound');
    }
    // Game exists, redirect to home with gameId parameter
    res.redirect(`/?join=${gameId}`);
});

// Game rooms storage
const gameRooms = {};

// Generate a random 6-character game ID
function generateGameId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    
    // Create a new game room
    socket.on('createGame', (playerName) => {
        const gameId = generateGameId();
        const player = {
            id: socket.id,
            name: playerName || 'Player 1',
            color: 'BLACK' // Creator is always black
        };
        
        // Create the game room
        gameRooms[gameId] = {
            id: gameId,
            players: [player],
            currentTurn: 'BLACK',
            board: initializeBoard(),
            gameOver: false
        };
        
        // Join the socket to the game room
        socket.join(gameId);
        
        // Send game created confirmation
        socket.emit('gameCreated', {
            gameId: gameId,
            playerColor: 'BLACK',
            playerName: player.name
        });
        
        console.log(`Game created: ${gameId} by ${player.name}`);
    });
    
    // Join an existing game
    socket.on('joinGame', (data) => {
        const { gameId, playerName } = data;
        
        // Check if game exists
        if (!gameRooms[gameId]) {
            socket.emit('error', { message: 'Game not found' });
            return;
        }
        
        // Check if game is already full
        if (gameRooms[gameId].players.length >= 2) {
            socket.emit('error', { message: 'Game is full' });
            return;
        }
        
        // Add player to the game
        const player = {
            id: socket.id,
            name: playerName || 'Player 2',
            color: 'WHITE' // Joiner is always white
        };
        
        gameRooms[gameId].players.push(player);
        
        // Join the socket to the game room
        socket.join(gameId);
        
        // Send game joined confirmation to the joining player
        socket.emit('gameJoined', {
            gameId: gameId,
            playerColor: 'WHITE',
            opponentName: gameRooms[gameId].players[0].name,
            board: gameRooms[gameId].board
        });
        
        // Notify the first player that someone joined
        socket.to(gameId).emit('opponentJoined', {
            opponentName: player.name,
            board: gameRooms[gameId].board
        });
        
        console.log(`Player ${player.name} joined game: ${gameId}`);
    });
    
    // Handle a player's move
    socket.on('makeMove', (data) => {
        const { gameId, row, col, playerColor } = data;
        
        // Validate the game exists
        if (!gameRooms[gameId]) {
            socket.emit('error', { message: 'Game not found' });
            return;
        }
        
        const game = gameRooms[gameId];
        
        // Validate it's the player's turn
        if (game.currentTurn !== playerColor) {
            socket.emit('error', { message: 'Not your turn' });
            return;
        }
        
        // Apply the move to the game board
        const moveResult = applyMove(game.board, row, col, playerColor);
        if (!moveResult.valid) {
            socket.emit('error', { message: 'Invalid move' });
            return;
        }
        
        // Update the game state
        game.board = moveResult.board;
        game.currentTurn = playerColor === 'BLACK' ? 'WHITE' : 'BLACK';
        
        // Check if the next player has valid moves
        const nextPlayerHasMoves = hasValidMoves(game.board, game.currentTurn);
        
        // If next player has no moves, check if game is over
        if (!nextPlayerHasMoves) {
            const otherPlayerHasMoves = hasValidMoves(game.board, playerColor);
            
            if (!otherPlayerHasMoves) {
                // Game is over - neither player can move
                game.gameOver = true;
                const scores = getScores(game.board);
                
                // Broadcast game over to both players
                io.to(gameId).emit('gameOver', {
                    board: game.board,
                    scores: scores,
                    winner: scores.BLACK > scores.WHITE ? 'BLACK' : 
                            scores.WHITE > scores.BLACK ? 'WHITE' : 'DRAW'
                });
            } else {
                // Current player must pass - switch back to them
                game.currentTurn = playerColor;
                
                // Broadcast pass notification
                io.to(gameId).emit('playerPassed', {
                    playerColor: game.currentTurn === 'BLACK' ? 'WHITE' : 'BLACK',
                    nextTurn: game.currentTurn,
                    board: game.board
                });
            }
        }
        
        // Broadcast the move to both players
        io.to(gameId).emit('moveMade', {
            row: row,
            col: col,
            playerColor: playerColor,
            board: game.board,
            currentTurn: game.currentTurn,
            scores: getScores(game.board)
        });
    });
    
    // Handle player disconnect
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        
        // Find games this player is in
        for (const gameId in gameRooms) {
            const game = gameRooms[gameId];
            const playerIndex = game.players.findIndex(p => p.id === socket.id);
            
            if (playerIndex !== -1) {
                // Notify the other player that this player left
                socket.to(gameId).emit('opponentLeft', {
                    opponentName: game.players[playerIndex].name
                });
                
                // Remove the game room
                delete gameRooms[gameId];
                console.log(`Game ${gameId} ended because player left`);
                break;
            }
        }
    });
});

// Initialize a new game board
function initializeBoard() {
    const board = Array(8).fill().map(() => Array(8).fill(0));
    // Set up the initial 4 pieces
    board[3][3] = 'WHITE';
    board[3][4] = 'BLACK';
    board[4][3] = 'BLACK';
    board[4][4] = 'WHITE';
    return board;
}

// Apply a move to the board and return the new board state
function applyMove(board, row, col, playerColor) {
    // Deep copy the board
    const newBoard = JSON.parse(JSON.stringify(board));
    
    // Check if the move is valid
    const flippedDiscs = getFlippableDiscs(newBoard, row, col, playerColor);
    if (flippedDiscs.length === 0) {
        return { valid: false, board: newBoard };
    }
    
    // Place the piece and flip the captured discs
    newBoard[row][col] = playerColor;
    flippedDiscs.forEach(disc => {
        newBoard[disc.row][disc.col] = playerColor;
    });
    
    return { valid: true, board: newBoard };
}

// Get all discs that would be flipped by a move
function getFlippableDiscs(board, row, col, playerColor) {
    if (board[row][col] !== 0) return []; // Cell already occupied
    
    const opponentColor = playerColor === 'BLACK' ? 'WHITE' : 'BLACK';
    const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1]
    ];
    
    const flippableDiscs = [];
    
    for (const [dx, dy] of directions) {
        let x = row + dx;
        let y = col + dy;
        const discsToFlip = [];
        
        // Look for opponent's discs
        while (x >= 0 && x < 8 && y >= 0 && y < 8 && board[x][y] === opponentColor) {
            discsToFlip.push({ row: x, col: y });
            x += dx;
            y += dy;
        }
        
        // If we found opponent's discs and then one of our own
        if (discsToFlip.length > 0 && x >= 0 && x < 8 && y >= 0 && y < 8 && board[x][y] === playerColor) {
            flippableDiscs.push(...discsToFlip);
        }
    }
    
    return flippableDiscs;
}

// Check if a player has any valid moves
function hasValidMoves(board, playerColor) {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (board[row][col] === 0) {
                const flippableDiscs = getFlippableDiscs(board, row, col, playerColor);
                if (flippableDiscs.length > 0) {
                    return true;
                }
            }
        }
    }
    return false;
}

// Get the current scores
function getScores(board) {
    let blackCount = 0;
    let whiteCount = 0;
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (board[row][col] === 'BLACK') blackCount++;
            else if (board[row][col] === 'WHITE') whiteCount++;
        }
    }
    
    return { BLACK: blackCount, WHITE: whiteCount };
}

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});