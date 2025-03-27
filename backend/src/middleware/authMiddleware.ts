import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/auth";
import User from "../models/User";

// ✅ 1. Custom tip cast ile `req.user`'a erişim
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

    // ❗ Cast ekliyoruz:
    (req as Request & { user?: { id: string; role: "admin" | "user" } }).user =
      {
        id: decoded.id,
        role: decoded.role,
      };

    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

// ✅ 2. Diğer fonksiyonda da cast ekliyoruz
export const authorizeRole = (role: "admin" | "user") => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const typedReq = req as Request & {
      user?: { id: string; role: "admin" | "user" };
    };

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
