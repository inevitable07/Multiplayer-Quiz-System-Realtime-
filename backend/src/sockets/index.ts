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
  currentQuestionIndex: number;
  totalQuestions: number;
  questions: any[];
  playerScores: { [userId: string]: number };
  answeredPlayers: Set<string>;
  questionStartTime: number;
  questionTimer: NodeJS.Timeout | null;
}

/**
 * Central game store - Map provides O(1) lookups and proper cleanup
 */
const games = new Map<string, IGameState>();

const QUESTION_DURATION = 10000;

/**
 * Safe game retrieval with null checks
 */
function getGame(roomId: string): IGameState | null {
  if (!roomId) return null;
  const game = games.get(roomId);
  if (!game) {
    console.warn(`⚠️ getGame: Game not found for roomId="${roomId}"`);
    console.log(`📋 Active games: ${Array.from(games.keys()).join(", ") || "NONE"}`);
  }
  return game || null;
}

/**
 * Safe game storage
 */
function setGame(roomId: string, gameState: IGameState): void {
  if (!roomId) {
    console.error(`❌ setGame: roomId is empty!`);
    return;
  }
  console.log(`📝 setGame: Storing game for roomId="${roomId}", isActive=${gameState.isActive}, Q${gameState.currentQuestionIndex + 1}/${gameState.totalQuestions}`);
  games.set(roomId, gameState);
}

/**
 * Safe game deletion with timer cleanup
 */
