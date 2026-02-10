
const { io } = require("socket.io-client");

// Configuration
const TARGET_URL = "https://live-quiz-1-zdt5.onrender.com"; 
const TOTAL_CLIENTS = 500;    
const ROOM_COUNT = 50;         
const PLAYERS_PER_ROOM = Math.floor(TOTAL_CLIENTS / ROOM_COUNT);
const SPAWN_INTERVAL_MS = 20;  

// WE NEED A VALID QUIZ ID FROM YOUR DATABASE for this to work
const VALID_QUIZ_ID = "698ac1cbd13de8262a6418a5"; 

console.log(`🚀 Starting Load Test on ${TARGET_URL}`);
console.log(`🎯 Simulating ${TOTAL_CLIENTS} players across ${ROOM_COUNT} rooms`);

// Stats
let connected = 0;
let activeRooms = 0;
let votesCast = 0;
let failed = 0;
let quizCompleted = 0;

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

    let currentRoomId = null;

    hostSocket.on("connect", () => {
        // 1. Create Room
        hostSocket.emit("CREATE_ROOM", { 
            quizId: VALID_QUIZ_ID, 
            userId: `host-${roomIndex}` 
        }, (response) => {
            if (response.success) {
                activeRooms++;
                currentRoomId = response.roomId;
                
                // 2. Spawn players for this room
                spawnPlayersForRoom(currentRoomId, PLAYERS_PER_ROOM);

                // 3. START GAME LOOP (Start Q1 after 5s)
                setTimeout(() => {
                    hostSocket.emit("START_QUESTION", { roomId: currentRoomId });
                    console.log(`⏩ Room ${currentRoomId} starting Q1`);
                }, 5000);
            } else {
                console.error(`❌ Failed to create room: ${response.error}`);
            }
        });
    });

    hostSocket.on("NEW_QUESTION", (data) => {
        if (roomIndex === 0) console.log(`📢 Room ${currentRoomId} Question ${data.currentQuestionIndex}/${data.totalQuestions}`);
    });

    hostSocket.on("TICK", (timeLeft) => {
        if (roomIndex === 0) console.log(`⏳ Room ${currentRoomId} TICK: ${timeLeft}`);
    });

    // 4. Handle Question Ends -> Next Question
    hostSocket.on("QUESTION_ENDED", () => {
        // Wait 3s then start next question OR terminate
        console.log(`🏁 Room ${currentRoomId} Question finished`);
        
        // We need to know if this was the last question to terminate
        // Ideally the server should tell us, but for now we can rely on data.currentQuestionIndex from NEW_QUESTION
        // Let's just try to start next. If it fails or loops, we should handle "end of quiz"
        
        setTimeout(() => {
            if (currentRoomId) {
                // Try to start next question. 
                // If server logic prevents starting Q(MAX+1), we should probably emit TERMINATE here
                // But let's see if the server emits QUIZ_ENDED automatically? 
                // Looking at roomManager.ts, it DOES NOT automatically end quiz. Host must Terminate.
                
                // Hack: We don't track question index here easily without state. 
                // Let's assume after 10 questions we terminate? 
                // Better: The server implementation of startQuestion likely returns error or ignores if done.
                
                hostSocket.emit("START_QUESTION", { roomId: currentRoomId });
            }
        }, 3000);
    });

    // LISTENER FOR ERROR (e.g., "No more questions")
    hostSocket.on("ERROR", (err) => {
        // If we try to start Q11 and receive error, we should terminate
        if (err && (err.message === "Quiz already finished" || err.message.includes("monitor"))) {
             hostSocket.emit("TERMINATE_ROOM", { roomId: currentRoomId });
        }
    });

    // 5. Handle Quiz End -> Persistence Check
    hostSocket.on("QUIZ_ENDED", (data) => {
        quizCompleted++;
        console.log(`🏆 Room ${currentRoomId} finished! Leaderboard size: ${data.leaderboard.length}`);
        logStats();
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
    let socket = io(TARGET_URL, {
        forceNew: true,
        reconnection: true,
        transports: ["websocket"]
    });

    const username = `Bot-${playerId}`;

    socket.on("connect", () => {
        connected++;
        logStats();
        // 1. Join Room
        socket.emit("JOIN_ROOM", { roomId, username });
    });

    // 2. Listen for Question -> VOTE
    socket.on("NEW_QUESTION", (data) => {
         // Determine behavior: Normal, Late, or Reconnect
         const rand = Math.random();
         
         if (rand < 0.1) {
             // 10% RECONNECT SIMULATION
             // Disconnect immediately, reconnect after 2s
             socket.disconnect();
             setTimeout(() => {
                 socket.connect();
                 // Re-join logic might be needed depending on your server auth
                 // Currently just re-connecting socket
             }, 2000);
         } else if (rand < 0.2) {
             // 10% LATE VOTE SIMULATION (Edge Case)
             // Try to vote at 16s (should fail/be ignored)
             setTimeout(() => {
                const randomOption = data.options[0].id; 
                socket.emit("SUBMIT_VOTE", { roomId, optionId: randomOption });
             }, 16000);
         } else {
             // 80% NORMAL VOTE
             const delay = Math.random() * 10000;
             setTimeout(() => {
                if (data.options && data.options.length > 0) {
                    const randomOption = data.options[0].id; 
                    socket.emit("SUBMIT_VOTE", { roomId, optionId: randomOption });
                    votesCast++;
                    logStats();
                }
             }, delay);
         }
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
    process.stdout.write(`\r🔌 Users: ${connected} | 🏠 Rooms: ${activeRooms} | 🗳️ Votes: ${votesCast} | 🏆 Finished: ${quizCompleted}`);
}

start();

setInterval(() => {}, 10000);
