import express, { Express } from "express";
import cors from "cors";

// Import routes
import healthRoute from "./routes/health.route";

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

// Add more routes here as modules expand
// app.use("/api/auth", authRoute);
// app.use("/api/quizzes", quizRoute);
// app.use("/api/rooms", roomRoute);

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
