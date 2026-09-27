// ============================================
// UI HANDLER — Semua logika tampilan & interaksi
// ============================================

document.addEventListener('DOMContentLoaded', () => {

  // ============================================
  //  HELPER
  // ============================================
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function showScreen(id) {
    document.querySelectorAll('.screen, .overlay').forEach(el => {
      if (el.id !== id && !el.classList.contains('achieve-popup')) {
        el.style.display = 'none';
      }
    });
    const el = document.getElementById(id);
    if (el) {
      el.style.display = 'flex';
      if (el.classList.contains('screen')) el.style.display = 'flex';
    }
  }

  // ============================================
  //  REFERENSI ELEMEN
  // ============================================
  const loginScreen       = document.getElementById('loginScreen');
  const menuScreen        = document.getElementById('menuScreen');
  const modeScreen        = document.getElementById('modeScreen');
  const leaderboardScreen = document.getElementById('leaderboardScreen');
  const profileScreen     = document.getElementById('profileScreen');
  const achievementScreen = document.getElementById('achievementScreen');
  const statsScreen       = document.getElementById('statsScreen');
  const gameContainer     = document.getElementById('gameContainer');

  const tabs         = document.querySelectorAll('.tab');
  const loginForm    = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const loginError   = document.getElementById('loginError');
  const regError     = document.getElementById('regError');

  // ============================================
  //  1. AUTH (LOGIN / REGISTER)
  // ============================================
  loginForm.style.display = 'flex';
  registerForm.style.display = 'none';

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

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';
    const u = document.getElementById('loginUser').value;
    const p = document.getElementById('loginPass').value;

    const res = await loginUser(u, p);
    if (!res.ok) { loginError.textContent = '❌ ' + res.error; return; }
    showMenu(res.user);
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    regError.textContent = '';
    const u  = document.getElementById('regUser').value;
    const p  = document.getElementById('regPass').value;
    const p2 = document.getElementById('regPass2').value;

    if (p !== p2) { regError.textContent = '❌ Password tidak sama'; return; }

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

  // ============================================
  //  2. SHOW MENU
  // ============================================
  function showMenu(user) {
    // Sembunyikan semua screen
    document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
    document.querySelectorAll('.overlay').forEach(s => {
      if (s.id !== 'achievePopup') s.style.display = 'none';
    });
    gameContainer.style.display = 'none';

    menuScreen.style.display = 'flex';
    document.body.classList.remove('in-menu');

    // Tawk.to chat widget muncul setelah login
    if (typeof showChatWidget === 'function') showChatWidget();

    // Set user info ke Tawk.to
    if (window.Tawk_API && window.Tawk_API.setAttributes) {
      window.Tawk_API.setAttributes({
        'name': user.username,
        'email': user.username + '@bubblepop.local'
      }, function (error) {});
    }

    // Update avatar + username
    document.getElementById('menuUsername').textContent = user.username;
    document.getElementById('sidebarUsername').textContent = user.username;

    const avatar = getUserAvatar(user.username);
    document.getElementById('topbarAvatar').textContent = avatar;
    document.getElementById('sidebarAvatar').textContent = avatar;

    // Stats
    document.getElementById('menuHighScore').textContent = getUserHighScore(user.username);

    const users = loadUsers();
    document.getElementById('menuTotalPlay').textContent = users[user.username]?.totalPlay || 0;
    document.getElementById('menuCoins').textContent = users[user.username]?.coins || 0;

    // Admin button
    document.getElementById('sidebarAdminBtn').style.display = user.isAdmin ? 'flex' : 'none';

    // Broadcast notif
    showBroadcastIfAny();

    // Daily bonus check
    checkDailyBonus();

    // Achievement check
    checkAchievements();
  }

  window.showMenu = showMenu;

  // ============================================
  //  3. SHOW GAME
  // ============================================
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

    if (typeof window.onUserLogin === 'function') {
      window.onUserLogin(user, mode);
    }
  }

  window.showGame = showGame;

  // ============================================
  //  4. HAMBURGER + SIDEBAR
  // ============================================
  const hamburger = document.getElementById('btnHamburger');
  const sidebar   = document.getElementById('sidebar');
  const backdrop  = document.getElementById('sidebarBackdrop');

  function openSidebar() {
    sidebar.classList.add('open');
    backdrop.classList.add('show');
    hamburger.classList.add('open');
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    backdrop.classList.remove('show');
    hamburger.classList.remove('open');
  }

  hamburger.addEventListener('click', () => {
    if (sidebar.classList.contains('open')) closeSidebar();
    else openSidebar();
  });

  backdrop.addEventListener('click', closeSidebar);

  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.addEventListener('click', () => {
      const action = item.dataset.action;
      closeSidebar();

      setTimeout(() => {
        const session = getSession();
        if (!session) return;

        if (action === 'play') {
          menuScreen.style.display = 'none';
          modeScreen.style.display = 'flex';
        }
        else if (action === 'achievement') {
          menuScreen.style.display = 'none';
          achievementScreen.style.display = 'flex';
          renderAchievements();
        }
        else if (action === 'stats') {
          menuScreen.style.display = 'none';
          statsScreen.style.display = 'flex';
          renderStats();
        }
        else if (action === 'leaderboard') {
          showLeaderboard();
        }
        else if (action === 'profile') {
          openProfileScreen();
        }
        else if (action === 'admin') {
          if (typeof window.openAdminPanel === 'function') window.openAdminPanel();
        }
        else if (action === 'logout') {
          if (confirm('Yakin mau logout?')) {
            if (typeof hideChatWidget === 'function') hideChatWidget();
            logout();
          }
        }
      }, 200);
    });
  });

  // ============================================
  //  5. PROFILE + AVATAR
  // ============================================
  const AVATARS = ['👤','😎','🐱','🐶','🦊','🐼','🐸','🦁','🐯','🦄','🐙','🦋','🐝','🦉','🐺','🐨','🐵','🐰','🐷','🤖'];

  function openProfileScreen() {
    const session = getSession();
    if (!session) return;

    const users = loadUsers();
    const u = users[session.username];
    if (!u) return;

    menuScreen.style.display = 'none';
    profileScreen.style.display = 'flex';

    document.getElementById('profileName').textContent = session.username;
    document.getElementById('profileRole').textContent = u.isAdmin ? '👑 ADMIN' : '🎮 PLAYER';
    document.getElementById('profileHighScore').textContent = u.highScore || 0;
    document.getElementById('profileTotalPlay').textContent = u.totalPlay || 0;
    document.getElementById('profileCoins').textContent = u.coins || 0;

    const joined = u.createdAt ? new Date(u.createdAt).toLocaleDateString('id-ID') : '-';
    document.getElementById('profileJoined').textContent = joined;

    document.getElementById('profileAvatar').textContent = getUserAvatar(session.username);
  }

  document.getElementById('btnProfileTop').addEventListener('click', openProfileScreen);

  document.getElementById('btnBackFromProfile').addEventListener('click', () => {
    profileScreen.style.display = 'none';
    const s = getSession();
    if (s) showMenu(s);
  });

  document.getElementById('btnChangeAvatar').addEventListener('click', () => {
    const session = getSession();
    if (!session) return;

    const grid = document.getElementById('avatarGrid');
    grid.innerHTML = '';
    const current = getUserAvatar(session.username);

    AVATARS.forEach(a => {
      const btn = document.createElement('button');
      btn.className = 'avatar-option' + (a === current ? ' selected' : '');
      btn.textContent = a;
      btn.addEventListener('click', () => {
        setUserAvatar(session.username, a);
        grid.querySelectorAll('.avatar-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        document.getElementById('profileAvatar').textContent = a;
        document.getElementById('topbarAvatar').textContent = a;
        document.getElementById('sidebarAvatar').textContent = a;
      });
      grid.appendChild(btn);
    });

    document.getElementById('avatarPicker').style.display = 'flex';
  });

  document.getElementById('btnCloseAvatarPicker').addEventListener('click', () => {
    document.getElementById('avatarPicker').style.display = 'none';
  });

  // ============================================
  //  6. MENU BUTTONS
  // ============================================
  document.getElementById('btnMenuStart').addEventListener('click', () => {
    menuScreen.style.display = 'none';
    modeScreen.style.display = 'flex';
  });

  document.getElementById('btnBackFromMode').addEventListener('click', () => {
    modeScreen.style.display = 'none';
    const s = getSession();
    if (s) showMenu(s);
  });

  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      const session = getSession();
      if (!session) return;

      // Increment totalPlay
      const users = loadUsers();
      if (users[session.username]) {
        users[session.username].totalPlay = (users[session.username].totalPlay || 0) + 1;
        saveUsers(users);
      }

      modeScreen.style.display = 'none';
      showGame(session, mode);
    });
  });

  // ============================================
  //  7. LEADERBOARD
  // ============================================
  function showLeaderboard() {
    menuScreen.style.display = 'none';
    leaderboardScreen.style.display = 'flex';

    const users = loadUsers();
    const session = getSession();

    const list = Object.entries(users)
      .map(([username, data]) => ({
        username,
        highScore: data.highScore || 0,
        isAdmin: data.isAdmin
      }))
      .sort((a, b) => b.highScore - a.highScore)
      .slice(0, 10);

    const container = document.getElementById('leaderboardList');
    container.innerHTML = '';

    if (list.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:#888">Belum ada data</p>';
      return;
    }

    list.forEach((item, i) => {
      const rankEmoji = ['🥇','🥈','🥉'][i] || `#${i + 1}`;
      const isMe = session && session.username === item.username;

      const row = document.createElement('div');
      row.className = 'leaderboard-row' + (isMe ? ' me' : '');
      row.innerHTML = `
        <span class="leaderboard-rank">${rankEmoji}</span>
        <span class="leaderboard-name">
          ${escapeHtml(item.username)}
          ${item.isAdmin ? '<span class="badge-mini">ADMIN</span>' : ''}
          ${isMe ? '<span class="badge-mini me-badge">KAMU</span>' : ''}
        </span>
        <span class="leaderboard-score">${item.highScore}</span>
      `;
      container.appendChild(row);
    });
  }

  document.getElementById('btnBackFromLeaderboard').addEventListener('click', () => {
    leaderboardScreen.style.display = 'none';
    const s = getSession();
    if (s) showMenu(s);
  });

  // ============================================
  //  8. BACK TO MENU (dari game)
  // ============================================
  document.getElementById('btnBackToMenu').addEventListener('click', () => {
    if (typeof window.stopGame === 'function') window.stopGame();
    const s = getSession();
    if (s) showMenu(s);
  });

  document.getElementById('btnBackMenuFromGameover').addEventListener('click', () => {
    const s = getSession();
    if (s) showMenu(s);
  });

  document.getElementById('btnVictoryMenu').addEventListener('click', () => {
    const s = getSession();
    if (s) showMenu(s);
  });

  document.getElementById('btnVictoryRestart').addEventListener('click', () => {
    if (window.startGameWithMode && window.currentModeId) {
      window.startGameWithMode(window.currentModeId);
    }
  });

  // ============================================
  //  9. BROADCAST NOTIF
  // ============================================
  function showBroadcastIfAny() {
    try {
      const data = JSON.parse(localStorage.getItem('bubble_broadcast'));
      if (!data || !data.text) return;

      const seen = sessionStorage.getItem('broadcast_seen');
      if (seen === String(data.createdAt)) return;

      const notif = document.createElement('div');
      notif.style.cssText = `
        position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
        background: linear-gradient(90deg, #ffea00, #ff7b00); color: #1a0033;
        padding: 12px 24px; border-radius: 30px; font-weight: bold; font-size: 14px;
        z-index: 9999; box-shadow: 0 0 30px rgba(255, 234, 0, 0.6);
        animation: slideDown 0.4s ease-out; max-width: 90%; text-align: center;
        cursor: pointer;
      `;
      notif.textContent = '📢 ' + data.text;
      notif.addEventListener('click', () => notif.remove());
      document.body.appendChild(notif);

      setTimeout(() => notif.remove(), 8000);
      sessionStorage.setItem('broadcast_seen', String(data.createdAt));
    } catch (e) {}
  }

  // ============================================
  //  10. ACHIEVEMENT SYSTEM
  // ============================================
  const ACHIEVEMENTS = [
    { id: 'first_pop',      icon: '🎯', title: 'Langkah Pertama',  desc: 'Pop bubble pertama kali' },
    { id: 'combo_10',       icon: '🔥', title: 'On Fire!',         desc: 'Capai combo 10x' },
    { id: 'combo_25',       icon: '💥', title: 'Combo Master',     desc: 'Capai combo 25x' },
    { id: 'score_500',      icon: '⭐', title: 'Rising Star',      desc: 'Dapat skor 500+' },
    { id: 'score_1000',     icon: '🌟', title: 'Bintang',          desc: 'Dapat skor 1000+' },
    { id: 'score_2500',     icon: '👑', title: 'LEGENDA',          desc: 'Dapat skor 2500+' },
    { id: 'play_10',        icon: '🎮', title: 'Gamer Sejati',     desc: 'Main 10x game' },
    { id: 'play_50',        icon: '🎯', title: 'Ketagihan',        desc: 'Main 50x game' },
    { id: 'win_target',     icon: '🏆', title: 'Pemenang',         desc: 'Menang mode Target Score' },
    { id: 'survive_sudden', icon: '💀', title: 'Survivor',         desc: 'Dapat 500+ di Sudden Match' }
  ];

  const ACH_KEY   = 'bubble_achievements';
  const DAILY_KEY = 'bubble_daily';
  const STATS_KEY = 'bubble_stats';

  function getUnlocked() {
    try { return JSON.parse(localStorage.getItem(ACH_KEY)) || {}; }
    catch { return {}; }
  }

  function setUnlocked(data) {
    localStorage.setItem(ACH_KEY, JSON.stringify(data));
  }

  function getStats() {
    try {
      return JSON.parse(localStorage.getItem(STATS_KEY)) || {
        totalBubbles: 0, totalGames: 0, bestCombo: 0, totalPowerups: 0
      };
    } catch {
      return { totalBubbles: 0, totalGames: 0, bestCombo: 0, totalPowerups: 0 };
    }
  }

  function setStats(s) {
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
  }

  function unlockAchievement(id) {
    const unlocked = getUnlocked();
    if (unlocked[id]) return;

    const ach = ACHIEVEMENTS.find(a => a.id === id);
    if (!ach) return;

    unlocked[id] = { unlockedAt: Date.now() };
    setUnlocked(unlocked);

    // Popup
    const popup = document.getElementById('achievePopup');
    document.getElementById('achievePopupName').textContent = ach.title;
    popup.querySelector('.achieve-popup-icon').textContent = ach.icon;
    popup.classList.add('show');
    setTimeout(() => popup.classList.remove('show'), 4000);

    // Bonus coin
    const session = getSession();
    if (session) addUserCoins(session.username, 50);
  }

  function checkAchievements() {
    const stats = getStats();
    const session = getSession();
    if (!session) return;

    const u = loadUsers()[session.username];
    const hs = u?.highScore || 0;

    if (stats.totalGames >= 1)  unlockAchievement('first_pop');
    if (stats.totalGames >= 10) unlockAchievement('play_10');
    if (stats.totalGames >= 50) unlockAchievement('play_50');

    if (stats.bestCombo >= 10) unlockAchievement('combo_10');
    if (stats.bestCombo >= 25) unlockAchievement('combo_25');

    if (hs >= 500)  unlockAchievement('score_500');
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
      item.innerHTML = `
        <div class="achievement-icon">${ach.icon}</div>
        <div class="achievement-info">
          <div class="achievement-title">${ach.title}</div>
          <div class="achievement-desc">${ach.desc}</div>
        </div>
        <span class="achievement-badge">${isUnlocked ? '✅' : '🔒'}</span>
      `;
      container.appendChild(item);
    });
  }

