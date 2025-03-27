import jwt, { SignOptions } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const SECRET_KEY = process.env.JWT_SECRET || "default_secret_key";

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

export const verifyToken = (token: string): any => {
  return jwt.verify(token, SECRET_KEY);
};
