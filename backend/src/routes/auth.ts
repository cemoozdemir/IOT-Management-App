import express, {
  Request,
  Response,
  Router,
} from "express";
import {
  col,
  fn,
  UniqueConstraintError,
  where,
} from "sequelize";
import User from "../models/User";
import {
  loginRateLimiter,
  registerRateLimiter,
} from "../middleware/rateLimits";
import {
  comparePasswords,
  generateToken,
  hashPassword,
} from "../utils/auth";
import {
  validateAuthBody,
} from "../utils/requestValidation";

const router: Router =
  express.Router();

const findUserByEmail =
  async (
    normalizedEmail:
      string
  ) => {
    return User.findOne({
      where:
        where(
          fn(
            "lower",
            col("email")
          ),
          normalizedEmail
        ),
    });
  };

// Public registration always creates
// a normal user. Client-provided roles
// are deliberately ignored.
export const registerHandler =
  async (
    req:
      Request<
        {},
        {},
        unknown
      >,
    res:
      Response
  ): Promise<void> => {
    const validation =
      validateAuthBody(
        req.body,
        "register"
      );

    if (!validation.ok) {
      res.status(400).json({
        error:
          validation.error,
      });
      return;
    }

    const {
      email,
      password,
    } = validation.value;

    try {
      const existingUser =
        await findUserByEmail(
          email
        );

      if (existingUser) {
        res.status(400).json({
          error:
            "User already exists",
        });
        return;
      }

      const hashedPassword =
        await hashPassword(
          password
        );

      const user =
        await User.create({
          email,
          password:
            hashedPassword,
          role:
            "user",
        });

      const token =
        generateToken(
          user.id
        );

      res.status(201).json({
        message:
          "User registered",
        userId:
          user.id,
        role:
          user.role,
        token,
      });
    } catch (error) {
      if (
        error instanceof
        UniqueConstraintError
      ) {
        res.status(400).json({
          error:
            "User already exists",
        });
        return;
      }

      // Never serialize request data,
      // password values or database
      // exception details into logs.
      console.error(
        "Register request failed"
      );

      res.status(500).json({
        error:
          "Server error",
      });
    }
  };

export const loginHandler =
  async (
    req:
      Request<
        {},
        {},
        unknown
      >,
    res:
      Response
  ): Promise<void> => {
    const validation =
      validateAuthBody(
        req.body,
        "login"
      );

    if (!validation.ok) {
      res.status(400).json({
        error:
          validation.error,
      });
      return;
    }

    const {
      email,
      password,
    } = validation.value;

    try {
      const user =
        await findUserByEmail(
          email
        );

      if (
        !user ||
        !(
          await comparePasswords(
            password,
            user.password
          )
        )
      ) {
        res.status(401).json({
          error:
            "Invalid credentials",
        });
        return;
      }

      const token =
        generateToken(
          user.id
        );

      res.json({
        token,
      });
    } catch {
      console.error(
        "Login request failed"
      );

      res.status(500).json({
        error:
          "Server error",
      });
    }
  };

router.post(
  "/register",
  registerRateLimiter,
  registerHandler
);

router.post(
  "/login",
  loginRateLimiter,
  loginHandler
);

export default router;
