import mongoose, { Schema, Document, Types } from "mongoose";

/**
 * Room Interface
 * Defines the structure of a Room document
 */
export interface IRoom extends Document {
  hostId: Types.ObjectId;
  status: "waiting" | "active" | "finished";
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
    status: {
      type: String,
      enum: {
        values: ["waiting", "active", "finished"],
        message: "Status must be one of: waiting, active, finished",
      },
      default: "waiting",
      index: true,
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
