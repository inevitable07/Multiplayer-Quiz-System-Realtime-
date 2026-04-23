import express, { Express } from "express";
import cors from "cors";

// Import routes
import healthRoute from "./routes/health.route";
import authRoute from "./routes/auth.route";
import roomRoute from "./routes/room.route";
import quizRoute from "./routes/quiz.route";

/**
 * Initialize and configure Express app
 * This separates app configuration from server startup
 */
const app: Express = express();

// ==================== Middlewares ====================

// Enable CORS for cross-origin requests
app.use(cors());

// Parse incoming JSON requests
app.use(express.json());

// Parse incoming URL-encoded requests
app.use(express.urlencoded({ extended: true }));

// ==================== Health Check (Root) ====================

// Basic health check at root endpoint
app.get("/", (_req, res) => {
  res.status(200).json({
    message: "Multiplayer Quiz System API",
    status: "running",
  });
});

// ==================== API Routes ====================

// Health check route
app.use("/api/health", healthRoute);

// Authentication routes
app.use("/api/auth", authRoute);

// Room management routes
app.use("/api/room", roomRoute);

// Quiz management routes
app.use("/api/quiz", quizRoute);

// ==================== Multer Error Handler ====================

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // Handle multer errors
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "File size exceeds 10MB limit",
    });
  }
  if (err.message === "Only .csv files are allowed") {
    return res.status(400).json({
      success: false,
      message: "Only .csv files are supported",
    });
  }
  if (err.message?.includes("MIME type")) {
    return res.status(400).json({
      success: false,
      message: "Only .csv files are supported",
    });
  }
  // Pass to next error handler
  _next(err);
});

// ==================== 404 Handler ====================

app.use((_req, res) => {
  res.status(404).json({
    message: "Endpoint not found",
    path: _req.path,
  });
});

// ==================== Error Handler ====================

app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Error:", err);
    res.status(err.status || 500).json({
      message: err.message || "Internal Server Error",
      status: "error",
    });
  }
);

export default app;
