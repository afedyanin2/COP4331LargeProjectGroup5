// api.js — every backend call lives here.
// One place to change the URL, one place to debug network issues.

import AsyncStorage from '@react-native-async-storage/async-storage';

// If the live domain isn't up yet, swap this for your computer's local IP
// while the backend runs locally, e.g. 'http://192.168.1.42:5000'
// (localhost does NOT work from a phone — the phone's localhost is itself.)
export const API_BASE = 'https://noteriety-app.com';

const TOKEN_KEY = 'noteriety_token';

export async function saveToken(token) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function clearToken() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

// --- Auth ------------------------------------------------------------

// Backend returns HTTP 200 even on failure, with the reason in `error`.
// So we check data.error, not response.ok.
export async function login(username, password) {
  const res = await fetch(`${API_BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data; // { id, firstName, lastName, emailVerified, token, error }
}

export async function register({ username, password, firstName, lastName, email }) {
  const res = await fetch(`${API_BASE}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, firstName, lastName, email }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

// --- Notes (all require the token) -----------------------------------

async function authHeaders() {
  const token = await getToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function getNotes() {
  const res = await fetch(`${API_BASE}/api/notes`, {
    headers: await authHeaders(),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.notes || [];
}

export async function createNote(title, body) {
  const res = await fetch(`${API_BASE}/api/notes`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ title, body }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

export async function updateNote(id, title, body) {
  const res = await fetch(`${API_BASE}/api/notes/${id}`, {
    method: 'PUT',
    headers: await authHeaders(),
    body: JSON.stringify({ title, body }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

export async function deleteNote(id) {
  const res = await fetch(`${API_BASE}/api/notes/${id}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}