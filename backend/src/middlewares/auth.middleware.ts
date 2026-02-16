// src/middlewares/auth.middleware.ts
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getEnvVar } from "../utils/env.js"; // ⚠️ .js para Node ESM

interface JwtPayload {
    userId: string;
    email?: string;
}

export interface AuthRequest extends Request {
    user?: JwtPayload;
}

export default function authMiddleware(
    req: AuthRequest,
    res: Response,
    next: NextFunction
): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ success: false, message: "Token não fornecido" });
        return;
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
        res.status(401).json({ success: false, message: "Token mal formatado" });
        return;
    }

    const secret: string = getEnvVar("JWT_SECRET");

    const payload = jwt.verify(token, secret) as JwtPayload;
}
