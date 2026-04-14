import app from "./app";
import config from "./config/env";
import { connectDB } from "./config/db";

/**
 * Start the Express server
 * Connects to MongoDB, then starts the server with proper error handling
 */
const startServer = async () => {
  try {
    // Connect to MongoDB first
    await connectDB();

    const server = app.listen(config.PORT, () => {
      console.log(`
╔══════════════════════════════════════════════╗
║  🚀 Multiplayer Quiz System Backend Started  ║
║  🌐 Server: http://localhost:${config.PORT}            ║
║  🔧 Environment: ${config.NODE_ENV.padEnd(29)}║
║  💾 Database: MongoDB Connected              ║
║  📝 Health Check: GET /api/health            ║
╚══════════════════════════════════════════════╝
      `);
    });

    /**
     * Handle graceful shutdown
     */
    const gracefulShutdown = (signal: string) => {
      console.log(`\n[${signal}] Shutting down gracefully...`);
      server.close(() => {
        console.log("Server closed");
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error("Forced shutdown");
        process.exit(1);
      }, 10000);
    };

    // Listen for shutdown signals
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    /**
     * Handle uncaught exceptions
     */
    process.on("uncaughtException", (error) => {
      console.error("Uncaught Exception:", error);
      process.exit(1);
    });

    process.on("unhandledRejection", (reason, promise) => {
      console.error("Unhandled Rejection at:", promise, "reason:", reason);
      process.exit(1);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// Start the server
startServer();
