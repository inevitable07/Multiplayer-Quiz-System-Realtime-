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
  
  // Add more environment variables here as needed
  // DATABASE_URL: process.env.DATABASE_URL,
  // REDIS_URL: process.env.REDIS_URL,
  // JWT_SECRET: process.env.JWT_SECRET,
};

/**
 * Validate that required environment variables are set
 */
const validateConfig = () => {
  const required = ["PORT"];
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
