import { Router } from "express";
import { createRoom, joinRoom, getRoom } from "../controllers/room.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

/**
 * Room Routes
 * Handles room creation, joining, and retrieval
 *
 * POST /api/room/create      - Create a new room (protected)
 * POST /api/room/join/:roomId - Join an existing room (protected)
 * GET /api/room/:roomId       - Get room details (protected)
 */
const router = Router();

/**
 * POST /api/room/create
 * Create a new room with authenticated user as host
 *
 * Headers: Authorization: Bearer <token>
 * Response: { roomId, hostId, players, status, createdAt }
 */
router.post("/create", authMiddleware, createRoom);

/**
 * POST /api/room/join/:roomId
 * Add authenticated user to room's player list
 *
 * Params: roomId (MongoDB ObjectId)
 * Headers: Authorization: Bearer <token>
 * Response: { roomId, hostId, players, status, createdAt }
 */
router.post("/join/:roomId", authMiddleware, joinRoom);

/**
 * GET /api/room/:roomId
 * Get room details with populated user information
 *
 * Params: roomId (MongoDB ObjectId)
 * Response: { roomId, hostUsername, players, playerCount, status, createdAt }
 */
router.get("/:roomId", authMiddleware, getRoom);

export default router;
