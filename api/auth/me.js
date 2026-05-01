import { sql, ensureTables } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const tokenUser = requireAuth(req, res);
  if (!tokenUser) return;

  try {
    await ensureTables();
    // Always re-read from the DB so the role stays in sync if it was changed
    // since the JWT was issued.
    const result = await sql`
      SELECT id, email, name, role FROM users WHERE id = ${tokenUser.id}
    `;
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Account no longer exists.' });
    }
    const user = result.rows[0];
    return res.status(200).json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  } catch (err) {
    console.error('me error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
