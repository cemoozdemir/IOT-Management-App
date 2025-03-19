import express, { Request, Response } from "express";
import { authenticate } from "../middleware/authMiddleware";
import Device from "../models/Device";

const router = express.Router();

router.post(
  "/",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, type } = req.body;
      const newDevice = await Device.create({
        name,
        type,
        userId: req.user?.id,
      });
      res.status(201).json(newDevice);
    } catch (err) {
      res.status(500).json({ error: "Failed to create device" });
    }
  }
);

router.get(
  "/",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const devices = await Device.findAll({ where: { userId: req.user?.id } });
      res.json(devices);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch devices" });
    }
  }
);

router.put(
  "/:id",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, type, status } = req.body;
      const device = await Device.findOne({
        where: { id: req.params.id, userId: req.user?.id },
      });

      if (!device) {
        res.status(404).json({ error: "Device not found" });
        return;
      }

      await device.update({ name, type, status });
      res.json(device);
    } catch (err) {
      res.status(500).json({ error: "Failed to update device" });
    }
  }
);

router.delete(
  "/:id",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const deleted = await Device.destroy({
        where: { id: req.params.id, userId: req.user?.id },
      });

      if (!deleted) {
        res.status(404).json({ error: "Device not found" });
        return;
      }

      res.json({ message: "Device deleted successfully" });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete device" });
    }
  }
);

export default router;
