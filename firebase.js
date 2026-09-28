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

window.fb = {
  db, startUsersListener, getUsersFromCache,
  saveUserToFirebase, deleteUserFromFirebase,
  saveBroadcast, getBroadcast, clearBroadcastFirebase,
  listenChat, sendChatMessage, deleteChatMessage
};

console.log('🔥 firebase.js loaded:', FIREBASE_CONFIG.projectId);