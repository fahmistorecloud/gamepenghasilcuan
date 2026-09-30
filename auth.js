// ============================================
// AUTH SYSTEM — Firebase Version
// ============================================

const SESSION_KEY = 'bubble_session';
let usersCache = {};
let authReady = false;

// ===== Init Auth =====
function initAuth() {
  if (!window.fb) { console.error('firebase.js belum load!'); return; }
  window.fb.startUsersListener((users) => {
    usersCache = users;
    if (!authReady) { authReady = true; seedAdminCheck(); }
  });
}

// ===== Seed Admin =====
async function seedAdminCheck() {
  if (usersCache.admin) return;
  const hash = await hashPassword('admin123');
  await window.fb.saveUserToFirebase('admin', {
    username: 'admin',
    password: hash,
    isAdmin: true,
    highScore: 0,
    totalPlay: 0,
    coins: 0,
    bankCoins: 0,
    xp: 0,
    owned: [],
    equippedBadge: null,
    avatar: '👑',
    banned: false,
    createdAt: Date.now(),
    lastLogin: null
  });
}

// ===== Load Users =====
function loadUsers() { return usersCache; }
function saveUsers() {}

// ===== Save User =====
async function saveUser(username, data) {
  await window.fb.saveUserToFirebase(username, data);
  usersCache[username] = { ...(usersCache[username] || {}), ...data };
}

// ===== Hash Password (SHA-256) =====
async function hashPassword(password) {
  const enc = new TextEncoder();
  const data = enc.encode(password + '::bubble_salt_v1');
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

// ===== Register =====
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
    username,
    password: hash,
    isAdmin: false,
    highScore: 0,
    totalPlay: 0,
    coins: 0,
    bankCoins: 0,
    xp: 0,
    owned: [],
    equippedBadge: null,
    avatar: '👤',
    banned: false,
    createdAt: Date.now(),
    lastLogin: null
  });
  return { ok: true };
}

