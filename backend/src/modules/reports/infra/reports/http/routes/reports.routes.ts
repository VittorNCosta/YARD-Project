import type { FastifyInstance } from "fastify";

import { GetFleetMetricsController } from "@/modules/reports/infra/reports/controllers/fleet-metrics/get-fleet-metrics.controller";

/**
 * Rotas do módulo Reports.
 *
 *   GET /api/reports/fleet      (autenticado)
 *
 * O prefixo `/api` é aplicado por `infra/http/app.ts` via `registerRoutes`.
 */
export async function reportsRoutes(app: FastifyInstance): Promise<void> {
    const getFleetMetricsController = new GetFleetMetricsController();

    app.get("/reports/fleet", {
        onRequest: [app.ensureAuthenticated],
        handler: (req, reply) => getFleetMetricsController.handle(req, reply),
    });
}
