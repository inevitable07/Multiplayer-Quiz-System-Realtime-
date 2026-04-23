import { Request, Response } from "express";
import mongoose from "mongoose";
import { Question, IQuestion } from "../models/question.model";
import { Room } from "../models/room.model";
import { ITokenPayload } from "../utils/jwt";

/**
 * Extend Express Request to include user info from auth middleware
 */
interface AuthenticatedRequest extends Request {
  user?: ITokenPayload;
}

/**
 * Add Question to Room
 * Host can add questions before starting the game
 * 
 * @param req - Request with roomId, question, options, correctAnswer
 * @param res - Response
 */
export const addQuestion = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const { roomId } = req.params;
    const { question, options, correctAnswer } = req.body;

    /**
     * Validate roomId is valid MongoDB ObjectId
     */
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      res.status(400).json({
        success: false,
        message: "Invalid room ID format",
      });
      return;
    }

    /**
     * Verify room exists and user is the host
     */
    const room = await Room.findById(roomId);

    if (!room) {
      res.status(404).json({
        success: false,
        message: "Room not found",
      });
      return;
    }

    if (room.hostId.toString() !== req.user.userId) {
      res.status(403).json({
        success: false,
        message: "Only room host can add questions",
      });
      return;
    }

    /**
     * Validate input
     */
    if (!question || !options || !correctAnswer) {
      res.status(400).json({
        success: false,
        message: "Question, options, and correctAnswer are required",
      });
      return;
    }

    if (!Array.isArray(options) || options.length !== 4) {
      res.status(400).json({
        success: false,
        message: "Must provide exactly 4 options",
      });
      return;
    }

    /**
     * Validate correctAnswer is one of A, B, C, D
     */
    if (!["A", "B", "C", "D"].includes(correctAnswer)) {
      res.status(400).json({
        success: false,
        message: "Correct answer must be A, B, C, or D",
      });
      return;
    }

    /**
     * Get next question index for this room
     */
    const lastQuestion = await Question.findOne({ roomId }).sort({
      index: -1,
    });

    const nextIndex = (lastQuestion?.index ?? -1) + 1;

    /**
     * Create new question
     */
    const newQuestion = new Question({
      roomId: new mongoose.Types.ObjectId(roomId),
      question,
      options: [
        { label: "A", text: options[0] },
        { label: "B", text: options[1] },
        { label: "C", text: options[2] },
        { label: "D", text: options[3] },
      ],
      correctAnswer,
      index: nextIndex,
      createdBy: new mongoose.Types.ObjectId(req.user.userId),
    });

    /**
     * Save question
     */
    const savedQuestion = await newQuestion.save();

    res.status(201).json({
      success: true,
      message: "Question added successfully",
      data: {
        questionId: savedQuestion._id,
        index: savedQuestion.index,
        question: savedQuestion.question,
        optionCount: savedQuestion.options.length,
      },
    });
  } catch (error) {
    console.error("Add question error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while adding question",
      error: (error as Error).message,
    });
  }
};

/**
 * Get All Questions for Room
 * Fetch all questions for a room (used for starting the game)
 * 
 * @param req - Request with roomId
 * @param res - Response
 */
export const getQuestionsByRoom = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { roomId } = req.params;

    /**
     * Validate roomId
     */
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      res.status(400).json({
        success: false,
        message: "Invalid room ID format",
      });
      return;
    }

    /**
     * Verify room exists
     */
    const room = await Room.findById(roomId);

    if (!room) {
      res.status(404).json({
        success: false,
        message: "Room not found",
      });
      return;
    }

    /**
     * Fetch all questions for this room, sorted by index
     */
    const questions = await Question.find({ roomId })
      .sort({ index: 1 })
      .select("-__v");

    if (questions.length === 0) {
      res.status(400).json({
        success: false,
        message: "No questions added to this room yet",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Questions retrieved successfully",
      data: {
        roomId,
        totalQuestions: questions.length,
        questions: questions.map((q) => ({
          id: q._id,
          index: q.index,
          question: q.question,
          options: q.options,
          // Do NOT send correctAnswer here - only send to backend
        })),
      },
    });
  } catch (error) {
    console.error("Get questions error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching questions",
      error: (error as Error).message,
    });
  }
};

/**
 * Get Single Question with Correct Answer (server-side only)
 * Used by socket handler to validate answers
 * 
 * @param roomId - Room ID
 * @param questionIndex - Question index
 * @returns Question with correctAnswer included
 */
export const getQuestionWithAnswer = async (
  roomId: string,
  questionIndex: number
): Promise<IQuestion | null> => {
  try {
    return await Question.findOne({
      roomId: new mongoose.Types.ObjectId(roomId),
      index: questionIndex,
    });
  } catch (error) {
    console.error("Error fetching question with answer:", error);
    return null;
  }
};

/**
 * Delete All Questions for Room
 * Called when game ends or room is deleted
 * 
 * @param roomId - Room ID
 */
export const deleteQuestionsByRoom = async (roomId: string): Promise<boolean> => {
  try {
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return false;
    }

    const result = await Question.deleteMany({
      roomId: new mongoose.Types.ObjectId(roomId),
    });

    console.log(`✅ Deleted ${result.deletedCount} questions for room ${roomId}`);
    return result.deletedCount > 0;
  } catch (error) {
    console.error("Error deleting questions:", error);
    return false;
  }
};
