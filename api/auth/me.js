import { getCurrentUser } from '../_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const user = await getCurrentUser(req)

    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    return res.status(200).json({ user })
  } catch (error) {
    console.error('Auth me error:', error)
    return res.status(500).json({ error: 'Failed to get user' })
  }
}
