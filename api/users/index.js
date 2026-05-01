// GET /api/users — list all user accounts (admins/owner only)
import { sql, ensureTables } from '../_lib/db.js';
import { requireAuth, requirePrivileged } from '../_lib/auth.js';

export default async function handler(req, res) {
  const me = requireAuth(req, res);
  if (!me) return;
  if (!requirePrivileged(me, res)) return;

  try {
    await ensureTables();

    if (req.method === 'GET') {
      const result = await sql`
        SELECT id, email, name, role, created_at
        FROM users
        ORDER BY created_at ASC
      `;
      return res.status(200).json({
        users: result.rows.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role || 'employee',
          createdAt: u.created_at
        }))
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('users handler error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
