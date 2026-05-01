// Auth helpers: password hashing + JWT.
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_TTL = '7d';

if (!JWT_SECRET && process.env.NODE_ENV !== 'development') {
  // Don't throw at import time — just warn. Endpoints will refuse to sign tokens
  // if the secret is missing (see signToken below).
  console.warn('[auth] JWT_SECRET env var is not set. Set it in Vercel project settings.');
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function signToken(user, options = {}) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured on the server.');
  }
  // `remember: true` extends the lifetime to 30 days.
  const expiresIn = options.remember ? '30d' : TOKEN_TTL;
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role || 'employee' },
    JWT_SECRET,
    { expiresIn }
  );
}

export function verifyToken(token) {
  if (!JWT_SECRET) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function getUserFromRequest(req) {
  const auth = req.headers?.authorization || req.headers?.Authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  return verifyToken(token);
}

// Returns user payload or sends a 401 and returns null.
export function requireAuth(req, res) {
  const user = getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized. Please sign in.' });
    return null;
  }
  return user;
}

// Role helpers — kept central so the rules are easy to audit.
export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  EMPLOYEE: 'employee'
};

export function isPrivileged(user) {
  return !!user && (user.role === ROLES.OWNER || user.role === ROLES.ADMIN);
}

// Sends a 403 if the user is not privileged. Returns true when allowed.
export function requirePrivileged(user, res) {
  if (!isPrivileged(user)) {
    res.status(403).json({ error: 'You do not have permission to perform this action.' });
    return false;
  }
  return true;
}

// Sends a 403 if the user is not the owner. Returns true when allowed.
export function requireOwner(user, res) {
  if (!user || user.role !== ROLES.OWNER) {
    res.status(403).json({ error: 'Only the workspace owner can perform this action.' });
    return false;
  }
  return true;
}
