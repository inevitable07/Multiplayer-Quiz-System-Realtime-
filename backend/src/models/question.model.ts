import mongoose, { Schema, Document, Types } from "mongoose";

/**
 * Question Interface
 * Defines the structure of a Question document
 */
export interface IQuestion extends Document {
  roomId: Types.ObjectId;
  question: string;
  options: string[];
  correctIndex: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Question Schema
 * Defines validation and structure for question documents in MongoDB
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
      type: [String],
      required: [true, "Options are required"],
      validate: {
        validator: (v: string[]) => v && v.length >= 2 && v.length <= 6,
        message: "Question must have between 2 and 6 options",
      },
    },
    correctIndex: {
      type: Number,
      required: [true, "Correct answer index is required"],
      min: [0, "Correct index cannot be negative"],
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
 * Question Model
 * Factory for creating and querying question documents
 */
export const Question = mongoose.model<IQuestion>("Question", questionSchema);
