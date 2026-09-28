// ============================================
// UI HANDLER — Firebase Version
// ============================================

document.addEventListener('DOMContentLoaded', () => {

  if (typeof initAuth === 'function') initAuth();

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  const loginScreen       = document.getElementById('loginScreen');
  const menuScreen        = document.getElementById('menuScreen');
  const modeScreen        = document.getElementById('modeScreen');
  const leaderboardScreen = document.getElementById('leaderboardScreen');
  const profileScreen     = document.getElementById('profileScreen');
  const achievementScreen = document.getElementById('achievementScreen');
  const statsScreen       = document.getElementById('statsScreen');
  const chatScreen        = document.getElementById('chatScreen');
  const bankScreen        = document.getElementById('bankScreen');
  const settingsScreen    = document.getElementById('settingsScreen');
  const shopScreen        = document.getElementById('shopScreen');
  const levelScreen       = document.getElementById('levelScreen');
  const gameContainer     = document.getElementById('gameContainer');

  const tabs         = document.querySelectorAll('.tab');
  const loginForm    = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const loginError   = document.getElementById('loginError');
  const regError     = document.getElementById('regError');

  loginForm.style.display = 'flex';
  registerForm.style.display = 'none';

  // ===== SET ACTIVE NAV =====
  function setActiveNav(navName) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector('.nav-btn[data-nav="' + navName + '"]');
    if (btn) btn.classList.add('active');

    const navs = ['home', 'play', 'rank', 'chat', 'shop', 'profile'];
    const idx = navs.indexOf(navName);
    if (idx !== -1) updateSwipeDot(idx);
  }

  function updateSwipeDot(idx) {
    document.querySelectorAll('.swipe-dot').forEach((dot, i) => {
      if (i === idx) dot.classList.add('active');
      else dot.classList.remove('active');
    });
  }

  // ===== TABS =====
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      if (tab.dataset.tab === 'login') {
        loginForm.style.display = 'flex';
        registerForm.style.display = 'none';
      } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'flex';
      }
      loginError.textContent = '';
      regError.textContent = '';
    });
  });

  // ===== LOGIN =====
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';
    const u = document.getElementById('loginUser').value;
    const p = document.getElementById('loginPass').value;

    loginError.style.color = '#ffea00';
    loginError.textContent = 'Menghubungkan...';
    let waitCount = 0;
    while (Object.keys(loadUsers()).length === 0 && waitCount < 25) {
      await new Promise(r => setTimeout(r, 200));
      waitCount++;
    }
    loginError.textContent = '';
    loginError.style.color = '';

    const res = await loginUser(u, p);
    if (!res.ok) { loginError.textContent = '❌ ' + res.error; return; }
    showMenu(res.user);
  });

  // ===== REGISTER =====
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    regError.textContent = '';
    const u = document.getElementById('regUser').value;
    const p = document.getElementById('regPass').value;
    const p2 = document.getElementById('regPass2').value;
    if (p !== p2) { regError.textContent = '❌ Password tidak sama'; return; }

    regError.style.color = '#ffea00';
    regError.textContent = 'Menghubungkan...';
    let waitCount = 0;
    while (Object.keys(loadUsers()).length === 0 && waitCount < 25) {
      await new Promise(r => setTimeout(r, 200));
      waitCount++;
    }
    regError.textContent = '';
    regError.style.color = '';

    const res = await registerUser(u, p);
    if (!res.ok) { regError.textContent = '❌ ' + res.error; return; }
    regError.style.color = '#00ff88';
    regError.textContent = '✅ Registrasi sukses! Silakan login...';
    setTimeout(() => {
      regError.style.color = '';
      document.querySelector('.tab[data-tab="login"]').click();
      document.getElementById('loginUser').value = u;
      document.getElementById('loginPass').focus();
    }, 1200);
  });

  // ===== SHOW MENU =====
  function showMenu(user) {
    document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
    document.querySelectorAll('.overlay').forEach(s => {
      if (s.id !== 'achievePopup') s.style.display = 'none';
    });
    gameContainer.style.display = 'none';
    menuScreen.style.display = 'flex';
    document.body.classList.remove('in-menu');

    if (typeof showChatWidget === 'function') showChatWidget();
    if (window.Tawk_API && window.Tawk_API.setAttributes) {
      window.Tawk_API.setAttributes({
        'name': user.username,
        'email': user.username + '@bubblepop.local'
      }, function (error) {});
    }

    // Update user info
    const u = loadUsers()[user.username];
    if (!u) return;

    document.getElementById('menuUsername').textContent = user.username;
    document.getElementById('menuWelcome').textContent = user.username;

    const avatar = getUserAvatar(user.username);
    document.getElementById('menuUserAvatar').textContent = avatar;

    const level = getUserLevel(user.username);
    document.getElementById('menuUserLevel').textContent = 'Level ' + level + ' - ' + getLevelTitle(level);

    document.getElementById('menuTotalPlay').textContent = u.totalPlay || 0;
    document.getElementById('menuCoins').textContent = u.coins || 0;
    document.getElementById('menuHighScore').textContent = u.highScore || 0;

    setActiveNav('home');

    showBroadcastIfAny();
    checkDailyBonus();
    checkAchievements();
  }

  window.showMenu = showMenu;

  // ===== SHOW GAME =====
  function showGame(user, mode) {
    document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
    document.querySelectorAll('.overlay').forEach(s => {
      if (s.id !== 'achievePopup' && s.id !== 'adminPanel') s.style.display = 'none';
    });
    gameContainer.style.display = 'block';
    document.getElementById('currentUser').textContent = user.username;
    const hs = getUserHighScore(user.username);
    document.getElementById('highScore').textContent = hs;
    document.getElementById('startHighScore').textContent = hs;
    document.getElementById('start').style.display = 'flex';
    document.getElementById('gameover').style.display = 'none';
    document.getElementById('victory').style.display = 'none';
    if (typeof window.onUserLogin === 'function') window.onUserLogin(user, mode);
  }

  window.showGame = showGame;

  // ===== BACK TO MENU =====
  document.getElementById('btnBackToMenu').addEventListener('click', () => {
    if (typeof window.stopGame === 'function') window.stopGame();
    const s = getSession(); if (s) showMenu(s);
  });
  document.getElementById('btnBackMenuFromGameover').addEventListener('click', () => {
    const s = getSession(); if (s) showMenu(s);
  });
  document.getElementById('btnVictoryMenu').addEventListener('click', () => {
    const s = getSession(); if (s) showMenu(s);
  });
  document.getElementById('btnVictoryRestart').addEventListener('click', () => {
    if (window.startGameWithMode && window.currentModeId) window.startGameWithMode(window.currentModeId);
  });

  // ===== MENU LOGOUT =====
  const btnMenuLogout = document.getElementById('btnMenuLogout');
  if (btnMenuLogout) {
    btnMenuLogout.addEventListener('click', () => {
      if (confirm('Yakin mau logout?')) {
        if (typeof hideChatWidget === 'function') hideChatWidget();
        sessionStorage.removeItem('bubble_session');
        location.reload();
      }
    });
  }

  // ===== BROADCAST =====
  async function showBroadcastIfAny() {
    try {
      const data = await window.fb.getBroadcast();
      if (!data || !data.text) return;
      const seen = sessionStorage.getItem('broadcast_seen');
      if (seen === String(data.createdAt)) return;
      const notif = document.createElement('div');
      notif.style.cssText = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: linear-gradient(90deg, #ffea00, #ff7b00); color: #1a0033; padding: 12px 24px; border-radius: 30px; font-weight: bold; font-size: 14px; z-index: 9999; box-shadow: 0 0 30px rgba(255, 234, 0, 0.6); animation: slideDown 0.4s ease-out; max-width: 90%; text-align: center; cursor: pointer;';
      notif.textContent = '📢 ' + data.text;
      notif.addEventListener('click', () => notif.remove());
      document.body.appendChild(notif);
      setTimeout(() => notif.remove(), 8000);
      sessionStorage.setItem('broadcast_seen', String(data.createdAt));
    } catch (e) {}
  }

  // ===== BOTTOM NAVBAR =====
  const swipePages = ['menuScreen', 'modeScreen', 'leaderboardScreen', 'chatScreen', 'shopScreen', 'profileScreen'];
  const swipeNavs  = ['home', 'play', 'rank', 'chat', 'shop', 'profile'];

  function getCurrentScreenIdx() {
    for (let i = 0; i < swipePages.length; i++) {
      const el = document.getElementById(swipePages[i]);
      if (el && el.style.display === 'flex') return i;
    }
    return 0;
  }

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const nav = btn.dataset.nav;
      const session = getSession();
      if (!session) return;

      setTimeout(() => {
        if (nav === 'home') {
          showMenu(session);
        } else if (nav === 'play') {
          document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
          modeScreen.style.display = 'flex';
          setActiveNav('play');
        } else if (nav === 'rank') {
          document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
          leaderboardScreen.style.display = 'flex';
          showLeaderboard();
          setActiveNav('rank');
        } else if (nav === 'chat') {
          openChat();
        } else if (nav === 'shop') {
          openShop();
        } else if (nav === 'profile') {
          openProfileScreen();
        }
      }, 100);
    });
  });

  // ===== PROFILE =====
  const AVATARS = ['👤','😎','🐱','🐶','🦊','🐼','🐸','🦁','🐯','🦄','🐙','🦋','🐝','🦉','🐺','🐨','🐵','🐰','🐷','🤖'];

  function openProfileScreen() {
    const session = getSession();
    if (!session) return;
    const u = loadUsers()[session.username];
    if (!u) return;
    menuScreen.style.display = 'none';
    profileScreen.style.display = 'flex';
    setActiveNav('profile');

    document.getElementById('profileName').textContent = session.username;
    document.getElementById('profileRole').textContent = u.isAdmin ? 'ADMIN' : 'PLAYER';
    document.getElementById('profileHighScore').textContent = u.highScore || 0;
    document.getElementById('profileTotalPlay').textContent = u.totalPlay || 0;
    document.getElementById('profileCoins').textContent = u.coins || 0;
    document.getElementById('profileBank').textContent = u.bankCoins || 0;
    const joined = u.createdAt ? new Date(u.createdAt).toLocaleDateString('id-ID') : '-';
    document.getElementById('profileJoined').textContent = joined;
    document.getElementById('profileAvatar').textContent = getUserAvatar(session.username);
  }

  window.openProfileScreen = openProfileScreen;

  document.getElementById('btnBackFromProfile').addEventListener('click', () => {
    profileScreen.style.display = 'none';
    const s = getSession(); if (s) showMenu(s);
  });

  document.getElementById('btnChangeAvatarProfile').addEventListener('click', openAvatarPicker);
  document.getElementById('btnChangeAvatarSettings').addEventListener('click', openAvatarPicker);

  function openAvatarPicker() {
    const session = getSession();
    if (!session) return;
    const grid = document.getElementById('avatarGrid');
    grid.innerHTML = '';
    const current = getUserAvatar(session.username);
    AVATARS.forEach(a => {
      const btn = document.createElement('button');
      btn.className = 'avatar-option' + (a === current ? ' selected' : '');
      btn.textContent = a;
      btn.addEventListener('click', async () => {
        await setUserAvatar(session.username, a);
        grid.querySelectorAll('.avatar-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        document.getElementById('profileAvatar').textContent = a;
      });
      grid.appendChild(btn);
    });
    document.getElementById('avatarPicker').style.display = 'flex';
  }

  document.getElementById('btnCloseAvatarPicker').addEventListener('click', () => {
    document.getElementById('avatarPicker').style.display = 'none';
  });

  // ===== MENU BUTTONS =====
  document.getElementById('btnMenuStart').addEventListener('click', () => {
    menuScreen.style.display = 'none';
    modeScreen.style.display = 'flex';
    setActiveNav('play');
  });

  document.getElementById('btnBackFromMode').addEventListener('click', () => {
    modeScreen.style.display = 'none';
    const s = getSession(); if (s) showMenu(s);
  });

  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      const session = getSession();
      if (!session) return;
      const user = loadUsers()[session.username];
      if (user) saveUser(session.username, { totalPlay: (user.totalPlay || 0) + 1 }).catch(e => console.error(e));
      modeScreen.style.display = 'none';
      showGame(session, mode);
    });
  });

  // ===== LEADERBOARD =====
  function showLeaderboard() {
    document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
    leaderboardScreen.style.display = 'flex';
    setActiveNav('rank');

    const users = loadUsers();
    const session = getSession();
    const list = Object.entries(users)
      .map(([username, data]) => ({ username, highScore: data.highScore || 0, isAdmin: data.isAdmin }))
      .sort((a, b) => b.highScore - a.highScore).slice(0, 10);
    const container = document.getElementById('leaderboardList');
    container.innerHTML = '';
    if (list.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:#888">Belum ada data</p>';
      return;
    }
    list.forEach((item, i) => {
      const rankEmoji = ['🥇','🥈','🥉'][i] || '#' + (i + 1);
      const isMe = session && session.username === item.username;
      const row = document.createElement('div');
      row.className = 'leaderboard-row' + (isMe ? ' me' : '');
      row.innerHTML = '<span class="leaderboard-rank">' + rankEmoji + '</span>' +
        '<span class="leaderboard-name">' + escapeHtml(item.username) +
        (item.isAdmin ? ' <span class="badge-mini">ADMIN</span>' : '') +
        (isMe ? ' <span class="badge-mini me-badge">KAMU</span>' : '') +
        '</span>' +
        '<span class="leaderboard-score">' + item.highScore + '</span>';
      container.appendChild(row);
    });
  }

  window.showLeaderboard = showLeaderboard;

  document.getElementById('btnBackFromLeaderboard').addEventListener('click', () => {
    leaderboardScreen.style.display = 'none';
    const s = getSession(); if (s) showMenu(s);
  });
  
