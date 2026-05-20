import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance } from "fastify";

import { env } from "@/config/env";
import { registerAuthDecorators } from "@/infra/http/middlewares/auth-decorators";
import { errorHandler } from "@/infra/http/middlewares/error-handler";
import { registerRoutes } from "@/infra/http/routes";

/**
 * Constrói a instância Fastify aplicando, na ordem:
 *
 *   1. Helmet — CSP estrita + HSTS + nosniff + frameguard.
 *   2. @fastify/cookie — assina cookies via COOKIE_SECRET.
 *   3. CORS apertado — `origin: env.FRONTEND_URL`, `credentials: true`.
 *   4. Rate limit global — 100 req/min/IP (rotas de auth sobrepõem para 5).
 *   5. Decorators de auth (ensureAuthenticated/ensureRole) — dependem
 *      de cookie já registrado.
 *   6. Routes (prefix `/api`).
 *   7. Error handler global (não vaza stack em prod).
 *
 * Sem `listen()` — entry-point (`infra/server.ts`) que decide.
 */
export async function buildApp(): Promise<FastifyInstance> {
    const app = Fastify({
        logger: false,
    });

    await app.register(helmet, {
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", "data:"],
                frameAncestors: ["'none'"],
            },
        },
        hsts: { maxAge: 31_536_000, includeSubDomains: true },
        noSniff: true,
        frameguard: { action: "deny" },
    });

    await app.register(cookie, {
        secret: env.COOKIE_SECRET,
    });

    await app.register(cors, {
        origin: env.FRONTEND_URL,
        credentials: true,
    });

    await app.register(rateLimit, {
        max: 100,
        timeWindow: "1 minute",
    });

    registerAuthDecorators(app);

    app.setErrorHandler(errorHandler);

    await app.register(registerRoutes, { prefix: "/api" });

    return app;
}
