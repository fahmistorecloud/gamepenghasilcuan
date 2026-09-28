// ============================================
// GAME LOGIC — Firebase Version
// ============================================

const DEFAULT_SETTINGS = { duration: 30, spawnInterval: 700, powerupChance: 0.12, soundDefault: true };

const MODES = {
  time:    { id: 'time',    name: '⏱️ TIME ATTACK',  duration: 30,       targetScore: null, endless: false, suddenDeath: false },
  target:  { id: 'target',  name: '🎯 TARGET SCORE', duration: 45,       targetScore: 500,  endless: false, suddenDeath: false },
  endless: { id: 'endless', name: '♾️ ENDLESS',      duration: Infinity, targetScore: null, endless: true,  suddenDeath: false },
  sudden:  { id: 'sudden',  name: '💀 SUDDEN MATCH', duration: 60,       targetScore: null, endless: false, suddenDeath: true }
};

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem('bubble_settings'));
    return { ...DEFAULT_SETTINGS, ...s };
  } catch { return { ...DEFAULT_SETTINGS }; }
}

let SETTINGS = loadSettings();
const COLORS = ['#ff006e', '#00f5ff', '#ffea00', '#9d4edd', '#00ff88', '#ff7b00'];
const POWERUP_TYPES = [
  { id: 'bomb',   icon: '💣', color: '#ff4444', bg: 'radial-gradient(circle at 30% 30%, #ff8888, #aa0000)' },
  { id: 'freeze', icon: '❄️', color: '#66ddff', bg: 'radial-gradient(circle at 30% 30%, #aaffff, #0088cc)' },
  { id: 'double', icon: '⭐', color: '#ffea00', bg: 'radial-gradient(circle at 30% 30%, #ffff88, #cc9900)' }
];

let score = 0, combo = 0, timeLeft = 0, gameRunning = false;
let currentUser = null, currentMode = MODES.time, currentModeId = 'time';
let highScore = 0;
let soundEnabled = localStorage.getItem('bubbleSound') !== 'off';
let spawnIntervalId = null, timerIntervalId = null;
let doubleScoreActive = false, freezeActive = false;
let doubleScoreTimeout = null, freezeTimeout = null;
window.currentModeId = 'time';

let audioCtx = null;
function initAudio() {
  if (!audioCtx) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}
function playTone(freq, dur, type = 'sine', vol = 0.15, delay = 0) {
  if (!soundEnabled || !audioCtx) return;
  const now = audioCtx.currentTime + delay;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(vol, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now); osc.stop(now + dur);
}
function playPopSound(c)     { playTone(400 + Math.min(c * 40, 600), 0.1, 'sine', 0.15); }
function playFreezeSound()   { playTone(1200, 0.15); playTone(1600, 0.15, 'sine', 0.15, 0.1); playTone(2000, 0.25, 'sine', 0.15, 0.2); }
function playDoubleSound()   { playTone(600, 0.12, 'square', 0.1); playTone(900, 0.12, 'square', 0.1, 0.1); playTone(1200, 0.2, 'square', 0.1, 0.2); }
function playGameOverSound() { playTone(400, 0.2, 'sine', 0.2); playTone(300, 0.2, 'sine', 0.2, 0.2); playTone(200, 0.4, 'sine', 0.2, 0.4); }
function playHighScoreSound(){ playTone(523, 0.15, 'sine', 0.2); playTone(659, 0.15, 'sine', 0.2, 0.15); playTone(784, 0.15, 'sine', 0.2, 0.3); playTone(1047, 0.4, 'sine', 0.2, 0.45); }
function playVictorySound()  { playTone(523, 0.15); playTone(659, 0.15, 'sine', 0.2, 0.15); playTone(784, 0.15, 'sine', 0.2, 0.3); playTone(1047, 0.15, 'sine', 0.2, 0.45); playTone(1318, 0.5, 'sine', 0.2, 0.6); }
function playMissSound()     { playTone(200, 0.3, 'sawtooth', 0.2); }
function playBombSound() {
  if (!soundEnabled || !audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.exponentialRampToValueAtTime(50, now + 0.5);
  gain.gain.setValueAtTime(0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now); osc.stop(now + 0.5);
}

const scoreEl        = document.getElementById('score');
const comboEl        = document.getElementById('comboDisplay');
const comboBanner    = document.getElementById('combo');
const timerEl        = document.getElementById('timer');
const startScreen    = document.getElementById('start');
const gameoverScreen = document.getElementById('gameover');
const victoryScreen  = document.getElementById('victory');
const finalScoreEl   = document.getElementById('finalScore');
const rankEl         = document.getElementById('rank');
const highScoreEl    = document.getElementById('highScore');
const startHighScore = document.getElementById('startHighScore');
const newRecordEl    = document.getElementById('newRecord');
const btnStart       = document.getElementById('btnStart');
const btnRestart     = document.getElementById('btnRestart');
const soundToggle    = document.getElementById('soundToggle');
const buffsEl        = document.getElementById('buffs');
const modeIndicator  = document.getElementById('modeIndicator');
const targetInfo     = document.getElementById('targetInfo');

window.onUserLogin = function (user, modeId) {
  currentUser = user;
  currentModeId = modeId || 'time';
  window.currentModeId = currentModeId;
  currentMode = MODES[currentModeId] || MODES.time;
  highScore = getUserHighScore(user.username);
  highScoreEl.textContent = highScore;
  startHighScore.textContent = highScore;
  updateModeUI();
};

function updateModeUI() {
  if (!currentMode) return;
  modeIndicator.textContent = currentMode.name;
  modeIndicator.classList.add('visible');
  if (currentMode.targetScore) {
    targetInfo.textContent = `🎯 Target: ${score}/${currentMode.targetScore}`;
    targetInfo.classList.add('visible');
  } else { targetInfo.classList.remove('visible'); }
  if (currentMode.endless) timerEl.textContent = '⏱️ ∞';
  else timerEl.textContent = '⏱️ ' + (gameRunning ? timeLeft : currentMode.duration);
}

function applySoundState() {
  soundToggle.textContent = soundEnabled ? '🔊' : '🔇';
  soundToggle.classList.toggle('muted', !soundEnabled);
}
soundToggle.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  localStorage.setItem('bubbleSound', soundEnabled ? 'on' : 'off');
  applySoundState();
  if (soundEnabled) { initAudio(); playTone(600, 0.1); }
});

