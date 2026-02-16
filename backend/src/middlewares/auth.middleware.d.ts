import type { Request, Response, NextFunction } from "express";

interface JwtPayload {
  userId: string;
  email?: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

declare const authMiddleware: (req: AuthRequest, res: Response, next: NextFunction) => void;

export default authMiddleware;
