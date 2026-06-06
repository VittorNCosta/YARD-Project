import React from "react";
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface BarDatum {
  name: string;
  value: number;
}

interface BarChartProps {
  data: BarDatum[];
  /** Cor padrão da barra. Default: primary-500. */
  color?: string;
  /** Orientação. Default `vertical` (eixo X categórico). */
  orientation?: "vertical" | "horizontal";
}

/**
 * Wrapper fino sobre recharts.BarChart.
 *
 * - `vertical` (default): nomes no eixo X.
 * - `horizontal`: nomes no eixo Y — útil para listas longas/labels grandes.
 */
const BarChart: React.FC<BarChartProps> = ({
  data,
  color = "#667eea",
  orientation = "vertical",
}) => {
  if (orientation === "horizontal") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 16, bottom: 8, left: 16 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
          <XAxis type="number" allowDecimals={false} fontSize={12} />
          <YAxis
            type="category"
            dataKey="name"
            width={110}
            fontSize={12}
          />
          <Tooltip />
          <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} />
        </RechartsBarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsBarChart
        data={data}
        margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
        <XAxis dataKey="name" fontSize={12} />
        <YAxis allowDecimals={false} fontSize={12} />
        <Tooltip />
        <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
      </RechartsBarChart>
    </ResponsiveContainer>
  );
};

export default BarChart;
