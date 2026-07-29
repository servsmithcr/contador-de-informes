const { getStore } = require('@netlify/blobs');
const { hashPassword, json, preflight } = require('./lib/auth');

function checkAdminSecret(event) {
  const provided = event.headers['x-admin-secret'] || event.headers['X-Admin-Secret'];
  const expected = process.env.ADMIN_SECRET;
  return Boolean(expected) && provided === expected;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();

  if (!checkAdminSecret(event)) {
    return json(401, { error: 'Clave de administración inválida o faltante (header x-admin-secret).' });
  }

  const usersStore = getStore('lab-users');

  if (event.httpMethod === 'GET') {
    const users = (await usersStore.get('users', { type: 'json' })) || {};
    const list = Object.entries(users).map(([username, u]) => ({
      username,
      name: u.name || username,
    }));
    return json(200, { users: list });
  }

  if (event.httpMethod === 'POST') {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return json(400, { error: 'JSON inválido' });
    }

    const username = (body.username || '').trim().toLowerCase();
    const password = body.password || '';
    const name = (body.name || '').trim();

    if (!username || !password) {
      return json(400, { error: 'username y password son obligatorios' });
    }
    if (password.length < 6) {
      return json(400, { error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const users = (await usersStore.get('users', { type: 'json' })) || {};
    const { hash, salt } = hashPassword(password);

    users[username] = { hash, salt, name: name || username };

    await usersStore.setJSON('users', users);

    return json(200, { message: `Usuario '${username}' creado/actualizado correctamente.` });
  }

  if (event.httpMethod === 'DELETE') {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return json(400, { error: 'JSON inválido' });
    }
    const username = (body.username || '').trim().toLowerCase();
    if (!username) return json(400, { error: 'username es obligatorio' });

    const users = (await usersStore.get('users', { type: 'json' })) || {};
    delete users[username];
    await usersStore.setJSON('users', users);

    return json(200, { message: `Usuario '${username}' eliminado.` });
  }

  return json(405, { error: 'Método no permitido' });
};
