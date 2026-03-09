// [Improvement 2] Billing configuration helper — shows current Stripe dunning/retry settings
// and provides guidance on configuring them via the Stripe Dashboard
import { requireAdmin } from '../_lib/auth.js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    await requireAdmin(req)

    // Fetch Stripe account settings to show current billing config
    const account = await stripe.accounts.retrieve()

    // Get subscription-related settings
    let invoiceSettings = null
    try {
      // List recent failed invoices to show retry patterns
      const failedInvoices = await stripe.invoices.list({
        status: 'open',
        limit: 5,
      })
      invoiceSettings = {
        open_invoices: failedInvoices.data.length,
        invoices: failedInvoices.data.map(inv => ({
          id: inv.id,
          subscription: inv.subscription,
          amount_due: inv.amount_due / 100,
          currency: inv.currency,
          attempt_count: inv.attempt_count,
          next_payment_attempt: inv.next_payment_attempt
            ? new Date(inv.next_payment_attempt * 1000).toISOString()
            : null,
          created: new Date(inv.created * 1000).toISOString(),
        })),
      }
    } catch {
      // May not have permission
    }

    return res.json({
      account_name: account.settings?.dashboard?.display_name || account.business_profile?.name,
      country: account.country,
      default_currency: account.default_currency,
      invoices: invoiceSettings,
      dunning_guide: {
        description: 'Configure Smart Retries and dunning emails in Stripe Dashboard',
        steps: [
          '1. Go to Stripe Dashboard → Settings → Billing → Subscriptions',
          '2. Enable "Smart Retries" to let Stripe optimally retry failed payments',
          '3. Set retry schedule (recommended: 4 attempts over 3 weeks)',
          '4. Configure customer emails for: payment failure, upcoming renewal, expiring card',
          '5. Set subscription cancellation policy after final retry failure',
        ],
        dashboard_url: 'https://dashboard.stripe.com/settings/billing/automatic',
      },
    })
  } catch (err) {
    if (err.status === 401) return res.status(401).json({ error: err.message })
    if (err.status === 403) return res.status(403).json({ error: err.message })
    console.error('Billing config error:', err)
    return res.status(500).json({ error: 'Failed to fetch billing config' })
  }
}
