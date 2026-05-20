import { env } from "@/config/env";
import {
    type AccessTokenPayload,
    type RefreshTokenPayload,
    TokenService,
} from "@/modules/auth/domain/auth/services/token-service";
import type { UserRole } from "@/modules/user/domain/user/enums/user-role";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import { injectable } from "tsyringe";

/**
 * Implementação concreta de `TokenService` com `jsonwebtoken` (HS256).
 *
 * Secrets e TTLs vêm do env validado via Zod. Erros de verificação
 * (assinatura inválida, expirado, malformado) são re-lançados pelo callee
 * e tratados pelos use cases que disparam mensagens genéricas.
 */
@injectable()
export class JwtTokenService extends TokenService {
    async signAccess(payload: AccessTokenPayload): Promise<string> {
        const opts: SignOptions = {
            algorithm: "HS256",
            expiresIn: env.JWT_ACCESS_TTL as SignOptions["expiresIn"],
        };
        return jwt.sign(
            { sub: payload.sub, role: payload.role },
            env.JWT_ACCESS_SECRET,
            opts
        );
    }

    async signRefresh(payload: RefreshTokenPayload): Promise<string> {
        const opts: SignOptions = {
            algorithm: "HS256",
            expiresIn: env.JWT_REFRESH_TTL as SignOptions["expiresIn"],
        };
        return jwt.sign(
            { sub: payload.sub, sid: payload.sid },
            env.JWT_REFRESH_SECRET,
            opts
        );
    }

    async verifyAccess(token: string): Promise<AccessTokenPayload> {
        const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
            algorithms: ["HS256"],
        }) as JwtPayload;

        if (
            typeof decoded.sub !== "string" ||
            typeof decoded.role !== "string"
        ) {
            throw new Error("invalid access token payload");
        }
        return { sub: decoded.sub, role: decoded.role as UserRole };
    }

    async verifyRefresh(token: string): Promise<RefreshTokenPayload> {
        const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET, {
            algorithms: ["HS256"],
        }) as JwtPayload;

        if (
            typeof decoded.sub !== "string" ||
            typeof (decoded as { sid?: unknown }).sid !== "string"
        ) {
            throw new Error("invalid refresh token payload");
        }
        return {
            sub: decoded.sub,
            sid: (decoded as { sid: string }).sid,
        };
    }
}