// ===== ACHIEVEMENT =====
const ACHIEVEMENTS = [
  { id: 'first_pop', icon: '🎯', title: 'Langkah Pertama', desc: 'Pop bubble pertama kali' },
  { id: 'combo_10', icon: '🔥', title: 'On Fire!', desc: 'Capai combo 10x' },
  { id: 'combo_25', icon: '💥', title: 'Combo Master', desc: 'Capai combo 25x' },
  { id: 'score_500', icon: '⭐', title: 'Rising Star', desc: 'Dapat skor 500+' },
  { id: 'score_1000', icon: '🌟', title: 'Bintang', desc: 'Dapat skor 1000+' },
  { id: 'score_2500', icon: '👑', title: 'LEGENDA', desc: 'Dapat skor 2500+' },
  { id: 'play_10', icon: '🎮', title: 'Gamer Sejati', desc: 'Main 10x game' },
  { id: 'play_50', icon: '🎯', title: 'Ketagihan', desc: 'Main 50x game' },
  { id: 'win_target', icon: '🏆', title: 'Pemenang', desc: 'Menang mode Target Score' },
  { id: 'survive_sudden', icon: '💀', title: 'Survivor', desc: 'Dapat 500+ di Sudden Match' }
];

const ACH_KEY = 'bubble_achievements';
const DAILY_KEY = 'bubble_daily';
const STATS_KEY = 'bubble_stats';

