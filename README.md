# Reversi Game

A modern implementation of the classic Reversi (Othello) board game with a sleek dark theme, responsive design, and online multiplayer functionality.

## Features

- **Three Game Modes**:
  - Play against AI with adjustable difficulty
  - Play locally against another player
  - Play online against friends with real-time multiplayer
- **AI Difficulty Levels**: Choose from Very Easy to Hard difficulty
- **Dark Theme**: Sleek dark interface with smooth animations and gradient effects
- **Responsive Design**: Works well on different screen sizes from desktop to mobile
- **Score Tracking**: Real-time score display for both players
- **Turn Indicator**: Clear visual indication of whose turn it is
- **Sound Effects**: Toggle-able game sounds for piece placement, turn changes, and game over
- **Modern UI**: Attractive game mode selection with visual indicators
- **Animations**: Smooth transitions and hover effects for better user experience
- **Friend Invite**: Share a game link directly with friends to join your online game
- **Real-time Multiplayer**: Play against friends remotely with Socket.IO integration

## How to Play

### Local Play
1. Select game mode (1 Player vs AI or 2 Players local)
2. For 1 Player mode, choose AI difficulty level
3. Click on valid cells (highlighted) to place your pieces
4. The game ends when no more moves are possible
5. Player with the most pieces wins

### Online Multiplayer
1. Select "Online" game mode
2. Enter your name
3. Create a new game or join an existing game with a Game ID
4. Share the Game ID or link with a friend to invite them
5. Play against your friend in real-time

## Installation and Running

### Local Play Only
No installation required - just open `index.html` in any modern browser.

### Online Multiplayer
1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the server:
   ```
   npm start
   ```
4. Open `http://localhost:3000` in your browser

### Development Mode
Run the server with automatic restart on file changes:
```
npm run dev
```

## Project Structure

- `index.html` - Main HTML file
- `style.css` - Styling for the game
- `script.js` - Game logic and AI implementation
- `server.js` - Socket.IO server for online multiplayer
- `fonts.css` - Custom font styling
- `audio/` - Sound effect files
  - `place-piece.mp3` - Sound when placing a piece
  - `turn-change.mp3` - Sound when turn changes
  - `game-over.mp3` - Sound when game ends

## Technologies Used

- Frontend: HTML5, CSS3, Vanilla JavaScript
- Backend: Node.js, Express
- Real-time Communication: Socket.IO

## Credits

Created using JavaScript, HTML5, CSS3, Node.js, and Socket.IO.