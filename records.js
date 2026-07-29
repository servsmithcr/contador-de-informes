const { getStore } = require('@netlify/blobs');
const { getUserFromRequest, json, preflight } = require('./lib/auth');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'GET') {
    return json(405, { error: 'Método no permitido' });
  }

  const user = getUserFromRequest(event);
  if (!user) {
    return json(401, { error: 'No autorizado. Inicia sesión de nuevo.' });
  }

  const registry = getStore('lab-registry');

  const { blobs } = await registry.list({ prefix: 'record-' });

  const records = await Promise.all(
    blobs.map((b) => registry.get(b.key, { type: 'json' }))
  );

  records.sort((a, b) => b.number - a.number);

  const limit = Math.min(parseInt(event.queryStringParameters?.limit, 10) || 100, 500);

  return json(200, { records: records.slice(0, limit), total: records.length });
};