function getUnlocked() {
  try { return JSON.parse(localStorage.getItem(ACH_KEY)) || {}; } catch { return {}; }
}
function setUnlocked(d) { localStorage.setItem(ACH_KEY, JSON.stringify(d)); }

function getStats() {
  try {
    return JSON.parse(localStorage.getItem(STATS_KEY)) || { totalBubbles: 0, totalGames: 0, bestCombo: 0, totalPowerups: 0 };
  } catch { return { totalBubbles: 0, totalGames: 0, bestCombo: 0, totalPowerups: 0 }; }
}
function setStats(s) { localStorage.setItem(STATS_KEY, JSON.stringify(s)); }

async function unlockAchievement(id) {
  const unlocked = getUnlocked();
  if (unlocked[id]) return;
  const ach = ACHIEVEMENTS.find(a => a.id === id);
  if (!ach) return;
  unlocked[id] = { unlockedAt: Date.now() };
  setUnlocked(unlocked);
  const popup = document.getElementById('achievePopup');
  document.getElementById('achievePopupName').textContent = ach.title;
  popup.querySelector('.achieve-popup-icon').textContent = ach.icon;
  popup.classList.add('show');
  setTimeout(() => popup.classList.remove('show'), 4000);
  const session = getSession();
  if (session) await addUserCoins(session.username, 50).catch(e => console.error(e));
}

function checkAchievements() {
  const stats = getStats();
  const session = getSession();
  if (!session) return;
  const u = loadUsers()[session.username];
  const hs = u?.highScore || 0;
  if (stats.totalGames >= 1) unlockAchievement('first_pop');
  if (stats.totalGames >= 10) unlockAchievement('play_10');
  if (stats.totalGames >= 50) unlockAchievement('play_50');
  if (stats.bestCombo >= 10) unlockAchievement('combo_10');
  if (stats.bestCombo >= 25) unlockAchievement('combo_25');
  if (hs >= 500) unlockAchievement('score_500');
  if (hs >= 1000) unlockAchievement('score_1000');
  if (hs >= 2500) unlockAchievement('score_2500');
}

function renderAchievements() {
  const unlocked = getUnlocked();
  const container = document.getElementById('achievementList');
  container.innerHTML = '';
  ACHIEVEMENTS.forEach(ach => {
    const isUnlocked = !!unlocked[ach.id];
    const item = document.createElement('div');
    item.className = 'achievement-item ' + (isUnlocked ? 'unlocked' : 'locked');
    item.innerHTML = '<div class="achievement-icon">' + ach.icon + '</div>' +
      '<div class="achievement-info">' +
        '<div class="achievement-title">' + ach.title + '</div>' +
        '<div class="achievement-desc">' + ach.desc + '</div>' +
      '</div>' +
      '<span class="achievement-badge">' + (isUnlocked ? '✅' : '🔒') + '</span>';
    container.appendChild(item);
  });
}

document.getElementById('btnBackFromAchievement').addEventListener('click', () => {
  achievementScreen.style.display = 'none';
  const s = getSession(); if (s) showMenu(s);
});

// ===== STATS =====
function renderStats() {
  const stats = getStats();
  const unlocked = getUnlocked();
  const unlockedCount = Object.keys(unlocked).length;
  const session = getSession();
  const coins = session ? getUserCoins(session.username) : 0;
  document.getElementById('statsContent').innerHTML =
    '<div class="stat-item"><span class="stat-item-label">Total Main</span><span class="stat-item-value">' + (stats.totalGames || 0) + 'x</span></div>' +
    '<div class="stat-item"><span class="stat-item-label">Total Bubble Dipop</span><span class="stat-item-value">' + (stats.totalBubbles || 0) + '</span></div>' +
    '<div class="stat-item"><span class="stat-item-label">Best Combo</span><span class="stat-item-value">' + (stats.bestCombo || 0) + 'x</span></div>' +
    '<div class="stat-item"><span class="stat-item-label">Power-up Dipakai</span><span class="stat-item-value">' + (stats.totalPowerups || 0) + '</span></div>' +
    '<div class="stat-item"><span class="stat-item-label">Achievement</span><span class="stat-item-value">' + unlockedCount + '/' + ACHIEVEMENTS.length + '</span></div>' +
    '<div class="stat-item"><span class="stat-item-label">Total Coin</span><span class="stat-item-value">' + coins + '</span></div>';
}

document.getElementById('btnBackFromStats').addEventListener('click', () => {
  statsScreen.style.display = 'none';
  const s = getSession(); if (s) showMenu(s);
});

// ===== DAILY BONUS =====
function checkDailyBonus() {
  try {
    const data = JSON.parse(localStorage.getItem(DAILY_KEY)) || {};
    const today = new Date().toDateString();
    if (data.lastClaim === today) return;
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const isConsecutive = data.lastClaim === yesterday.toDateString();
    const streak = isConsecutive ? (data.streak || 0) + 1 : 1;
    const bonusAmount = 100 + (streak - 1) * 50;
    document.getElementById('bonusAmount').textContent = '+' + bonusAmount;
    document.getElementById('bonusStreak').textContent = streak;
    document.getElementById('dailyBonusModal').style.display = 'flex';
    sessionStorage.setItem('pendingBonus', JSON.stringify({ amount: bonusAmount, streak }));
  } catch (e) {}
}

