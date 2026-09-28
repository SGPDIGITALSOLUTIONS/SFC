import { getViewer, json, readBody, sql } from './_lib.js';
import webpush from 'web-push';

const MAX_STATE_BYTES = 8 * 1024 * 1024;

function activityAdded(before = [], after = []) {
  const prior = new Map(before.map(item => [item.id, item]));
  if (after.some(item => !prior.has(item.id))) return true;
  return after.some(item => {
    const old = prior.get(item.id);
    if (!old) return false;
    if (Boolean(old.archived) !== Boolean(item.archived) || old.profileImage !== item.profileImage || old.note !== item.note || old.score !== item.score) return true;
    if ((item.posts?.length || 0) > (old.posts?.length || 0) || (item.events?.length || 0) > (old.events?.length || 0)) return true;
    if (JSON.stringify(item.posts || []) !== JSON.stringify(old.posts || [])) return true;
    const oldComments = (old.posts || []).reduce((count, post) => count + (post.comments?.length || 0), 0);
    const newComments = (item.posts || []).reduce((count, post) => count + (post.comments?.length || 0), 0);
    return newComments > oldComments;
  });
}

async function notifyOtherMember(viewer) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;
  webpush.setVapidDetails('mailto:steve@sgpdigitalsolutions.co.uk', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  const rows = await sql`
    SELECT p.endpoint, p.subscription
    FROM push_subscriptions p
    JOIN memberships m ON m.user_id = p.user_id
    WHERE m.workspace_id = ${viewer.workspace_id} AND p.user_id <> ${viewer.id}`;
  const payload = JSON.stringify({ title: 'SFC update', body: 'There is new activity in your shared case file.', url: '/' });
  await Promise.all(rows.map(async row => {
    try {
      await webpush.sendNotification(row.subscription, payload, { TTL: 60 * 60 });
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410) await sql`DELETE FROM push_subscriptions WHERE endpoint = ${row.endpoint}`;
      else console.error('push delivery error', error);
    }
  }));
}

export default async function handler(req, res) {
  try {
    const viewer = await getViewer(req);
    if (!viewer) return json(res, 401, { error: 'Sign in to access your shared cases.' });

    if (req.method === 'GET') {
      const rows = await sql`
        SELECT cases, updated_at
        FROM workspace_case_state
        WHERE workspace_id = ${viewer.workspace_id}
        LIMIT 1`;
      return json(res, 200, {
        exists: Boolean(rows[0]),
        cases: rows[0]?.cases || null,
        updatedAt: rows[0]?.updated_at || null
      });
    }

    if (req.method === 'PUT') {
      const body = await readBody(req);
      if (!Array.isArray(body.cases)) return json(res, 400, { error: 'Cases must be a list.' });
      const serialized = JSON.stringify(body.cases);
      if (Buffer.byteLength(serialized, 'utf8') > MAX_STATE_BYTES) {
        return json(res, 413, { error: 'Your case file is too large to save. Keep images under 2 MB and remove an attachment before trying again.' });
      }
      const existing = await sql`SELECT cases FROM workspace_case_state WHERE workspace_id = ${viewer.workspace_id} LIMIT 1`;
      const shouldNotify = Boolean(existing[0]) && activityAdded(existing[0].cases || [], body.cases);
      const rows = await sql`
        INSERT INTO workspace_case_state (workspace_id, cases, updated_by, updated_at)
        VALUES (${viewer.workspace_id}, ${serialized}::jsonb, ${viewer.id}, NOW())
        ON CONFLICT (workspace_id) DO UPDATE
          SET cases = EXCLUDED.cases, updated_by = EXCLUDED.updated_by, updated_at = NOW()
        RETURNING updated_at`;
      if (shouldNotify) await notifyOtherMember(viewer);
      return json(res, 200, { ok: true, updatedAt: rows[0].updated_at });
    }

    res.setHeader('Allow', 'GET, PUT');
    return json(res, 405, { error: 'Method not allowed.' });
  } catch (error) {
    console.error('case-state error', error);
    return json(res, 500, { error: 'SFC could not save the shared case file. Try again.' });
  }
}
