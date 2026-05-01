// GET  /api/leaves — list leave requests
//   • Owners and admins see every request.
//   • Employees see only their own.
// POST /api/leaves — submit a new leave request (any signed-in user).
import { sql, ensureTables, rowToLeaveRequest, nullIfEmpty, getBody } from '../_lib/db.js';
import { requireAuth, isPrivileged } from '../_lib/auth.js';

const VALID_TYPES = ['Casual', 'Sick', 'Earned', 'Maternity', 'Paternity', 'Unpaid', 'Other'];

export default async function handler(req, res) {
  const me = requireAuth(req, res);
  if (!me) return;

  try {
    await ensureTables();

    if (req.method === 'GET') {
      const privileged = isPrivileged(me);
      const result = privileged
        ? await sql`
            SELECT lr.*,
                   u.name  AS user_name,
                   u.email AS user_email,
                   r.name  AS reviewer_name
            FROM leave_requests lr
            LEFT JOIN users u ON u.id = lr.user_id
            LEFT JOIN users r ON r.id = lr.reviewed_by
            ORDER BY lr.created_at DESC
          `
        : await sql`
            SELECT lr.*,
                   u.name  AS user_name,
                   u.email AS user_email,
                   r.name  AS reviewer_name
            FROM leave_requests lr
            LEFT JOIN users u ON u.id = lr.user_id
            LEFT JOIN users r ON r.id = lr.reviewed_by
            WHERE lr.user_id = ${me.id}
            ORDER BY lr.created_at DESC
          `;
      return res.status(200).json({
        leaves: result.rows.map(rowToLeaveRequest)
      });
    }

    if (req.method === 'POST') {
      const body = getBody(req);
      const startDate = nullIfEmpty(body.startDate);
      const endDate = nullIfEmpty(body.endDate);
      const leaveType = VALID_TYPES.includes(body.leaveType) ? body.leaveType : 'Casual';

      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Start date and end date are required.' });
      }
      if (new Date(endDate) < new Date(startDate)) {
        return res.status(400).json({ error: 'End date must be on or after the start date.' });
      }

      const inserted = await sql`
        INSERT INTO leave_requests (
          user_id, employee_id, leave_type, start_date, end_date, reason, status
        ) VALUES (
          ${me.id},
          ${nullIfEmpty(body.employeeId)},
          ${leaveType},
          ${startDate},
          ${endDate},
          ${nullIfEmpty(body.reason)},
          'Pending'
        )
        RETURNING id
      `;

      const newId = inserted.rows[0].id;
      const result = await sql`
        SELECT lr.*,
               u.name  AS user_name,
               u.email AS user_email,
               r.name  AS reviewer_name
        FROM leave_requests lr
        LEFT JOIN users u ON u.id = lr.user_id
        LEFT JOIN users r ON r.id = lr.reviewed_by
        WHERE lr.id = ${newId}
      `;
      return res.status(201).json({ leave: rowToLeaveRequest(result.rows[0]) });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('leaves handler error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
