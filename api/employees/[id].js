// GET    /api/employees/:id — fetch one (privileged users, or the employee whose
//                              record this is, by email match)
// PUT    /api/employees/:id — update (privileged only)
// DELETE /api/employees/:id — remove (privileged only)
import {
  sql,
  ensureTables,
  rowToEmployee,
  nullIfEmpty,
  getBody,
  writeEmployeeAudit
} from '../_lib/db.js';
import { requireAuth, requirePrivileged, isPrivileged } from '../_lib/auth.js';

// Compute the diff between the previous and next employee shape so the audit
// log can record exactly which fields changed (and what they changed from).
const TRACKED_FIELDS = [
  'name', 'role', 'department', 'email', 'phone', 'joinDate', 'status',
  'dob', 'gender', 'bloodGroup', 'address', 'grade', 'managerId',
  'emergencyName', 'emergencyPhone', 'notes'
];

function diffEmployee(prev, next) {
  const changes = {};
  for (const field of TRACKED_FIELDS) {
    const a = prev[field] ?? '';
    const b = next[field] ?? '';
    if (a !== b) changes[field] = { from: a, to: b };
  }
  return changes;
}

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
      const employee = rowToEmployee(result.rows[0]);
      // Non-privileged users can only fetch their own record.
      if (!isPrivileged(user)) {
        const myEmail = String(user.email || '').toLowerCase();
        if ((employee.email || '').toLowerCase() !== myEmail) {
          return res.status(403).json({ error: 'You can only view your own record.' });
        }
      }
      return res.status(200).json({ employee });
    }

    if (req.method === 'PUT') {
      if (!requirePrivileged(user, res)) return;

      const e = getBody(req);
      if (!e.name || !e.role || !e.department) {
        return res.status(400).json({ error: 'Name, role, and department are required.' });
      }

      // Snapshot the current state so we can record the diff.
      const before = await sql`SELECT * FROM employees WHERE id = ${id}`;
      if (before.rows.length === 0) {
        return res.status(404).json({ error: 'Employee not found.' });
      }
      const prevEmployee = rowToEmployee(before.rows[0]);

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
      const updated = rowToEmployee(update.rows[0]);

      const changes = diffEmployee(prevEmployee, updated);
      if (Object.keys(changes).length > 0) {
        await writeEmployeeAudit({
          employeeId: id,
          employeeName: updated.name,
          user,
          action: 'updated',
          details: { changes }
        });
      }

      return res.status(200).json({ employee: updated });
    }

    if (req.method === 'DELETE') {
      if (!requirePrivileged(user, res)) return;

      const before = await sql`SELECT id, name FROM employees WHERE id = ${id}`;
      if (before.rows.length === 0) {
        return res.status(404).json({ error: 'Employee not found.' });
      }

      await sql`DELETE FROM employees WHERE id = ${id}`;

      await writeEmployeeAudit({
        employeeId: id,
        employeeName: before.rows[0].name,
        user,
        action: 'deleted',
        details: null
      });

      return res.status(200).json({ ok: true, id });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('employee [id] handler error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
