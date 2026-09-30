// ============================================
// FIREBASE HELPER
// ============================================

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBUPIMsA-72bJh2IAF7R8V6Kg0_TUo1JY0",
  authDomain: "bubble-pop-d1138.firebaseapp.com",
  projectId: "bubble-pop-d1138",
  storageBucket: "bubble-pop-d1138.firebasestorage.app",
  messagingSenderId: "584531847641",
  appId: "1:584531847641:web:37d2a873a2e30d4c6051c8",
  measurementId: "G-X50L0CL68W"
};

firebase.initializeApp(FIREBASE_CONFIG);
const db = firebase.firestore();

let _fbUsersCache = {};
let _fbListenerStarted = false;

function startUsersListener(callback) {
  if (_fbListenerStarted) return;
  _fbListenerStarted = true;
  db.collection('users').onSnapshot(snapshot => {
    _fbUsersCache = {};
    snapshot.forEach(doc => { _fbUsersCache[doc.id] = doc.data(); });
    console.log('🔥 Users synced:', Object.keys(_fbUsersCache).length);
    if (callback) callback(_fbUsersCache);
  }, err => console.error('Firebase error:', err));
}

function getUsersFromCache() { return _fbUsersCache; }

async function saveUserToFirebase(username, data) {
  try {
    await db.collection('users').doc(username).set(data, { merge: true });
    return true;
  } catch (e) { console.error('Save error:', e); return false; }
}

async function deleteUserFromFirebase(username) {
  try { await db.collection('users').doc(username).delete(); return true; }
  catch (e) { return false; }
}

async function saveBroadcast(text) {
  await db.collection('config').doc('broadcast').set({ text, createdAt: Date.now() });
}

async function getBroadcast() {
  const doc = await db.collection('config').doc('broadcast').get();
  return doc.exists ? doc.data() : null;
}

async function clearBroadcastFirebase() {
  await db.collection('config').doc('broadcast').delete();
}

// ===== CHAT =====
function listenChat(callback) {
  db.collection('chat')
    .orderBy('createdAt', 'asc')
    .limitToLast(50)
    .onSnapshot(snapshot => {
      const messages = [];
      snapshot.forEach(doc => { messages.push({ id: doc.id, ...doc.data() }); });
      if (callback) callback(messages);
    }, err => console.error('Chat error:', err));
}

async function sendChatMessage(username, text, avatar, isAdmin) {
  try {
    await db.collection('chat').add({
      username, text,
      avatar: avatar || '👤',
      isAdmin: !!isAdmin,
      createdAt: Date.now()
    });
    return true;
  } catch (e) { console.error('Send chat error:', e); return false; }
}

async function deleteChatMessage(msgId) {
  try { await db.collection('chat').doc(msgId).delete(); return true; }
  catch (e) { return false; }
}

// ===== POKER MULTIPLAYER =====
let _pokerRoomsUnsub = null;
let _currentPkRoomUnsub = null;

function listenPokerRooms(cb) {
  if (_pokerRoomsUnsub) _pokerRoomsUnsub();
  _pokerRoomsUnsub = db.collection('poker_rooms').onSnapshot(snap => {
    const rooms = {};
    snap.forEach(doc => { rooms[doc.id] = doc.data(); });
    cb(rooms);
  });
}

function listenPokerRoom(roomId, cb) {
  if (_currentPkRoomUnsub) _currentPkRoomUnsub();
  _currentPkRoomUnsub = db.collection('poker_rooms').doc(roomId).onSnapshot(doc => {
    cb(doc.exists ? doc.data() : null);
  });
  return () => { if (_currentPkRoomUnsub) _currentPkRoomUnsub(); };
}

async function getPokerRoom(id) {
  const d = await db.collection('poker_rooms').doc(id).get();
  return d.exists ? d.data() : null;
}

async function createPokerRoom(id, data) {
  await db.collection('poker_rooms').doc(id).set(data);
}

async function updatePokerRoom(id, data) {
  await db.collection('poker_rooms').doc(id).set(data, { merge: true });
}

async function joinPokerRoom(id, player) {
  const room = await getPokerRoom(id);
  if (!room) return;
  if (room.players.find(p => p.username === player.username)) return;
  await updatePokerRoom(id, { players: [...room.players, player] });
}

async function leavePokerRoom(id, username) {
  const room = await getPokerRoom(id);
  if (!room) return;
  const players = room.players.filter(p => p.username !== username);
  if (players.length === 0) {
    await db.collection('poker_rooms').doc(id).delete();
    return;
  }
  const updates = { players };
  if (room.host === username) updates.host = players[0].username;
  await updatePokerRoom(id, updates);
}

async function updatePokerPlayer(id, username, data) {
  const room = await getPokerRoom(id);
  if (!room) return;
  const players = room.players.map(p => p.username === username ? { ...p, ...data } : p);
  await updatePokerRoom(id, { players });
}

async function deductCoins(username, amount) {
  const u = getUsersFromCache()[username];
  if (!u) return;
  await saveUserToFirebase(username, { coins: Math.max(0, (u.coins || 0) - amount) });
}

async function addCoinsToUser(username, amount) {
  const u = getUsersFromCache()[username];
  if (!u) return;
  await saveUserToFirebase(username, { coins: (u.coins || 0) + amount });
}

// ===== EXPORT =====
window.fb = {
  db, startUsersListener, getUsersFromCache,
  saveUserToFirebase, deleteUserFromFirebase,
  saveBroadcast, getBroadcast, clearBroadcastFirebase,
  listenChat, sendChatMessage, deleteChatMessage,
  listenPokerRooms, listenPokerRoom, getPokerRoom,
  createPokerRoom, updatePokerRoom, joinPokerRoom, leavePokerRoom,
  updatePokerPlayer, deductCoins, addCoinsToUser
};

console.log('🔥 firebase.js loaded:', FIREBASE_CONFIG.projectId);