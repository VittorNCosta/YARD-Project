import React from "react";
import {
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface LineDatum {
  name: string;
  value: number;
}

interface LineChartProps {
  data: LineDatum[];
  color?: string;
}

/**
 * Wrapper fino sobre recharts.LineChart — pensado para séries temporais
 * curtas (ex.: cadastros por mês). Ponto fixo no shape `{name, value}`
 * para consistência com os outros wrappers.
 */
const LineChart: React.FC<LineChartProps> = ({
  data,
  color = "#667eea",
}) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsLineChart
        data={data}
        margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
        <XAxis dataKey="name" fontSize={12} />
        <YAxis allowDecimals={false} fontSize={12} />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
      </RechartsLineChart>
    </ResponsiveContainer>
  );
};

export default LineChart;