document.getElementById('btnClaimBonus').addEventListener('click', async () => {
  try {
    const pending = JSON.parse(sessionStorage.getItem('pendingBonus'));
    const session = getSession();
    if (pending && session) {
      await addUserCoins(session.username, pending.amount);
      await addUserXP(session.username, 25).catch(e => console.error(e));
      localStorage.setItem(DAILY_KEY, JSON.stringify({
        lastClaim: new Date().toDateString(),
        streak: pending.streak
      }));
      sessionStorage.removeItem('pendingBonus');
      showMenu(session);
    }
  } catch (e) {}
  document.getElementById('dailyBonusModal').style.display = 'none';
});

// ===== CHAT =====
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const chatStatus = document.getElementById('chatStatus');

function openChat() {
  document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
  chatScreen.style.display = 'flex';
  setActiveNav('chat');

  const session = getSession();
  if (!session) return;
  chatStatus.textContent = 'Online';
  chatStatus.style.color = '#00ff88';
  if (typeof window.fb.listenChat === 'function') {
    window.fb.listenChat(renderChatMessages);
  }
}

window.openChat = openChat;

function renderChatMessages(messages) {
  chatMessages.innerHTML = '';
  const session = getSession();
  if (messages.length === 0) {
    chatMessages.innerHTML = '<div class="chat-empty">Belum ada pesan. Mulai obrolan!</div>';
    return;
  }
  messages.forEach(msg => {
    const isMe = session && session.username === msg.username;
    const isAdmin = session && session.isAdmin;
    const time = new Date(msg.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const div = document.createElement('div');
    div.className = 'chat-msg' + (isMe ? ' me' : '');
    div.innerHTML = '<div class="chat-msg-avatar">' + escapeHtml(msg.avatar || '👤') + '</div>' +
      '<div class="chat-msg-body">' +
        '<div class="chat-msg-name ' + (isMe ? 'me' : (msg.isAdmin ? 'admin' : '')) + '">' +
          escapeHtml(msg.username) + (isMe ? ' (kamu)' : '') +
        '</div>' +
        '<div class="chat-msg-text">' + escapeHtml(msg.text) + '</div>' +
        '<div class="chat-msg-time">' + time + '</div>' +
      '</div>' +
      (isAdmin ? '<button class="chat-msg-delete" data-msg-id="' + msg.id + '">X</button>' : '');
    chatMessages.appendChild(div);
  });
  chatMessages.scrollTop = chatMessages.scrollHeight;
  chatMessages.querySelectorAll('.chat-msg-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Hapus pesan ini?')) return;
      await window.fb.deleteChatMessage(btn.dataset.msgId);
    });
  });
}

async function sendChat() {
  const text = chatInput.value.trim();
  if (!text) return;
  const session = getSession();
  if (!session) return;
  chatInput.value = '';
  const avatar = getUserAvatar(session.username);
  await window.fb.sendChatMessage(session.username, text, avatar, session.isAdmin);
}

document.getElementById('btnSendChat').addEventListener('click', sendChat);
chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChat(); });
document.getElementById('btnBackFromChat').addEventListener('click', () => {
  chatScreen.style.display = 'none';
  const s = getSession(); if (s) showMenu(s);
});

// ===== BANK =====
function openBank() {
  document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
  bankScreen.style.display = 'flex';

  const session = getSession();
  if (!session) return;
  const user = loadUsers()[session.username];
  if (!user) return;
  document.getElementById('walletCoins').textContent = user.coins || 0;
  document.getElementById('bankCoins').textContent = user.bankCoins || 0;
  document.getElementById('bankAmount').value = '';
  document.getElementById('bankMsg').textContent = '';
  document.getElementById('bankMsg').className = 'save-msg';
}

window.openBank = openBank;

function updateBankDisplay() {
  const session = getSession();
  if (!session) return;
  const user = loadUsers()[session.username];
  if (!user) return;
  document.getElementById('walletCoins').textContent = user.coins || 0;
  document.getElementById('bankCoins').textContent = user.bankCoins || 0;
}

document.getElementById('btnDeposit').addEventListener('click', async () => {
  const amount = parseInt(document.getElementById('bankAmount').value);
  const session = getSession();
  const msg = document.getElementById('bankMsg');
  if (!session) return;
  if (!amount || amount <= 0) { msg.className = 'save-msg error'; msg.textContent = 'Masukkan jumlah yang valid'; return; }
  const res = await depositCoin(session.username, amount);
  if (!res.ok) { msg.className = 'save-msg error'; msg.textContent = res.error; return; }
  msg.className = 'save-msg success';
  msg.textContent = 'Deposit ' + amount + ' coin berhasil!';
  document.getElementById('bankAmount').value = '';
  updateBankDisplay();
  setTimeout(() => { msg.textContent = ''; }, 3000);
});

document.getElementById('btnWithdraw').addEventListener('click', async () => {
  const amount = parseInt(document.getElementById('bankAmount').value);
  const session = getSession();
  const msg = document.getElementById('bankMsg');
  if (!session) return;
  if (!amount || amount <= 0) { msg.className = 'save-msg error'; msg.textContent = 'Masukkan jumlah yang valid'; return; }
  const res = await withdrawCoin(session.username, amount);
  if (!res.ok) { msg.className = 'save-msg error'; msg.textContent = res.error; return; }
  msg.className = 'save-msg success';
  msg.textContent = 'Withdraw ' + amount + ' coin berhasil!';
  document.getElementById('bankAmount').value = '';
  updateBankDisplay();
  setTimeout(() => { msg.textContent = ''; }, 3000);
});

document.getElementById('btnDepositAll').addEventListener('click', async () => {
  const session = getSession();
  if (!session) return;
  const user = loadUsers()[session.username];
  if (!user || !user.coins) return;
  const res = await depositCoin(session.username, user.coins);
  const msg = document.getElementById('bankMsg');
  if (res.ok) {
    msg.className = 'save-msg success';
    msg.textContent = 'Semua coin berhasil disimpan!';
    updateBankDisplay();
    setTimeout(() => { msg.textContent = ''; }, 3000);
  }
});

document.getElementById('btnWithdrawAll').addEventListener('click', async () => {
  const session = getSession();
  if (!session) return;
  const user = loadUsers()[session.username];
  if (!user || !user.bankCoins) return;
  const res = await withdrawCoin(session.username, user.bankCoins);
  const msg = document.getElementById('bankMsg');
  if (res.ok) {
    msg.className = 'save-msg success';
    msg.textContent = 'Semua coin berhasil diambil!';
    updateBankDisplay();
    setTimeout(() => { msg.textContent = ''; }, 3000);
  }
});

document.getElementById('btnBackFromBank').addEventListener('click', () => {
  bankScreen.style.display = 'none';
  const s = getSession(); if (s) showMenu(s);
});

