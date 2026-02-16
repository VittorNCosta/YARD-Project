// src/middlewares/error.middleware.d.ts
import type { Request, Response, NextFunction } from "express";

export interface CustomError extends Error {
  status?: number;
}

declare const errorMiddleware: (err: CustomError, req: Request, res: Response, next: NextFunction) => void;

export default errorMiddleware;
