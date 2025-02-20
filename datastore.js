const uuid4 = require("uuid4");

// datastore.js
const sessions = new Map(); // Store all session data in memory

function generateSessionCode() {
    const min = 100000;
    const max = 999999;

    let sessionCode;

    // Keep generating a new code until it is unique
    do {
        sessionCode = (Math.floor(Math.random() * (max - min + 1)) + min).toString();
    } while (isValidSessionCode(sessionCode));

    return sessionCode;
}

function isValidSessionCode(code) {
    return sessions.has(code);
}

// Method to add a session
function createSession(initialData) {
    try {
        let sessionCode = generateSessionCode();
        let initialCoins = parseInt(initialData.initialCoins);
        if (initialCoins < 100 || initialCoins > 1000) throw new Error();

        sessions.set(sessionCode, {
            players: [],
            initialCoins,
            potValue: 0
        });
        return sessionCode;
    } catch (err) {
        throw new Error("Invalid initial coin value");
    }
}

// Method to get a session by its code
function getSession(sessionCode) {
    return sessions.get(sessionCode);
}

// Method to update a session (e.g., update player data, bets, etc.)
function updateSession(sessionCode, session) {
    if (sessions.has(sessionCode)) {
        if (session.players) session.players.sort((playerA, playerB) => playerA.coins - playerB.coins);
        sessions.set(sessionCode, session);
    }
}

// Method to remove a session (if needed)
function removeSession(sessionCode) {
    sessions.delete(sessionCode);
}

// Method to get all sessions (optional)
function getAllSessions() {
    return Array.from(sessions.values());
}

function addPlayer(sessionCode, playerName) {
    try {
        if (!isValidSessionCode(sessionCode)) {
            throw new Error("Invalid session code");
        }

        // Retrieve the session
        let currentSession = sessions.get(sessionCode);

        // Ensure playerName is valid
        if (!playerName) {
            throw new Error("Player name cannot be empty");
        }

        // Check for duplicate player names
        let existingPlayers = currentSession.players.filter(
            (player) => player.name === playerName
        ).length;

        if (existingPlayers > 0) {
            playerName = `${playerName} ${existingPlayers + 1}`;
        }

        // Create new player object
        let player = {
            id: uuid4(),
            name: playerName,
            coins: currentSession.initialCoins,
            currentBet: 0,
            canBet: true
        };

        // Add the player to the session
        currentSession.players.push(player);
        return player.id;
    } catch (error) {
        console.error("Error adding player:", error.message);
        throw new Error(
            error.message || "An error occurred while adding the player."
        );
    }
}

// Export the methods for usage in other files
module.exports = {
    createSession,
    isValidSessionCode,
    addPlayer,
    getSession,
    updateSession,
    removeSession,
    getAllSessions,
};
