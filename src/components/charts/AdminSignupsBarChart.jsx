import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

export default function AdminSignupsBarChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#222" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#a1a1aa' }} />
        <YAxis tick={{ fontSize: 11, fill: '#a1a1aa' }} />
        <Tooltip />
        <Bar dataKey="signups" fill="#06D6A0" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
