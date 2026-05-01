// POST /api/auth/claim-owner
//
// Lets any signed-in user elevate themselves to the 'owner' role by entering
// the workspace setup password. The password is read from the
// OWNER_SETUP_PASSWORD environment variable (set this in your Vercel project
// settings under Environment Variables, then redeploy).
//
// This is the canonical way to bootstrap or recover ownership when nobody has
// it — for example, after the role column was added by a migration and every
// existing user defaulted to 'employee'.
import { sql, ensureTables, getBody } from '../_lib/db.js';
import { requireAuth, signToken, ROLES } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const me = requireAuth(req, res);
  if (!me) return;

  const setupPassword = process.env.OWNER_SETUP_PASSWORD;
  if (!setupPassword) {
    return res.status(503).json({
      error:
        'Owner claim is not configured. Set the OWNER_SETUP_PASSWORD environment variable on the server, redeploy, and try again.'
    });
  }

  const { password } = getBody(req);
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Password is required.' });
  }

  // Constant-time comparison to avoid leaking timing information about the
  // configured password.
  if (!safeEqual(password, setupPassword)) {
    return res.status(401).json({ error: 'Incorrect setup password.' });
  }

  try {
    await ensureTables();
    const result = await sql`
      UPDATE users SET role = ${ROLES.OWNER}
      WHERE id = ${me.id}
      RETURNING id, email, name, role
    `;
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account no longer exists.' });
    }
    const user = result.rows[0];
    // Issue a fresh token so the role claim in the JWT is updated.
    const token = signToken(user, { remember: false });
    return res.status(200).json({ user, token });
  } catch (err) {
    console.error('claim-owner error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