btnStart.addEventListener('click', startGame);
btnRestart.addEventListener('click', startGame);

window.startGameWithMode = function (modeId) {
  currentModeId = modeId;
  window.currentModeId = modeId;
  currentMode = MODES[modeId] || MODES.time;
  updateModeUI();
  startGame();
};

function startGame() {
  if (!currentUser || !currentMode) return;
  initAudio();
  SETTINGS = loadSettings();

  startScreen.style.display = 'none';
  gameoverScreen.style.display = 'none';
  victoryScreen.style.display = 'none';
  newRecordEl.classList.remove('show');
  document.getElementById('victoryNewRecord').classList.remove('show');
  document.querySelectorAll('.bubble, .particle, .popup').forEach(el => el.remove());

  score = 0; combo = 0;
  timeLeft = currentMode.endless ? Infinity : currentMode.duration;
  gameRunning = true; doubleScoreActive = false; freezeActive = false;

  if (doubleScoreTimeout) clearTimeout(doubleScoreTimeout);
  if (freezeTimeout) clearTimeout(freezeTimeout);

  updateHUD(); updateBuffs(); updateModeUI();
  timerEl.classList.remove('frozen');

  spawnIntervalId = setInterval(spawnBubble, SETTINGS.spawnInterval);
  if (!currentMode.endless) timerIntervalId = setInterval(tickTimer, 1000);
  spawnBubble();
}

window.stopGame = function () {
  gameRunning = false;
  clearInterval(spawnIntervalId);
  clearInterval(timerIntervalId);
  if (doubleScoreTimeout) clearTimeout(doubleScoreTimeout);
  if (freezeTimeout) clearTimeout(freezeTimeout);
  doubleScoreActive = false; freezeActive = false;
  document.querySelectorAll('.bubble, .particle, .popup').forEach(el => el.remove());
  modeIndicator.classList.remove('visible');
  targetInfo.classList.remove('visible');
};

function tickTimer() {
  if (!gameRunning || freezeActive) return;
  timeLeft--;
  timerEl.textContent = '⏱️ ' + timeLeft;
  if (timeLeft <= 3 && timeLeft > 0) playTone(880, 0.1);
  if (timeLeft <= 0) endGame();
}

function updateHUD() {
  scoreEl.textContent = score;
  comboEl.textContent = combo + 'x';
  if (currentMode && currentMode.targetScore) {
    targetInfo.textContent = `🎯 Target: ${score}/${currentMode.targetScore}`;
  }
}

