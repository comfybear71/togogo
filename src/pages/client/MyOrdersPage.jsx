import { Package } from 'lucide-react'
import ComingSoonPage from './ComingSoonPage'

export default function MyOrdersPage() {
  return (
    <ComingSoonPage
      icon={Package}
      title="Orders"
      description="See every sale made through your shop, with tracking details and payouts."
      bullets={[
        'See customer orders as they come in',
        'Track shipping status',
        'See how much you earned per order',
      ]}
    />
  )
}
