import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/auth";
import User from "../models/User";

// Ensure req.user is recognized
interface AuthRequest extends Request {
  user?: { id: string; role: "admin" | "user" };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const decoded = verifyToken(token);
    req.user = { id: decoded.id, role: decoded.role };

    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

export const authorizeRole = (role: "admin" | "user") => {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      res.status(403).json({ error: "User not authenticated" });
      return;
    }

    const user = await User.findByPk(req.user.id);
    if (!user || user.role !== role) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
};
