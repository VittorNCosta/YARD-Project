import HttpStatusCode from "@/core/enums/http-status-code";
import { zodValidationSchema } from "@/infra/http/utils/zod/zod-validation-schema";
import { GetFleetMetricsUseCase } from "@/modules/reports/application/reports/use-cases/fleet-metrics/get-fleet-metrics-use-case";
import { FleetReportPresenter } from "@/modules/reports/infra/reports/presenter/fleet-report-presenter";
import { UserRole } from "@/modules/user/domain/user/enums/user-role";
import type { FastifyReply, FastifyRequest } from "fastify";
import { container } from "tsyringe";

import { getFleetMetricsQuerySchema } from "./get-fleet-metrics.schema";

/**
 * GET /api/reports/fleet
 *
 * Devolve `{ success, data: FleetReport }`. Quando o caller é admin,
 * `data.usersByRole` é incluído pelo use-case — o controller só repassa.
 *
 * Decisões:
 * - O papel do solicitante vem do JWT decodificado por
 *   `app.ensureAuthenticated` (`request.user`); usamos o decorator do
 *   Fastify, não consultamos o DB de novo.
 */
export class GetFleetMetricsController {
    async handle(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const query = zodValidationSchema(
            getFleetMetricsQuerySchema,
            request.query
        );

        const useCase = container.resolve(GetFleetMetricsUseCase);

        const requesterRole = request.user?.role ?? UserRole.USER;

        const report = await useCase.execute({
            from: query.from ? new Date(query.from) : undefined,
            to: query.to ? new Date(query.to) : undefined,
            requesterRole,
        });

        reply.status(HttpStatusCode.OK).send({
            success: true,
            data: FleetReportPresenter.toHTTP(report),
        });
    }
}
