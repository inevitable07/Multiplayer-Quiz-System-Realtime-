import { Request, Response, NextFunction } from "express";
import { verifyToken, extractTokenFromHeader, ITokenPayload } from "../utils/jwt";

/**
 * Extend Express Request to include user data
 * Allows TypeScript to know that req.user is available after auth middleware
 */
declare global {
  namespace Express {
    interface Request {
      user?: ITokenPayload;
    }
  }
}

/**
 * Authentication Middleware
 * Verifies JWT token from Authorization header and attaches user to request
 *
 * Usage: app.use("/api/protected", authMiddleware, protectedRoute);
 *
 * Expected header format: "Authorization: Bearer <token>"
 */
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    /**
     * Extract token from Authorization header
     */
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Missing or invalid authorization header",
      });
      return;
    }

    /**
     * Verify token and extract payload
     */
    const decoded = verifyToken(token);

    /**
     * Attach user data to request object
     */
    req.user = decoded;

    /**
     * Continue to next middleware/route handler
     */
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid or expired token",
      error: (error as Error).message,
    });
  }
};
