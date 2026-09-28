import { getViewer, json } from '../_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed.' });
  const viewer = await getViewer(req);
  if (!viewer) return json(res, 401, { error: 'Sign in to manage notifications.' });
  if (!process.env.VAPID_PUBLIC_KEY) return json(res, 503, { error: 'Notifications are not configured yet.' });
  return json(res, 200, { publicKey: process.env.VAPID_PUBLIC_KEY });
}
