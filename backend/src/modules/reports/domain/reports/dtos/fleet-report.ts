/**
 * DTO consumido pela tela de Relatórios (frota).
 *
 * Mora no domain porque é o **contrato** entre o use-case `reports` e
 * qualquer consumidor (HTTP, fila, CLI). Não depende de Mongo, Fastify
 * ou Zod — é apenas um shape de dados.
 *
 * Quando este DTO for evoluído (novo KPI, novo gráfico), o use-case
 * `GetFleetMetricsUseCase` é o único responsável por produzí-lo a
 * partir dos repositórios.
 */
export interface FleetReportKpis {
    /** Total de veículos cadastrados no período. */
    totalVehicles: number;
    /** Percentual ativos (0–100, inteiro arredondado). */
    activePercentage: number;
    /** Percentual com pesagem obrigatória (0–100, inteiro arredondado). */
    weighingRequiredPercentage: number;
    /** Quantidade de tipos distintos de veículo presentes. */
    distinctVehicleTypes: number;
}

/** Bucket genérico chave/valor para gráficos de categoria. */
export interface FleetReportBucket {
    key: string;
    count: number;
    /** Percentual sobre o total (0–100, com 1 casa decimal). */
    percentage: number;
}

/** Bucket de evolução por mês (YYYY-MM). */
export interface FleetReportMonthlyBucket {
    month: string;
    count: number;
}

/** Bucket de contagem de usuários por papel (somente admin). */
export interface FleetReportRoleBucket {
    role: string;
    count: number;
}

export interface FleetReport {
    generatedAt: string;
    period: {
        from: string | null;
        to: string | null;
    };
    kpis: FleetReportKpis;
    composition: {
        byVehicleType: FleetReportBucket[];
        byActiveStatus: FleetReportBucket[];
        byWeighingRequired: FleetReportBucket[];
    };
    registrationsByMonth: FleetReportMonthlyBucket[];
    /**
     * Presente apenas quando o caller é admin — controlado no use-case,
     * o controller só repassa.
     */
    usersByRole?: FleetReportRoleBucket[];
}
