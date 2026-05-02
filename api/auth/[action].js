// Single serverless function that dispatches every /api/auth/* call by the
// {action} URL segment. Consolidating these keeps the deployed function count
// under Vercel's Hobby-plan ceiling of 12.
//
//   POST /api/auth/signup        — create account
//   POST /api/auth/login         — sign in (supports `remember`)
//   GET  /api/auth/me            — current user (re-reads role from DB)
//   POST /api/auth/claim-owner   — promote to owner via OWNER_SETUP_PASSWORD
import { sql, ensureTables, getBody } from '../_lib/db.js';
import {
  hashPassword,
  verifyPassword,
  signToken,
  requireAuth,
  ROLES
} from '../_lib/auth.js';

export default async function handler(req, res) {
  const action = String(req.query.action || '');
  try {
    if (action === 'signup') return await handleSignup(req, res);
    if (action === 'login') return await handleLogin(req, res);
    if (action === 'me') return await handleMe(req, res);
    if (action === 'claim-owner') return await handleClaimOwner(req, res);
    return res.status(404).json({ error: 'Unknown auth action.' });
  } catch (err) {
    console.error(`auth/${action} error:`, err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

async function handleSignup(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
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

  // First user becomes the owner; everyone else defaults to employee.
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
}

async function handleLogin(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  await ensureTables();

  const { email, password, remember } = getBody(req);
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const result = await sql`
    SELECT id, email, name, role, password_hash FROM users WHERE email = ${normalizedEmail}
  `;
  if (result.rows.length === 0) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  const user = result.rows[0];
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = signToken(user, { remember: !!remember });
  return res.status(200).json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    token
  });
}

async function handleMe(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const tokenUser = requireAuth(req, res);
  if (!tokenUser) return;

  await ensureTables();
  // Re-read from the DB so any role change since the token was issued takes
  // effect immediately on the next page load.
  const result = await sql`
    SELECT id, email, name, role FROM users WHERE id = ${tokenUser.id}
  `;
  if (result.rows.length === 0) {
    return res.status(401).json({ error: 'Account no longer exists.' });
  }
  const user = result.rows[0];
  return res.status(200).json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role }
  });
}

async function handleClaimOwner(req, res) {
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
  if (!safeEqual(password, setupPassword)) {
    return res.status(401).json({ error: 'Incorrect setup password.' });
  }

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
  const token = signToken(user, { remember: false });
  return res.status(200).json({ user, token });
}

// Constant-time string compare so the response time can't leak how close a
// guess was to the configured password.
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}
