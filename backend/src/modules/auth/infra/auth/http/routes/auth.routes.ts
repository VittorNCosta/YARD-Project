import type { FastifyInstance } from "fastify";

import { ForgotPasswordController } from "@/modules/auth/infra/auth/controllers/forgot-password/forgot-password.controller";
import { LoginController } from "@/modules/auth/infra/auth/controllers/login/login.controller";
import { LogoutController } from "@/modules/auth/infra/auth/controllers/logout/logout.controller";
import { MeController } from "@/modules/auth/infra/auth/controllers/me/me.controller";
import { RefreshController } from "@/modules/auth/infra/auth/controllers/refresh/refresh.controller";
import { RegisterController } from "@/modules/auth/infra/auth/controllers/register/register.controller";
import { ResetPasswordController } from "@/modules/auth/infra/auth/controllers/reset-password/reset-password.controller";

/**
 * Rotas do módulo Auth.
 *
 *   POST /auth/register          — público (rate-limit 5/min)
 *   POST /auth/login             — público (rate-limit 5/min)
 *   POST /auth/refresh           — usa cookie de refresh (não requer access)
 *   POST /auth/logout            — autenticado, revoga session
 *   GET  /auth/me                — autenticado, devolve user atual
 *   POST /auth/forgot-password   — público (rate-limit 3/min/IP) — sempre 200
 *   POST /auth/reset-password    — público (rate-limit 5/min/IP)
 *
 * Prefixo `/api` aplicado pelo barrel `infra/http/routes/index.ts`.
 */
export async function authRoutes(app: FastifyInstance): Promise<void> {
    const registerController = new RegisterController();
    const loginController = new LoginController();
    const refreshController = new RefreshController();
    const logoutController = new LogoutController();
    const meController = new MeController();
    const forgotPasswordController = new ForgotPasswordController();
    const resetPasswordController = new ResetPasswordController();

    app.post("/auth/register", {
        config: {
            rateLimit: { max: 5, timeWindow: "1 minute" },
        },
        handler: (req, reply) => registerController.handle(req, reply),
    });

    app.post("/auth/login", {
        config: {
            rateLimit: { max: 5, timeWindow: "1 minute" },
        },
        handler: (req, reply) => loginController.handle(req, reply),
    });

    // Refresh NÃO usa ensureAuthenticated — verifica via cookie de refresh.
    app.post("/auth/refresh", {
        handler: (req, reply) => refreshController.handle(req, reply),
    });

    app.post("/auth/logout", {
        handler: (req, reply) => logoutController.handle(req, reply),
    });

    app.get("/auth/me", {
        onRequest: [app.ensureAuthenticated],
        handler: (req, reply) => meController.handle(req, reply),
    });

    // Password reset endpoints — public, rate-limited.
    app.post("/auth/forgot-password", {
        config: {
            rateLimit: { max: 3, timeWindow: "1 minute" },
        },
        handler: (req, reply) =>
            forgotPasswordController.handle(req, reply),
    });

    app.post("/auth/reset-password", {
        config: {
            rateLimit: { max: 5, timeWindow: "1 minute" },
        },
        handler: (req, reply) =>
            resetPasswordController.handle(req, reply),
    });
}
