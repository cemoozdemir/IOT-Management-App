import express, { Request, Response, Router } from "express";
import User from "../models/User";
import { hashPassword, comparePasswords, generateToken } from "../utils/auth";

const router: Router = express.Router();

interface AuthRequestBody {
  email: string;
  password: string;
}

// Register Route
router.post(
  "/register",
  async (
    req: Request<{}, {}, AuthRequestBody>,
    res: Response
  ): Promise<void> => {
    try {
      const { email, password } = req.body;
      const hashedPassword = await hashPassword(password);
      const user = await User.create({ email, password: hashedPassword });
      res.status(201).json({ message: "User registered", userId: user.id });
    } catch (err) {
      res.status(400).json({ error: "User already exists" });
    }
  }
);

// Login Route
router.post(
  "/login",
  async (
    req: Request<{}, {}, AuthRequestBody>,
    res: Response
  ): Promise<void> => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ where: { email } });

      if (!user || !(await comparePasswords(password, user.password))) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      const token = generateToken(user.id);
      res.json({ token });
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  }
);

export default router;
