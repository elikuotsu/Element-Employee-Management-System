// PATCH /api/users/:id — change a user's role.
//
// Permission rules (kept deliberately strict — easy to audit):
//   • Only the owner can promote anyone to 'owner' or demote the current owner.
//   • An admin can change roles between 'admin' and 'employee' only.
//   • Nobody can change their own role (prevents self-lockout).
import { sql, ensureTables, getBody } from '../_lib/db.js';
import { requireAuth, requirePrivileged, ROLES } from '../_lib/auth.js';

const ALLOWED_ROLES = [ROLES.OWNER, ROLES.ADMIN, ROLES.EMPLOYEE];

export default async function handler(req, res) {
  const me = requireAuth(req, res);
  if (!me) return;
  if (!requirePrivileged(me, res)) return;

  try {
    await ensureTables();

    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing id parameter.' });

    if (req.method !== 'PATCH' && req.method !== 'PUT') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const targetId = Number(id);
    if (!Number.isFinite(targetId)) {
      return res.status(400).json({ error: 'Invalid user id.' });
    }
    if (targetId === Number(me.id)) {
      return res.status(400).json({ error: 'You cannot change your own role.' });
    }

    const { role: newRole } = getBody(req);
    if (!ALLOWED_ROLES.includes(newRole)) {
      return res.status(400).json({ error: 'Invalid role.' });
    }

    const target = await sql`SELECT id, role FROM users WHERE id = ${targetId}`;
    if (target.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const targetRole = target.rows[0].role;

    // Owner-only operations: anything that touches an owner record, and
    // promoting anyone *to* owner.
    const touchingOwner = newRole === ROLES.OWNER || targetRole === ROLES.OWNER;
    if (touchingOwner && me.role !== ROLES.OWNER) {
      return res.status(403).json({
        error: 'Only the workspace owner can promote, demote, or transfer ownership.'
      });
    }

    const updated = await sql`
      UPDATE users SET role = ${newRole} WHERE id = ${targetId}
      RETURNING id, email, name, role
    `;
    const u = updated.rows[0];
    return res.status(200).json({
      user: { id: u.id, email: u.email, name: u.name, role: u.role }
    });
  } catch (err) {
    console.error('user [id] handler error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
