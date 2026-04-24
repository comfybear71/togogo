import { DollarSign } from 'lucide-react'
import ComingSoonPage from './ComingSoonPage'

export default function MyEarningsPage() {
  return (
    <ComingSoonPage
      icon={DollarSign}
      title="Earnings"
      description="Track your income, pending payouts, and lifetime earnings from your shop."
      bullets={[
        'This month and all-time earnings',
        'Pending payouts from Stripe',
        'Earnings per product',
      ]}
    />
  )
}
