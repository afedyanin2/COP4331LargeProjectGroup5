// api.js — every backend call lives here.
// Written against main's server.js (categories + pinning supported).

import AsyncStorage from '@react-native-async-storage/async-storage';

// If the live domain isn't up, swap for your computer's LAN IP while the
// backend runs locally, e.g. 'http://192.168.1.42:5000'
// (localhost does NOT work from a phone — the phone's localhost is itself.)
export const API_BASE = 'https://noteriety-app.com';

const TOKEN_KEY = 'noteriety_token';
const EMAIL_KEY = 'noteriety_email';

export async function saveToken(token) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}
export async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}
export async function clearToken() {
  await AsyncStorage.multiRemove([TOKEN_KEY, EMAIL_KEY]);
}
export async function saveEmail(email) {
  await AsyncStorage.setItem(EMAIL_KEY, email);
}
export async function getEmail() {
  return AsyncStorage.getItem(EMAIL_KEY);
}

async function authHeaders() {
  const token = await getToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

// The backend returns HTTP 200 even on failure, with the reason in `error`.
// So we check data.error, not response.ok.
async function handle(res) {
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

// --- Auth ------------------------------------------------------------

export async function login(username, password) {
  const res = await fetch(`${API_BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return handle(res); // { id, firstName, username, emailVerified, token }
}

export async function register({ username, password, firstName, lastName, email }) {
  const res = await fetch(`${API_BASE}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, firstName, lastName, email }),
  });
  const data = await handle(res);
  await saveEmail(email);
  return data;
}

export async function forgotPassword(email) {
  const res = await fetch(`${API_BASE}/api/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return handle(res);
}

export async function resendVerification(email) {
  const res = await fetch(`${API_BASE}/api/resend-verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return handle(res);
}

export async function getMe() {
  const res = await fetch(`${API_BASE}/api/me`, { headers: await authHeaders() });
  return handle(res); // { firstName, lastName, username, email, emailVerified }
}

// --- Categories ------------------------------------------------------

export async function getCategories() {
  const res = await fetch(`${API_BASE}/api/categories`, {
    headers: await authHeaders(),
  });
  const data = await handle(res);
  return data.categories || []; // [{ _id, name, ... }]
}

export async function createCategory(name) {
  const res = await fetch(`${API_BASE}/api/categories`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ name }),
  });
  const data = await handle(res);
  return data.category;
}

// --- Notes -----------------------------------------------------------

// categoryId: undefined = all, 'uncategorized' = only uncategorized,
// or a real id to filter. Server sorts pinned first, then most recent.
export async function getNotes(categoryId) {
  const qs = categoryId ? `?categoryId=${encodeURIComponent(categoryId)}` : '';
  const res = await fetch(`${API_BASE}/api/notes${qs}`, {
    headers: await authHeaders(),
  });
  const data = await handle(res);
  return data.notes || [];
}

// NOTE: title is required by the backend — empty title returns an error.
export async function createNote(title, body, categoryId) {
  const res = await fetch(`${API_BASE}/api/notes`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ title, body, categoryId: categoryId || '' }),
  });
  return handle(res); // { id, note }
}

export async function updateNote(id, title, body, categoryId) {
  const res = await fetch(`${API_BASE}/api/notes/${id}`, {
    method: 'PUT',
    headers: await authHeaders(),
    body: JSON.stringify({ title, body, categoryId: categoryId || '' }),
  });
  return handle(res); // { note }
}

export async function setPinned(id, isPinned) {
  const res = await fetch(`${API_BASE}/api/notes/${id}/pin`, {
    method: 'PUT',
    headers: await authHeaders(),
    body: JSON.stringify({ isPinned }),
  });
  return handle(res); // { note }
}

export async function deleteNote(id) {
  const res = await fetch(`${API_BASE}/api/notes/${id}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  return handle(res);
}
