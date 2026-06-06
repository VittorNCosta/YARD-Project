import React from "react";
import "./charts.css";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  /** Quando true, oculta o `children` e renderiza o esqueleto de loading. */
  loading?: boolean;
  /** Quando definido, oculta o `children` e renderiza a mensagem de erro. */
  error?: string | null;
  /**
   * Quando true e sem erro/loading, oculta o `children` e renderiza
   * mensagem padrão de "sem dados". Use para datasets vazios sem que
   * o gráfico tente renderizar nada.
   */
  empty?: boolean;
  emptyMessage?: string;
  children: React.ReactNode;
}

/**
 * Container padrão para qualquer gráfico da tela de Relatórios.
 *
 * Centraliza os três estados — loading, error, empty — para que cada
 * dashboard individual não precise reimplementar. Todos os wrappers de
 * gráfico (DonutChart, BarChart, LineChart) devolvem apenas o
 * `<ResponsiveContainer>`; o `ChartCard` cuida do enquadramento e do
 * que mostrar quando não há dado.
 */
const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  loading = false,
  error = null,
  empty = false,
  emptyMessage = "Sem dados no período.",
  children,
}) => {
  return (
    <section className="chart-card" aria-busy={loading || undefined}>
      <header className="chart-card__header">
        <h3 className="chart-card__title">{title}</h3>
        {subtitle ? <p className="chart-card__subtitle">{subtitle}</p> : null}
      </header>

      <div className="chart-card__body">
        {loading ? (
          <div className="chart-card__loading" role="status">
            Carregando…
          </div>
        ) : error ? (
          <div className="chart-card__error" role="alert">
            {error}
          </div>
        ) : empty ? (
          <div className="chart-card__empty">{emptyMessage}</div>
        ) : (
          children
        )}
      </div>
    </section>
  );
};

export default ChartCard;
