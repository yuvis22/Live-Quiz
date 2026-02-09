
const { io } = require("socket.io-client");

// Configuration
const TARGET_URL = "https://live-quiz-1-zdt5.onrender.com"; 
const TOTAL_CLIENTS = 2000;    
const ROOM_COUNT = 50;         
const PLAYERS_PER_ROOM = Math.floor(TOTAL_CLIENTS / ROOM_COUNT);
const SPAWN_INTERVAL_MS = 20;  

// WE NEED A VALID QUIZ ID FROM YOUR DATABASE for this to work
const VALID_QUIZ_ID = "6989a5e20ceec6cae8e1dd82"; // REPLACE WITH A REAL ID FROM YOUR DB

console.log(`🚀 Starting Load Test on ${TARGET_URL}`);
console.log(`🎯 Simulating ${TOTAL_CLIENTS} players across ${ROOM_COUNT} rooms`);

// Stats
let connected = 0;
let activeRooms = 0;
let votesCast = 0;
let failed = 0;

async function start() {
    for (let i = 0; i < ROOM_COUNT; i++) {
        spawnRoom(i);
        await new Promise(r => setTimeout(r, 200)); 
    }
}

function spawnRoom(roomIndex) {
    const hostSocket = io(TARGET_URL, { 
        transports: ["websocket"],
        forceNew: true 
    });

    hostSocket.on("connect", () => {
        // console.log(`✅ Host ${roomIndex} connected`);
        
        // 1. Create Room
        hostSocket.emit("CREATE_ROOM", { 
            quizId: VALID_QUIZ_ID, 
            userId: `host-${roomIndex}` 
        }, (response) => {
            if (response.success) {
                activeRooms++;
                const roomId = response.roomId;
                // console.log(`🏠 Room ${roomId} created`);
                
                // 2. Spawn players for this room
                spawnPlayersForRoom(roomId, PLAYERS_PER_ROOM);

                // 3. START GAME LOOP (Start Q1 after 5s)
                setTimeout(() => {
                    hostSocket.emit("START_QUESTION", { roomId });
                }, 5000);
            } else {
                console.error(`❌ Failed to create room: ${response.error}`);
            }
        });
    });

    hostSocket.on("connect_error", () => {
        failed++;
        logStats();
    });
}

function spawnPlayersForRoom(roomId, count) {
    let spawned = 0;
    const interval = setInterval(() => {
        if (spawned >= count) {
            clearInterval(interval);
            return;
        }
        spawnPlayer(roomId, spawned++);
    }, SPAWN_INTERVAL_MS);
}

function spawnPlayer(roomId, playerId) {
    const socket = io(TARGET_URL, {
        forceNew: true,
        reconnection: false,
        transports: ["websocket"]
    });

    socket.on("connect", () => {
        connected++;
        logStats();
        
        // 1. Join Room
        socket.emit("JOIN_ROOM", { roomId, username: `Bot-${playerId}` });
    });

    // 2. Listen for Question -> VOTE
    socket.on("NEW_QUESTION", (data) => {
         // Vote after random 1-10s delay
         const delay = Math.random() * 10000;
         setTimeout(() => {
            const randomOption = data.options[0].id; // Just pick first option
            socket.emit("SUBMIT_VOTE", { roomId, optionId: randomOption });
            votesCast++;
            logStats();
         }, delay);
    });

    socket.on("connect_error", () => {
        failed++;
        logStats();
    });

    socket.on("disconnect", () => {
        connected--;
        logStats();
    });
}

function logStats() {
    process.stdout.write(`\r🔌 Users: ${connected} | 🏠 Rooms: ${activeRooms} | 🗳️ Votes: ${votesCast} | ❌ Failed: ${failed}`);
}

start();

setInterval(() => {}, 10000);
