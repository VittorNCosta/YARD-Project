import React from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export interface DonutDatum {
  name: string;
  value: number;
}

interface DonutChartProps {
  data: DonutDatum[];
  /**
   * Paleta de cores aplicada por fatia (round-robin). Quando omitida,
   * usamos a paleta padrão calibrada para o tema atual.
   */
  colors?: string[];
  /** Quando true, renderiza valor + percentual ao lado do nome no Tooltip. */
  showPercentage?: boolean;
}

const DEFAULT_COLORS = [
  "#667eea", // primary-500
  "#5a67d8", // primary-700
  "#764ba2", // gradient-end
  "#10b981", // success-500
  "#f59e0b", // warning-500
  "#ef4444", // danger-500
  "#0ea5e9", // sky-500
  "#a855f7", // purple-500
];

/**
 * Wrapper fino sobre recharts.PieChart no formato donut.
 *
 * Não decide loading/error/empty — o caller deve usar `ChartCard` para
 * isso. Aqui apenas devolvemos um `ResponsiveContainer` para que o
 * gráfico ocupe 100% do `chart-card__body`.
 */
const DonutChart: React.FC<DonutChartProps> = ({
  data,
  colors = DEFAULT_COLORS,
  showPercentage = false,
}) => {
  const total = data.reduce((acc, d) => acc + d.value, 0);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="55%"
          outerRadius="80%"
          paddingAngle={2}
          isAnimationActive
        >
          {data.map((entry, idx) => (
            <Cell
              key={`cell-${entry.name}-${idx}`}
              fill={colors[idx % colors.length]}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => {
            const numeric =
              typeof value === "number"
                ? value
                : Number(value ?? 0);
            const label = String(name ?? "");
            if (!showPercentage || total === 0) {
              return [String(numeric), label];
            }
            const pct = ((numeric / total) * 100).toFixed(1);
            return [`${numeric} (${pct}%)`, label];
          }}
        />
        <Legend verticalAlign="bottom" height={32} />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default DonutChart;
