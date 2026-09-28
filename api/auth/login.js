import { createSession, json, publicViewer, readBody, sql, verifyPassword } from '../_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  const body = await readBody(req);
  const email = String(body.email || '').trim().toLowerCase();
  const [account] = await sql`SELECT id, password_hash FROM users WHERE email = ${email}`;
  if (!account || !(await verifyPassword(String(body.password || ''), account.password_hash)))
    return json(res, 401, { error: 'Email or password is incorrect.' });
  await createSession(res, account.id, req);
  const [viewer] = await sql`SELECT u.id,u.email,u.display_name,m.role,w.id workspace_id,w.name workspace_name
    FROM users u JOIN memberships m ON m.user_id=u.id JOIN workspaces w ON w.id=m.workspace_id WHERE u.id=${account.id}`;
  return json(res, 200, { user: publicViewer(viewer) });
}