function spawnBubble() {
  if (!gameRunning) return;
  const isPowerup = Math.random() < SETTINGS.powerupChance;
  const size = isPowerup ? 70 : 50 + Math.random() * 60;
  const bubble = document.createElement('div');
  bubble.className = 'bubble';

  if (isPowerup) {
    const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
    bubble.classList.add('powerup');
    bubble.dataset.type = type.id;
    bubble.textContent = type.icon;
    bubble.style.background = type.bg;
    bubble.style.color = type.color;
    bubble.style.fontSize = (size * 0.55) + 'px';
  } else {
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    bubble.style.background = `radial-gradient(circle at 30% 30%, ${color}, ${shadeColor(color, -40)})`;
    bubble.style.color = color;
  }

  bubble.style.width = size + 'px';
  bubble.style.height = size + 'px';
  bubble.style.left = Math.random() * (window.innerWidth - size) + 'px';
  bubble.style.top = Math.random() * (window.innerHeight - size) + 'px';

  const life = isPowerup ? 3000 : 1500 + Math.random() * 1500;
  const timeoutId = setTimeout(() => {
    if (bubble.parentNode && gameRunning) {
      if (!isPowerup) {
        if (currentMode.suddenDeath) {
          playMissSound();
          createScorePopup(window.innerWidth / 2, window.innerHeight / 2, '💀 MISSED!', '#ff4466');
          bubble.remove();
          setTimeout(endGame, 300);
          return;
        }
        combo = 0; updateHUD();
      }
      bubble.remove();
    }
  }, life);

  bubble.addEventListener('click', (e) => {
    if (!gameRunning) return;
    clearTimeout(timeoutId);
    if (isPowerup) triggerPowerup(bubble.dataset.type, bubble, e.clientX, e.clientY);
    else popBubble(bubble, e.clientX, e.clientY);
  });
  document.body.appendChild(bubble);
}

function popBubble(bubble, x, y) {
  combo++;
  const multiplier = doubleScoreActive ? 2 : 1;
  const points = 10 * combo * multiplier;
  score += points;
  updateHUD();
  playPopSound(combo);
  if (combo >= 3) showCombo(combo);
  const color = bubble.style.color || '#fff';
  createScorePopup(x, y, points, color);
  createParticles(x, y, color, combo, 12);
  bubble.remove();
  if (window.gameAchievements) window.gameAchievements.updateStats({ totalBubbles: 1 });
  if (currentMode.targetScore && score >= currentMode.targetScore) setTimeout(winGame, 300);
}

function triggerPowerup(type, bubble, x, y) {
  const rect = bubble.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  if (window.gameAchievements) window.gameAchievements.updateStats({ totalPowerups: 1 });

  if (type === 'bomb') {
    playBombSound();
    createParticles(cx, cy, '#ff4444', 5, 40);
    createScorePopup(cx, cy, 'BOOM! 💣', '#ff4444');
    let cleared = 0;
    document.querySelectorAll('.bubble').forEach((b, i) => {
      if (b === bubble) return;
      const r = b.getBoundingClientRect();
      const bx = r.left + r.width / 2, by = r.top + r.height / 2;
      setTimeout(() => {
        createParticles(bx, by, b.style.color || '#fff', 3, 10);
        b.remove(); cleared++;
      }, i * 30);
    });
    const bombPoints = 50 + cleared * 15 * (doubleScoreActive ? 2 : 1);
    score += bombPoints; combo += 5; updateHUD();
    setTimeout(() => {
      createScorePopup(cx, cy - 60, '+' + bombPoints, '#ffea00');
      if (currentMode.targetScore && score >= currentMode.targetScore) setTimeout(winGame, 300);
    }, 200);
  }
  if (type === 'freeze') {
    playFreezeSound();
    freezeActive = true;
    timerEl.classList.add('frozen');
    createScorePopup(cx, cy, 'FREEZE! ❄️', '#66ddff');
    createParticles(cx, cy, '#66ddff', 5, 20);
    updateBuffs();
    if (freezeTimeout) clearTimeout(freezeTimeout);
    freezeTimeout = setTimeout(() => {
      freezeActive = false;
      timerEl.classList.remove('frozen');
      updateBuffs();
    }, 3000);
  }
  if (type === 'double') {
    playDoubleSound();
    doubleScoreActive = true;
    createScorePopup(cx, cy, 'DOUBLE! ⭐', '#ffea00');
    createParticles(cx, cy, '#ffea00', 5, 20);
    updateBuffs();
    if (doubleScoreTimeout) clearTimeout(doubleScoreTimeout);
    doubleScoreTimeout = setTimeout(() => {
      doubleScoreActive = false;
      updateBuffs();
    }, 5000);
  }
  bubble.remove();
}

function updateBuffs() {
  buffsEl.innerHTML = '';
  if (doubleScoreActive) {
    const b = document.createElement('div');
    b.className = 'buff double';
    b.textContent = '⭐ DOUBLE SCORE';
    buffsEl.appendChild(b);
  }
  if (freezeActive) {
    const b = document.createElement('div');
    b.className = 'buff freeze';
    b.textContent = '❄️ TIME FROZEN';
    buffsEl.appendChild(b);
  }
}

