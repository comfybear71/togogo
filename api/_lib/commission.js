// Shared commission rate helper — reads from admin_settings, falls back to 70%.
// Business rule: ToGoGo keeps 70% of the owner's intended profit plus every
// dollar of AE discount captured at reconciliation. Owner keeps 30%.
import { sql } from './db.js'

const DEFAULT_COMMISSION_PERCENT = 70

export async function getCommissionRate() {
  try {
    const result = await sql`SELECT value FROM admin_settings WHERE key = 'platform_fee_percent'`
    const percent = result.rows.length > 0
      ? parseFloat(result.rows[0].value) || DEFAULT_COMMISSION_PERCENT
      : DEFAULT_COMMISSION_PERCENT
    return percent / 100
  } catch {
    return DEFAULT_COMMISSION_PERCENT / 100
  }
}

export async function getCommissionPercent() {
  try {
    const result = await sql`SELECT value FROM admin_settings WHERE key = 'platform_fee_percent'`
    return result.rows.length > 0
      ? parseFloat(result.rows[0].value) || DEFAULT_COMMISSION_PERCENT
      : DEFAULT_COMMISSION_PERCENT
  } catch {
    return DEFAULT_COMMISSION_PERCENT
  }
}
