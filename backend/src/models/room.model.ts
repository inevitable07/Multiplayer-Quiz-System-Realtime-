import mongoose, { Schema, Document, Types } from "mongoose";

/**
 * Player Interface
 * Represents a player in a room
 */
export interface IPlayer {
  userId: Types.ObjectId;
  username: string;
}

/**
 * Room Interface
 * Defines the structure of a Room document
 */
export interface IRoom extends Document {
  hostId: Types.ObjectId;
  players: IPlayer[];
  status: "waiting" | "active" | "finished";
  shortCode: string; // 6-digit code for easy sharing
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Room Schema
 * Defines validation and structure for room documents in MongoDB
 */
const roomSchema = new Schema<IRoom>(
  {
    hostId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Host ID is required"],
      index: true,
    },
    players: {
      type: [
        {
          userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
          },
          username: {
            type: String,
            required: true,
          },
        },
      ],
      default: [],
    },
    status: {
      type: String,
      enum: {
        values: ["waiting", "active", "finished"],
        message: "Status must be one of: waiting, active, finished",
      },
      default: "waiting",
      index: true,
    },
    shortCode: {
      type: String,
      unique: true,
      sparse: true, // Allow null values for existing rooms
      index: true,
      minlength: 6,
      maxlength: 6,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

/**
 * Room Model
 * Factory for creating and querying room documents
 */
export const Room = mongoose.model<IRoom>("Room", roomSchema);
