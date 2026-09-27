// ============================================
// AUTH SYSTEM
// ⚠️ Client-side only, NOT real security!
// ============================================

const USERS_KEY = 'bubble_users';
const SESSION_KEY = 'bubble_session';

function loadUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY)) || {}; }
  catch { return {}; }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// ===== Seed default admin =====
(function seedAdmin() {
  const users = loadUsers();
  if (!users.admin) {
    hashPassword('admin123').then(hash => {
      const u = loadUsers();
      u.admin = {
        password: hash,
        isAdmin: true,
        highScore: 0,
        totalPlay: 0,
        coins: 0,
        avatar: '👑',
        banned: false,
        createdAt: Date.now(),
        lastLogin: null
      };
      saveUsers(u);
    });
  }
})();

// ===== Hash Password (SHA-256 + salt) =====
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + '::bubble_salt_v1');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

// ===== Register =====
async function registerUser(username, password) {
  username = username.trim().toLowerCase();

  if (!/^[a-z0-9_]{3,15}$/.test(username)) {
    return { ok: false, error: 'Username 3-15 char, huruf/angka/underscore' };
  }
  if (password.length < 4) {
    return { ok: false, error: 'Password minimal 4 karakter' };
  }

  const users = loadUsers();
  if (users[username]) {
    return { ok: false, error: 'Username sudah dipakai' };
  }

  users[username] = {
    password: await hashPassword(password),
    isAdmin: false,
    highScore: 0,
    totalPlay: 0,
    coins: 0,
    avatar: '👤',
    banned: false,
    createdAt: Date.now(),
    lastLogin: null
  };
  saveUsers(users);
  return { ok: true };
}

// ===== Login =====
async function loginUser(username, password) {
  username = username.trim().toLowerCase();
  const users = loadUsers();
  const user = users[username];

  if (!user) return { ok: false, error: 'Username tidak ditemukan' };

  const hash = await hashPassword(password);
  if (hash !== user.password) {
    return { ok: false, error: 'Password salah' };
  }

  // Cek banned
  if (user.banned) {
    return { ok: false, error: 'Akun lo di-ban. Hubungi admin di live chat.' };
  }

  user.lastLogin = Date.now();
  saveUsers(users);

  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    username,
    isAdmin: user.isAdmin,
    loginAt: Date.now()
  }));

  return { ok: true, user: { username, isAdmin: user.isAdmin } };
}

// ===== Session =====
function getSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); }
  catch { return null; }
}

function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  location.reload();
}

// ===== High Score per user =====
function getUserHighScore(username) {
  return loadUsers()[username]?.highScore || 0;
}

function setUserHighScore(username, score) {
  const users = loadUsers();
  if (!users[username]) return;
  if (score > (users[username].highScore || 0)) {
    users[username].highScore = score;
    saveUsers(users);
  }
}

// ===== Coins per user =====
function getUserCoins(username) {
  return loadUsers()[username]?.coins || 0;
}

function addUserCoins(username, amount) {
  const users = loadUsers();
  if (!users[username]) return;
  users[username].coins = (users[username].coins || 0) + amount;
  saveUsers(users);
}

// ===== Avatar per user =====
function getUserAvatar(username) {
  return loadUsers()[username]?.avatar || '👤';
}

function setUserAvatar(username, avatar) {
  const users = loadUsers();
  if (!users[username]) return;
  users[username].avatar = avatar;
  saveUsers(users);
}