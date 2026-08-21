import express, { Request, Response, Router } from "express";
import User from "../models/User";
import { hashPassword, comparePasswords, generateToken } from "../utils/auth";
import { authenticate } from "../middleware/authMiddleware";
import { AuthenticatedRequest } from "types/AuthenticatedRequest";

const router: Router = express.Router();

interface AuthRequestBody {
  email: string;
  password: string;
}

// REGISTER
export const registerHandler = async (
  req: Request<{}, {}, AuthRequestBody>,
  res: Response
): Promise<void> => {
  try {
    const { email, password } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      res.status(400).json({ error: "User already exists" });
      return;
    }

    const hashedPassword = await hashPassword(password);
    const user = await User.create({
      email,
      password: hashedPassword,
      role: "user",
    });

    const token = generateToken(user.id);

    res.status(201).json({
      message: "User registered",
      userId: user.id,
      role: user.role,
      token,
    });
  } catch (err) {
    console.error("❌ Register error (detailed):", JSON.stringify(err, null, 2));
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

type TokenDuration = "30d" | "90d" | "180d";

const ALLOWED_TOKEN_DURATIONS =
  new Set<TokenDuration>(["30d", "90d", "180d"]);

const isTokenDuration = (
  value: unknown
): value is TokenDuration => {
  return (
    typeof value === "string" &&
    ALLOWED_TOKEN_DURATIONS.has(value as TokenDuration)
  );
};

export const tokenHandler = (
  req: AuthenticatedRequest,
  res: Response
): void => {
  const requestedDuration = req.body?.duration;
  const duration =
    requestedDuration === undefined
      ? "30d"
      : requestedDuration;

  if (!isTokenDuration(duration)) {
    res.status(400).json({
      error: "Invalid token duration",
    });
    return;
  }

  const token = generateToken(
    req.user!.id,
    duration
  );

  res.json({ token });
};

router.post(
  "/token",
  authenticate,
  tokenHandler
);

// Routes
router.post("/register", registerHandler);
router.post("/login", loginHandler);

export default router;
