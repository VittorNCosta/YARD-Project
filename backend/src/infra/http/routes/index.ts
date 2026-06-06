import type { FastifyInstance } from "fastify";

import { authRoutes } from "@/modules/auth/infra/auth/http/routes/auth.routes";
import { reportsRoutes } from "@/modules/reports/infra/reports/http/routes/reports.routes";
import { userRoutes } from "@/modules/user/infra/user/http/routes/user.routes";
import { vehicleRoutes } from "@/modules/vehicle/infra/vehicle/http/routes/vehicle.routes";

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
    await app.register(reportsRoutes);
}
