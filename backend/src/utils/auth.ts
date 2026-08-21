import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { requireEnv } from "../config/env";

const SECRET_KEY = requireEnv("JWT_SECRET");

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePasswords = async (
  password: string,
  hashed: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashed);
};

export const generateToken = (
  userId: string,
  expiresIn: SignOptions["expiresIn"] = "30d"
) => {
  return jwt.sign({ id: userId }, SECRET_KEY, { expiresIn });
};

export interface AuthTokenPayload extends JwtPayload {
  id: string;
}

export const verifyToken = (token: string): AuthTokenPayload => {
  const decoded = jwt.verify(token, SECRET_KEY);

  if (
    typeof decoded === "string" ||
    typeof decoded.id !== "string" ||
    decoded.id.trim() === ""
  ) {
    throw new Error("Invalid token payload");
  }

  return decoded as AuthTokenPayload;
};
