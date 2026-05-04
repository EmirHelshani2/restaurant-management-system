import jwt from "jsonwebtoken";
import { logger } from "./logger";

const SECRET = process.env.SESSION_SECRET ?? "restorapro-dev-secret-2024";

export interface JwtPayload {
  userId: number;
  role: string;
  email: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, SECRET) as JwtPayload;
  } catch {
    logger.debug("Invalid JWT token");
    return null;
  }
}
