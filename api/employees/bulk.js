// POST /api/employees/bulk
//
// Body: { action: 'delete' | 'activate' | 'deactivate', ids: ['id-1', 'id-2', ...] }
//
// Privileged (owner / admin) only. Returns the affected count and writes one
// audit entry per affected employee.
import {
  sql,
  ensureTables,
  getBody,
  writeEmployeeAudit
} from '../_lib/db.js';
import { requireAuth, requirePrivileged } from '../_lib/auth.js';

const ACTIONS = ['delete', 'activate', 'deactivate'];

export default async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;
  if (!requirePrivileged(user, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await ensureTables();
    const body = getBody(req);
    const action = body.action;
    const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : [];

    if (!ACTIONS.includes(action)) {
      return res.status(400).json({ error: 'Unknown action.' });
    }
    if (ids.length === 0) {
      return res.status(400).json({ error: 'Pick at least one employee.' });
    }

    // Pull a snapshot so the audit log can record names alongside ids.
    const targets = await sql`
      SELECT id, name, status FROM employees WHERE id = ANY(${ids})
    `;
    const found = targets.rows;
    if (found.length === 0) {
      return res.status(404).json({ error: 'No matching employees.' });
    }
    const foundIds = found.map((r) => r.id);

    let affected = 0;

    if (action === 'delete') {
      const del = await sql`DELETE FROM employees WHERE id = ANY(${foundIds}) RETURNING id`;
      affected = del.rows.length;
      for (const row of found) {
        await writeEmployeeAudit({
          employeeId: row.id,
          employeeName: row.name,
          user,
          action: 'deleted',
          details: { via: 'bulk' }
        });
      }
    } else {
      const newStatus = action === 'activate' ? 'Active' : 'Inactive';
      const upd = await sql`
        UPDATE employees SET status = ${newStatus}, updated_at = NOW()
        WHERE id = ANY(${foundIds}) RETURNING id
      `;
      affected = upd.rows.length;
      for (const row of found) {
        if (row.status !== newStatus) {
          await writeEmployeeAudit({
            employeeId: row.id,
            employeeName: row.name,
            user,
            action: 'status_changed',
            details: { via: 'bulk', from: row.status, to: newStatus }
          });
        }
      }
    }

    return res.status(200).json({ ok: true, action, affected });
  } catch (err) {
    console.error('employees bulk handler error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
