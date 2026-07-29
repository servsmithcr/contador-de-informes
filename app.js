const API = '/api';
const TOKEN_KEY = 'lab_informes_token';
const NAME_KEY = 'lab_informes_name';

const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const loginBtn = document.getElementById('login-btn');

const whoName = document.getElementById('who-name');
const logoutBtn = document.getElementById('logout-btn');

const appError = document.getElementById('app-error');
const appOk = document.getElementById('app-ok');

const ticketIdle = document.getElementById('ticket-idle');
const ticketDone = document.getElementById('ticket-done');
const assignForm = document.getElementById('assign-form');
const descriptionInput = document.getElementById('description');
const charcount = document.getElementById('charcount');
const assignBtn = document.getElementById('assign-btn');
const assignedNumber = document.getElementById('assigned-number');
const assignedSummary = document.getElementById('assigned-summary');
const assignAnotherBtn = document.getElementById('assign-another-btn');

const recordsLoading = document.getElementById('records-loading');
const recordsTable = document.getElementById('records-table');
const recordsBody = document.getElementById('records-body');
const recordsEmpty = document.getElementById('records-empty');

function getToken() { return localStorage.getItem(TOKEN_KEY); }

function showLogin() {
  loginScreen.classList.remove('hidden');
  appScreen.classList.add('hidden');
}

function showApp(name) {
  loginScreen.classList.add('hidden');
  appScreen.classList.remove('hidden');
  whoName.textContent = name || '';
}

function setError(el, message) {
  if (!message) { el.classList.add('hidden'); el.textContent = ''; return; }
  el.textContent = message;
  el.classList.remove('hidden');
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(NAME_KEY);
    showLogin();
    throw new Error(data.error || 'Sesión expirada, ingresa de nuevo.');
  }
  if (!res.ok) {
    throw new Error(data.error || 'Ocurrió un error inesperado.');
  }
  return data;
}

// ---------- Login ----------
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  setError(loginError, null);
  loginBtn.disabled = true;
  loginBtn.textContent = 'Ingresando…';

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  try {
    const res = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'No se pudo iniciar sesión.');

    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(NAME_KEY, data.name);
    showApp(data.name);
    loadRecords();
  } catch (err) {
    setError(loginError, err.message);
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Ingresar';
  }
});

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(NAME_KEY);
  showLogin();
});

// ---------- Contador de caracteres ----------
descriptionInput.addEventListener('input', () => {
  const len = descriptionInput.value.length;
  charcount.textContent = `${len} / 255`;
  charcount.classList.toggle('over', len >= 255);
});

// ---------- Asignar número ----------
assignForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  setError(appError, null);
  setError(appOk, null);
  assignBtn.disabled = true;
  assignBtn.textContent = 'Asignando…';

  try {
    const description = descriptionInput.value.trim();
    const data = await apiFetch('/assign-number', {
      method: 'POST',
      body: JSON.stringify({ description }),
    });

    const r = data.record;
    assignedNumber.textContent = r.numberFormatted;
    assignedSummary.innerHTML = `Asignado a <strong>${escapeHtml(r.userName)}</strong> · ${escapeHtml(r.description)}`;

    ticketIdle.classList.add('hidden');
    ticketDone.classList.remove('hidden');

    descriptionInput.value = '';
    charcount.textContent = '0 / 255';

    loadRecords();
  } catch (err) {
    setError(appError, err.message);
  } finally {
    assignBtn.disabled = false;
    assignBtn.textContent = 'Tomar y asignar número';
  }
});

assignAnotherBtn.addEventListener('click', () => {
  ticketDone.classList.add('hidden');
  ticketIdle.classList.remove('hidden');
  setError(appOk, null);
  setError(appError, null);
});

// ---------- Historial ----------
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString('es-CR', {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

async function loadRecords() {
  recordsLoading.classList.remove('hidden');
  recordsTable.classList.add('hidden');
  recordsEmpty.classList.add('hidden');

  try {
    const data = await apiFetch('/records?limit=100');
    const records = data.records || [];

    if (records.length === 0) {
      recordsEmpty.classList.remove('hidden');
    } else {
      recordsBody.innerHTML = records.map((r) => `
        <tr>
          <td class="num-cell">${escapeHtml(r.numberFormatted)}</td>
          <td>${escapeHtml(r.userName)}</td>
          <td>${escapeHtml(r.description)}</td>
          <td class="muted">${formatDate(r.date)}</td>
        </tr>
      `).join('');
      recordsTable.classList.remove('hidden');
    }
  } catch (err) {
    recordsEmpty.textContent = err.message;
    recordsEmpty.classList.remove('hidden');
  } finally {
    recordsLoading.classList.add('hidden');
  }
}

// ---------- Arranque ----------
(function init() {
  const token = getToken();
  const name = localStorage.getItem(NAME_KEY);
  if (token) {
    showApp(name);
    loadRecords();
  } else {
    showLogin();
  }
})();
