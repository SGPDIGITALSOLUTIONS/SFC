import { getViewer, json, readBody, sql } from './_lib.js';

const MAX_STATE_BYTES = 8 * 1024 * 1024;

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
      const rows = await sql`
        INSERT INTO workspace_case_state (workspace_id, cases, updated_by, updated_at)
        VALUES (${viewer.workspace_id}, ${serialized}::jsonb, ${viewer.id}, NOW())
        ON CONFLICT (workspace_id) DO UPDATE
          SET cases = EXCLUDED.cases, updated_by = EXCLUDED.updated_by, updated_at = NOW()
        RETURNING updated_at`;
      return json(res, 200, { ok: true, updatedAt: rows[0].updated_at });
    }

    res.setHeader('Allow', 'GET, PUT');
    return json(res, 405, { error: 'Method not allowed.' });
  } catch (error) {
    console.error('case-state error', error);
    return json(res, 500, { error: 'SFC could not save the shared case file. Try again.' });
  }
}
