// Temporary test endpoint — DELETE after debugging
import { sql } from '../../_lib/db.js'

export default async function handler(req, res) {
  try {
    // Test 1: Can we query admin_settings at all?
    let tableExists = false
    try {
      await sql`SELECT 1 FROM admin_settings LIMIT 1`
      tableExists = true
    } catch (e) {
      // Table doesn't exist, try creating it
      try {
        await sql`
          CREATE TABLE IF NOT EXISTS admin_settings (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            "key" TEXT UNIQUE NOT NULL,
            "value" TEXT NOT NULL DEFAULT '',
            category TEXT NOT NULL,
            label TEXT,
            is_secret BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          )
        `
        tableExists = true
      } catch (createErr) {
        return res.json({ error: 'create_table_failed', details: createErr.message })
      }
    }

    // Test 2: Try an insert
    try {
      await sql`
        INSERT INTO admin_settings ("key", "value", category, label, is_secret)
        VALUES ('_test_key', 'test_value', 'general', 'Test', false)
        ON CONFLICT ("key") DO UPDATE SET
          "value" = EXCLUDED."value",
          updated_at = NOW()
      `
    } catch (insertErr) {
      return res.json({ error: 'insert_failed', details: insertErr.message })
    }

    // Test 3: Clean up
    await sql`DELETE FROM admin_settings WHERE "key" = '_test_key'`

    return res.json({ success: true, tableExists })
  } catch (err) {
    return res.json({ error: 'unexpected', details: err.message })
  }
}
