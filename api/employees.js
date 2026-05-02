// GET  /api/employees — list employees
//   • Owner / Admin: full directory
//   • Employee: only their own record (matched by login email)
// POST /api/employees — create new employee (privileged only)
//
// Sub-paths (/api/employees/:id, /api/employees/bulk, etc.) are handled by
// api/employees/[...path].js. Splitting them this way keeps the deployed
// function count under Vercel's Hobby-plan limit.
import {
  sql,
  ensureTables,
  rowToEmployee,
  nullIfEmpty,
  getBody,
  writeEmployeeAudit
} from './_lib/db.js';
import { requireAuth, requirePrivileged, isPrivileged } from './_lib/auth.js';

export default async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;

  try {
    await ensureTables();

    if (req.method === 'GET') {
      let result;
      if (isPrivileged(user)) {
        result = await sql`SELECT * FROM employees ORDER BY created_at DESC`;
      } else {
        const myEmail = String(user.email || '').toLowerCase();
        result = await sql`
          SELECT * FROM employees
          WHERE LOWER(email) = ${myEmail}
          ORDER BY created_at DESC
        `;
      }
      return res.status(200).json({ employees: result.rows.map(rowToEmployee) });
    }

    if (req.method === 'POST') {
      if (!requirePrivileged(user, res)) return;

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
      const employee = rowToEmployee(result.rows[0]);

      await writeEmployeeAudit({
        employeeId: id,
        employeeName: employee.name,
        user,
        action: 'created',
        details: {
          role: employee.role,
          department: employee.department,
          status: employee.status
        }
      });

      return res.status(201).json({ employee });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('employees handler error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
