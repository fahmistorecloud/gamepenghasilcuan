// ============================================
// AUTH SYSTEM — Firebase Version
// ============================================

const SESSION_KEY = 'bubble_session';
let usersCache = {};
let authReady = false;

function initAuth() {
  if (!window.fb) { console.error('firebase.js belum load!'); return; }
  window.fb.startUsersListener((users) => {
    usersCache = users;
    if (!authReady) { authReady = true; seedAdminCheck(); }
  });
}

async function seedAdminCheck() {
  if (usersCache.admin) return;
  const hash = await hashPassword('admin123');
  await window.fb.saveUserToFirebase('admin', {
    username: 'admin', password: hash, isAdmin: true,
    highScore: 0, totalPlay: 0, coins: 0, avatar: '👑',
    banned: false, createdAt: Date.now(), lastLogin: null
  });
}

function loadUsers() { return usersCache; }
function saveUsers() {}

async function saveUser(username, data) {
  await window.fb.saveUserToFirebase(username, data);
  usersCache[username] = { ...(usersCache[username] || {}), ...data };
}

async function hashPassword(password) {
  const enc = new TextEncoder();
  const data = enc.encode(password + '::bubble_salt_v1');
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

async function registerUser(username, password) {
  username = username.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,15}$/.test(username))
    return { ok: false, error: 'Username 3-15 char, huruf/angka/underscore' };
  if (password.length < 4)
    return { ok: false, error: 'Password minimal 4 karakter' };
  if (usersCache[username])
    return { ok: false, error: 'Username sudah dipakai' };

  const hash = await hashPassword(password);
  await window.fb.saveUserToFirebase(username, {
    username, password: hash, isAdmin: false,
    highScore: 0, totalPlay: 0, coins: 0, avatar: '👤',
    banned: false, createdAt: Date.now(), lastLogin: null
  });
  return { ok: true };
}

async function loginUser(username, password) {
  username = username.trim().toLowerCase();
  const user = usersCache[username];
  if (!user) return { ok: false, error: 'Username tidak ditemukan' };

  const hash = await hashPassword(password);
  if (hash !== user.password) return { ok: false, error: 'Password salah' };
  if (user.banned) return { ok: false, error: 'Akun lo di-ban. Hubungi admin di live chat.' };

  await window.fb.saveUserToFirebase(username, { lastLogin: Date.now() });
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    username, isAdmin: user.isAdmin, loginAt: Date.now()
  }));
  return { ok: true, user: { username, isAdmin: user.isAdmin } };
}

function getSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); }
  catch { return null; }
}

function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  location.reload();
}

function getUserHighScore(username) { return usersCache[username]?.highScore || 0; }
async function setUserHighScore(username, score) {
  const u = usersCache[username];
  if (!u) return;
  if (score > (u.highScore || 0)) await saveUser(username, { highScore: score });
}

function getUserCoins(username) { return usersCache[username]?.coins || 0; }
async function addUserCoins(username, amount) {
  const u = usersCache[username];
  if (!u) return;
  await saveUser(username, { coins: (u.coins || 0) + amount });
}

function getUserAvatar(username) { return usersCache[username]?.avatar || '👤'; }
async function setUserAvatar(username, avatar) { await saveUser(username, { avatar }); }