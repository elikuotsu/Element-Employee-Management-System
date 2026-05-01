// GET    /api/employees/:id  — fetch one
// PUT    /api/employees/:id  — update
// DELETE /api/employees/:id  — remove
import { sql, ensureTables, rowToEmployee, nullIfEmpty, getBody } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';

export default async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;

  try {
    await ensureTables();

    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: 'Missing id parameter.' });
    }

    if (req.method === 'GET') {
      const result = await sql`SELECT * FROM employees WHERE id = ${id}`;
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Employee not found.' });
      }
      return res.status(200).json({ employee: rowToEmployee(result.rows[0]) });
    }

    if (req.method === 'PUT') {
      const e = getBody(req);
      if (!e.name || !e.role || !e.department) {
        return res.status(400).json({ error: 'Name, role, and department are required.' });
      }

      const update = await sql`
        UPDATE employees SET
          name = ${e.name},
          role = ${e.role},
          department = ${e.department},
          email = ${nullIfEmpty(e.email)},
          phone = ${nullIfEmpty(e.phone)},
          join_date = ${nullIfEmpty(e.joinDate)},
          status = ${e.status || 'Active'},
          dob = ${nullIfEmpty(e.dob)},
          gender = ${nullIfEmpty(e.gender)},
          blood_group = ${nullIfEmpty(e.bloodGroup)},
          address = ${nullIfEmpty(e.address)},
          grade = ${nullIfEmpty(e.grade)},
          manager_id = ${nullIfEmpty(e.managerId)},
          emergency_name = ${nullIfEmpty(e.emergencyName)},
          emergency_phone = ${nullIfEmpty(e.emergencyPhone)},
          notes = ${nullIfEmpty(e.notes)},
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
      if (update.rows.length === 0) {
        return res.status(404).json({ error: 'Employee not found.' });
      }
      return res.status(200).json({ employee: rowToEmployee(update.rows[0]) });
    }

    if (req.method === 'DELETE') {
      const del = await sql`DELETE FROM employees WHERE id = ${id} RETURNING id`;
      if (del.rows.length === 0) {
        return res.status(404).json({ error: 'Employee not found.' });
      }
      return res.status(200).json({ ok: true, id });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('employee [id] handler error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
