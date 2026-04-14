import { Router, Request, Response } from "express";

const router = Router();

/**
 * GET /api/health
 * Health check endpoint
 * Returns server status
 */
router.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    message: "Server is healthy 🚀",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;
