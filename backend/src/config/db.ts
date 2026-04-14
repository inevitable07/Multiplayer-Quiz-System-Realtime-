import mongoose from "mongoose";
import config from "./env";

/**
 * MongoDB Connection Configuration
 * Handles connection to MongoDB using Mongoose
 */

/**
 * Connect to MongoDB
 * @returns Promise that resolves when connected
 */
export const connectDB = async (): Promise<void> => {
  try {
    console.log("📊 Connecting to MongoDB...");
    
    await mongoose.connect(config.MONGO_URI, {
      retryWrites: true,
      w: "majority",
    });

    console.log("✅ MongoDB connected successfully");
    
    // Log connection info in development
    if (config.NODE_ENV === "development") {
      console.log(`   Host: ${mongoose.connection.host}`);
      console.log(`   Database: ${mongoose.connection.name}`);
    }
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    
    // Log more details in development
    if (config.NODE_ENV === "development") {
      console.error("   Check your MONGO_URI in .env file");
      console.error("   Current URI:", config.MONGO_URI);
    }
    
    process.exit(1);
  }
};

/**
 * Disconnect from MongoDB
 * @returns Promise that resolves when disconnected
 */
export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log("📊 MongoDB disconnected");
  } catch (error) {
    console.error("❌ MongoDB disconnection failed:", error);
    process.exit(1);
  }
};

/**
 * Handle MongoDB connection events
 */
mongoose.connection.on("connected", () => {
  console.log("📊 Mongoose connected to MongoDB");
});

mongoose.connection.on("error", (error) => {
  console.error("❌ Mongoose connection error:", error);
});

mongoose.connection.on("disconnected", () => {
  console.log("📊 Mongoose disconnected from MongoDB");
});

// Handle signal interruption
process.on("SIGINT", async () => {
  await disconnectDB();
  process.exit(0);
});

export default mongoose;
