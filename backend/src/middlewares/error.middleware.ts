// src/middlewares/error.middleware.ts
import type { Request, Response, NextFunction } from "express";

export interface CustomError extends Error {
  status?: number;
}

export default function errorMiddleware(
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error("❌ Erro capturado pelo middleware:", err);

  const status = err.status || 500;
  const message = err.message || "Erro interno do servidor";

  res.status(status).json({
    success: false,
    message
  });
}
