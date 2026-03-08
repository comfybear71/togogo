import { sql } from '../_lib/db.js'

export default async function handler(req, res) {
  try {
    const result = await sql`SELECT 1 as test`
    return res.status(200).json({ success: true, result: result.rows })
  } catch (error) {
    return res.status(500).json({ 
      error: error.message, 
      code: error.code,
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 5)
    })
  }
}