// ===== PENGATURAN =====
document.getElementById('btnBackFromSettings').addEventListener('click', () => {
  settingsScreen.style.display = 'none';
  const s = getSession(); if (s) showMenu(s);
});

document.getElementById('btnSoundToggle2').addEventListener('click', () => {
  const btn = document.getElementById('soundToggle');
  if (btn) btn.click();
});

// ===== UBAH KATA SANDI =====
const changePassModal = document.getElementById('changePassModal');
const changePassForm = document.getElementById('changePassForm');
const changePassMsg = document.getElementById('changePassMsg');

document.getElementById('btnChangePass').addEventListener('click', () => {
  changePassForm.reset();
  changePassMsg.textContent = '';
  changePassMsg.className = 'save-msg';
  changePassModal.style.display = 'flex';
});

document.getElementById('btnCloseChangePass').addEventListener('click', () => {
  changePassModal.style.display = 'none';
});

changePassForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  changePassMsg.textContent = '';
  changePassMsg.className = 'save-msg';
  const session = getSession();
  if (!session) return;
  const oldP = document.getElementById('oldPass').value;
  const newP = document.getElementById('newPass').value;
  const newP2 = document.getElementById('newPass2').value;
  if (newP !== newP2) {
    changePassMsg.className = 'save-msg error';
    changePassMsg.textContent = 'Kata sandi baru tidak sama';
    return;
  }
  changePassMsg.textContent = 'Menyimpan...';
  const res = await changePassword(session.username, oldP, newP);
  if (!res.ok) {
    changePassMsg.className = 'save-msg error';
    changePassMsg.textContent = res.error;
    return;
  }
  changePassMsg.className = 'save-msg success';
  changePassMsg.textContent = 'Kata sandi berhasil diubah!';
  setTimeout(() => { changePassModal.style.display = 'none'; }, 1500);
});

// ===== LEVEL SCREEN =====
const LEVEL_TITLES = [
  { min: 1,  title: 'NOVICE' },
  { min: 5,  title: 'PEMULA' },
  { min: 10, title: 'JAGOAN' },
  { min: 20, title: 'PRO' },
  { min: 30, title: 'MASTER' },
  { min: 40, title: 'LEGENDA' },
  { min: 50, title: 'DEWA' }
];

function openLevelScreen() {
  document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
  levelScreen.style.display = 'flex';

  const session = getSession();
  if (!session) return;

  const level = getUserLevel(session.username);
  const xp = getUserXP(session.username);
  const xpCurrent = getXpForLevel(level);
  const xpNext = getXpForLevel(level + 1);
  const xpProgress = xp - xpCurrent;
  const xpNeeded = xpNext - xpCurrent;
  const percent = Math.min(100, Math.round((xpProgress / xpNeeded) * 100));

  document.getElementById('levelBadge').textContent = level;
  document.getElementById('levelTitle').textContent = getLevelTitle(level);
  document.getElementById('levelXpText').textContent = xpProgress + ' / ' + xpNeeded + ' XP';
  document.getElementById('levelPercent').textContent = percent + '%';
  document.getElementById('levelProgressFill').style.width = percent + '%';

  const list = document.getElementById('levelTitleList');
  list.innerHTML = '';
  LEVEL_TITLES.forEach(t => {
    const item = document.createElement('div');
    item.className = 'level-title-item' + (level >= t.min ? ' reached' : '');
    item.innerHTML = '<span>' + t.title + '</span><span>Level ' + t.min + '+</span>';
    list.appendChild(item);
  });
}

window.openLevelScreen = openLevelScreen;

document.getElementById('btnBackFromLevel').addEventListener('click', () => {
  levelScreen.style.display = 'none';
  const s = getSession(); if (s) showMenu(s);
});

// ===== SHOP SCREEN =====
function openShop() {
  document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
  shopScreen.style.display = 'flex';
  setActiveNav('shop');

  const session = getSession();
  if (!session) return;

  const user = loadUsers()[session.username];
  document.getElementById('shopCoins').textContent = user?.coins || 0;

  renderShopAvatars();
  renderShopBadges();
}

window.openShop = openShop;

function renderShopAvatars() {
  const session = getSession();
  if (!session) return;
  const owned = getOwnedItems(session.username);
  const grid = document.getElementById('shop-avatar');
  grid.innerHTML = '';

  SHOP_AVATARS.forEach(item => {
    const isOwned = owned.includes(item.id);
    const card = document.createElement('div');
    card.className = 'shop-item' + (isOwned ? ' owned' : '');
    card.innerHTML = '<div class="shop-item-icon">' + item.icon + '</div>' +
      '<div class="shop-item-name">' + item.name + '</div>' +
      '<div class="shop-item-price ' + (isOwned ? 'owned-text' : '') + '">' +
        (isOwned ? 'OWNED' : item.price + ' coin') +
      '</div>' +
      '<button class="shop-buy-btn ' + (isOwned ? 'owned' : '') + '" data-id="' + item.id + '" data-price="' + item.price + '" ' + (isOwned ? 'disabled' : '') + '>' +
        (isOwned ? 'UDAH PUNYA' : 'BELI') +
      '</button>';
    grid.appendChild(card);
  });

  grid.querySelectorAll('.shop-buy-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', async () => {
      await handleBuy(btn.dataset.id, parseInt(btn.dataset.price));
    });
  });
}

function renderShopBadges() {
  const session = getSession();
  if (!session) return;
  const owned = getOwnedItems(session.username);
  const grid = document.getElementById('shop-badge');
  grid.innerHTML = '';

  SHOP_BADGES.forEach(item => {
    const isOwned = owned.includes(item.id);
    const card = document.createElement('div');
    card.className = 'shop-item' + (isOwned ? ' owned' : '');
    card.innerHTML = '<div class="shop-item-icon">' +
        '<span class="badge-preview" style="background:' + item.color + ';color:#1a0033;">' + item.name + '</span>' +
      '</div>' +
      '<div class="shop-item-name" style="margin-top:10px;">' + item.name + '</div>' +
      '<div class="shop-item-price ' + (isOwned ? 'owned-text' : '') + '">' +
        (isOwned ? 'OWNED' : item.price + ' coin') +
      '</div>' +
      '<button class="shop-buy-btn ' + (isOwned ? 'owned' : '') + '" data-id="' + item.id + '" data-price="' + item.price + '" ' + (isOwned ? 'disabled' : '') + '>' +
        (isOwned ? 'UDAH PUNYA' : 'BELI') +
      '</button>';
    grid.appendChild(card);
  });

  grid.querySelectorAll('.shop-buy-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', async () => {
      await handleBuy(btn.dataset.id, parseInt(btn.dataset.price));
    });
  });
}

