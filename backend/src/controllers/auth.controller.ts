import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { User } from "../models/user.model";
import { generateToken } from "../utils/jwt";

/**
 * Signup Controller
 * Handles user registration with password hashing and JWT token generation
 */
export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password } = req.body;

    /**
     * Validate input
     */
    if (!username || !email || !password) {
      res.status(400).json({
        success: false,
        message: "Username, email, and password are required",
      });
      return;
    }

    /**
     * Check if user already exists
     */
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        message:
          existingUser.email === email
            ? "Email already registered"
            : "Username already taken",
      });
      return;
    }

    /**
     * Hash password using bcrypt
     * Generate salt with 10 rounds for security
     */
    const hashedPassword = await bcrypt.hash(password, 10);

    /**
     * Create new user document
     */
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
    });

    /**
     * Save user to database
     */
    const savedUser = await newUser.save();

    /**
     * Generate JWT token
     */
    const token = generateToken(savedUser._id.toString());

    /**
     * Return user data (without password) and token
     */
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        userId: savedUser._id,
        username: savedUser.username,
        email: savedUser.email,
        token,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during signup",
      error: (error as Error).message,
    });
  }
};

/**
 * Login Controller
 * Handles user authentication with password verification and JWT token generation
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    /**
     * Validate input
     */
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
      return;
    }

    /**
     * Find user by email
     * Need to explicitly select password field since it has select: false in schema
     */
    const user = await User.findOne({ email }).select("+password");

    /**
     * Validate user exists
     */
    if (!user) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
      return;
    }

    /**
     * Compare provided password with hashed password
     */
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
      return;
    }

    /**
     * Generate JWT token
     */
    const token = generateToken(user._id.toString());

    /**
     * Return user data (without password) and token
     */
    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        userId: user._id,
        username: user.username,
        email: user.email,
        token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during login",
      error: (error as Error).message,
    });
  }
};
