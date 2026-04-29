import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import { Room } from "../models/room.model";
import { Question } from "../models/question.model";
import { User } from "../models/user.model";
import mongoose from "mongoose";
import { getQuestionWithAnswer, deleteQuestionsByRoom } from "../controllers/quiz.controller";

/**
 * ============================================================================
 * GAME STATE MANAGEMENT - CORE ENGINE
 * ============================================================================
 * Single source of truth for all active games using Map
 * Prevents race conditions and ensures proper cleanup
 */

interface IGameState {
  roomId: string;
  isActive: boolean;
  currentIndex: number; // ✅ PHASE 3: Simplified (was currentQuestionIndex)
  totalQuestions: number;
  questions: any[];
  scores: { [userId: string]: number }; // ✅ PHASE 3: Simplified (was playerScores)
  answered: Set<string>; // ✅ PHASE 3: Simplified (was answeredPlayers)
  deadline: number;
  timer: NodeJS.Timeout | null; // ✅ PHASE 3: Simplified (was questionTimer)
}

/**
 * Central game store - Map provides O(1) lookups and proper cleanup
 */
const games = new Map<string, IGameState>();

const QUESTION_DURATION = 10000;

/**
 * Safe game retrieval with null checks
 * CRITICAL: Always convert roomId to string for consistent Map key
 */
function getGame(roomId: string): IGameState | null {
  if (!roomId) return null;
  const key = roomId.toString();
  const game = games.get(key);
  if (!game) {
    console.warn(`⚠️ getGame: Game not found for roomId="${key}"`);
    console.log(`📋 Active games: ${Array.from(games.keys()).join(", ") || "NONE"}`);
  }
  return game || null;
}

/**
 * Safe game storage
 * CRITICAL: Always convert roomId to string for consistent Map key
 */
function setGame(roomId: string, gameState: IGameState): void {
  if (!roomId) {
    console.error(`❌ setGame: roomId is empty!`);
    return;
  }
  const key = roomId.toString();
  console.log(`📝 setGame: Storing game for roomId="${key}", isActive=${gameState.isActive}, Q${gameState.currentIndex + 1}/${gameState.totalQuestions}`); // ✅ PHASE 3: Use currentIndex
  games.set(key, gameState);
}

/**
 * Safe game deletion with timer cleanup
 * CRITICAL: Always convert roomId to string for consistent Map key
 */
function deleteGame(roomId: string): void {
  if (!roomId) {
    console.error(`❌ deleteGame: roomId is empty!`);
    return;
  }
  const key = roomId.toString();
  console.log(`🗑️ deleteGame: Removing game for roomId="${key}"`);
  const game = games.get(key);
  if (game && game.timer) { // ✅ PHASE 3: Using 'timer' instead of 'questionTimer'
    clearTimeout(game.timer);
    game.timer = null;
  }
  games.delete(key);
  console.log(`✅ Game deleted. Active games: ${Array.from(games.keys()).join(", ") || "NONE"}`);
}

/**
 * ============================================================================
 * SOCKET INITIALIZATION
 * ============================================================================
 */

