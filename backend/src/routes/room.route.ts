import { Router, NextFunction, Request, Response } from "express";
import { createRoom, joinRoom, getRoom, addQuestion, uploadQuestions } from "../controllers/room.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { uploadMiddleware } from "../config/multer";

/**
 * Room Routes
 * Handles room creation, joining, retrieval, and question management
 *
 * POST /api/room/create              - Create a new room (protected)
 * POST /api/room/join/:roomId        - Join an existing room (protected)
 * GET /api/room/:roomId              - Get room details (protected)
 * POST /api/rooms/:roomId/questions  - Add question to room (protected, host only)
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

/**
 * POST /api/rooms/:roomId/questions
 * Add a question to a room (only host can add questions)
 *
 * Params: roomId (MongoDB ObjectId)
 * Headers: Authorization: Bearer <token>
 * Body: { question, options, correctAnswer }
 * Response: { success, message, questionCount }
 */
router.post("/:roomId/questions", authMiddleware, addQuestion);

/**
 * Custom middleware to handle multer errors
 */
const handleFileUpload = (req: Request, res: Response, next: NextFunction) => {
  uploadMiddleware.single("file")(req, res, (err: any) => {
    if (err) {
      console.error("Multer error:", err);
      return res.status(400).json({
        success: false,
        message: err.message || "File upload failed",
      });
    }
    next();
  });
};

/**
 * POST /api/room/:roomId/upload-questions
 * Upload and parse questions from CSV file (only host can upload)
 *
 * CSV Format:
 * question,option1,option2,option3,option4,answer
 * "What is 2+2?","2","3","4","5","C"
 *
 * Params: roomId (MongoDB ObjectId)
 * Headers: Authorization: Bearer <token>
 * File: [file] - CSV file containing questions
 * Response: { success, message, uploadedCount, totalQuestions }
 */
router.post(
  "/:roomId/upload-questions",
  authMiddleware,
  handleFileUpload,
  uploadQuestions
);

export default router;
