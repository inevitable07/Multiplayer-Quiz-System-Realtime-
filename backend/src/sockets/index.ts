import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import { Room } from "../models/room.model";
import mongoose from "mongoose";

/**
 * Initialize Socket.IO and attach to HTTP server
 * Configures CORS for development and sets up event handlers
 *
 * @param httpServer - HTTP server instance from Express
 * @returns Socket.IO server instance
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

  // In-memory room state: tracks host and players separately
  const roomStates: { [key: string]: { hostId: string; players: Array<{ id: string; name: string }> } } = {};

  /**
   * Handle client disconnection globally
   */
  io.on("connection", (socket: Socket) => {
    console.log(`

   Client Connected                      
   Socket ID: ${socket.id.padEnd(31)}

    `);

    // ==================== Room Events ====================

    /**
     * join_room: Join user to a socket room and send current players
     * 
     * @param data - { roomId: string, userId: string }
     */
    socket.on("join_room", async (data: { roomId: string; userId?: string }) => {
      const { roomId, userId } = data;
      
      if (!roomId) {
        console.error("join_room: roomId is missing");
        socket.emit("room_users", {
          players: [],
          isHost: false,
          shortCode: '',
        });
        return;
      }

      // Track the actual MongoDB room ID (not shortCode)
      let actualRoomId = roomId;
      let dbRoom;
      let shortCode = '';
      let isHost = false;

      try {
        // Handle both MongoDB ObjectId (24 chars) and shortCode (6 digits)
        if (roomId.length === 6 && /^\d+$/.test(roomId)) {
          // Treating roomId as 6-digit short code
          console.log(`[${socket.id}] Received shortCode: ${roomId}, looking up MongoDB ID...`);
          dbRoom = await Room.findOne({ shortCode: roomId });
          
          if (dbRoom) {
            actualRoomId = dbRoom._id.toString();
            console.log(`✅ Found room by shortCode ${roomId}: MongoDB ID = ${actualRoomId}`);
          } else {
            console.error(`❌ Room not found with shortCode: ${roomId}`);
            socket.emit("room_users", {
              players: [],
              isHost: false,
              shortCode: '',
            });
            return;
          }
        } else if (mongoose.Types.ObjectId.isValid(roomId)) {
          // Treating roomId as MongoDB ObjectId
          console.log(`[${socket.id}] Received MongoDB ID: ${roomId}`);
          dbRoom = await Room.findById(roomId);
          actualRoomId = roomId;
          
          if (!dbRoom) {
            console.error(`❌ Room not found with MongoDB ID: ${roomId}`);
            socket.emit("room_users", {
              players: [],
              isHost: false,
              shortCode: '',
            });
            return;
          }
        } else {
          console.error(`❌ Invalid room ID format: ${roomId} (not 6-digit code or 24-char ObjectId)`);
          socket.emit("room_users", {
            players: [],
            isHost: false,
            shortCode: '',
          });
          return;
        }

        // Now we have dbRoom and actualRoomId
        shortCode = dbRoom.shortCode || '';
        
        // Initialize room state if it doesn't exist
        if (!roomStates[actualRoomId]) {
          roomStates[actualRoomId] = { hostId: '', players: [] };
        }
        
        // Store the host ID from database
        roomStates[actualRoomId].hostId = dbRoom.hostId.toString();
        
        // Determine if this socket connection's user is the host
        isHost = userId === dbRoom.hostId.toString();

        console.log(`🎯 Room Analysis: Host ID=${roomStates[actualRoomId].hostId}, Current User=${userId}, IsHost=${isHost}`);

        // If this is not the host, add as a regular player
        if (!isHost && userId) {
          const playerName = `Player ${roomStates[actualRoomId].players.length + 1}`;
          const player = {
            id: userId,
            name: playerName,
          };

          // Check if already added (prevent duplicates)
          const playerAlreadyExists = roomStates[actualRoomId].players.some(p => p.id === userId);
          if (!playerAlreadyExists) {
            roomStates[actualRoomId].players.push(player);
            console.log(`✅ Player ${userId} added to room ${actualRoomId}`);

            // Notify others in the room that a user joined
            socket.to(actualRoomId).emit("user_joined", { player });
          } else {
            console.log(`⚠️  Player ${userId} already exists in room ${actualRoomId}`);
          }
        } else if (isHost) {
          console.log(`👑 Host ${userId} connected to room ${actualRoomId}`);
        }
      } catch (err) {
        console.error("❌ Error in join_room:", err);
      }

      // Join the socket to the actual room namespace
      socket.join(actualRoomId);
      console.log(`[${socket.id}] joined socket room: ${actualRoomId}`);

      // Always emit response to prevent frontend from hanging
      socket.emit("room_users", {
        players: roomStates[actualRoomId]?.players || [],
        isHost,
        shortCode,
      });

      console.log(`📊 Room ${actualRoomId} state: ${roomStates[actualRoomId]?.players.length || 0} players, Host ID: ${roomStates[actualRoomId]?.hostId}, ShortCode: ${shortCode}`);
    });

    /**
     * start_game: Host initiates game start
     * 
     * @param data - { roomId: string }
     */
    socket.on("start_game", (data: { roomId: string }) => {
      const { roomId } = data;

      if (!roomId) {
        console.error("start_game: roomId is missing");
        return;
      }

      console.log(`[${socket.id}] starting game in room: ${roomId}`);

      // Broadcast to all users in the room
      io.to(roomId).emit("game_started", {
        roomId,
        timestamp: new Date(),
      });
    });

    /**
     * send_message: Broadcast a message to all users in a room
     * Used for testing real-time communication
     */
    socket.on("send_message", (roomId: string, message: string) => {
      console.log(`[${socket.id}] sent message to room ${roomId}: ${message}`);

      io.to(roomId).emit("receive_message", {
        sender: socket.id,
        message,
        timestamp: new Date(),
      });
    });

    /**
     * leave_room: Leave a room and clean up
     */
    socket.on("leave_room", (roomId: string) => {
      socket.leave(roomId);
      console.log(`[${socket.id}] left room: ${roomId}`);

      // Remove player from room state (not the host)
      if (roomStates[roomId]) {
        const playerIndex = roomStates[roomId].players.findIndex((p) => p.id === socket.id);
        if (playerIndex !== -1) {
          roomStates[roomId].players.splice(playerIndex, 1);

          // Notify others in the room
          io.to(roomId).emit("user_left", {
            playerId: socket.id,
          });

          // Delete room if empty (only players left, host can stay)
          if (roomStates[roomId].players.length === 0 && !roomStates[roomId].hostId) {
            delete roomStates[roomId];
            console.log(`Room ${roomId} deleted (empty)`);
          }
        }
      }
    });

    // ==================== Disconnection Events ====================

    /**
     * Handle client disconnection
     */
    socket.on("disconnect", () => {
      console.log(`

   Client Disconnected                   
   Socket ID: ${socket.id.padEnd(31)}
      `);

      // Remove player from all rooms they were in
      Object.keys(roomStates).forEach((roomId) => {
        const playerIndex = roomStates[roomId].players.findIndex((p) => p.id === socket.id);
        if (playerIndex !== -1) {
          roomStates[roomId].players.splice(playerIndex, 1);

          // Notify others in the room
          io.to(roomId).emit("user_left", {
            playerId: socket.id,
          });
        }
      });
    });

    /**
     * Handle connection errors
     */
    socket.on("error", (error) => {
      console.error(`[${socket.id}] Socket error:`, error);
    });
  });

  return io;
};

export type { SocketIOServer };

