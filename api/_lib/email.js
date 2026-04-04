// Email notification helper — sends emails via Resend API
// No SDK needed, uses raw fetch

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = 'ToGoGo <noreply@togogo.me>'

export async function sendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not configured, skipping email')
    return false
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error(`[Email] Failed to send to ${to}:`, data)
      return false
    }

    console.log(`[Email] Sent "${subject}" to ${to} (id: ${data.id})`)
    return true
  } catch (err) {
    console.error(`[Email] Error sending to ${to}:`, err.message)
    return false
  }
}

// ─── Email Templates ─────────────────────────────────────────────────

export function orderConfirmationEmail({ orderRef, items, total, storeName, customerName }) {
  const itemRows = items.map(i => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #333">${i.title}</td>
      <td style="padding:8px;border-bottom:1px solid #333;text-align:center">${i.quantity}</td>
      <td style="padding:8px;border-bottom:1px solid #333;text-align:right">$${(i.price * i.quantity).toFixed(2)}</td>
    </tr>
  `).join('')

  return {
    subject: `Order Confirmed — ${orderRef}`,
    html: `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:16px">
        <div style="text-align:center;margin-bottom:24px">
          <h1 style="color:#FF6B35;font-size:28px;margin:0">ToGoGo</h1>
          <p style="color:#94a3b8;font-size:12px;margin-top:4px">${storeName}</p>
        </div>
        <h2 style="color:#fff;font-size:20px">Order Confirmed!</h2>
        <p style="color:#94a3b8">Hi ${customerName}, thank you for your order.</p>
        <p style="color:#94a3b8;font-size:14px">Order Reference: <strong style="color:#fff">${orderRef}</strong></p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <thead>
            <tr style="color:#94a3b8;font-size:12px;text-transform:uppercase">
              <th style="padding:8px;text-align:left;border-bottom:1px solid #334155">Product</th>
              <th style="padding:8px;text-align:center;border-bottom:1px solid #334155">Qty</th>
              <th style="padding:8px;text-align:right;border-bottom:1px solid #334155">Price</th>
            </tr>
          </thead>
          <tbody style="color:#e2e8f0;font-size:14px">${itemRows}</tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding:12px 8px;font-weight:bold;color:#fff">Total</td>
              <td style="padding:12px 8px;font-weight:bold;color:#FF6B35;text-align:right;font-size:18px">$${total.toFixed(2)} AUD</td>
            </tr>
          </tfoot>
        </table>
        <p style="color:#94a3b8;font-size:13px">We'll send you tracking information once your order ships.</p>
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid #334155;text-align:center">
          <p style="color:#64748b;font-size:11px">Powered by ToGoGo — togogo.me</p>
        </div>
      </div>
    `,
  }
}

export function newOrderAlertEmail({ orderRef, items, total, storeName, customerName, customerEmail, isAdmin }) {
  return {
    subject: `${isAdmin ? '[Admin] ' : ''}New Order — ${orderRef} ($${total.toFixed(2)})`,
    html: `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:16px">
        <div style="text-align:center;margin-bottom:24px">
          <h1 style="color:#FF6B35;font-size:28px;margin:0">ToGoGo</h1>
        </div>
        <h2 style="color:#06D6A0;font-size:20px">New Order Received!</h2>
        <p style="color:#94a3b8">A customer just placed an order on <strong style="color:#fff">${storeName}</strong>.</p>
        <div style="background:#1e293b;border-radius:12px;padding:16px;margin:16px 0">
          <p style="margin:4px 0;color:#94a3b8;font-size:13px">Order: <strong style="color:#fff">${orderRef}</strong></p>
          <p style="margin:4px 0;color:#94a3b8;font-size:13px">Customer: <strong style="color:#fff">${customerName}</strong> (${customerEmail})</p>
          <p style="margin:4px 0;color:#94a3b8;font-size:13px">Total: <strong style="color:#FF6B35;font-size:18px">$${total.toFixed(2)} AUD</strong></p>
          <p style="margin:4px 0;color:#94a3b8;font-size:13px">Items: ${items.map(i => i.title).join(', ')}</p>
        </div>
        <a href="https://togogo.me/admin/orders" style="display:inline-block;background:#FF6B35;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:bold">View Order</a>
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid #334155;text-align:center">
          <p style="color:#64748b;font-size:11px">Powered by ToGoGo — togogo.me</p>
        </div>
      </div>
    `,
  }
}
