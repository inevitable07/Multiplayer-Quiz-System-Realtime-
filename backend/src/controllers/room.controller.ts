import { Request, Response } from "express";
import mongoose from "mongoose";
import { Room } from "../models/room.model";
import { User } from "../models/user.model";
import { ITokenPayload } from "../utils/jwt";

/**
 * Extend Express Request to ensure user is available
 * This is guaranteed by authMiddleware, but we type it here for clarity
 */
interface AuthenticatedRequest extends Request {
  user?: ITokenPayload;
}

/**
 * Create Room Controller
 * Creates a new room with authenticated user as host
 */
export const createRoom = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    /**
     * Authenticate: Ensure user is logged in
     */
    if (!req.user?.userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const userId = req.user.userId;

    /**
     * Fetch user details to get username
     */
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    /**
     * Generate unique 6-digit short code
     */
    let shortCode: string;
    let isUnique = false;
    
    while (!isUnique) {
      shortCode = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
      const existingRoom = await Room.findOne({ shortCode });
      if (!existingRoom) {
        isUnique = true;
      }
    }

    /**
     * Create new room with authenticated user as host
     * Note: Players array is empty initially - host is tracked separately via hostId
     */
    const newRoom = new Room({
      hostId: new mongoose.Types.ObjectId(userId),
      players: [], // Empty - host is NOT counted as a player
      status: "waiting",
      shortCode,
    });

    /**
     * Save room to database
     */
    const savedRoom = await newRoom.save();

    /**
     * Return created room
     */
    res.status(201).json({
      success: true,
      message: "Room created successfully",
      data: {
        roomId: savedRoom._id,
        shortCode: savedRoom.shortCode,
        hostId: savedRoom.hostId,
        players: savedRoom.players,
        status: savedRoom.status,
        createdAt: savedRoom.createdAt,
      },
    });
  } catch (error) {
    console.error("Create room error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while creating room",
      error: (error as Error).message,
    });
  }
};

/**
 * Join Room Controller
 * Adds authenticated user to existing room's player list
 * Accepts either full MongoDB ID (24 chars) or 6-digit shortCode
 */
export const joinRoom = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    /**
     * Authenticate: Ensure user is logged in
     */
    if (!req.user?.userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const { roomId } = req.params;
    const userId = req.user.userId;

    /**
     * Find room by either shortCode (6 digits) or full MongoDB ID (24 chars)
     */
    let room;

    if (roomId.length === 6 && /^\d+$/.test(roomId)) {
      // Treat as 6-digit short code - try exact match first
      room = await Room.findOne({ shortCode: roomId });
      
      if (!room) {
        res.status(404).json({
          success: false,
          message: "Room not found with that code",
        });
        return;
      }
    } else if (roomId.length === 24) {
      // Treat as full MongoDB ObjectId
      room = await Room.findById(roomId);

      if (!room) {
        res.status(404).json({
          success: false,
          message: "Room not found",
        });
        return;
      }
    } else {
      // Invalid format
      res.status(400).json({
        success: false,
        message: "Invalid room ID format. Use 6-digit code or full room ID",
      });
      return;
    }

    /**
     * Check if room is in waiting status
     * (Can't join rooms that are active or finished)
     */
    if (room.status !== "waiting") {
      res.status(400).json({
        success: false,
        message: `Cannot join a ${room.status} room`,
      });
      return;
    }

    /**
     * Check if user is already in the room
     */
    const playerExists = room.players.some(
      (player) => player.userId.toString() === userId
    );

    if (playerExists) {
      res.status(409).json({
        success: false,
        message: "You are already in this room",
      });
      return;
    }

    /**
     * Fetch user details to get username
     */
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    /**
     * Add user to players array
     */
    room.players.push({
      userId: new mongoose.Types.ObjectId(userId),
      username: user.username,
    });

    /**
     * Save updated room
     */
    const updatedRoom = await room.save();

    /**
     * Return updated room
     */
    res.status(200).json({
      success: true,
      message: "Joined room successfully",
      data: {
        roomId: updatedRoom._id,
        hostId: updatedRoom.hostId,
        players: updatedRoom.players,
        status: updatedRoom.status,
        createdAt: updatedRoom.createdAt,
      },
    });
  } catch (error) {
    console.error("Join room error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while joining room",
      error: (error as Error).message,
    });
  }
};

/**
 * Get Room Controller
 * Fetches room details including players information
 */
export const getRoom = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { roomId } = req.params;

    /**
     * Validation: Check if roomId is valid MongoDB ObjectId
     */
    if (!roomId || roomId.length !== 24) {
      res.status(400).json({
        success: false,
        message: "Invalid room ID format",
      });
      return;
    }

    /**
     * Find room by ID and populate host details
     */
    const room = await Room.findById(roomId).populate<{ hostId: any }>(
      "hostId",
      "username email"
    );

    if (!room) {
      res.status(404).json({
        success: false,
        message: "Room not found",
      });
      return;
    }

    /**
     * Return room data with formatted response
     */
    res.status(200).json({
      success: true,
      message: "Room retrieved successfully",
      data: {
        roomId: room._id,
        hostId: room.hostId._id,
        hostUsername: room.hostId.username,
        players: room.players,
        playerCount: room.players.length,
        status: room.status,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get room error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while retrieving room",
      error: (error as Error).message,
    });
  }
};
