// PATCH  /api/leaves/:id  — update a leave request.
//   Privileged users (owner/admin) can change status to Approved or Rejected
//   and optionally attach review notes. The submitter can cancel their own
//   pending request.
// DELETE /api/leaves/:id  — submitter (while still pending) or any privileged
//   user may delete a request.
import { sql, ensureTables, rowToLeaveRequest, nullIfEmpty, getBody } from '../_lib/db.js';
import { requireAuth, isPrivileged } from '../_lib/auth.js';

const VALID_STATUSES = ['Pending', 'Approved', 'Rejected', 'Cancelled'];

async function fetchLeave(id) {
  const result = await sql`
    SELECT lr.*,
           u.name  AS user_name,
           u.email AS user_email,
           r.name  AS reviewer_name
    FROM leave_requests lr
    LEFT JOIN users u ON u.id = lr.user_id
    LEFT JOIN users r ON r.id = lr.reviewed_by
    WHERE lr.id = ${id}
  `;
  return result.rows[0] || null;
}

export default async function handler(req, res) {
  const me = requireAuth(req, res);
  if (!me) return;

  try {
    await ensureTables();

    const { id } = req.query;
    const leaveId = Number(id);
    if (!Number.isFinite(leaveId)) {
      return res.status(400).json({ error: 'Invalid leave id.' });
    }

    const existing = await fetchLeave(leaveId);
    if (!existing) {
      return res.status(404).json({ error: 'Leave request not found.' });
    }

    const privileged = isPrivileged(me);
    const isSubmitter = Number(existing.user_id) === Number(me.id);

    if (req.method === 'PATCH' || req.method === 'PUT') {
      const body = getBody(req);
      const newStatus = body.status;
      if (!VALID_STATUSES.includes(newStatus)) {
        return res.status(400).json({ error: 'Invalid status.' });
      }

      // Permission rules:
      //   - Approved / Rejected: privileged users only.
      //   - Cancelled:           the submitter (only while pending) or a
      //                          privileged user.
      //   - Pending:             privileged users may revert a decision.
      if (newStatus === 'Approved' || newStatus === 'Rejected') {
        if (!privileged) {
          return res.status(403).json({ error: 'Only admins or the owner can approve or reject leave.' });
        }
      } else if (newStatus === 'Cancelled') {
        if (!privileged && !(isSubmitter && existing.status === 'Pending')) {
          return res.status(403).json({ error: 'You cannot cancel this request.' });
        }
      } else if (newStatus === 'Pending') {
        if (!privileged) {
          return res.status(403).json({ error: 'Only admins can move a request back to Pending.' });
        }
      }

      const reviewNotes = nullIfEmpty(body.reviewNotes);
      const reviewedBy =
        newStatus === 'Approved' || newStatus === 'Rejected' ? me.id : null;

      await sql`
        UPDATE leave_requests SET
          status = ${newStatus},
          review_notes = ${reviewNotes},
          reviewed_by = ${reviewedBy},
          reviewed_at = ${reviewedBy ? new Date().toISOString() : null},
          updated_at = NOW()
        WHERE id = ${leaveId}
      `;

      const updated = await fetchLeave(leaveId);
      return res.status(200).json({ leave: rowToLeaveRequest(updated) });
    }

    if (req.method === 'DELETE') {
      if (!privileged && !(isSubmitter && existing.status === 'Pending')) {
        return res.status(403).json({ error: 'You cannot delete this request.' });
      }
      await sql`DELETE FROM leave_requests WHERE id = ${leaveId}`;
      return res.status(200).json({ ok: true, id: leaveId });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('leave [id] handler error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