async function handleBuy(itemId, price) {
  const session = getSession();
  if (!session) return;
  const msg = document.getElementById('shopMsg');
  if (!confirm('Beli item ini seharga ' + price + ' coin?')) return;

  const res = await buyItem(session.username, itemId, price);
  if (!res.ok) {
    msg.className = 'save-msg error';
    msg.textContent = res.error;
    return;
  }
  msg.className = 'save-msg success';
  msg.textContent = 'Pembelian sukses!';
  setTimeout(() => { msg.textContent = ''; }, 3000);

  const user = loadUsers()[session.username];
  document.getElementById('shopCoins').textContent = user?.coins || 0;
  renderShopAvatars();
  renderShopBadges();
}

document.getElementById('btnBackFromShop').addEventListener('click', () => {
  shopScreen.style.display = 'none';
  const s = getSession(); if (s) showMenu(s);
});

document.querySelectorAll('.shop-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const target = tab.dataset.shop;
    document.getElementById('shop-avatar').style.display = target === 'avatar' ? 'grid' : 'none';
    document.getElementById('shop-badge').style.display = target === 'badge' ? 'grid' : 'none';
  });
});

// ===== SWIPE GESTURE =====
let touchStartX = 0, touchStartY = 0;
const SWIPE_THRESHOLD = 60;

document.addEventListener('touchstart', (e) => {
  const t = e.target;
  if (t.closest('input, textarea, [contenteditable]')) return;
  if (t.closest('.bubble')) return;
  if (t.closest('.chat-messages')) return;
  if (t.closest('.admin-box')) return;
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchend', (e) => {
  if (!touchStartX) return;
  const diffX = touchStartX - e.changedTouches[0].clientX;
  const diffY = Math.abs(touchStartY - e.changedTouches[0].clientY);
  touchStartX = 0;

  if (Math.abs(diffX) < SWIPE_THRESHOLD) return;
  if (diffY > 80) return;

  const session = getSession();
  if (!session) return;

  const currentIdx = getCurrentScreenIdx();
  let newIdx = currentIdx;

  if (diffX > SWIPE_THRESHOLD) newIdx = Math.min(currentIdx + 1, swipePages.length - 1);
  else newIdx = Math.max(currentIdx - 1, 0);

  if (newIdx === currentIdx) return;

  const nav = swipeNavs[newIdx];
  if (nav === 'home') showMenu(session);
  else if (nav === 'play') {
    document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
    modeScreen.style.display = 'flex';
    setActiveNav('play');
  }
  else if (nav === 'rank') {
    document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
    leaderboardScreen.style.display = 'flex';
    showLeaderboard();
    setActiveNav('rank');
  }
  else if (nav === 'chat') openChat();
  else if (nav === 'shop') openShop();
  else if (nav === 'profile') openProfileScreen();
}, { passive: true });

// ===== EXPOSE ACHIEVEMENT API =====
window.gameAchievements = {
  unlock: unlockAchievement,
  updateStats: function (data) {
    const stats = getStats();
    Object.keys(data).forEach(k => {
      if (k === 'bestCombo') stats.bestCombo = Math.max(stats.bestCombo || 0, data[k]);
      else stats[k] = (stats[k] || 0) + data[k];
    });
    setStats(stats);
    checkAchievements();
  }
};

