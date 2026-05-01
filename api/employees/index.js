// GET  /api/employees       — list all employees (auth required)
// POST /api/employees       — create new employee (auth required)
import { sql, ensureTables, rowToEmployee, nullIfEmpty, getBody } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';

export default async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;

  try {
    await ensureTables();

    if (req.method === 'GET') {
      const result = await sql`
        SELECT * FROM employees ORDER BY created_at DESC
      `;
      return res.status(200).json({
        employees: result.rows.map(rowToEmployee)
      });
    }

    if (req.method === 'POST') {
      const e = getBody(req);
      if (!e.name || !e.role || !e.department) {
        return res.status(400).json({ error: 'Name, role, and department are required.' });
      }

      const id = e.id || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      await sql`
        INSERT INTO employees (
          id, name, role, department, email, phone, join_date, status,
          dob, gender, blood_group, address, grade, manager_id,
          emergency_name, emergency_phone, notes, created_by
        ) VALUES (
          ${id}, ${e.name}, ${e.role}, ${e.department},
          ${nullIfEmpty(e.email)}, ${nullIfEmpty(e.phone)},
          ${nullIfEmpty(e.joinDate)}, ${e.status || 'Active'},
          ${nullIfEmpty(e.dob)}, ${nullIfEmpty(e.gender)},
          ${nullIfEmpty(e.bloodGroup)}, ${nullIfEmpty(e.address)},
          ${nullIfEmpty(e.grade)}, ${nullIfEmpty(e.managerId)},
          ${nullIfEmpty(e.emergencyName)}, ${nullIfEmpty(e.emergencyPhone)},
          ${nullIfEmpty(e.notes)}, ${user.id}
        )
      `;

      const result = await sql`SELECT * FROM employees WHERE id = ${id}`;
      return res.status(201).json({ employee: rowToEmployee(result.rows[0]) });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('employees handler error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
