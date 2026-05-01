// PATCH  /api/departments/:id — rename. Cascades to employees.department.
// DELETE /api/departments/:id — remove. Refuses if employees still belong to it.
import { sql, ensureTables, getBody } from '../_lib/db.js';
import { requireAuth, requirePrivileged } from '../_lib/auth.js';

export default async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;
  if (!requirePrivileged(user, res)) return;

  try {
    await ensureTables();
    const id = Number(req.query.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'Invalid department id.' });
    }

    const existing = await sql`SELECT id, name FROM departments WHERE id = ${id}`;
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Department not found.' });
    }
    const oldName = existing.rows[0].name;

    if (req.method === 'PATCH' || req.method === 'PUT') {
      const { name } = getBody(req);
      const trimmed = String(name || '').trim();
      if (!trimmed) {
        return res.status(400).json({ error: 'Department name is required.' });
      }
      if (trimmed === oldName) {
        return res.status(200).json({
          department: { id, name: oldName }
        });
      }

      try {
        await sql`UPDATE departments SET name = ${trimmed} WHERE id = ${id}`;
      } catch (e) {
        if (String(e.message || '').includes('duplicate key')) {
          return res.status(409).json({ error: 'A department with that name already exists.' });
        }
        throw e;
      }
      // Cascade the rename across the employees table so the directory
      // doesn't end up with stale labels.
      await sql`
        UPDATE employees SET department = ${trimmed}, updated_at = NOW()
        WHERE department = ${oldName}
      `;
      return res.status(200).json({ department: { id, name: trimmed } });
    }

    if (req.method === 'DELETE') {
      const usage = await sql`
        SELECT COUNT(*)::int AS count FROM employees WHERE department = ${oldName}
      `;
      const count = usage.rows[0]?.count || 0;
      if (count > 0) {
        return res.status(409).json({
          error: `Cannot delete: ${count} employee${count !== 1 ? 's are' : ' is'} still in "${oldName}". Reassign them first.`
        });
      }
      await sql`DELETE FROM departments WHERE id = ${id}`;
      return res.status(200).json({ ok: true, id });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('department [id] handler error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
