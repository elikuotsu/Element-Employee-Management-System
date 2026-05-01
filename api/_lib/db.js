// Postgres helpers (Neon serverless driver)
// Connection string is auto-read from whichever env var Vercel set when you
// connected the Neon database to this project. We accept the modern
// DATABASE_URL (Neon marketplace default) as well as the legacy POSTGRES_URL.
import { neon } from '@neondatabase/serverless';

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING;

if (!connectionString) {
  console.warn(
    '[db] No Postgres connection string found. Expected DATABASE_URL or POSTGRES_URL. ' +
    'Connect a Neon database to this Vercel project under Storage.'
  );
}

const _neon = connectionString ? neon(connectionString) : null;

// Wrap so callers keep the familiar `{ rows }` result shape regardless of
// driver. The Neon tagged template natively returns an array; we mirror it.
export const sql = async (strings, ...values) => {
  if (!_neon) {
    throw new Error('Database is not configured. Connect Neon under Vercel → Storage.');
  }
  const rows = await _neon(strings, ...values);
  return { rows: Array.isArray(rows) ? rows : [], rowCount: Array.isArray(rows) ? rows.length : 0 };
};

// Idempotent table creation. Safe to call on every request.
let tablesEnsured = false;
export async function ensureTables() {
  if (tablesEnsured) return;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'employee',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Idempotent migration: ensure the `role` column exists on legacy installs.
  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'employee'
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT,
      department TEXT,
      email TEXT,
      phone TEXT,
      join_date DATE,
      status TEXT DEFAULT 'Active',
      dob DATE,
      gender TEXT,
      blood_group TEXT,
      address TEXT,
      grade TEXT,
      manager_id TEXT,
      emergency_name TEXT,
      emergency_phone TEXT,
      notes TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS leave_requests (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      employee_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
      leave_type TEXT NOT NULL DEFAULT 'Casual',
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      reason TEXT,
      status TEXT NOT NULL DEFAULT 'Pending',
      reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      review_notes TEXT,
      reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  tablesEnsured = true;
}

// Convert empty strings to null so date columns and the like don't error.
export function nullIfEmpty(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === 'string' && v.trim() === '') return null;
  return v;
}

// Map a DB row to the camelCase shape the frontend expects.
export function rowToEmployee(row) {
  const dateStr = (d) => {
    if (!d) return '';
    if (d instanceof Date) return d.toISOString().split('T')[0];
    // Already a YYYY-MM-DD string from pg
    return String(d).split('T')[0];
  };
  return {
    id: row.id,
    name: row.name || '',
    role: row.role || '',
    department: row.department || '',
    email: row.email || '',
    phone: row.phone || '',
    joinDate: dateStr(row.join_date),
    status: row.status || 'Active',
    dob: dateStr(row.dob),
    gender: row.gender || '',
    bloodGroup: row.blood_group || '',
    address: row.address || '',
    grade: row.grade || '',
    managerId: row.manager_id || '',
    emergencyName: row.emergency_name || '',
    emergencyPhone: row.emergency_phone || '',
    notes: row.notes || ''
  };
}

// Map a leave_requests row (joined with users) to camelCase shape.
export function rowToLeaveRequest(row) {
  const dateStr = (d) => {
    if (!d) return '';
    if (d instanceof Date) return d.toISOString().split('T')[0];
    return String(d).split('T')[0];
  };
  const tsStr = (d) => {
    if (!d) return '';
    if (d instanceof Date) return d.toISOString();
    return String(d);
  };
  return {
    id: String(row.id),
    userId: row.user_id,
    userName: row.user_name || '',
    userEmail: row.user_email || '',
    employeeId: row.employee_id || '',
    leaveType: row.leave_type || 'Casual',
    startDate: dateStr(row.start_date),
    endDate: dateStr(row.end_date),
    reason: row.reason || '',
    status: row.status || 'Pending',
    reviewedBy: row.reviewed_by || null,
    reviewerName: row.reviewer_name || '',
    reviewNotes: row.review_notes || '',
    reviewedAt: tsStr(row.reviewed_at),
    createdAt: tsStr(row.created_at),
    updatedAt: tsStr(row.updated_at)
  };
}

// Helper: safely parse JSON body (Vercel Node runtime auto-parses, but be defensive).
export function getBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}
