import mongoose, { Schema, Document, Types } from "mongoose";

/**
 * Question Option Interface
 * Represents a single option for a question with a label (A, B, C, D)
 */
export interface IQuestionOption {
  label: string; // A, B, C, D
  text: string; // Option text
}

/**
 * Question Interface
 * Defines the structure of a Question document for the quiz game
 */
export interface IQuestion extends Document {
  roomId: Types.ObjectId;
  question: string;
  options: IQuestionOption[]; // Array of labeled options
  correctAnswer: string; // Label (A, B, C, D)
  index: number; // Order in quiz (0-based)
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Question Schema
 * Defines validation and structure for question documents in MongoDB
 * Optimized for multiplayer quiz game
 */
const questionSchema = new Schema<IQuestion>(
  {
    roomId: {
      type: Schema.Types.ObjectId,
      ref: "Room",
      required: [true, "Room ID is required"],
      index: true,
    },
    question: {
      type: String,
      required: [true, "Question text is required"],
      minlength: [5, "Question must be at least 5 characters long"],
      maxlength: [500, "Question must not exceed 500 characters"],
      trim: true,
    },
    options: {
      type: [
        {
          label: {
            type: String,
            enum: ["A", "B", "C", "D"],
            required: [true, "Option label is required"],
          },
          text: {
            type: String,
            required: [true, "Option text is required"],
            minlength: [1, "Option text cannot be empty"],
            maxlength: [200, "Option text must not exceed 200 characters"],
            trim: true,
          },
        },
      ],
      required: [true, "Options are required"],
      validate: {
        validator: (v: IQuestionOption[]) => v.length === 4,
        message: "Question must have exactly 4 options (A, B, C, D)",
      },
    },
    correctAnswer: {
      type: String,
      enum: {
        values: ["A", "B", "C", "D"],
        message: "Correct answer must be A, B, C, or D",
      },
      required: [true, "Correct answer is required"],
    },
    index: {
      type: Number,
      required: [true, "Question index is required"],
      min: [0, "Index cannot be negative"],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator ID is required"],
      index: true,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

/**
 * Compound index for efficient querying of questions by room
 * Ensures unique question index per room
 */
questionSchema.index({ roomId: 1, index: 1 }, { unique: true });

/**
 * Question Model
 * Factory for creating and querying question documents
 */
export const Question = mongoose.model<IQuestion>("Question", questionSchema);
