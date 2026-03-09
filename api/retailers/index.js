export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  // Retailers list not yet implemented — return empty
  return res.json([])
}
