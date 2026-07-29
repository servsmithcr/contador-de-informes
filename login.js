const { getStore } = require('@netlify/blobs');
const { verifyPassword, signToken, json, preflight } = require('./lib/auth');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Método no permitido' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'JSON inválido' });
  }

  const username = (body.username || '').trim().toLowerCase();
  const password = body.password || '';

  if (!username || !password) {
    return json(400, { error: 'Usuario y contraseña son obligatorios' });
  }

  const usersStore = getStore('lab-users');
  const users = (await usersStore.get('users', { type: 'json' })) || {};
  const user = users[username];

  if (!user || !verifyPassword(password, user.salt, user.hash)) {
    return json(401, { error: 'Usuario o contraseña incorrectos' });
  }

  const token = signToken({ username, name: user.name || username });

  return json(200, { token, username, name: user.name || username });
};
