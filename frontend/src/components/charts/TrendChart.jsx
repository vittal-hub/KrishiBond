import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../utils/format';

function TrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="stub-card px-3 py-2 text-xs shadow-stub">
      <p className="text-ink-faint">{label}</p>
      <p className="font-semibold text-ink mt-0.5">{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

// Single-series magnitude trend (one hue, light-to-dark not needed since it's
// a time series, not a ramp) - farmer income or buyer spend, never both on
// the same axis.
export default function TrendChart({ data, color = '#2F5233', emptyLabel = 'No activity yet' }) {
  const hasData = data.some((d) => d.value > 0);

  if (!hasData) {
    return (
      <div className="h-56 flex items-center justify-center text-sm text-ink-faint">{emptyLabel}</div>
    );
  }

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(28,43,34,0.08)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: '#7C8577' }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={48}
            tick={{ fontSize: 11, fill: '#7C8577' }}
            tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)}
          />
          <Tooltip content={<TrendTooltip />} cursor={{ stroke: 'rgba(28,43,34,0.15)' }} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill="url(#trendFill)"
            dot={{ r: 3, strokeWidth: 0, fill: color }}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
