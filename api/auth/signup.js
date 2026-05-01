import { sql, ensureTables, getBody } from '../_lib/db.js';
import { hashPassword, signToken, ROLES } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    await ensureTables();

    const { email, password, name, remember } = getBody(req);
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    const existing = await sql`SELECT id FROM users WHERE email = ${normalizedEmail}`;
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // The very first user to register becomes the workspace owner. Everyone
    // else defaults to 'employee' and can be promoted later by an admin/owner.
    const countResult = await sql`SELECT COUNT(*)::int AS count FROM users`;
    const isFirstUser = (countResult.rows[0]?.count || 0) === 0;
    const role = isFirstUser ? ROLES.OWNER : ROLES.EMPLOYEE;

    const hash = await hashPassword(password);
    const result = await sql`
      INSERT INTO users (email, password_hash, name, role)
      VALUES (${normalizedEmail}, ${hash}, ${String(name).trim()}, ${role})
      RETURNING id, email, name, role
    `;
    const user = result.rows[0];
    const token = signToken(user, { remember: !!remember });

    return res.status(201).json({ user, token });
  } catch (err) {
    console.error('signup error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
