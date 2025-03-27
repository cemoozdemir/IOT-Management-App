// src/global.d.ts

// Bu dosyayı herhangi bir import veya reference olmadan, TS global tipler olarak yükleyecektir.
import "express";

declare module "express-serve-static-core" {
  interface Request {
    user?: {
      id: string;
      role: "admin" | "user";
    };
  }
}
