import { Router, Request, Response } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";

/**
 * Example Protected Routes
 * Demonstrates how to use authMiddleware to protect endpoints
 *
 * All routes in this file require valid JWT authentication
 */
const router = Router();

/**
 * Apply auth middleware to all routes in this router
 */
router.use(authMiddleware);

/**
 * GET /api/profile
 * Get authenticated user's profile information
 *
 * Headers: Authorization: Bearer <token>
 * Response: { userId, username, email }
 */
router.get("/profile", (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "User not authenticated",
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Profile retrieved successfully",
    data: {
      userId: req.user.userId,
    },
  });
});

export default router;
