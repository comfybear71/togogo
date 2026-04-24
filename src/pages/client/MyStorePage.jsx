import { Store } from 'lucide-react'
import ComingSoonPage from './ComingSoonPage'

export default function MyStorePage() {
  return (
    <ComingSoonPage
      icon={Store}
      title="My Store"
      description="Everything to do with your shop — products, theme, name, and your markup — will live here."
      bullets={[
        'Change your store name and subdomain',
        'Pick a colour theme',
        'Set your markup percentage',
        'Browse and manage your products',
      ]}
    />
  )
}
