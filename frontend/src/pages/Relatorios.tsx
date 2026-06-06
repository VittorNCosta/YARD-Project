import React, { useMemo, useState } from "react";

import BarChart, {
  type BarDatum,
} from "../components/charts/BarChart";
import ChartCard from "../components/charts/ChartCard";
import DonutChart, {
  type DonutDatum,
} from "../components/charts/DonutChart";
import LineChart, {
  type LineDatum,
} from "../components/charts/LineChart";
import MetricCard from "../components/charts/MetricCard";
import { useAuth } from "../contexts/AuthContext";
import { useFleetReport } from "../hooks/useReports";
import type { FleetReportFilters } from "../services/api";

import "./Relatorios.css";

/**
 * Converte `YYYY-MM-DD` (input type="date") em ISO 8601 com hora 00:00:00 UTC
 * (`from`) ou 23:59:59 UTC (`to`). Mantemos UTC para evitar drift entre o que
 * o usuário vê e o que o backend agrega — o servidor usa createdAt em UTC.
 */
function toIsoStartOfDay(value: string): string {
  return `${value}T00:00:00.000Z`;
}
function toIsoEndOfDay(value: string): string {
  return `${value}T23:59:59.999Z`;
}

function isoToInputDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

const Relatorios: React.FC = () => {
  const { isAdmin } = useAuth();
  const { data, loading, error, filters, setFilters, refetch } =
    useFleetReport();

  const [fromInput, setFromInput] = useState<string>(
    isoToInputDate(filters.from)
  );
  const [toInput, setToInput] = useState<string>(isoToInputDate(filters.to));

  const applyFilters = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const next: FleetReportFilters = {};
    if (fromInput) next.from = toIsoStartOfDay(fromInput);
    if (toInput) next.to = toIsoEndOfDay(toInput);
    setFilters(next);
  };

  const resetFilters = (): void => {
    setFromInput("");
    setToInput("");
    setFilters({});
  };

  // Derivados memoizados para alimentar cada gráfico — todos no shape
  // `{name, value}` esperado pelos wrappers.
  const byTypeData: DonutDatum[] = useMemo(
    () =>
      (data?.composition.byVehicleType ?? []).map((b) => ({
        name: b.key,
        value: b.count,
      })),
    [data]
  );

  const byActiveData: DonutDatum[] = useMemo(
    () =>
      (data?.composition.byActiveStatus ?? []).map((b) => ({
        name: b.key,
        value: b.count,
      })),
    [data]
  );

  const byWeighingData: BarDatum[] = useMemo(
    () =>
      (data?.composition.byWeighingRequired ?? []).map((b) => ({
        name: b.key,
        value: b.count,
      })),
    [data]
  );

  const monthlyData: LineDatum[] = useMemo(
    () =>
      (data?.registrationsByMonth ?? []).map((b) => ({
        name: b.month,
        value: b.count,
      })),
    [data]
  );

  const usersByRoleData: BarDatum[] = useMemo(
    () =>
      (data?.usersByRole ?? []).map((b) => ({
        name: b.role,
        value: b.count,
      })),
    [data]
  );

  const kpis = data?.kpis;
  const hasError = Boolean(error);
  const isInitialLoading = loading && !data;

  return (
    <div className="relatorios">
      <header className="relatorios-header">
        <h2>Relatórios — Frota</h2>

        <form className="relatorios-filters" onSubmit={applyFilters}>
          <label>
            De
            <input
              type="date"
              value={fromInput}
              max={toInput || undefined}
              onChange={(e) => setFromInput(e.target.value)}
              aria-label="Data inicial"
            />
          </label>
          <label>
            Até
            <input
              type="date"
              value={toInput}
              min={fromInput || undefined}
              onChange={(e) => setToInput(e.target.value)}
              aria-label="Data final"
            />
          </label>
          <button type="submit">Aplicar</button>
          <button
            type="button"
            className="relatorios-filters__reset"
            onClick={resetFilters}
          >
            Limpar
          </button>
          <button
            type="button"
            className="relatorios-filters__reset"
            onClick={() => void refetch()}
          >
            Recarregar
          </button>
        </form>
      </header>

      {hasError ? (
        <div className="relatorios-error" role="alert">
          {error}
        </div>
      ) : null}

      {isInitialLoading ? (
        <div className="relatorios-loading" role="status">
          Carregando relatório…
        </div>
      ) : null}

      <section className="relatorios-kpis" aria-label="Indicadores de frota">
        <MetricCard
          label="Total de veículos"
          value={kpis?.totalVehicles ?? 0}
          hint={
            kpis && kpis.totalVehicles === 0 && !isInitialLoading
              ? "Nenhum veículo no período"
              : undefined
          }
        />
        <MetricCard
          label="% Ativos"
          value={kpis?.activePercentage ?? 0}
          suffix="%"
        />
        <MetricCard
          label="% com pesagem obrigatória"
          value={kpis?.weighingRequiredPercentage ?? 0}
          suffix="%"
        />
        <MetricCard
          label="Tipos distintos"
          value={kpis?.distinctVehicleTypes ?? 0}
          hint="Quantidade de categorias de veículo presentes"
        />
      </section>

      <div className="relatorios-grid">
        <ChartCard
          title="Composição da frota por tipo"
          subtitle="Distribuição dos veículos cadastrados por categoria"
          loading={loading && !data}
          error={hasError ? error : null}
          empty={!loading && byTypeData.length === 0}
        >
          <DonutChart data={byTypeData} showPercentage />
        </ChartCard>

        <ChartCard
          title="Status cadastral"
          subtitle="Ativos × Inativos"
          loading={loading && !data}
          error={hasError ? error : null}
          empty={!loading && byActiveData.length === 0}
        >
          <DonutChart data={byActiveData} />
        </ChartCard>

        <ChartCard
          title="Pesagem obrigatória"
          subtitle="Quantidade de veículos por exigência de pesagem"
          loading={loading && !data}
          error={hasError ? error : null}
          empty={
            !loading &&
            byWeighingData.every((b) => b.value === 0)
          }
        >
          <BarChart data={byWeighingData} />
        </ChartCard>

        <ChartCard
          title="Cadastros por mês"
          subtitle="Evolução do total de cadastros (createdAt)"
          loading={loading && !data}
          error={hasError ? error : null}
          empty={!loading && monthlyData.length === 0}
        >
          <LineChart data={monthlyData} />
        </ChartCard>

        {isAdmin ? (
          <ChartCard
            title="Usuários por papel"
            subtitle="Disponível apenas para administradores"
            loading={loading && !data}
            error={hasError ? error : null}
            empty={!loading && usersByRoleData.length === 0}
          >
            <BarChart
              data={usersByRoleData}
              orientation="horizontal"
              color="#5a67d8"
            />
          </ChartCard>
        ) : null}
      </div>

      {data?.generatedAt ? (
        <p className="relatorios-meta">
          Gerado em {new Date(data.generatedAt).toLocaleString("pt-BR")}
        </p>
      ) : null}
    </div>
  );
};

export default Relatorios;
