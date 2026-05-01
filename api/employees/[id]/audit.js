// GET /api/employees/:id/audit
//
// Returns the change history for a single employee.
//   • Privileged users see everything.
//   • Other users may only read their own employee's history (matched by email).
import { sql, ensureTables, rowToAudit } from '../../_lib/db.js';
import { requireAuth, isPrivileged } from '../../_lib/auth.js';

export default async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await ensureTables();
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: 'Missing employee id.' });
    }

    if (!isPrivileged(user)) {
      const target = await sql`SELECT email FROM employees WHERE id = ${id}`;
      if (target.rows.length === 0) {
        return res.status(404).json({ error: 'Employee not found.' });
      }
      const myEmail = String(user.email || '').toLowerCase();
      if ((target.rows[0].email || '').toLowerCase() !== myEmail) {
        return res.status(403).json({ error: 'You can only view your own audit log.' });
      }
    }

    const result = await sql`
      SELECT * FROM employee_audit_log
      WHERE employee_id = ${id}
      ORDER BY created_at DESC
      LIMIT 200
    `;
    return res.status(200).json({
      audit: result.rows.map(rowToAudit)
    });
  } catch (err) {
    console.error('audit handler error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