function showCombo(c) {
  comboBanner.textContent = c + 'x COMBO!';
  comboBanner.classList.add('show');
  setTimeout(() => comboBanner.classList.remove('show'), 400);
}

function createScorePopup(x, y, points, color) {
  const popup = document.createElement('div');
  popup.className = 'popup';
  popup.textContent = typeof points === 'number' ? '+' + points : points;
  popup.style.left = x + 'px'; popup.style.top = y + 'px';
  popup.style.color = color;
  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 800);
}

function createParticles(x, y, color, comboCount, count) {
  const n = count || (12 + Math.min(comboCount * 2, 20));
  for (let i = 0; i < n; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const pSize = 4 + Math.random() * 8;
    p.style.width = pSize + 'px'; p.style.height = pSize + 'px';
    p.style.left = x + 'px'; p.style.top = y + 'px';
    p.style.background = color;
    p.style.boxShadow = `0 0 10px ${color}`;
    const angle = (Math.PI * 2 * i) / n + Math.random() * 0.5;
    const dist = 60 + Math.random() * 100;
    p.style.setProperty('--tx', Math.cos(angle) * dist + 'px');
    p.style.setProperty('--ty', Math.sin(angle) * dist + 'px');
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 800);
  }
}

function endGame() {
  gameRunning = false;
  clearInterval(spawnIntervalId);
  clearInterval(timerIntervalId);
  if (doubleScoreTimeout) clearTimeout(doubleScoreTimeout);
  if (freezeTimeout) clearTimeout(freezeTimeout);
  doubleScoreActive = false; freezeActive = false;
  updateBuffs();
  document.querySelectorAll('.bubble').forEach(b => b.remove());

  finalScoreEl.textContent = score;
  rankEl.textContent = 'Rank: ' + getRank(score);

  const coinBonus = Math.floor(score / 10);
  if (currentUser && coinBonus > 0) {
    addUserCoins(currentUser.username, coinBonus).catch(e => console.error(e));
  }

  if (window.gameAchievements) {
    window.gameAchievements.updateStats({ totalGames: 1, bestCombo: combo });
  }

  if (currentUser && score > highScore) {
    highScore = score;
    setUserHighScore(currentUser.username, score).catch(e => console.error(e));
    newRecordEl.classList.add('show');
    setTimeout(playHighScoreSound, 300);
  } else {
    playGameOverSound();
  }

  highScoreEl.textContent = highScore;
  startHighScore.textContent = highScore;
  gameoverScreen.style.display = 'flex';
}

function winGame() {
  if (!gameRunning) return;
  gameRunning = false;
  clearInterval(spawnIntervalId);
  clearInterval(timerIntervalId);
  if (doubleScoreTimeout) clearTimeout(doubleScoreTimeout);
  if (freezeTimeout) clearTimeout(freezeTimeout);
  doubleScoreActive = false; freezeActive = false;
  updateBuffs();
  document.querySelectorAll('.bubble').forEach(b => b.remove());

  document.getElementById('victoryScore').textContent = score;
  document.getElementById('victoryRank').textContent = 'Rank: ' + getRank(score);

  const coinBonus = Math.floor(score / 10) + 100;
  if (currentUser) addUserCoins(currentUser.username, coinBonus).catch(e => console.error(e));

  if (window.gameAchievements) {
    window.gameAchievements.updateStats({ totalGames: 1, bestCombo: combo });
    window.gameAchievements.unlock('win_target');
  }

  if (currentUser && score > highScore) {
    highScore = score;
    setUserHighScore(currentUser.username, score).catch(e => console.error(e));
    document.getElementById('victoryNewRecord').classList.add('show');
  } else {
    document.getElementById('victoryNewRecord').classList.remove('show');
  }

  highScoreEl.textContent = highScore;
  startHighScore.textContent = highScore;
  playVictorySound();
  victoryScreen.style.display = 'flex';
}

function getRank(s) {
  if (s > 2500) return 'DEWA BUBBLE ⚡';
  if (s > 1500) return 'LEGENDA 👑';
  if (s > 800)  return 'Master 🏆';
  if (s > 300)  return 'Jagoan 🎯';
  return 'Pemula 🫠';
}

function shadeColor(hex, percent) {
  const num = parseInt(hex.slice(1), 16);
  let r = (num >> 16) + percent;
  let g = ((num >> 8) & 0x00ff) + percent;
  let b = (num & 0x0000ff) + percent;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

applySoundState();