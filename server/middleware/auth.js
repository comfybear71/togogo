import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }
    req.user = user
    next()
  } catch {
    res.status(401).json({ error: 'Authentication failed' })
  }
}

export async function requireAdmin(req, res, next) {
  await requireAuth(req, res, async () => {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', req.user.id)
      .single()

    if (profile?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }
    next()
  })
}

export { supabase }
