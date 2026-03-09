export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  // Price history not yet implemented — return empty
  return res.json([])
}
