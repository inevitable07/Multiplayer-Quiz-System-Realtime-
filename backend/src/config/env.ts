import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

/**
 * Environment configuration
 * Centralized place to manage all environment variables
 */
const config = {
  // Server
  PORT: parseInt(process.env.PORT || "5000", 10),
  NODE_ENV: process.env.NODE_ENV || "development",
  
  // Database
  MONGO_URI: process.env.MONGO_URI || "mongodb://localhost:27017/quiz-system",
  
  // Authentication
  JWT_SECRET: process.env.JWT_SECRET || "your-default-secret-key",
  JWT_EXPIRY: process.env.JWT_EXPIRY || "7d",
  
  // Add more environment variables here as needed
  // REDIS_URL: process.env.REDIS_URL,
};

/**
 * Validate that required environment variables are set
 */
const validateConfig = () => {
  const required = ["PORT", "MONGO_URI"];
  const missing = required.filter(
    (key) => !Object.prototype.hasOwnProperty.call(config, key)
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
};

validateConfig();

export default config;
