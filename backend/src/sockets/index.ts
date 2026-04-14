import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";

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
     * join_room: Join user to a socket room
     * When a user joins a room, they'll receive updates for that room only
     *
     * @param roomId - ID of the room to join
     */
    socket.on("join_room", (roomId: string) => {
      socket.join(roomId);
      console.log(`[${socket.id}] joined room: ${roomId}`);

      // Notify others in the room that a user joined
      io.to(roomId).emit("user_joined", {
        message: `A user has joined the room`,
        timestamp: new Date(),
      });
    });

    /**
     * send_message: Broadcast a message to all users in a room
     * Used for testing real-time communication
     *
     * @param roomId - ID of the room
     * @param message - Message content
     */
    socket.on("send_message", (roomId: string, message: string) => {
      console.log(`[${socket.id}] sent message to room ${roomId}: ${message}`);

      // Broadcast message to all users in the room
      io.to(roomId).emit("receive_message", {
        sender: socket.id,
        message,
        timestamp: new Date(),
      });
    });

    /**
     * leave_room: Leave a room (optional but recommended)
     */
    socket.on("leave_room", (roomId: string) => {
      socket.leave(roomId);
      console.log(`[${socket.id}] left room: ${roomId}`);

      // Notify others in the room that a user left
      io.to(roomId).emit("user_left", {
        message: `A user has left the room`,
        timestamp: new Date(),
      });
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
