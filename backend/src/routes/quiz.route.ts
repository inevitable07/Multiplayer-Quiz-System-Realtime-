import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { addQuestion, getQuestionsByRoom } from "../controllers/quiz.controller";

/**
 * Quiz Routes
 * Handles question management for rooms
 */
const quizRouter = Router();

/**
 * POST /api/quiz/rooms/:roomId/questions
 * Add a question to a room (host only)
 */
quizRouter.post(
  "/rooms/:roomId/questions",
  authMiddleware,
  addQuestion
);

/**
 * GET /api/quiz/rooms/:roomId/questions
 * Get all questions for a room (for verification)
 */
quizRouter.get(
  "/rooms/:roomId/questions",
  authMiddleware,
  getQuestionsByRoom
);

export default quizRouter;