window.renderAchievements = renderAchievements;
window.renderStats = renderStats;

  // ===== ADMIN PANEL =====
  const btnClose   = document.getElementById('btnCloseAdmin');
  const panel      = document.getElementById('adminPanel');
  const adminTabs  = document.querySelectorAll('.admin-tab');
  const usersList  = document.getElementById('usersList');
  const totalUsers = document.getElementById('totalUsers');
  const userSearch = document.getElementById('userSearch');

  btnClose.addEventListener('click', () => { panel.style.display = 'none'; });

  adminTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      adminTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.admin-panel-content').forEach(p => p.style.display = 'none');
      document.getElementById('panel-' + tab.dataset.panel).style.display = 'block';
      if (tab.dataset.panel === 'dashboard') renderDashboard();
      if (tab.dataset.panel === 'users') renderUsers();
      if (tab.dataset.panel === 'broadcast') renderActiveBroadcast();
    });
  });

  document.getElementById('btnSaveSettings').addEventListener('click', saveSettings);
  document.getElementById('btnResetSettings').addEventListener('click', resetSettings);
  document.getElementById('btnSendBroadcast').addEventListener('click', sendBroadcast);
  document.getElementById('btnClearBroadcast').addEventListener('click', clearBroadcast);
  document.getElementById('btnExportData').addEventListener('click', exportData);
  document.getElementById('btnImportData').addEventListener('click', () => document.getElementById('importFile').click());
  document.getElementById('importFile').addEventListener('change', importData);
  document.getElementById('btnResetAllUsers').addEventListener('click', resetAllUsers);
  document.getElementById('btnResetAllScores').addEventListener('click', resetAllScores);
  userSearch.addEventListener('input', renderUsers);

  window.openAdminPanel = function () {
    const session = getSession();
    if (!session || !session.isAdmin) { alert('Akses ditolak!'); return; }
    panel.style.display = 'flex';
    renderDashboard();
    renderUsers();
    loadSettingsToForm();
    renderActiveBroadcast();
  };

  // ===== DASHBOARD =====
  function renderDashboard() {
    const users = loadUsers();
    const names = Object.keys(users);
    let totalPlay = 0, topScore = 0, topPlayer = '-', adminCount = 0, scoreSum = 0, scoreCount = 0;
    names.forEach(n => {
      const u = users[n];
      totalPlay += u.totalPlay || 0;
      if (u.isAdmin) adminCount++;
      if ((u.highScore || 0) > 0) { scoreSum += u.highScore; scoreCount++; }
      if ((u.highScore || 0) > topScore) { topScore = u.highScore; topPlayer = n; }
    });
    document.getElementById('statTotalUsers').textContent = names.length;
    document.getElementById('statTotalPlay').textContent = totalPlay;
    document.getElementById('statTopScore').textContent = topScore;
    document.getElementById('statAvgScore').textContent = scoreCount > 0 ? Math.round(scoreSum / scoreCount) : 0;
    document.getElementById('statTopPlayer').textContent = topPlayer;
    document.getElementById('statAdminCount').textContent = adminCount;

    const top5 = names.map(n => ({ name: n, score: users[n].highScore || 0 }))
      .sort((a, b) => b.score - a.score).slice(0, 5);
    const container = document.getElementById('topPlayersList');
    container.innerHTML = '';
    if (top5.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:#888">Belum ada data</p>';
      return;
    }
    top5.forEach((p, i) => {
      const medal = '#' + (i + 1);
      const row = document.createElement('div');
      row.className = 'user-card';
      row.innerHTML = '<div class="user-info"><div class="user-name">' + medal + ' ' + escapeHtml(p.name) + '</div></div>' +
        '<div class="leaderboard-score">' + p.score + '</div>';
      container.appendChild(row);
    });
  }

  // ===== USERS =====
  function renderUsers() {
    const users = loadUsers();
    const names = Object.keys(users);
    const query = (userSearch.value || '').trim().toLowerCase();
    const filteredNames = names.filter(n => !query || n.includes(query));

    totalUsers.textContent = names.length;
    usersList.innerHTML = '';

    filteredNames.sort((a, b) => {
      if (users[a].isAdmin && !users[b].isAdmin) return -1;
      if (!users[a].isAdmin && users[b].isAdmin) return 1;
      return (users[b].highScore || 0) - (users[a].highScore || 0);
    });

    if (filteredNames.length === 0) {
      usersList.innerHTML = '<p style="text-align:center;color:#888;padding:20px;font-style:italic">Gak ada user</p>';
      return;
    }

    filteredNames.forEach(name => {
      const u = users[name];
      const card = document.createElement('div');
      card.className = 'user-card' + (u.isAdmin ? ' admin' : '');

      const last = u.lastLogin ? new Date(u.lastLogin).toLocaleString('id-ID') : 'Belum pernah';
      const banned = u.banned ? '<span class="badge badge-banned">BANNED</span>' : '';
      const adminBadge = u.isAdmin ? '<span class="badge">ADMIN</span>' : '';
      const level = typeof getUserLevel === 'function' ? getUserLevel(name) : 1;
      const xpVal = typeof getUserXP === 'function' ? getUserXP(name) : 0;

      card.innerHTML =
        '<div class="user-info">' +
          '<div class="user-name">' +
            escapeHtml(name) + adminBadge + banned +
          '</div>' +
          '<div class="user-meta">' +
            'Lv.<strong>' + level + '</strong> • XP: <strong>' + xpVal + '</strong> • ' +
            'Skor: <strong>' + (u.highScore || 0) + '</strong> • ' +
            'Main: <strong>' + (u.totalPlay || 0) + 'x</strong>' +
            '<br>Coin: <strong>' + (u.coins || 0) + '</strong> • ' +
            'Bank: <strong>' + (u.bankCoins || 0) + '</strong>' +
            '<br>' + last +
          '</div>' +
        '</div>' +
        '<div class="user-actions">' +
          '<button class="action-btn reset" data-user="' + escapeHtml(name) + '">Reset</button>' +
          '<button class="action-btn coin" data-user="' + escapeHtml(name) + '">Koin</button>' +
          '<button class="action-btn level" data-user="' + escapeHtml(name) + '">Level</button>' +
          (!u.isAdmin ?
            '<button class="action-btn ban" data-user="' + escapeHtml(name) + '">' +
              (u.banned ? 'Unban' : 'Ban') +
            '</button>' +
            '<button class="action-btn delete" data-user="' + escapeHtml(name) + '">Hapus</button>'
          : '') +
        '</div>';

      usersList.appendChild(card);
    });

    // Attach handlers
    usersList.querySelectorAll('.action-btn.reset').forEach(btn =>
      btn.addEventListener('click', async () => {
        const username = btn.dataset.user;
        if (!confirm('Reset skor "' + username + '"?')) return;
        await saveUser(username, { highScore: 0 });
        renderUsers();
      })
    );

    usersList.querySelectorAll('.action-btn.coin').forEach(btn =>
      btn.addEventListener('click', () => openEditCoinModal(btn.dataset.user))
    );

    usersList.querySelectorAll('.action-btn.level').forEach(btn =>
      btn.addEventListener('click', () => openEditLevelModal(btn.dataset.user))
    );

    usersList.querySelectorAll('.action-btn.ban').forEach(btn =>
      btn.addEventListener('click', async () => {
        const username = btn.dataset.user;
        const u = loadUsers()[username];
        if (!u) return;
        const action = u.banned ? 'unban' : 'ban';
        if (!confirm('Yakin ' + action + ' user "' + username + '"?')) return;
        await saveUser(username, { banned: !u.banned });
        renderUsers();
      })
    );

    usersList.querySelectorAll('.action-btn.delete').forEach(btn =>
      btn.addEventListener('click', async () => {
        const username = btn.dataset.user;
        if (!confirm('Yakin hapus user "' + username + '"?')) return;
        await window.fb.deleteUserFromFirebase(username);
        renderUsers();
      })
    );
  }

  // ===== EDIT KOIN =====
  let currentEditCoinUser = null;

  function openEditCoinModal(username) {
    const user = loadUsers()[username];
    if (!user) return;
    currentEditCoinUser = username;
    document.getElementById('editCoinUser').textContent = username;
    document.getElementById('editCoinCurrent').value = user.coins || 0;
    document.getElementById('editBankCurrent').value = user.bankCoins || 0;
    document.getElementById('editCoinNew').value = user.coins || 0;
    document.getElementById('editBankNew').value = user.bankCoins || 0;
    document.getElementById('editCoinMsg').textContent = '';
    document.getElementById('editCoinMsg').className = 'save-msg';
    document.getElementById('editCoinModal').style.display = 'flex';
  }

  document.getElementById('btnCloseEditCoin').addEventListener('click', () => {
    document.getElementById('editCoinModal').style.display = 'none';
    currentEditCoinUser = null;
  });

  document.getElementById('btnSaveEditCoin').addEventListener('click', async () => {
    if (!currentEditCoinUser) return;
    const newCoins = parseInt(document.getElementById('editCoinNew').value) || 0;
    const newBank = parseInt(document.getElementById('editBankNew').value) || 0;
    const msg = document.getElementById('editCoinMsg');
    if (newCoins < 0 || newBank < 0) {
      msg.className = 'save-msg error';
      msg.textContent = 'Tidak boleh negatif';
      return;
    }
    msg.className = 'save-msg';
    msg.textContent = 'Menyimpan...';
    await saveUser(currentEditCoinUser, { coins: newCoins, bankCoins: newBank });
    msg.className = 'save-msg success';
    msg.textContent = 'Berhasil disimpan!';
    setTimeout(() => {
      document.getElementById('editCoinModal').style.display = 'none';
      currentEditCoinUser = null;
      renderUsers();
    }, 1000);
  });

  // ===== EDIT LEVEL =====
  let currentEditLevelUser = null;

  function openEditLevelModal(username) {
    const user = loadUsers()[username];
    if (!user) return;
    currentEditLevelUser = username;
    const level = getUserLevel(username);
    const xp = getUserXP(username);
    document.getElementById('editLevelUser').textContent = username;
    document.getElementById('editLevelCurrent').value = level;
    document.getElementById('editXpCurrent').value = xp;
    document.getElementById('editLevelNew').value = level;
    document.getElementById('editLevelMsg').textContent = '';
    document.getElementById('editLevelMsg').className = 'save-msg';
    document.getElementById('editLevelModal').style.display = 'flex';
  }

  document.getElementById('btnCloseEditLevel').addEventListener('click', () => {
    document.getElementById('editLevelModal').style.display = 'none';
    currentEditLevelUser = null;
  });

  document.getElementById('btnSaveEditLevel').addEventListener('click', async () => {
    if (!currentEditLevelUser) return;
    const newLevel = parseInt(document.getElementById('editLevelNew').value) || 1;
    const msg = document.getElementById('editLevelMsg');
    if (newLevel < 1 || newLevel > 50) {
      msg.className = 'save-msg error';
      msg.textContent = 'Level harus 1-50';
      return;
    }
    msg.className = 'save-msg';
    msg.textContent = 'Menyimpan...';
    const newXp = Math.pow(newLevel - 1, 2) * 100;
    await saveUser(currentEditLevelUser, { xp: newXp });
    msg.className = 'save-msg success';
    msg.textContent = 'Level diubah ke ' + newLevel + '!';
    setTimeout(() => {
      document.getElementById('editLevelModal').style.display = 'none';
      currentEditLevelUser = null;
      renderUsers();
    }, 1000);
  });

  // ===== SETTINGS FORM =====
  function loadSettingsToForm() {
    const s = loadSettings();
    document.getElementById('setDuration').value = s.duration;
    document.getElementById('setSpawn').value = s.spawnInterval;
    document.getElementById('setPowerup').value = Math.round(s.powerupChance * 100);
    document.getElementById('setSound').value = s.soundDefault ? 'on' : 'off';
  }

  function saveSettings() {
    const duration = parseInt(document.getElementById('setDuration').value);
    const spawn = parseInt(document.getElementById('setSpawn').value);
    const powerup = parseInt(document.getElementById('setPowerup').value);
    const sound = document.getElementById('setSound').value === 'on';
    const msg = document.getElementById('settingsMsg');

    if (duration < 10 || duration > 120) { msg.className = 'save-msg error'; msg.textContent = 'Durasi 10-120 detik'; return; }
    if (spawn < 200 || spawn > 2000) { msg.className = 'save-msg error'; msg.textContent = 'Spawn 200-2000 ms'; return; }
    if (powerup < 0 || powerup > 50) { msg.className = 'save-msg error'; msg.textContent = 'Power-up 0-50%'; return; }

    localStorage.setItem('bubble_settings', JSON.stringify({
      duration: duration,
      spawnInterval: spawn,
      powerupChance: powerup / 100,
      soundDefault: sound
    }));

    msg.className = 'save-msg success';
    msg.textContent = 'Tersimpan!';
    setTimeout(() => { msg.textContent = ''; }, 3000);
  }

  function resetSettings() {
    if (!confirm('Reset ke default?')) return;
    localStorage.removeItem('bubble_settings');
    loadSettingsToForm();
    const msg = document.getElementById('settingsMsg');
    msg.className = 'save-msg success';
    msg.textContent = 'Direset!';
    setTimeout(() => { msg.textContent = ''; }, 3000);
  }

  // ===== BROADCAST =====
  async function sendBroadcast() {
    const text = document.getElementById('broadcastMessage').value.trim();
    const msg = document.getElementById('broadcastMsg');
    if (!text) { msg.className = 'save-msg error'; msg.textContent = 'Pesan gak boleh kosong'; return; }
    if (text.length > 200) { msg.className = 'save-msg error'; msg.textContent = 'Max 200 karakter'; return; }
    await window.fb.saveBroadcast(text);
    msg.className = 'save-msg success';
    msg.textContent = 'Broadcast terkirim!';
    setTimeout(() => { msg.textContent = ''; }, 3000);
    renderActiveBroadcast();
  }

  async function clearBroadcast() {
    if (!confirm('Hapus broadcast aktif?')) return;
    await window.fb.clearBroadcastFirebase();
    renderActiveBroadcast();
    const msg = document.getElementById('broadcastMsg');
    msg.className = 'save-msg success';
    msg.textContent = 'Broadcast dihapus';
    setTimeout(() => { msg.textContent = ''; }, 3000);
  }

  async function renderActiveBroadcast() {
    const box = document.getElementById('activeBroadcast');
    try {
      const data = await window.fb.getBroadcast();
      if (data && data.text) {
        const date = new Date(data.createdAt).toLocaleString('id-ID');
        box.className = 'active-broadcast';
        box.innerHTML = '<strong>' + escapeHtml(data.text) + '</strong><br><small style="color:#888">Dikirim: ' + date + '</small>';
        return;
      }
    } catch (e) {}
    box.className = 'active-broadcast empty';
    box.textContent = 'Belum ada broadcast aktif';
  }

  // ===== BACKUP =====
  function exportData() {
    const users = loadUsers();
    const data = { exportedAt: new Date().toISOString(), version: '2.0', users: users };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bubblepop-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    const msg = document.getElementById('backupMsg');
    msg.className = 'save-msg success';
    msg.textContent = 'Backup terdownload!';
    setTimeout(() => { msg.textContent = ''; }, 3000);
  }

  async function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.users || typeof data.users !== 'object') throw new Error('Format salah');
        if (!confirm('Import ' + Object.keys(data.users).length + ' user?')) return;
        for (const username of Object.keys(data.users)) {
          await window.fb.saveUserToFirebase(username, data.users[username]);
        }
        renderUsers();
        renderDashboard();
        const msg = document.getElementById('backupMsg');
        msg.className = 'save-msg success';
        msg.textContent = 'Data berhasil di-import!';
        setTimeout(() => { msg.textContent = ''; }, 3000);
      } catch (err) {
        const msg = document.getElementById('backupMsg');
        msg.className = 'save-msg error';
        msg.textContent = 'File gak valid: ' + err.message;
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  }

  async function resetAllUsers() {
    if (!confirm('HAPUS SEMUA USER selain admin?')) return;
    if (!confirm('Yakin banget? Konfirmasi terakhir!')) return;
    const users = loadUsers();
    for (const username of Object.keys(users)) {
      if (!users[username].isAdmin) {
        await window.fb.deleteUserFromFirebase(username);
      }
    }
    renderUsers();
    renderDashboard();
    const msg = document.getElementById('backupMsg');
    msg.className = 'save-msg success';
    msg.textContent = 'Semua user (kecuali admin) dihapus';
    setTimeout(() => { msg.textContent = ''; }, 3000);
  }

  async function resetAllScores() {
    if (!confirm('Reset SEMUA skor user jadi 0?')) return;
    const users = loadUsers();
    for (const username of Object.keys(users)) {
      await saveUser(username, { highScore: 0 });
    }
    renderUsers();
    renderDashboard();
    const msg = document.getElementById('backupMsg');
    msg.className = 'save-msg success';
    msg.textContent = 'Semua skor direset ke 0';
    setTimeout(() => { msg.textContent = ''; }, 3000);
  }

  // ===== AUTO LOGIN =====
  setTimeout(() => {
    const session = getSession();
    if (session && loadUsers()[session.username]) {
      showMenu(session);
    }
  }, 1500);

});