function deleteGame(roomId: string): void {
  if (!roomId) {
    console.error(`❌ deleteGame: roomId is empty!`);
    return;
  }
  console.log(`🗑️ deleteGame: Removing game for roomId="${roomId}"`);
  const game = games.get(roomId);
  if (game && game.questionTimer) {
    clearTimeout(game.questionTimer);
    game.questionTimer = null;
  }
  games.delete(roomId);
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
      });
    });

    // ==================== HELPER FUNCTIONS (DEFINED FIRST) ====================
    // These must be defined before event handlers that use them

    const sendQuestion = (io: SocketIOServer, roomId: string): boolean => {
      console.log(`\n📤 SEND_QUESTION: roomId="${roomId}"`);
      const game = getGame(roomId);
      
      if (!game) {
        console.error(`❌ sendQuestion: Game not found for roomId="${roomId}"`);
        return false;
      }

      if (!game.isActive) {
        console.warn(`⚠️ sendQuestion: Game inactive for ${roomId}`);
        return false;
      }

      if (game.currentQuestionIndex >= game.totalQuestions) {
        console.error(`❌ sendQuestion: Index out of range: ${game.currentQuestionIndex} >= ${game.totalQuestions}`);
        return false;
      }

      const q = game.questions[game.currentQuestionIndex];
      if (!q) {
        console.error(`❌ sendQuestion: Question not found at index ${game.currentQuestionIndex}`);
        return false;
      }

      console.log(`📡 Broadcasting Q${game.currentQuestionIndex + 1}/${game.totalQuestions}: "${q.question.substring(0, 50)}..."`);

      // Clear previous timer
      if (game.questionTimer) {
        clearTimeout(game.questionTimer);
        game.questionTimer = null;
        console.log(`🔄 Cleared previous timer`);
      }

      // Emit question
      io.to(roomId).emit("send_question", {
        questionIndex: game.currentQuestionIndex,
        totalQuestions: game.totalQuestions,
        question: q.question,
        options: q.options,
        timeLimit: QUESTION_DURATION / 1000,
      });

      // Reset answered players
      game.answeredPlayers.clear();
      game.questionStartTime = Date.now();
      console.log(`🔄 Reset: answeredPlayers cleared, timer will auto-advance in ${QUESTION_DURATION / 1000}s`);

      // Set timeout - capture current index in closure
      const currentIndex = game.currentQuestionIndex;
      game.questionTimer = setTimeout(() => {
        console.log(`\n⏱️ TIMEOUT: Question ${currentIndex + 1} time limit reached`);
        moveToNextQuestion(io, roomId);
      }, QUESTION_DURATION);

      setGame(roomId, game);
      console.log(`✅ Question ${game.currentQuestionIndex + 1} sent\n`);
      return true;
    };

    const moveToNextQuestion = async (io: SocketIOServer, roomId: string): Promise<void> => {
      console.log(`\n⏭️ MOVE_TO_NEXT_QUESTION: roomId="${roomId}"`);
      const game = getGame(roomId);
      
      if (!game) {
        console.warn(`⚠️ moveToNextQuestion: Game not found for roomId="${roomId}"`);
        return;
      }

      console.log(`📍 Current: Q${game.currentQuestionIndex + 1}/${game.totalQuestions}, ${game.answeredPlayers.size} answered`);

      if (game.questionTimer) {
        clearTimeout(game.questionTimer);
        game.questionTimer = null;
      }

      game.currentQuestionIndex++;
      console.log(`➡️ Incremented to Q${game.currentQuestionIndex + 1}/${game.totalQuestions}`);

      setGame(roomId, game);

      if (game.currentQuestionIndex >= game.totalQuestions) {
        console.log(`🏁 Quiz complete! Ending game...`);
        await endGame(io, roomId);
        return;
      }

      console.log(`📤 Sending next question...`);
      const sent = sendQuestion(io, roomId);
      if (!sent) {
        console.error(`❌ Failed to send question, ending game`);
        await endGame(io, roomId);
      }
    };

    const endGame = async (io: SocketIOServer, roomId: string): Promise<void> => {
      console.log(`\n🏁 END_GAME: roomId="${roomId}"`);
      const game = getGame(roomId);
      
      if (!game) {
        console.warn(`⚠️ endGame: Game not found for roomId="${roomId}"`);
        return;
      }

      console.log(`📊 Final scores:`, game.playerScores);
      console.log(`👥 Total players:`, Object.keys(game.playerScores).length);

      game.isActive = false;

      if (game.questionTimer) {
        clearTimeout(game.questionTimer);
        game.questionTimer = null;
      }

      setGame(roomId, game);

      // Build leaderboard with usernames
      const rawLeaderboard = Object.entries(game.playerScores)
        .map(([userId, score]) => ({ userId, score }))
        .sort((a, b) => b.score - a.score);

      // Enrich leaderboard with usernames from DB (or roomStates as fallback)
      const leaderboard = await Promise.all(
        rawLeaderboard.map(async (entry) => {
          // Try roomStates first (already fetched when joining)
          const roomPlayer = roomStates[roomId]?.players.find((p) => p.id === entry.userId);
          if (roomPlayer?.name) {
            return { ...entry, username: roomPlayer.name };
          }
          // Fallback to DB lookup
          try {
            const dbUser = await User.findById(entry.userId).select('username');
            return { ...entry, username: dbUser?.username || `Player` };
          } catch {
            return { ...entry, username: `Player` };
          }
        })
      );

      console.log(`🏆 Leaderboard:`, leaderboard);

      // Emit results
      io.to(roomId).emit("game_over", { leaderboard, totalQuestions: game.totalQuestions });

      console.log(`📤 Emitted game_over with leaderboard`);

      // Delete questions
      await deleteQuestionsByRoom(roomId);

      // Cleanup
      deleteGame(roomId);
      console.log(`✅ Game end complete\n`);
    };

    // ==================== GAME START ====================

    socket.on("start_game", async (data: { roomId: string }) => {
      const { roomId } = data;

      console.log(`\n🎮 START_GAME EVENT RECEIVED`);
      console.log(`   roomId="${roomId}"`);
      console.log(`   roomId type: ${typeof roomId}, length: ${roomId?.length}`);

      if (!roomId) {
        console.error(`❌ start_game: roomId is missing`);
        socket.emit("error", { message: "Room ID required" });
        return;
      }

      try {
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

        // Fetch questions
        const questions = await Question.find({ roomId })
          .sort({ index: 1 })
          .select("question options correctAnswer index");

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
          currentQuestionIndex: 0,
          totalQuestions: questions.length,
          questions: questions.map((q) => ({
            id: q._id,
            question: q.question,
            options: q.options,
            index: q.index,
          })),
          playerScores: {},
          answeredPlayers: new Set(),
          questionStartTime: Date.now(),
          questionTimer: null,
        };

        // Pre-initialize scores for ALL participants (host + players)
        // This ensures everyone appears on the leaderboard even if they never answer
        const hostId = roomStates[roomId]?.hostId;
        if (hostId) {
          gameState.playerScores[hostId] = 0;
        }
        if (roomStates[roomId]?.players) {
          for (const player of roomStates[roomId].players) {
            gameState.playerScores[player.id] = 0;
          }
        }
        console.log(`👥 Initialized scores for ${Object.keys(gameState.playerScores).length} players`);

        // CRITICAL: Store the game state
        setGame(roomId, gameState);
        console.log(`✅ Game state stored in Map for roomId="${roomId}"`);
        console.log(`📋 Active games after init: ${Array.from(games.keys()).join(", ")}`);

        // Emit game_started with the ObjectId roomId so ALL clients navigate correctly,
        // even players who joined via short code and have a different URL param.
        io.to(roomId).emit("game_started", { roomId, message: "Game starting..." });
        console.log(`📡 Emitted game_started to roomId="${roomId}" (ObjectId)`);

        // Send first question
        console.log(`📤 Sending first question...`);
        const sent = sendQuestion(io, roomId);
        
        if (!sent) {
          console.error(`❌ Failed to send first question`);
          socket.emit("error", { message: "Failed to send first question" });
          deleteGame(roomId);
          return;
        }

        console.log(`\n✅ START_GAME COMPLETE for roomId="${roomId}"\n`);
      } catch (error) {
        console.error("❌ start_game error:", error);
        socket.emit("error", { message: "Failed to start game" });
      }
    });

    // ==================== ANSWER SUBMISSION ====================

    socket.on("submit_answer", async (data: { roomId: string; userId: string; selectedAnswer: string }) => {
      const { roomId, userId, selectedAnswer } = data;

      console.log(`\n🔵 SUBMIT_ANSWER EVENT:`, { roomId, userId, selectedAnswer });

      if (!roomId || !userId || !selectedAnswer) {
        console.error(`❌ Missing required fields:`, { roomId, userId, selectedAnswer });
        socket.emit("error", { message: "Invalid submission" });
        return;
      }

      console.log(`📋 All active games before lookup: ${Array.from(games.keys()).join(", ") || "NONE"}`);

      // Defensive: resolve short code to ObjectId if needed (safety net for clients using short code URL)
      let resolvedRoomId = roomId;
      if (roomId.length === 6 && /^\d+$/.test(roomId)) {
        try {
          const dbRoom = await Room.findOne({ shortCode: roomId });
          if (dbRoom) {
            resolvedRoomId = dbRoom._id.toString();
            console.log(`🔄 Resolved shortCode "${roomId}" → ObjectId "${resolvedRoomId}"`);
          }
        } catch {
          // ignore, will fail at getGame
        }
      }

      const game = getGame(resolvedRoomId);
      console.log(`🔍 getGame result for "${resolvedRoomId}":`, game ? `FOUND (isActive=${game.isActive})` : "NULL");

      // SAFEGUARD: Game must exist and be active
      if (!game) {
        console.error(`❌ CRITICAL: Game not found for roomId="${resolvedRoomId}"`);
        console.log(`🔴 Available games: ${Array.from(games.keys()).map(rid => `[${rid}]`).join(" ") || "NONE"}`);
        socket.emit("error", { message: "No active game" });
        return;
      }

      if (!game.isActive) {
        console.error(`❌ Game not active for ${resolvedRoomId}`);
        socket.emit("error", { message: "Game is not active" });
        return;
      }

      // Prevent double submission
      if (game.answeredPlayers.has(userId)) {
        console.log(`⚠️ Duplicate answer: ${userId} already answered Q${game.currentQuestionIndex + 1}`);
        return;
      }

      console.log(`✅ First answer from ${userId} for Q${game.currentQuestionIndex + 1}/${game.totalQuestions}`);

      try {
        // Get question with correct answer for validation
        const question = await getQuestionWithAnswer(resolvedRoomId, game.currentQuestionIndex);

        if (!question) {
          console.error(`❌ Question fetch failed: roomId="${resolvedRoomId}", index=${game.currentQuestionIndex}`);
          socket.emit("error", { message: "Question validation failed" });
          return;
        }

        // Mark player as answered
        game.answeredPlayers.add(userId);

        // Check if answer is correct
        const isCorrect = selectedAnswer === question.correctAnswer;

        // Update score
        if (!game.playerScores[userId]) {
          game.playerScores[userId] = 0;
        }

        if (isCorrect) {
          game.playerScores[userId]++;
          console.log(`⭐ CORRECT! ${userId} → Score: ${game.playerScores[userId]}`);
        } else {
          console.log(`❌ WRONG! ${userId} → Score: ${game.playerScores[userId]} (Correct: ${question.correctAnswer})`);
        }

        // CRITICAL: Persist game state after score update
        setGame(resolvedRoomId, game);

        // Send feedback to player
        socket.emit("answer_feedback", {
          correct: isCorrect,
          correctAnswer: question.correctAnswer,
          currentScore: game.playerScores[userId],
        });

        // Check if all players have answered.
        // roomStates.players only contains NON-HOST players.
        // The host also answers questions, so we add +1 to account for them.
        // totalExpected = non-host players + 1 (host)
        const nonHostPlayers = roomStates[resolvedRoomId]?.players.length ?? 0;
        const totalExpected = nonHostPlayers + 1; // +1 for the host
        const answeredCount = game.answeredPlayers.size;

        console.log(`📊 Progress: ${answeredCount}/${totalExpected} answered (${nonHostPlayers} non-host + 1 host)`);

        if (answeredCount >= totalExpected) {
          console.log(`\n🎯 ALL PLAYERS ANSWERED! Moving to next question...\n`);
          await moveToNextQuestion(io, resolvedRoomId);
        }
      } catch (error) {
        console.error("❌ submit_answer error:", error);
        socket.emit("error", { message: "Failed to process answer" });
      }
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
      const { roomId, userId } = data;

      if (!roomId || !userId) {
        socket.emit("error", { message: "Invalid request" });
        return;
      }

      if (!roomStates[roomId] || roomStates[roomId].hostId !== userId) {
        socket.emit("error", { message: "Only host can destroy" });
        return;
      }

      try {
        await Room.findByIdAndDelete(roomId);
        await deleteQuestionsByRoom(roomId);
        deleteGame(roomId);

        io.to(roomId).emit("room_destroyed", {});
        delete roomStates[roomId];

        console.log(`🗑️ Room destroyed: ${roomId}`);
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

