'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export interface PipelineChartDatum {
  stage: string;
  count: number;
  fill: string;
}

export default function LeadPipelineChart({ data }: { data: PipelineChartDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
        <XAxis
          dataKey="stage"
          stroke="#D1D5DB"
          tick={{ fill: '#6B7280', fontSize: 12 }}
        />
        <YAxis
          stroke="#D1D5DB"
          tick={{ fill: '#6B7280', fontSize: 12 }}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            color: '#111827',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
          formatter={(value) => [String(value), 'Leads']}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.stage} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
