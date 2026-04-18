import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

export default function EarningsBarChart({ earnings, showRevenueBar = false }) {
  const data = earnings.map(e => ({
    date: new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    earnings: e.profit,
    revenue: e.revenue,
  }))
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#222" />
        <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#666' }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 9, fill: '#666' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${v}`}
        />
        <Tooltip
          contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: 8, fontSize: 11 }}
          labelStyle={{ color: '#999' }}
          formatter={(value, name) => [`$${value.toFixed(2)}`, name === 'earnings' ? 'Profit' : 'Revenue']}
        />
        {showRevenueBar && (
          <Bar dataKey="revenue" fill="#FF6B35" radius={[4, 4, 0, 0]} opacity={0.3} />
        )}
        <Bar dataKey="earnings" fill="#06D6A0" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
