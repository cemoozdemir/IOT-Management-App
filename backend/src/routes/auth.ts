import express, { Request, Response, Router } from "express";
import User from "../models/User";
import { hashPassword, comparePasswords, generateToken } from "../utils/auth";
import { authenticate } from "../middleware/authMiddleware";
import { AuthenticatedRequest } from "types/AuthenticatedRequest";

const router: Router = express.Router();

interface AuthRequestBody {
  email: string;
  password: string;
  role: string;
}

// REGISTER
const registerHandler = async (
  req: Request<{}, {}, AuthRequestBody>,
  res: Response
): Promise<void> => {
  try {
    const { email, password, role } = req.body;

    if (!["admin", "user"].includes(role)) {
      res.status(400).json({ error: "Invalid role" });
      return;
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      res.status(400).json({ error: "User already exists" });
      return;
    }

    const hashedPassword = await hashPassword(password);
    const user = await User.create({ email, password: hashedPassword, role });

    res.status(201).json({
      message: "User registered",
      userId: user.id,
      role: user.role,
    });
  } catch (err) {
    console.error(
      "❌ Register error (detailed):",
      JSON.stringify(err, null, 2)
    );
    res.status(500).json({ error: "Server error" });
  }
};

// LOGIN
const loginHandler = async (
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
    console.error("❌ Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

router.post(
  "/token",
  authenticate,
  (req: AuthenticatedRequest, res: Response) => {
    const { duration } = req.body;
    const token = generateToken(req.user!.id, duration || "30d");
    res.json({ token });
  }
);

// Routes
router.post("/register", registerHandler);
router.post("/login", loginHandler);

export default router;
