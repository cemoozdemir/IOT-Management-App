import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/auth";
import User from "../models/User";
import { AuthenticatedRequest } from "../types/AuthenticatedRequest";

export const authenticate = async (
  req: Request,
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

    (req as AuthenticatedRequest).user = {
      id: decoded.id,
    };

    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

export const authorizeRole = (role: "admin" | "user") => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const typedReq = req as AuthenticatedRequest;

    if (!typedReq.user) {
      res.status(403).json({ error: "User not authenticated" });
      return;
    }

    const user = await User.findByPk(typedReq.user.id);

    if (!user || user.role !== role) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    next();
  };
};
