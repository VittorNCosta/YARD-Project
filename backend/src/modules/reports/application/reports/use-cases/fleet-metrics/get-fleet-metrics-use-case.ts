import HttpStatusCode from "@/core/enums/http-status-code";
import { UseCaseError } from "@/core/errors/use-case-error";
import type { DatabaseOptions } from "@/core/types/database-options";
import type { FleetReport } from "@/modules/reports/domain/reports/dtos/fleet-report";
import { UserRole } from "@/modules/user/domain/user/enums/user-role";
import { UserRepository } from "@/modules/user/domain/user/repositories/user-repository";
import { VehicleRepository } from "@/modules/vehicle/domain/vehicle/repositories/vehicle-repository";
import { inject, injectable } from "tsyringe";

export interface GetFleetMetricsUseCaseRequest {
    /**
     * Limites de período (ISO 8601). Quando ausentes, considera toda a base.
     */
    from?: Date;
    to?: Date;
    /**
     * Papel do solicitante. Determina se o bloco `usersByRole` é incluído
     * — esse dado é restrito a admins por carregar contagem total de
     * usuários do sistema.
     */
    requesterRole: UserRole;
    databaseOptions?: DatabaseOptions;
}

export type GetFleetMetricsUseCaseResponse = FleetReport;

/**
 * Compila o DTO `FleetReport` consumido pela tela de Relatórios → Frota.
 *
 * Decisões:
 * - Toda a agregação pesada vive nos repositórios (`aggregateMetrics`).
 *   O use-case só compõe KPIs derivados, formata percentuais e aplica
 *   regra de autorização.
 * - Percentuais são pré-calculados aqui para que cada cliente HTTP/CLI
 *   não precise reimplementar o arredondamento.
 */
@injectable()
export class GetFleetMetricsUseCase {
    constructor(
        @inject("VehicleRepository")
        private readonly vehicleRepository: VehicleRepository,
        @inject("UserRepository")
        private readonly userRepository: UserRepository
    ) {}

    async execute(
        request: GetFleetMetricsUseCaseRequest
    ): Promise<GetFleetMetricsUseCaseResponse> {
        const { from, to, requesterRole, databaseOptions } = request;

        if (from && to && from.getTime() > to.getTime()) {
            throw new UseCaseError(
                "reports.invalid-period",
                HttpStatusCode.BAD_REQUEST
            );
        }

        const metrics = await this.vehicleRepository.aggregateMetrics(
            { from, to },
            databaseOptions
        );

        const total = metrics.total;

        const activeCount =
            metrics.countByActiveStatus.find((b) => b.key === "Ativo")?.count ??
            0;
        const weighingCount = metrics.countByWeighingRequired.required;

        const kpis = {
            totalVehicles: total,
            activePercentage: this.toRoundedPercentage(activeCount, total),
            weighingRequiredPercentage: this.toRoundedPercentage(
                weighingCount,
                total
            ),
            distinctVehicleTypes: metrics.countByType.length,
        };

        const composition = {
            byVehicleType: this.withPercentages(
                metrics.countByType.map((b) => ({ key: b.key, count: b.count })),
                total
            ),
            byActiveStatus: this.withPercentages(
                metrics.countByActiveStatus.map((b) => ({
                    key: b.key,
                    count: b.count,
                })),
                total
            ),
            byWeighingRequired: this.withPercentages(
                [
                    {
                        key: "Obrigatória",
                        count: metrics.countByWeighingRequired.required,
                    },
                    {
                        key: "Não obrigatória",
                        count: metrics.countByWeighingRequired.notRequired,
                    },
                ],
                total
            ),
        };

        const registrationsByMonth = metrics.registrationsByMonth.map((b) => ({
            month: b.month,
            count: b.count,
        }));

        let usersByRole: FleetReport["usersByRole"];
        if (requesterRole === UserRole.ADMIN) {
            const roleBuckets = await this.userRepository.countByRole(
                databaseOptions
            );
            usersByRole = roleBuckets.map((b) => ({
                role: b.role,
                count: b.count,
            }));
        }

        return {
            generatedAt: new Date().toISOString(),
            period: {
                from: from ? from.toISOString() : null,
                to: to ? to.toISOString() : null,
            },
            kpis,
            composition,
            registrationsByMonth,
            ...(usersByRole !== undefined ? { usersByRole } : {}),
        };
    }

    private toRoundedPercentage(part: number, total: number): number {
        if (total === 0) return 0;
        return Math.round((part / total) * 100);
    }

    private withPercentages(
        buckets: Array<{ key: string; count: number }>,
        total: number
    ): Array<{ key: string; count: number; percentage: number }> {
        return buckets.map((b) => ({
            key: b.key,
            count: b.count,
            percentage:
                total === 0
                    ? 0
                    : Math.round((b.count / total) * 1000) / 10,
        }));
    }
}
