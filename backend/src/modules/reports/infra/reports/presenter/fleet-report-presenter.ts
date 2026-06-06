import type { FleetReport } from "@/modules/reports/domain/reports/dtos/fleet-report";

/**
 * Presenter do FleetReport.
 *
 * O DTO já é pensado para o cliente — números pré-arredondados, datas
 * em ISO 8601. O presenter existe para:
 *  1. Manter o ponto de extensão caso queiramos i18n de keys
 *     (ex.: "Truck" → "Caminhão") no servidor no futuro.
 *  2. Garantir explicitamente o shape devolvido ao frontend,
 *     blindando contra propriedades novas do DTO escaparem por engano.
 */
export class FleetReportPresenter {
    static toHTTP(report: FleetReport): FleetReport {
        return {
            generatedAt: report.generatedAt,
            period: report.period,
            kpis: report.kpis,
            composition: report.composition,
            registrationsByMonth: report.registrationsByMonth,
            ...(report.usersByRole !== undefined
                ? { usersByRole: report.usersByRole }
                : {}),
        };
    }
}