// ===== Login =====
async function loginUser(username, password) {
  username = username.trim().toLowerCase();
  const user = usersCache[username];
  if (!user) return { ok: false, error: 'Username tidak ditemukan' };

  const hash = await hashPassword(password);
  if (hash !== user.password) return { ok: false, error: 'Password salah' };
  if (user.banned) return { ok: false, error: 'Akun lo di-ban. Hubungi admin.' };

  await window.fb.saveUserToFirebase(username, { lastLogin: Date.now() });
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

// ===== High Score =====
function getUserHighScore(username) {
  return usersCache[username]?.highScore || 0;
}

async function setUserHighScore(username, score) {
  const u = usersCache[username];
  if (!u) return;
  if (score > (u.highScore || 0)) {
    await saveUser(username, { highScore: score });
  }
}

// ===== Coins =====
function getUserCoins(username) {
  return usersCache[username]?.coins || 0;
}

async function addUserCoins(username, amount) {
  const u = usersCache[username];
  if (!u) return;
  await saveUser(username, { coins: (u.coins || 0) + amount });
}

// ===== Avatar =====
function getUserAvatar(username) {
  return usersCache[username]?.avatar || '👤';
}

async function setUserAvatar(username, avatar) {
  await saveUser(username, { avatar });
}

// ===== Ubah Kata Sandi =====
async function changePassword(username, oldPass, newPass) {
  const user = usersCache[username];
  if (!user) return { ok: false, error: 'User tidak ditemukan' };

  const oldHash = await hashPassword(oldPass);
  if (oldHash !== user.password) {
    return { ok: false, error: 'Kata sandi lama salah' };
  }
  if (newPass.length < 4) {
    return { ok: false, error: 'Kata sandi baru minimal 4 karakter' };
  }

  const newHash = await hashPassword(newPass);
  await saveUser(username, { password: newHash });
  return { ok: true };
}

// ===== Bank =====
function getUserBank(username) {
  return usersCache[username]?.bankCoins || 0;
}

async function depositCoin(username, amount) {
  const user = usersCache[username];
  if (!user) return { ok: false, error: 'User tidak ditemukan' };

  const wallet = user.coins || 0;
  if (amount <= 0) return { ok: false, error: 'Jumlah harus lebih dari 0' };
  if (amount > wallet) return { ok: false, error: 'Coin di dompet tidak cukup' };

  await saveUser(username, {
    coins: wallet - amount,
    bankCoins: (user.bankCoins || 0) + amount
  });
  return { ok: true };
}

async function withdrawCoin(username, amount) {
  const user = usersCache[username];
  if (!user) return { ok: false, error: 'User tidak ditemukan' };

  const bank = user.bankCoins || 0;
  if (amount <= 0) return { ok: false, error: 'Jumlah harus lebih dari 0' };
  if (amount > bank) return { ok: false, error: 'Coin di bank tidak cukup' };

  await saveUser(username, {
    coins: (user.coins || 0) + amount,
    bankCoins: bank - amount
  });
  return { ok: true };
}

// ===== LEVEL SYSTEM =====
function getUserXP(username) {
  return usersCache[username]?.xp || 0;
}

function getUserLevel(username) {
  const xp = getUserXP(username);
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

function getXpForLevel(level) {
  return Math.pow(level - 1, 2) * 100;
}

function getLevelTitle(level) {
  if (level >= 50) return 'DEWA';
  if (level >= 40) return 'LEGENDA';
  if (level >= 30) return 'MASTER';
  if (level >= 20) return 'PRO';
  if (level >= 10) return 'JAGOAN';
  if (level >= 5)  return 'PEMULA';
  return 'NOVICE';
}

async function addUserXP(username, amount) {
  const u = usersCache[username];
  if (!u) return { levelUp: false };
  const oldLevel = getUserLevel(username);
  const newXP = (u.xp || 0) + amount;
  await saveUser(username, { xp: newXP });
  const newLevel = getUserLevel(username);
  return {
    levelUp: newLevel > oldLevel,
    oldLevel,
    newLevel,
    xp: newXP
  };
}

// ===== SHOP SYSTEM =====
const SHOP_AVATARS = [
  { id: 'av1', icon: '😎', name: 'Cool Guy', price: 100 },
  { id: 'av2', icon: '🐱', name: 'Kucing', price: 150 },
  { id: 'av3', icon: '🐶', name: 'Anjing', price: 150 },
  { id: 'av4', icon: '🦊', name: 'Rubah', price: 200 },
  { id: 'av5', icon: '🐼', name: 'Panda', price: 200 },
  { id: 'av6', icon: '🦁', name: 'Singa', price: 300 },
  { id: 'av7', icon: '🐯', name: 'Macan', price: 300 },
  { id: 'av8', icon: '🦄', name: 'Unicorn', price: 500 },
  { id: 'av9', icon: '🐲', name: 'Naga', price: 800 },
  { id: 'av10', icon: '🤖', name: 'Robot', price: 1000 }
];

const SHOP_BADGES = [
  { id: 'bd1', name: 'Pemula', price: 100, color: '#00f5ff' },
  { id: 'bd2', name: 'Jagoan', price: 300, color: '#00ff88' },
  { id: 'bd3', name: 'Master', price: 500, color: '#ffea00' },
  { id: 'bd4', name: 'LEGENDA', price: 1000, color: '#ff00e5' },
  { id: 'bd5', name: 'SULTAN', price: 2000, color: '#ff7b00' },
  { id: 'bd6', name: 'DEWA', price: 5000, color: '#ff0066' }
];

function getOwnedItems(username) {
  return usersCache[username]?.owned || [];
}

async function buyItem(username, itemId, price) {
  const u = usersCache[username];
  if (!u) return { ok: false, error: 'User tidak ditemukan' };

  const coins = u.coins || 0;
  if (coins < price) {
    return { ok: false, error: 'Coin lo gak cukup' };
  }

  const owned = u.owned || [];
  if (owned.includes(itemId)) {
    return { ok: false, error: 'Lo udah punya item ini' };
  }

  await saveUser(username, {
    coins: coins - price,
    owned: [...owned, itemId]
  });

  return { ok: true };
}

async function equipBadge(username, badgeId) {
  await saveUser(username, { equippedBadge: badgeId });
}

function getEquippedBadge(username) {
  return usersCache[username]?.equippedBadge || null;
}