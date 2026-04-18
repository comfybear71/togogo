import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

export default function PriceHistoryAreaChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#FF6B35" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#71717a' }}
          tickLine={false}
          axisLine={{ stroke: '#1e1e1e' }}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#71717a' }}
          tickLine={false}
          axisLine={{ stroke: '#1e1e1e' }}
          tickFormatter={(v) => `$${v}`}
          domain={['dataMin - 5', 'dataMax + 5']}
          width={60}
        />
        <Tooltip
          contentStyle={{
            fontSize: '13px',
            borderRadius: '10px',
            backgroundColor: '#1a1a1a',
            border: '1px solid #2a2a2a',
            color: '#fff',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}
          itemStyle={{ color: '#FF6B35' }}
          labelStyle={{ color: '#71717a', fontSize: '11px' }}
          formatter={(value) => [`$${value.toFixed(2)}`, 'Price']}
        />
        <Area
          type="monotone"
          dataKey="price"
          stroke="#FF6B35"
          strokeWidth={2}
          fill="url(#priceGradient)"
          dot={false}
          activeDot={{ r: 5, fill: '#FF6B35', stroke: '#050505', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
