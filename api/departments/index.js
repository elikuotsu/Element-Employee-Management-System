// GET  /api/departments — list departments (any authenticated user can list,
//                          since the dropdowns in the employee form need them)
// POST /api/departments — create a new department (privileged only)
import { sql, ensureTables, getBody } from '../_lib/db.js';
import { requireAuth, requirePrivileged } from '../_lib/auth.js';

export default async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;

  try {
    await ensureTables();

    if (req.method === 'GET') {
      const result = await sql`
        SELECT d.id, d.name, d.created_at,
          (SELECT COUNT(*) FROM employees e WHERE e.department = d.name)::int AS employee_count
        FROM departments d
        ORDER BY d.name ASC
      `;
      return res.status(200).json({
        departments: result.rows.map((r) => ({
          id: r.id,
          name: r.name,
          employeeCount: r.employee_count || 0,
          createdAt: r.created_at
        }))
      });
    }

    if (req.method === 'POST') {
      if (!requirePrivileged(user, res)) return;
      const { name } = getBody(req);
      const trimmed = String(name || '').trim();
      if (!trimmed) {
        return res.status(400).json({ error: 'Department name is required.' });
      }
      try {
        const inserted = await sql`
          INSERT INTO departments (name) VALUES (${trimmed})
          RETURNING id, name, created_at
        `;
        const d = inserted.rows[0];
        return res.status(201).json({
          department: { id: d.id, name: d.name, employeeCount: 0, createdAt: d.created_at }
        });
      } catch (e) {
        // Postgres unique violation — surface a friendly message.
        if (String(e.message || '').includes('duplicate key')) {
          return res.status(409).json({ error: 'A department with that name already exists.' });
        }
        throw e;
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('departments handler error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
