// routes/poker.js
const express = require("express");
const { createSession, getSession, addPlayer } = require("../datastore"); // Import datastore methods
const router = express.Router();

// Example endpoint to create a session
router.post("/start-session", (req, res) => {
    const { initialCoins } = req.body;
    try {
        // Store the session in memory
        let sessionCode = createSession({ initialCoins });

        res.json({ sessionCode });
    } catch (error) {
        res.sendStatus(500);
    }
});

// Example endpoint to get session info
router.get("/session/:code", (req, res) => {
    const { code } = req.params;

    const session = getSession(code);
    if (!session) {
        return res.status(404).json({ error: "Session not found" });
    }

    res.json(session);
});

// Example endpoint to update session (e.g., add players or update bets)
router.post("/join-session", (req, res) => {
    try {
        const { sessionCode, playerName } = req.body;
        let playerId = addPlayer(sessionCode, playerName);
        res.json({ success: true, playerId });
    } catch (error) {
        if (error.message == "Invalid session code") return res.sendStatus(404);
        return res.sendStatus(500);
    }
});

module.exports = router;
