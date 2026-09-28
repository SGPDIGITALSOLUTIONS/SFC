import { getViewer, json, publicViewer } from './_lib.js';

export default async function handler(req, res) {
  const viewer = await getViewer(req);
  return viewer
    ? json(res, 200, { user: publicViewer(viewer) })
    : json(res, 401, { error: 'Not signed in.' });
}
