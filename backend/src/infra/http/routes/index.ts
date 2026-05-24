import type { FastifyInstance } from "fastify";

import { authRoutes } from "@/modules/auth/infra/auth/http/routes/auth.routes";
import { userRoutes } from "@/modules/user/infra/user/http/routes/user.routes";
import { vehicleRoutes } from "@/modules/vehicle/infra/vehicle/http/routes/vehicle.routes";
import { dockRoutes } from "@/modules/yard/infra/dock/http/routes/dock.routes";
import { yardMovementRoutes } from "@/modules/yard/infra/yard-movement/http/routes/yard-movement.routes";

/**
 * Registro central de rotas HTTP da aplicação.
 *
 * Cada módulo registra seu grupo de rotas aqui. O prefixo `/api` é aplicado
 * pelo caller (`buildApp`) para manter compatibilidade com o contrato legado
 * consumido pelo frontend.
 */
export async function registerRoutes(app: FastifyInstance): Promise<void> {
    await app.register(authRoutes);
    await app.register(userRoutes);
    await app.register(vehicleRoutes);
    await app.register(dockRoutes);
    await app.register(yardMovementRoutes);
}
