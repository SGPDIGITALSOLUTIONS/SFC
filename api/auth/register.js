import { createSession, hashPassword, json, publicViewer, readBody, sql } from '../_lib.js';
import { createHash } from 'node:crypto';

const INVITES = {
  '050690': 'owner',
  '050624': 'friend'
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  try {
    const body = await readBody(req);
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const inviteCode = String(body.inviteCode || '').trim();
    const role = INVITES[inviteCode];
    const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0];
    const fingerprint = createHash('sha256').update(ip).digest('hex');
    const [recent] = await sql`SELECT COUNT(*)::int AS attempts FROM registration_attempts
      WHERE fingerprint=${fingerprint} AND created_at > NOW() - INTERVAL '15 minutes'`;
    if (recent.attempts >= 8) return json(res, 429, { error: 'Too many attempts. Try again in 15 minutes.' });
    if (!role) {
      await sql`INSERT INTO registration_attempts (fingerprint) VALUES (${fingerprint})`;
      return json(res, 403, { error: 'That private invite code is not valid.' });
    }
    if (!name || !/^\S+@\S+\.\S+$/.test(email) || password.length < 10)
      return json(res, 400, { error: 'Use a name, valid email and password of at least 10 characters.' });
    const used = await sql`SELECT 1 FROM users WHERE invite_code = ${inviteCode}`;
    if (used.length) return json(res, 409, { error: 'That invite has already been used.' });
    const existing = await sql`SELECT 1 FROM users WHERE email = ${email}`;
    if (existing.length) return json(res, 409, { error: 'That email already has an account.' });
    const passwordHash = await hashPassword(password);
    const [workspace] = await sql`INSERT INTO workspaces (slug, name)
      VALUES ('sfc-private', 'Our SFC') ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name RETURNING id`;
    const [user] = await sql`INSERT INTO users (email, display_name, password_hash, invite_code)
      VALUES (${email}, ${name}, ${passwordHash}, ${inviteCode}) RETURNING id`;
    await sql`INSERT INTO memberships (user_id, workspace_id, role)
      VALUES (${user.id}, ${workspace.id}, ${role})`;
    await createSession(res, user.id, req);
    const [viewer] = await sql`SELECT u.id,u.email,u.display_name,m.role,w.id workspace_id,w.name workspace_name
      FROM users u JOIN memberships m ON m.user_id=u.id JOIN workspaces w ON w.id=m.workspace_id WHERE u.id=${user.id}`;
    return json(res, 201, { user: publicViewer(viewer) });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: 'Could not create the account.' });
  }
}