export const initializeSocket = (httpServer: HTTPServer): SocketIOServer => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: ["http://localhost:5173", "http://localhost:3000", "*"],
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  const roomStates: { [key: string]: { hostId: string; players: Array<{ id: string; name: string }> } } = {};

  io.on("connection", (socket: Socket) => {
    console.log(`\n✅ CLIENT CONNECTED: ${socket.id}\n`);

    // ==================== ROOM MANAGEMENT ====================

    socket.on("join_room", async (data: { roomId: string; userId?: string }) => {
      const { roomId, userId } = data;

      if (!roomId) {
        socket.emit("room_users", { players: [], isHost: false, shortCode: "" });
        return;
      }

      let actualRoomId = roomId;
      let dbRoom;
      let shortCode = "";
      let isHost = false;

      try {
        if (roomId.length === 6 && /^\d+$/.test(roomId)) {
          dbRoom = await Room.findOne({ shortCode: roomId });
          if (dbRoom) actualRoomId = dbRoom._id.toString();
          else {
            socket.emit("room_users", { players: [], isHost: false, shortCode: "" });
            return;
          }
        } else if (mongoose.Types.ObjectId.isValid(roomId)) {
          dbRoom = await Room.findById(roomId);
          if (!dbRoom) {
            socket.emit("room_users", { players: [], isHost: false, shortCode: "" });
            return;
          }
        } else {
          socket.emit("room_users", { players: [], isHost: false, shortCode: "" });
          return;
        }

        shortCode = dbRoom.shortCode || "";

        if (!roomStates[actualRoomId]) {
          roomStates[actualRoomId] = { hostId: "", players: [] };
        }

        roomStates[actualRoomId].hostId = dbRoom.hostId.toString();
        isHost = userId === dbRoom.hostId.toString();

        if (!isHost && userId) {
          const playerExists = roomStates[actualRoomId].players.some((p) => p.id === userId);

          if (!playerExists) {
            // IMPORTANT: Push with fallback name FIRST to prevent race condition
            // (React StrictMode double-mount / fast re-join would pass the check before push completes)
            const fallbackName = `Player ${roomStates[actualRoomId].players.length + 1}`;
            const playerEntry = { id: userId, name: fallbackName };
            roomStates[actualRoomId].players.push(playerEntry);

            // Now fetch real username from DB and update in place
            (async () => {
              try {
                const dbUser = await User.findById(userId).select('username');
                if (dbUser && dbUser.username) {
                  playerEntry.name = dbUser.username; // mutates the object in-place
                  console.log(`✅ Updated player name: ${userId} → "${dbUser.username}"`);
                }
              } catch (userErr) {
                console.warn(`⚠️ Could not fetch username for userId="${userId}", keeping fallback name`);
              }
              // Notify other players with the final (possibly updated) name
              socket.to(actualRoomId).emit("user_joined", { player: { id: userId, name: playerEntry.name } });
            })();
          }
        }
      } catch (err) {
        console.error("❌ join_room error:", err);
      }

      socket.join(actualRoomId);
      socket.emit("room_users", {
        players: roomStates[actualRoomId]?.players || [],
        isHost,
        shortCode,
        objectId: actualRoomId, // ✅ PHASE 1 FIX: Send the MongoDB ObjectId so frontend can emit start_game with correct ID
      });
    });

    // ==================== HELPER FUNCTIONS (DEFINED FIRST) ====================
    // These must be defined before event handlers that use them

    // ✅ PHASE 3: New sendQuestion helper - handles timer + auto-progression
    const sendQuestion = (io: SocketIOServer, roomId: string, game: IGameState): void => {
      console.log(`\n📤 SEND_QUESTION: roomId="${roomId}", currentIndex=${game.currentIndex}`);
      
      const key = roomId.toString();
      const q = game.questions[game.currentIndex];

      if (!q) {
        console.error(`❌ sendQuestion: Question not found at index ${game.currentIndex}`);
        return;
      }

      // ✅ PHASE 3: Always clear previous timer first
      if (game.timer) {
        clearTimeout(game.timer);
        game.timer = null;
        console.log(`🔄 Cleared previous timer`);
      }

      // ✅ PHASE 3: Set deadline for answer validation
      game.deadline = Date.now() + QUESTION_DURATION;
      game.answered.clear();

      console.log(`📡 Broadcasting Q${game.currentIndex + 1}/${game.totalQuestions}`);

      // Emit question to all players in room
      io.to(key).emit("send_question", {
        questionIndex: game.currentIndex,
        totalQuestions: game.totalQuestions,
        question: q.question,
        options: q.options,
        timeLimit: QUESTION_DURATION / 1000,
      });

      // ✅ PHASE 3: Set timer - auto-advance or end game
      game.timer = setTimeout(async () => {
        console.log(`\n⏱️ TIMEOUT: Question ${game.currentIndex + 1} time limit reached`);
        game.currentIndex++;

        if (game.currentIndex < game.totalQuestions) {
          // More questions - send next one
          console.log(`\n➡️ Moving to question ${game.currentIndex + 1}`);
          sendQuestion(io, roomId, game);
        } else {
          // Quiz complete - end game
          console.log(`\n🏁 All questions complete! Ending game...`);
          await endGame(io, roomId, game); // ✅ PHASE 4: Pass game object
        }
      }, QUESTION_DURATION);

      setGame(key, game);
      console.log(`✅ Question sent. Timer set for ${QUESTION_DURATION / 1000}s\n`);
    };

    // ✅ PHASE 3: Removed moveToNextQuestion - logic now in sendQuestion timer callback

    // ✅ PHASE 4: endGame function - receives game object for efficiency
    const endGame = async (io: SocketIOServer, roomId: string, game: IGameState): Promise<void> => {
      console.log(`\n🏁 END_GAME: roomId="${roomId}"`);
      
      console.log(`📊 Final scores:`, game.scores);
      console.log(`👥 Total players:`, Object.keys(game.scores).length);

      game.isActive = false;

      if (game.timer) {
        clearTimeout(game.timer);
        game.timer = null;
      }

      // Build leaderboard from scores
      const leaderboard = Object.entries(game.scores) // ✅ PHASE 4: Simple format
        .map(([userId, score]) => ({ userId, score }))
        .sort((a, b) => b.score - a.score);

      console.log(`🏆 Leaderboard:`, leaderboard);

      // Emit results to all players
      const key = roomId.toString();
      io.to(key).emit("game_over", { leaderboard, totalQuestions: game.totalQuestions });
      console.log(`📤 Emitted game_over with leaderboard`);

      // Delete questions from DB
      await deleteQuestionsByRoom(roomId);

      // Cleanup game state from Map
      deleteGame(roomId);
      console.log(`✅ Game end complete\n`);
    };

    // ==================== GAME START ====================

    socket.on("start_game", async (data: { roomId: string }) => {
      let { roomId } = data;

      console.log(`\n🎮 START_GAME EVENT RECEIVED`);
      console.log(`   roomId="${roomId}"`);
      console.log(`   roomId type: ${typeof roomId}, length: ${roomId?.length}`);

      if (!roomId) {
        console.error(`❌ start_game: roomId is missing`);
        socket.emit("error", { message: "Room ID required" });
        return;
      }

      try {
        // ✅ PHASE 1 FIX: Handle shortCode → ObjectId conversion
        // If frontend mistakenly sends shortCode (6 digits), convert to ObjectId
        if (roomId.length === 6 && /^\d+$/.test(roomId)) {
          try {
            const dbRoom = await Room.findOne({ shortCode: roomId });
            if (dbRoom) {
              roomId = dbRoom._id.toString();
              console.log(`🔄 Resolved shortCode "${data.roomId}" → ObjectId "${roomId}"`);
            }
          } catch {
            // Continue with original roomId, will fail validation below
          }
        }

        if (!mongoose.Types.ObjectId.isValid(roomId)) {
          console.error(`❌ Invalid MongoDB ObjectId: "${roomId}"`);
          socket.emit("error", { message: "Invalid room ID" });
          return;
        }

        // Prevent double start
        const existingGame = getGame(roomId);
        if (existingGame) {
          console.warn(`⚠️ Game already exists for roomId="${roomId}"`);
          return;
        }

        console.log(`📥 Fetching questions for roomId="${roomId}"...`);

        // Fetch questions (get all fields to debug missing correctAnswer)
        const questions = await Question.find({ roomId })
          .sort({ index: 1 });

        if (!questions || questions.length === 0) {
          console.error(`❌ No questions found for roomId="${roomId}"`);
          socket.emit("error", { message: "No questions found" });
          return;
        }

        // Debug: Check if correctAnswer exists
        console.log(`📋 Loaded ${questions.length} questions`);
        if (questions[0]) {
          console.log(`   Q1 keys: ${Object.keys(questions[0].toObject()).join(", ")}`);
          console.log(`   Q1 correctAnswer: "${questions[0].correctAnswer}"`);
        }

        console.log(`✅ Fetched ${questions.length} questions from database`);

        if (!questions || questions.length === 0) {
          console.error(`❌ No questions found for roomId="${roomId}"`);
          socket.emit("error", { message: "No questions uploaded" });
          return;
        }

        // Initialize game
        console.log(`🔧 Initializing game state...`);
        const gameState: IGameState = {
          roomId,
          isActive: true,
          currentIndex: 0, // ✅ PHASE 3: Simplified
          totalQuestions: questions.length,
          questions: questions.map((q) => ({
            id: q._id,
            question: q.question,
            options: q.options,
            index: q.index,
            correctAnswer: q.correctAnswer, // ✅ CRITICAL: Include correct answer for validation
          })),
          scores: {}, // ✅ PHASE 3: Simplified from playerScores
          answered: new Set(), // ✅ PHASE 3: Simplified from answeredPlayers
          deadline: Date.now() + QUESTION_DURATION,
          timer: null, // ✅ PHASE 3: Simplified from questionTimer
        };

        // Pre-initialize scores for ALL participants (host + players)
        // This ensures everyone appears on the leaderboard even if they never answer
        const hostId = roomStates[roomId]?.hostId;
        if (hostId) {
          gameState.scores[hostId] = 0; // ✅ PHASE 3: Using 'scores'
        }
        if (roomStates[roomId]?.players) {
          for (const player of roomStates[roomId].players) {
            gameState.scores[player.id] = 0; // ✅ PHASE 3: Using 'scores'
          }
        }
        console.log(`👥 Initialized scores for ${Object.keys(gameState.scores).length} players`);

        // ✅ PHASE 1 FIX: Always use roomId.toString() as key
        const gameKey = roomId.toString();
        // CRITICAL: Store the game state
        setGame(gameKey, gameState);
        console.log(`✅ Game state stored in Map with key="${gameKey}"`);
        console.log(`📋 Active games after init: ${Array.from(games.keys()).join(", ")}`);

        // Emit game_started with the ObjectId roomId so ALL clients navigate correctly,
        // even players who joined via short code and have a different URL param.
        io.to(gameKey).emit("game_started", { roomId: gameKey, message: "Game starting..." });
        console.log(`📡 Emitted game_started to roomId="${gameKey}" (ObjectId)`);

        // ✅ PHASE 3: Call new sendQuestion helper with game object
        console.log(`📤 Sending first question...`);
        sendQuestion(io, gameKey, gameState);
        console.log(`\n✅ START_GAME COMPLETE for roomId="${gameKey}"\n`);
      } catch (error) {
        console.error("❌ start_game error:", error);
        socket.emit("error", { message: "Failed to start game" });
      }
    });

    // ==================== ANSWER SUBMISSION ====================
    // ✅ PHASE 2: Simplified handler — just validate and score, no question advancement
    socket.on("submit_answer", (data: { roomId: string; userId: string; selectedAnswer: string }) => {
      let { roomId, userId, selectedAnswer } = data;

      console.log(`\n🔵 SUBMIT_ANSWER EVENT:`, { roomId, userId, selectedAnswer });

      if (!roomId || !userId || !selectedAnswer) {
        console.error(`❌ Missing required fields`);
        socket.emit("error", { message: "Invalid submission" });
        return;
      }

      // ✅ PHASE 2 FIX: Resolve shortCode if needed
      if (roomId.length === 6 && /^\d+$/.test(roomId)) {
        try {
          // Synchronous: fetch from Room if needed (should rarely happen)
          // For Phase 2, we'll assume frontend sends ObjectId (fixed in Phase 1)
        } catch {
          // ignore
        }
      }

      // ✅ PHASE 2: Look up game using roomId.toString()
      const key = roomId.toString();
      const game = getGame(key);

      if (!game) {
        console.error(`❌ Game not found for roomId="${key}"`);
        socket.emit("error", { message: "No active game" });
        return;
      }

      if (!game.isActive) {
        console.error(`❌ Game not active`);
        socket.emit("error", { message: "Game is not active" });
        return;
      }

      // ✅ PHASE 2: Reject late answers using deadline
      const now = Date.now();
      if (now > game.deadline) {
        console.warn(`⏱️ Answer rejected: too late (deadline=${game.deadline}, now=${now}, diff=${now - game.deadline}ms)`);
        socket.emit("answer_ack", { correct: false, late: true });
        return;
      }

      // Prevent double submission from same player
      if (game.answered.has(userId)) { // ✅ PHASE 3: Using 'answered'
        console.log(`⚠️ Duplicate answer from ${userId}`);
        socket.emit("answer_ack", { correct: false, duplicate: true });
        return;
      }

      // ✅ PHASE 2: Get current question
      const currentQ = game.questions[game.currentIndex]; // ✅ PHASE 3: Using 'currentIndex'
      if (!currentQ) {
        console.error(`❌ Question not found at index ${game.currentIndex}`);
        socket.emit("error", { message: "Question not found" });
        return;
      }

      // ✅ PHASE 2: Check answer against correctAnswer
      const isCorrect = selectedAnswer === currentQ.correctAnswer;

      if (isCorrect) {
        console.log(`⭐ CORRECT! ${userId} (Q${game.currentIndex + 1})`); // ✅ PHASE 3
        game.scores[userId] = (game.scores[userId] || 0) + 1; // ✅ PHASE 3: Using 'scores'
      } else {
        console.log(`❌ WRONG! ${userId} (Correct: ${currentQ.correctAnswer})`);
      }

      // Mark as answered
      game.answered.add(userId); // ✅ PHASE 3: Using 'answered'

      // ✅ PHASE 2: Persist state
      setGame(key, game);

      // ✅ PHASE 2: Emit answer_ack (not answer_feedback)
      socket.emit("answer_ack", {
        correct: isCorrect,
        correctAnswer: currentQ.correctAnswer,
        currentScore: game.scores[userId], // ✅ PHASE 3: Using 'scores'
      });

      console.log(`✅ Answer processed. Answered: ${game.answered.size}/${Object.keys(game.scores).length}`); // ✅ PHASE 3: Using new field names
    });

    // ==================== ROOM CONTROL ====================

    socket.on("leave_room", async (data: { roomId: string; userId?: string }) => {
      const { roomId, userId } = data;
      if (!roomId) return;

      // Resolve short code to ObjectId if needed
      let actualRoomId = roomId;
      if (roomId.length === 6 && /^\d+$/.test(roomId)) {
        try {
          const dbRoom = await Room.findOne({ shortCode: roomId });
          if (dbRoom) actualRoomId = dbRoom._id.toString();
        } catch {
          // ignore
        }
      }

      socket.leave(actualRoomId);

      if (roomStates[actualRoomId]) {
        const idx = roomStates[actualRoomId].players.findIndex((p) => p.id === userId || p.id === socket.id);
        if (idx !== -1) {
          const removed = roomStates[actualRoomId].players.splice(idx, 1)[0];
          io.to(actualRoomId).emit("user_left", { playerId: removed.id });
        }

        if (roomStates[actualRoomId].players.length === 0) {
          delete roomStates[actualRoomId];
        }
      }
    });

    socket.on("destroy_room", async (data: { roomId: string; userId: string }) => {
      let { roomId, userId } = data;

      if (!roomId || !userId) {
        socket.emit("error", { message: "Invalid request" });
        return;
      }

      // ✅ PHASE 1 FIX: Resolve shortCode if needed
      if (roomId.length === 6 && /^\d+$/.test(roomId)) {
        try {
          const dbRoom = await Room.findOne({ shortCode: roomId });
          if (dbRoom) {
            roomId = dbRoom._id.toString();
          }
        } catch {
          // continue
        }
      }

      if (!roomStates[roomId] || roomStates[roomId].hostId !== userId) {
        socket.emit("error", { message: "Only host can destroy" });
        return;
      }

      try {
        const roomKey = roomId.toString();
        await Room.findByIdAndDelete(roomId);
        await deleteQuestionsByRoom(roomId);
        deleteGame(roomKey);

        io.to(roomKey).emit("room_destroyed", {});
        delete roomStates[roomId];

        console.log(`🗑️ Room destroyed: ${roomKey}`);
      } catch (error) {
        socket.emit("error", { message: "Destroy failed" });
      }
    });

    // ==================== DISCONNECT ====================

    socket.on("disconnect", () => {
      console.log(`\n❌ CLIENT DISCONNECTED: ${socket.id}\n`);

      Object.keys(roomStates).forEach((roomId) => {
        const idx = roomStates[roomId].players.findIndex((p) => p.id === socket.id);
        if (idx !== -1) {
          roomStates[roomId].players.splice(idx, 1);
          io.to(roomId).emit("user_left", { playerId: socket.id });
        }
      });
    });

    socket.on("error", (error) => {
      console.error(`⚠️ Socket error [${socket.id}]:`, error);
    });
  });

  return io;
};

export type { SocketIOServer };

