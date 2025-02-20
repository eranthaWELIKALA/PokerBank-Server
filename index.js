// index.js
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const pokerRoutes = require("./routes/poker");
const cors = require("cors");

const dotenv = require("dotenv");
dotenv.config();

// Import datastore methods
const { getSession, updateSession } = require("./datastore");

const app = express();

const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

app.use(cors());
app.use(express.json());
app.use("/api", pokerRoutes);

io.on("connection", (socket) => {
    console.log(`A user connected: ${socket.id}`);

    socket.on("board-loaded", ({ sessionCode }) => {
        socket.join(sessionCode);
        try {
            const session = getSession(sessionCode);
            io.to(sessionCode).emit("board-updated", {
                players: session.players,
                potValue: session.potValue,
            });
        } catch (error) {
            console.error(error);
        }
    });

    socket.on("bet", (data, callback) => {
        const { sessionCode, playerId, amount } = data;

        // Access session data using getSession method from datastore
        const session = getSession(sessionCode);

        if (!session) {
            socket.emit("error", { message: "Session not found" });
            return;
        }

        // Find player and update bet
        const player = session.players.find((p) => p.id === playerId);
        if (!player) {
            socket.emit("error", { message: "Player not found in session" });
            return;
        }

        player.currentBet += amount;
        player.coins -= amount;
        session.potValue += amount;

        // Update session using updateSession method from datastore
        updateSession(sessionCode, session);

        // Emit bet update to all clients
        io.to(sessionCode).emit("board-updated", {
            players: session.players,
            potValue: session.potValue,
        });

        callback(player);

        console.log(`Session ${sessionCode}: Player ${player.name} placed a bet of ${amount}`);
    });

    socket.on("fold", (data, callback) => {
        const { sessionCode, playerId } = data;

        // Access session data using getSession method from datastore
        const session = getSession(sessionCode);

        if (!session) {
            socket.emit("error", { message: "Session not found" });
            return;
        }

        // Find player and update bet
        const player = session.players.find((p) => p.id === playerId);
        if (!player) {
            socket.emit("error", { message: "Player not found in session" });
            return;
        }

        player.canBet = false;

        let remainingPlayers = session.players.filter((p) => p.canBet);
        if (remainingPlayers && remainingPlayers.length == 1) {
            let remainingPlayer = session.players.find((p) => p.canBet);
            remainingPlayer.coins += session.potValue;
            session.potValue = 0;
            session.players.map((p) => {
                p.canBet = true;
                p.currentBet = 0;
                return p;
            });
        }

        // Update session using updateSession method from datastore
        updateSession(sessionCode, session);

        callback(player);

        // Emit bet update to all clients
        io.to(sessionCode).emit("board-updated", {
            players: session.players,
            potValue: session.potValue,
        });

        console.log(`Session ${sessionCode}: Player ${player.name} folded the hand`);
    });

    socket.on("withdraw", (data) => {
        const { sessionCode, playerId, amount } = data;

        // Access session data using getSession method from datastore
        const session = getSession(sessionCode);

        if (!session) {
            socket.emit("error", { message: "Session not found" });
            return;
        }

        // Find player and update bet
        const player = session.players.find((p) => p.id === playerId);
        if (!player) {
            socket.emit("error", { message: "Player not found in session" });
            return;
        }

        if (amount <= session.potValue) {
            player.coins += amount;
            session.potValue -= amount;
            console.log(`Session ${sessionCode}: Player ${player.name} withdrew ${amount}`);
        }

        if (session.potValue == 0) {
            session.players.map((p) => {
                p.canBet = true;
                p.currentBet = 0;
                return p;
            });
            console.log(`Session ${sessionCode}: Pot is cleared`);
        } else {
            let remainingPlayers = session.players.filter((p) => p.canBet);
            if (remainingPlayers && remainingPlayers.length == 1) {
                let remainingPlayer = session.players.find((p) => p.canBet);
                let remainingPotValue = session.potValue;
                remainingPlayer.coins += remainingPotValue;
                session.potValue = 0;
                session.players.map((p) => {
                    p.canBet = true;
                    p.currentBet = 0;
                    return p;
                });
                console.log(`Session ${sessionCode}: Player ${remainingPlayer.name} withdrew ${remainingPotValue}`);
                console.log(`Session ${sessionCode}: Pot is cleared`);
            }
        }

        // Update session using updateSession method from datastore
        updateSession(sessionCode, session);

        // Emit bet update to all clients
        io.to(sessionCode).emit("board-updated", {
            players: session.players,
            potValue: session.potValue,
        });
    });

    socket.on("disconnect", () => {
        console.log("A user disconnected");
    });
});

server.listen(process.env.PORT || 5000, () => {
    console.log(`Server running on port ${process.env.PORT || 5000}`);
});
