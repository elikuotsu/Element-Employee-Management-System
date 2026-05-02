// Catch-all for everything under /api/employees/* :
//
//   GET    /api/employees/:id          — fetch one
//   PUT    /api/employees/:id          — update (privileged)
//   DELETE /api/employees/:id          — remove (privileged)
//   POST   /api/employees/bulk         — bulk delete / activate / deactivate
//   GET    /api/employees/:id/audit    — change history for that employee
//
// Bundled as one function so we stay under Vercel's Hobby-plan limit of 12
// serverless functions per deployment.
import {
  sql,
  ensureTables,
  rowToEmployee,
  rowToAudit,
  nullIfEmpty,
  getBody,
  writeEmployeeAudit
} from '../_lib/db.js';
import { requireAuth, requirePrivileged, isPrivileged } from '../_lib/auth.js';

const BULK_ACTIONS = ['delete', 'activate', 'deactivate'];

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

    const raw = req.query.path;
    const segments = Array.isArray(raw) ? raw : raw ? [raw] : [];

    if (segments.length === 0) {
      // Shouldn't happen — Vercel routes /api/employees to the bare handler.
      return res.status(404).json({ error: 'Not found' });
    }

    if (segments.length === 1 && segments[0] === 'bulk') {
      return await handleBulk(req, res, user);
    }

    if (segments.length === 2 && segments[1] === 'audit') {
      return await handleAudit(req, res, user, segments[0]);
    }

    if (segments.length === 1) {
      return await handleEmployeeById(req, res, user, segments[0]);
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (err) {
    console.error('employees catch-all error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

async function handleEmployeeById(req, res, user, id) {
  if (!id) return res.status(400).json({ error: 'Missing id parameter.' });

  if (req.method === 'GET') {
    const result = await sql`SELECT * FROM employees WHERE id = ${id}`;
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found.' });
    }
    const employee = rowToEmployee(result.rows[0]);
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
}

async function handleBulk(req, res, user) {
  if (!requirePrivileged(user, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = getBody(req);
  const action = body.action;
  const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : [];

  if (!BULK_ACTIONS.includes(action)) {
    return res.status(400).json({ error: 'Unknown action.' });
  }
  if (ids.length === 0) {
    return res.status(400).json({ error: 'Pick at least one employee.' });
  }

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
}

async function handleAudit(req, res, user, employeeId) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!employeeId) {
    return res.status(400).json({ error: 'Missing employee id.' });
  }

  if (!isPrivileged(user)) {
    const target = await sql`SELECT email FROM employees WHERE id = ${employeeId}`;
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
    WHERE employee_id = ${employeeId}
    ORDER BY created_at DESC
    LIMIT 200
  `;
  return res.status(200).json({ audit: result.rows.map(rowToAudit) });
}
