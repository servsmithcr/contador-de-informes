const { getStore } = require('@netlify/blobs');
const { getUserFromRequest, json, preflight } = require('./lib/auth');

const MAX_DESCRIPTION_LENGTH = 255;
const MAX_RETRIES = 8;

function pad(number) {
  return String(number).padStart(6, '0');
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Método no permitido' });
  }

  const user = getUserFromRequest(event);
  if (!user) {
    return json(401, { error: 'No autorizado. Inicia sesión de nuevo.' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'JSON inválido' });
  }

  const description = (body.description || '').trim();
  if (!description) {
    return json(400, { error: 'La descripción es obligatoria.' });
  }
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return json(400, {
      error: `La descripción no puede superar ${MAX_DESCRIPTION_LENGTH} caracteres.`,
    });
  }

  const registry = getStore({ name: 'lab-registry', consistency: 'strong' });

  // Escritura optimista y atómica del contador: leemos el valor actual con su
  // ETag y solo escribimos si nadie más lo cambió mientras tanto. Si otro
  // usuario ganó la carrera, reintentamos con el nuevo valor.
  let assignedNumber = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const current = await registry.getWithMetadata('counter', { type: 'json' });
    const currentNumber = current && current.data ? current.data.next : 1;
    const currentEtag = current ? current.etag : null;

    const writeOptions = currentEtag ? { onlyIfMatch: currentEtag } : { onlyIfNew: true };

    const { modified } = await registry.setJSON('counter', { next: currentNumber + 1 }, writeOptions);

    if (modified) {
      assignedNumber = currentNumber;
      break;
    }
    // Alguien más escribió al mismo tiempo (cambió el ETag): reintentar con el valor actualizado.
  }

  if (assignedNumber === null) {
    return json(409, {
      error: 'No se pudo asignar el número por alta concurrencia. Intenta de nuevo.',
    });
  }

  const record = {
    number: assignedNumber,
    numberFormatted: pad(assignedNumber),
    username: user.username,
    userName: user.name || user.username,
    description,
    date: new Date().toISOString(),
  };

  await registry.setJSON(`record-${pad(assignedNumber)}`, record);

  return json(200, { record });
};
