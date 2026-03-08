import { ALL_SUPPLIERS } from '../_lib/suppliers.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  return res.status(200).json({ suppliers: ALL_SUPPLIERS })
}
