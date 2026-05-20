import type { FastifyInstance } from "fastify";

import { ensureAuthenticated } from "./ensure-authenticated";
import { ensureRole } from "./ensure-role";

/**
 * Registra os decorators `ensureAuthenticated` e `ensureRole` na instância
 * Fastify. Precisa rodar APÓS `@fastify/cookie` (os middlewares dependem
 * de `request.unsignCookie`) e ANTES das rotas.
 */
export function registerAuthDecorators(app: FastifyInstance): void {
    app.decorate("ensureAuthenticated", ensureAuthenticated);
    app.decorate("ensureRole", ensureRole);
}
