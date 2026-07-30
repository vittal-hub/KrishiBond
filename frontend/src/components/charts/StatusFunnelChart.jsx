import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList, ResponsiveContainer } from 'recharts';

// Reuses the same status -> color mapping as StatusStamp.jsx so a bar here
// reads as the same category everywhere else in the app. Each bar carries
// its own text label on the axis plus a direct value label, so status
// identity never depends on distinguishing the colors alone.
const STATUS_COLOR = {
  pending: '#C98A2C',
  active: '#2F5233',
  fulfilled: '#3A6B7A',
  disputed: '#B4502A',
  cancelled: '#7C8577',
};

function FunnelTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { status, count } = payload[0].payload;
  return (
    <div className="stub-card px-3 py-2 text-xs shadow-stub capitalize">
      <p className="text-ink-faint">{status}</p>
      <p className="font-semibold text-ink mt-0.5">{count} contract{count === 1 ? '' : 's'}</p>
    </div>
  );
}

export default function StatusFunnelChart({ counts }) {
  const data = Object.entries(counts).map(([status, count]) => ({ status, count }));
  const hasData = data.some((d) => d.count > 0);

  if (!hasData) {
    return <div className="h-56 flex items-center justify-center text-sm text-ink-faint">No contracts yet</div>;
  }

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(28,43,34,0.08)" />
          <XAxis dataKey="status" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#3E4A40' }} className="capitalize" />
          <YAxis hide />
          <Tooltip content={<FunnelTooltip />} cursor={{ fill: 'rgba(28,43,34,0.04)' }} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
            {data.map((d) => (
              <Cell key={d.status} fill={STATUS_COLOR[d.status] || '#7C8577'} />
            ))}
            <LabelList dataKey="count" position="top" style={{ fontSize: 11, fill: '#1C2B22', fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
