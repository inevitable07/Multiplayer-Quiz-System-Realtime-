import jwt, { JwtPayload } from "jsonwebtoken";
import config from "../config/env";

/**
 * JWT Payload Interface
 * Defines the structure of the JWT payload
 */
export interface ITokenPayload extends JwtPayload {
  userId: string;
}

/**
 * Generate JWT Token
 * Creates a signed JWT token with the userId
 *
 * @param userId - The user ID to encode in the token
 * @returns The generated JWT token
 */
export const generateToken = (userId: string): string => {
  return jwt.sign(
    { userId } as ITokenPayload,
    config.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

/**
 * Verify JWT Token
 * Verifies and decodes a JWT token
 *
 * @param token - The token to verify
 * @returns The decoded token payload
 * @throws Error if token is invalid or expired
 */
export const verifyToken = (token: string): ITokenPayload => {
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as ITokenPayload;
    return decoded;
  } catch (error) {
    throw new Error(`Invalid or expired token: ${(error as Error).message}`);
  }
};

/**
 * Extract Token from Authorization Header
 * Extracts the Bearer token from the Authorization header
 *
 * @param authHeader - The Authorization header value
 * @returns The extracted token or null
 */
export const extractTokenFromHeader = (authHeader?: string): string | null => {
  if (!authHeader) return null;

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return null;
  }

  return parts[1];
};
