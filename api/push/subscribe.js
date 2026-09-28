import { getViewer, json, readBody, sql } from '../_lib.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed.' });
    const viewer = await getViewer(req);
    if (!viewer) return json(res, 401, { error: 'Sign in to turn on notifications.' });
    const { subscription } = await readBody(req);
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return json(res, 400, { error: 'That device could not create a notification subscription.' });
    }
    const serialized = JSON.stringify(subscription);
    await sql`
      INSERT INTO push_subscriptions (endpoint, user_id, subscription, updated_at)
      VALUES (${subscription.endpoint}, ${viewer.id}, ${serialized}::jsonb, NOW())
      ON CONFLICT (endpoint) DO UPDATE
        SET user_id = EXCLUDED.user_id, subscription = EXCLUDED.subscription, updated_at = NOW()`;
    return json(res, 200, { ok: true });
  } catch (error) {
    console.error('push subscription error', error);
    return json(res, 500, { error: 'SFC could not turn on notifications for this device.' });
  }
}
