import React from "react";
import "./charts.css";

interface MetricCardProps {
  label: string;
  value: number | string;
  hint?: string;
  /** Sufixo opcional (ex: "%"). Aplicado apenas quando `value` é número. */
  suffix?: string;
  /** Ícone à esquerda do label. */
  icon?: React.ReactNode;
}

/**
 * KPI card minimalista — número + rótulo curto.
 *
 * Mantém-se ASCII-only por padrão (nenhum emoji obrigatório). O caller
 * decide se quer passar um `icon` (ex.: lucide-react).
 */
const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  hint,
  suffix,
  icon,
}) => {
  const display =
    typeof value === "number" && suffix ? `${value}${suffix}` : value;

  return (
    <div className="metric-card" role="group" aria-label={label}>
      <p className="metric-card__label">
        {icon ? (
          <span aria-hidden="true" style={{ marginRight: "0.4rem" }}>
            {icon}
          </span>
        ) : null}
        {label}
      </p>
      <p className="metric-card__value">{display}</p>
      {hint ? <p className="metric-card__hint">{hint}</p> : null}
    </div>
  );
};

export default MetricCard;
