import { Router } from "express";
import { signup, login } from "../controllers/auth.controller";

/**
 * Auth Routes
 * Defines authentication endpoints for user registration and login
 */
const router = Router();

/**
 * POST /api/auth/signup
 * Register a new user
 *
 * Body: { username, email, password }
 * Response: { userId, username, email, token }
 */
router.post("/signup", signup);

/**
 * POST /api/auth/login
 * Authenticate user and get JWT token
 *
 * Body: { email, password }
 * Response: { userId, username, email, token }
 */
router.post("/login", login);

export default router;
