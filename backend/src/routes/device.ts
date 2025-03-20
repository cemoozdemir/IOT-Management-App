import express, { Request, Response, NextFunction } from "express";
import { authenticate } from "../middleware/authMiddleware";
import Device from "../models/Device";

const router = express.Router();

interface AuthRequest extends Request {
  user?: { id: string; role: "admin" | "user" };
}

// Create a new device
router.post(
  "/",
  authenticate,
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { name, type } = req.body;

      if (!req.user) {
        res.status(403).json({ error: "User not authenticated" });
        return;
      }

      const newDevice = await Device.create({
        name,
        type,
        userId: req.user.id,
      });

      res.status(201).json(newDevice);
    } catch (err) {
      next(err); // Use Express's error handling middleware
    }
  }
);

// Get all devices for the authenticated user
router.get(
  "/",
  authenticate,
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(403).json({ error: "User not authenticated" });
        return;
      }

      const devices = await Device.findAll({ where: { userId: req.user.id } });
      res.json(devices);
    } catch (err) {
      next(err);
    }
  }
);

// Update a device
router.put(
  "/:id",
  authenticate,
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { name, type, status } = req.body;

      if (!req.user) {
        res.status(403).json({ error: "User not authenticated" });
        return;
      }

      const device = await Device.findOne({
        where: { id: req.params.id, userId: req.user.id },
      });

      if (!device) {
        res.status(404).json({ error: "Device not found" });
        return;
      }

      await device.update({ name, type, status });
      res.json(device);
    } catch (err) {
      next(err);
    }
  }
);

// Delete a device
router.delete(
  "/:id",
  authenticate,
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(403).json({ error: "User not authenticated" });
        return;
      }

      const deleted = await Device.destroy({
        where: { id: req.params.id, userId: req.user.id },
      });

      if (!deleted) {
        res.status(404).json({ error: "Device not found" });
        return;
      }

      res.json({ message: "Device deleted successfully" });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
