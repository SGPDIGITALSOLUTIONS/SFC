import { neon } from '@neondatabase/serverless';
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
export const sql = neon(process.env.DATABASE_URL);

export function json(res, status, body) {
  res.status(status).json(body);
}

export async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  return JSON.parse(req.body || '{}');
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${Buffer.from(key).toString('hex')}`;
}

export async function verifyPassword(password, stored) {
  const [algorithm, salt, hex] = String(stored).split(':');
  if (algorithm !== 'scrypt' || !salt || !hex) return false;
  const expected = Buffer.from(hex, 'hex');
  const actual = Buffer.from(await scrypt(password, salt, expected.length));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

const tokenHash = token => createHash('sha256').update(token).digest('hex');

export async function createSession(res, userId, req) {
  const token = randomBytes(32).toString('base64url');
  await sql`INSERT INTO sessions (token_hash, user_id, expires_at)
            VALUES (${tokenHash(token)}, ${userId}, NOW() + INTERVAL '30 days')`;
  const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `sfc_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000${secure}`);
}

export function clearSession(res) {
  res.setHeader('Set-Cookie', 'sfc_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0');
}

export async function getViewer(req) {
  const cookie = req.headers.cookie || '';
  const token = cookie.split(';').map(x => x.trim()).find(x => x.startsWith('sfc_session='))?.slice(12);
  if (!token) return null;
  const rows = await sql`
    SELECT u.id, u.email, u.display_name, m.role, w.id AS workspace_id,
           w.name AS workspace_name
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    JOIN memberships m ON m.user_id = u.id
    JOIN workspaces w ON w.id = m.workspace_id
    WHERE s.token_hash = ${tokenHash(token)} AND s.expires_at > NOW()
    LIMIT 1`;
  return rows[0] || null;
}

export function publicViewer(viewer) {
  return viewer && {
    id: viewer.id,
    email: viewer.email,
    name: viewer.display_name,
    role: viewer.role,
    workspaceId: viewer.workspace_id,
    workspaceName: viewer.workspace_name
  };
}
