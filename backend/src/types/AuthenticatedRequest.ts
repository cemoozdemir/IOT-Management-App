import { Request } from "express";

export type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    role: "admin" | "user";
  };
};
