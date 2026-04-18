import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

export default function AdminRevenueLineChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#222" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#a1a1aa' }} />
        <YAxis
          tick={{ fontSize: 11, fill: '#a1a1aa' }}
          tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
        />
        <Tooltip formatter={(v) => [`$${v.toLocaleString()}`, 'Revenue']} />
        <Line type="monotone" dataKey="revenue" stroke="#FF6B35" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