document.getElementById('btnBackFromAchievement').addEventListener('click', () => {
    achievementScreen.style.display = 'none';
    const s = getSession();
    if (s) showMenu(s);
  });

  // ============================================
  //  11. STATISTIK
  // ============================================
  function renderStats() {
    const stats = getStats();
    const unlocked = getUnlocked();
    const unlockedCount = Object.keys(unlocked).length;
    const session = getSession();
    const coins = session ? getUserCoins(session.username) : 0;

    document.getElementById('statsContent').innerHTML = `
      <div class="stat-item">
        <span class="stat-item-label">🎮 Total Main</span>
        <span class="stat-item-value">${stats.totalGames || 0}x</span>
      </div>
      <div class="stat-item">
        <span class="stat-item-label">🫧 Total Bubble Dipop</span>
        <span class="stat-item-value">${stats.totalBubbles || 0}</span>
      </div>
      <div class="stat-item">
        <span class="stat-item-label">🔥 Best Combo</span>
        <span class="stat-item-value">${stats.bestCombo || 0}x</span>
      </div>
      <div class="stat-item">
        <span class="stat-item-label">💎 Power-up Dipakai</span>
        <span class="stat-item-value">${stats.totalPowerups || 0}</span>
      </div>
      <div class="stat-item">
        <span class="stat-item-label">🏆 Achievement</span>
        <span class="stat-item-value">${unlockedCount}/${ACHIEVEMENTS.length}</span>
      </div>
      <div class="stat-item">
        <span class="stat-item-label">💰 Total Coin</span>
        <span class="stat-item-value">${coins}</span>
      </div>
    `;
  }

  document.getElementById('btnBackFromStats').addEventListener('click', () => {
    statsScreen.style.display = 'none';
    const s = getSession();
    if (s) showMenu(s);
  });

  // ============================================
  //  12. DAILY BONUS
  // ============================================
  function checkDailyBonus() {
    try {
      const data = JSON.parse(localStorage.getItem(DAILY_KEY)) || {};
      const today = new Date().toDateString();
      const lastClaim = data.lastClaim;

      if (lastClaim === today) return;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const isConsecutive = data.lastClaim === yesterday.toDateString();

      const streak = isConsecutive ? (data.streak || 0) + 1 : 1;
      const bonusAmount = 100 + (streak - 1) * 50;

      document.getElementById('bonusAmount').textContent = '+' + bonusAmount;
      document.getElementById('bonusStreak').textContent = streak;
      document.getElementById('dailyBonusModal').style.display = 'flex';

      sessionStorage.setItem('pendingBonus', JSON.stringify({ amount: bonusAmount, streak }));
    } catch (e) {}
  }

  document.getElementById('btnClaimBonus').addEventListener('click', () => {
    try {
      const pending = JSON.parse(sessionStorage.getItem('pendingBonus'));
      const session = getSession();
      if (pending && session) {
        addUserCoins(session.username, pending.amount);
        localStorage.setItem(DAILY_KEY, JSON.stringify({
          lastClaim: new Date().toDateString(),
          streak: pending.streak
        }));
        sessionStorage.removeItem('pendingBonus');

        // Update coin display
        const el = document.getElementById('menuCoins');
        if (el) el.textContent = getUserCoins(session.username);
      }
    } catch (e) {}
    document.getElementById('dailyBonusModal').style.display = 'none';
  });

  // ============================================
  //  13. EXPOSE UNTUK script.js
  // ============================================
  window.gameAchievements = {
    unlock: unlockAchievement,
    updateStats: function (data) {
      const stats = getStats();
      Object.keys(data).forEach(k => {
        if (k === 'bestCombo') {
          stats.bestCombo = Math.max(stats.bestCombo || 0, data[k]);
        } else {
          stats[k] = (stats[k] || 0) + data[k];
        }
      });
      setStats(stats);
      checkAchievements();
    },
    updateCoins: function () {
      const session = getSession();
      if (!session) return;
      const el = document.getElementById('menuCoins');
      if (el) el.textContent = getUserCoins(session.username);
    }
  };

  window.renderAchievements = renderAchievements;
  window.renderStats = renderStats;

  // ============================================
  //  14. ADMIN PANEL
  // ============================================
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
      document.querySelectorAll('.admin-panel-content')
        .forEach(p => p.style.display = 'none');
      document.getElementById('panel-' + tab.dataset.panel).style.display = 'block';

      if (tab.dataset.panel === 'dashboard') renderDashboard();
      if (tab.dataset.panel === 'users')     renderUsers();
      if (tab.dataset.panel === 'broadcast') renderActiveBroadcast();
    });
  });

  document.getElementById('btnSaveSettings').addEventListener('click', saveSettings);
  document.getElementById('btnResetSettings').addEventListener('click', resetSettings);
  document.getElementById('btnSendBroadcast').addEventListener('click', sendBroadcast);
  document.getElementById('btnClearBroadcast').addEventListener('click', clearBroadcast);
  document.getElementById('btnExportData').addEventListener('click', exportData);
  document.getElementById('btnImportData').addEventListener('click', () =>
    document.getElementById('importFile').click()
  );
  document.getElementById('importFile').addEventListener('change', importData);
  document.getElementById('btnResetAllUsers').addEventListener('click', resetAllUsers);
  document.getElementById('btnResetAllScores').addEventListener('click', resetAllScores);
  userSearch.addEventListener('input', renderUsers);

  window.openAdminPanel = function () {
    const session = getSession();
    if (!session || !session.isAdmin) { alert('⛔ Akses ditolak!'); return; }
    panel.style.display = 'flex';
    renderDashboard();
    renderUsers();
    loadSettingsToForm();
    renderActiveBroadcast();
  };

  function renderDashboard() {
    const users = loadUsers();
    const names = Object.keys(users);

    let totalPlay = 0, topScore = 0, topPlayer = '-';
    let adminCount = 0, scoreSum = 0, scoreCount = 0;

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

    const top5 = names
      .map(n => ({ name: n, score: users[n].highScore || 0 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const container = document.getElementById('topPlayersList');
    container.innerHTML = '';

    if (top5.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:#888">Belum ada data</p>';
      return;
    }

    top5.forEach((p, i) => {
      const medal = ['🥇','🥈','🥉','#4','#5'][i];
      const row = document.createElement('div');
      row.className = 'user-card';
      row.innerHTML = `
        <div class="user-info">
          <div class="user-name">${medal} ${escapeHtml(p.name)}</div>
        </div>
        <div class="leaderboard-score">${p.score}</div>
      `;
      container.appendChild(row);
    });
  }

  function renderUsers() {
    const users = loadUsers();
    const query = (userSearch.value || '').trim().toLowerCase();
    const names = Object.keys(users).filter(n => !query || n.includes(query));

    totalUsers.textContent = Object.keys(users).length;
    usersList.innerHTML = '';

    names.sort((a, b) => {
      if (users[a].isAdmin && !users[b].isAdmin) return -1;
      if (!users[a].isAdmin && users[b].isAdmin) return 1;
      return (users[b].highScore || 0) - (users[a].highScore || 0);
    });

    if (names.length === 0) {
      usersList.innerHTML = '<p style="text-align:center;color:#888;padding:20px">Gak ada user</p>';
      return;
    }

    names.forEach(name => {
      const u = users[name];
      const card = document.createElement('div');
      card.className = 'user-card' + (u.isAdmin ? ' admin' : '');

      const last = u.lastLogin ? new Date(u.lastLogin).toLocaleString('id-ID') : 'Belum pernah';
      const banned = u.banned ? '<span class="badge badge-banned">BANNED</span>' : '';

      card.innerHTML = `
        <div class="user-info">
          <div class="user-name">
            ${escapeHtml(name)}
            ${u.isAdmin ? '<span class="badge">ADMIN</span>' : ''}
            ${banned}
          </div>
          <div class="user-meta">
            🏆 <strong>${u.highScore || 0}</strong> •
            🎮 Main: <strong>${u.totalPlay || 0}x</strong> •
            💰 <strong>${u.coins || 0}</strong> •
            🕐 ${last}
          </div>
        </div>
        <div class="user-actions">
          <button class="action-btn reset" data-user="${escapeHtml(name)}">↺ Reset</button>
          ${!u.isAdmin ? `
            <button class="action-btn ban" data-user="${escapeHtml(name)}">
              ${u.banned ? '✅ Unban' : '🚫 Ban'}
            </button>
            <button class="action-btn delete" data-user="${escapeHtml(name)}">🗑️</button>
          ` : ''}
        </div>
      `;
      usersList.appendChild(card);
    });

    usersList.querySelectorAll('.action-btn.reset').forEach(btn =>
      btn.addEventListener('click', () => resetUserScore(btn.dataset.user))
    );
    usersList.querySelectorAll('.action-btn.ban').forEach(btn =>
      btn.addEventListener('click', () => toggleBan(btn.dataset.user))
    );
    usersList.querySelectorAll('.action-btn.delete').forEach(btn =>
      btn.addEventListener('click', () => deleteUser(btn.dataset.user))
    );
  }

  function resetUserScore(username) {
    if (!confirm(`Reset skor "${username}"?`)) return;
    const users = loadUsers();
    if (users[username]) {
      users[username].highScore = 0;
      saveUsers(users);
      renderUsers();
    }
  }

  function toggleBan(username) {
    const users = loadUsers();
    if (!users[username]) return;
    const action = users[username].banned ? 'unban' : 'ban';
    if (!confirm(`Yakin ${action} user "${username}"?`)) return;
    users[username].banned = !users[username].banned;
    saveUsers(users);
    renderUsers();
  }

  function deleteUser(username) {
    if (!confirm(`Yakin hapus user "${username}"? Tidak bisa dibatalkan!`)) return;
    const users = loadUsers();
    delete users[username];
    saveUsers(users);
    renderUsers();
  }

  function loadSettingsToForm() {
    const s = loadSettings();
    document.getElementById('setDuration').value = s.duration;
    document.getElementById('setSpawn').value = s.spawnInterval;
    document.getElementById('setPowerup').value = Math.round(s.powerupChance * 100);
    document.getElementById('setSound').value = s.soundDefault ? 'on' : 'off';
  }

  function saveSettings() {
    const duration = parseInt(document.getElementById('setDuration').value);
    const spawn    = parseInt(document.getElementById('setSpawn').value);
    const powerup  = parseInt(document.getElementById('setPowerup').value);
    const sound    = document.getElementById('setSound').value === 'on';
    const msg      = document.getElementById('settingsMsg');

    if (duration < 10 || duration > 120) {
      msg.className = 'save-msg error'; msg.textContent = '❌ Durasi 10-120 detik'; return;
    }
    if (spawn < 200 || spawn > 2000) {
      msg.className = 'save-msg error'; msg.textContent = '❌ Spawn 200-2000 ms'; return;
    }
    if (powerup < 0 || powerup > 50) {
      msg.className = 'save-msg error'; msg.textContent = '❌ Power-up 0-50%'; return;
    }

    localStorage.setItem('bubble_settings', JSON.stringify({
      duration, spawnInterval: spawn, powerupChance: powerup / 100, soundDefault: sound
    }));

    msg.className = 'save-msg success';
    msg.textContent = '✅ Tersimpan!';
    setTimeout(() => { msg.textContent = ''; }, 3000);
  }

  function resetSettings() {
    if (!confirm('Reset ke default?')) return;
    localStorage.removeItem('bubble_settings');
    loadSettingsToForm();
    const msg = document.getElementById('settingsMsg');
    msg.className = 'save-msg success';
    msg.textContent = '↺ Direset!';
    setTimeout(() => { msg.textContent = ''; }, 3000);
  }

  function sendBroadcast() {
    const text = document.getElementById('broadcastMessage').value.trim();
    const msg  = document.getElementById('broadcastMsg');

    if (!text) { msg.className = 'save-msg error'; msg.textContent = '❌ Pesan gak boleh kosong'; return; }
    if (text.length > 200) { msg.className = 'save-msg error'; msg.textContent = '❌ Max 200 karakter'; return; }

    localStorage.setItem('bubble_broadcast', JSON.stringify({ text, createdAt: Date.now() }));

    msg.className = 'save-msg success';
    msg.textContent = '✅ Broadcast terkirim!';
    setTimeout(() => { msg.textContent = ''; }, 3000);
    renderActiveBroadcast();
  }

  function clearBroadcast() {
    if (!confirm('Hapus broadcast aktif?')) return;
    localStorage.removeItem('bubble_broadcast');
    renderActiveBroadcast();
    const msg = document.getElementById('broadcastMsg');
    msg.className = 'save-msg success';
    msg.textContent = '🗑️ Broadcast dihapus';
    setTimeout(() => { msg.textContent = ''; }, 3000);
  }

  function renderActiveBroadcast() {
    const box = document.getElementById('activeBroadcast');
    try {
      const data = JSON.parse(localStorage.getItem('bubble_broadcast'));
      if (data && data.text) {
        const date = new Date(data.createdAt).toLocaleString('id-ID');
        box.className = 'active-broadcast';
        box.innerHTML = `<strong>📢 ${escapeHtml(data.text)}</strong><br><small style="color:#888">Dikirim: ${date}</small>`;
        return;
      }
    } catch (e) {}
    box.className = 'active-broadcast empty';
    box.textContent = 'Belum ada broadcast aktif';
  }

  function exportData() {
    const users = loadUsers();
    const data = { exportedAt: new Date().toISOString(), version: '1.0', users };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bubblepop-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    const msg = document.getElementById('backupMsg');
    msg.className = 'save-msg success';
    msg.textContent = '✅ Backup terdownload!';
    setTimeout(() => { msg.textContent = ''; }, 3000);
  }

  function importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.users || typeof data.users !== 'object') throw new Error('Format salah');
        if (!confirm(`Import ${Object.keys(data.users).length} user? Data lama akan ditimpa.`)) return;

        const current = loadUsers();
        Object.keys(data.users).forEach(k => { current[k] = data.users[k]; });
        saveUsers(current);

        renderUsers();
        renderDashboard();

        const msg = document.getElementById('backupMsg');
        msg.className = 'save-msg success';
        msg.textContent = '✅ Data berhasil di-import!';
        setTimeout(() => { msg.textContent = ''; }, 3000);
      } catch (err) {
        const msg = document.getElementById('backupMsg');
        msg.className = 'save-msg error';
        msg.textContent = '❌ File gak valid: ' + err.message;
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  }

  function resetAllUsers() {
    if (!confirm('⚠️ HAPUS SEMUA USER selain admin?')) return;
    if (!confirm('Yakin banget? Konfirmasi terakhir!')) return;

    const users = loadUsers();
    const newUsers = {};
    Object.keys(users).forEach(k => {
      if (users[k].isAdmin) newUsers[k] = users[k];
    });
    saveUsers(newUsers);

    renderUsers();
    renderDashboard();

    const msg = document.getElementById('backupMsg');
    msg.className = 'save-msg success';
    msg.textContent = '🔥 Semua user (kecuali admin) dihapus';
    setTimeout(() => { msg.textContent = ''; }, 3000);
  }

  function resetAllScores() {
    if (!confirm('⚠️ Reset SEMUA skor user jadi 0?')) return;
    const users = loadUsers();
    Object.keys(users).forEach(k => { users[k].highScore = 0; });
    saveUsers(users);

    renderUsers();
    renderDashboard();

    const msg = document.getElementById('backupMsg');
    msg.className = 'save-msg success';
    msg.textContent = '🎯 Semua skor direset ke 0';
    setTimeout(() => { msg.textContent = ''; }, 3000);
  }

  // ============================================
  //  15. AUTO LOGIN
  // ============================================
  const session = getSession();
  if (session && loadUsers()[session.username]) {
    showMenu(session);
  }

});
  