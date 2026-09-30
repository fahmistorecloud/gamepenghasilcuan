// ============================================
// POKER MULTIPLAYER (MABAR) + SINGLE PLAYER
// ============================================

const PK_SUITS = [{s:'♠',c:'black'},{s:'♥',c:'red'},{s:'♦',c:'red'},{s:'♣',c:'black'}];
const PK_RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

let pkRoom = null;
let pkUnsub = null;
let pkMe = null;
let pkLobbyUnsub = null;

function pkEscape(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function pkDeck() {
  const d = [];
  for (const s of PK_SUITS) for (const r of PK_RANKS) d.push({ rank: r, suit: s.s, color: s.c });
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [d[i],d[j]] = [d[j],d[i]]; }
  return d;
}

function pkEval(hand) {
  if (!hand || hand.length < 5) return { rank: 0, name: '-', tb: [] };
  const ranks = hand.map(c => PK_RANKS.indexOf(c.rank)).sort((a,b)=>b-a);
  const suits = hand.map(c => c.suit);
  const cnt = {};
  ranks.forEach(r => cnt[r] = (cnt[r]||0)+1);
  const cv = Object.values(cnt).sort((a,b)=>b-a);
  const flush = suits.every(s => s === suits[0]);
  const straight = ranks.every((r,i) => i===0 || r === ranks[i-1]-1);
  const royal = straight && ranks[0] === 12 && ranks[4] === 8;
  let rank, name;
  if (royal && flush) { rank = 10; name = 'Royal Flush'; }
  else if (straight && flush) { rank = 9; name = 'Straight Flush'; }
  else if (cv[0] === 4) { rank = 8; name = 'Four of a Kind'; }
  else if (cv[0] === 3 && cv[1] === 2) { rank = 7; name = 'Full House'; }
  else if (flush) { rank = 6; name = 'Flush'; }
  else if (straight) { rank = 5; name = 'Straight'; }
  else if (cv[0] === 3) { rank = 4; name = 'Three of a Kind'; }
  else if (cv[0] === 2 && cv[1] === 2) { rank = 3; name = 'Two Pair'; }
  else if (cv[0] === 2) { rank = 2; name = 'Pair'; }
  else { rank = 1; name = 'High Card'; }
  return { rank, name, tb: ranks };
}

function pkTie(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i]||0) !== (b[i]||0)) return (a[i]||0) - (b[i]||0);
  }
  return 0;
}

// ===== MULTIPLAYER: LOBBY =====
window.openPokerLobby = function () {
  document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
  document.getElementById('pokerLobby').style.display = 'flex';
  const session = getSession();
  if (session) document.getElementById('pokerLobbyCoins').textContent = getUserCoins(session.username);
  pkListenRooms();
};

function pkListenRooms() {
  if (pkLobbyUnsub) pkLobbyUnsub();
  pkLobbyUnsub = window.fb.listenPokerRooms(rooms => {
    const list = document.getElementById('pokerRoomList');
    if (!list) return;
    list.innerHTML = '';
    const arr = Object.entries(rooms).sort((a,b) => (b[1].createdAt||0) - (a[1].createdAt||0));
    if (arr.length === 0) {
      list.innerHTML = '<p style="text-align:center;color:#888;font-style:italic;padding:20px;">Belum ada meja. Bikin dulu!</p>';
      return;
    }
    arr.forEach(([id, r]) => {
      const count = (r.players || []).length;
      const full = count >= r.maxPlayers;
      const row = document.createElement('div');
      row.className = 'poker-room-row';
      row.innerHTML =
        '<div class="poker-room-info">' +
          '<div class="poker-room-name">🃏 ' + pkEscape(r.name) + '</div>' +
          '<div class="poker-room-meta">Host: <strong>' + pkEscape(r.host) + '</strong> • Bet: <strong>' + r.betAmount + '</strong> • ' + count + '/' + r.maxPlayers + ' pemain</div>' +
        '</div>' +
        '<button class="poker-join-btn" ' + (full ? 'disabled' : '') + '>' + (full ? 'FULL' : 'MASUK') + '</button>';
      const btn = row.querySelector('button');
      if (!btn.disabled) btn.onclick = () => pkJoinRoom(id);
      list.appendChild(row);
    });
  });
}

window.pkOpenCreateModal = function () {
  document.getElementById('createRoomModal').style.display = 'flex';
  document.getElementById('crMsg').textContent = '';
};

window.pkConfirmCreate = async function () {
  const session = getSession();
  if (!session) return;
  const name = document.getElementById('crName').value.trim() || (session.username + "'s Room");
  const bet = parseInt(document.getElementById('crBet').value) || 50;
  const maxP = parseInt(document.getElementById('crMax').value) || 4;
  const coins = getUserCoins(session.username);
  const msg = document.getElementById('crMsg');
  if (bet < 10) { msg.className = 'save-msg error'; msg.textContent = 'Min bet 10'; return; }
  if (bet > coins) { msg.className = 'save-msg error'; msg.textContent = 'Coin kurang! Punya: ' + coins; return; }

  const roomId = 'r_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
  await window.fb.createPokerRoom(roomId, {
    name, host: session.username, betAmount: bet, maxPlayers: maxP,
    status: 'waiting', pot: 0, deck: [], createdAt: Date.now(),
    players: [{
      username: session.username, avatar: getUserAvatar(session.username),
      ready: false, submitted: false,
      hand: [], held: [false,false,false,false,false]
    }],
    result: null
  });
  document.getElementById('createRoomModal').style.display = 'none';
  pkJoinRoom(roomId);
};

async function pkJoinRoom(roomId) {
  const session = getSession();
  if (!session) return;
  pkMe = session.username;
  const room = await window.fb.getPokerRoom(roomId);
  if (!room) { alert('Meja tidak ada'); return; }
  if (room.status !== 'waiting') { alert('Game udah jalan'); return; }

  const existing = room.players.find(p => p.username === pkMe);
  if (!existing) {
    if (room.players.length >= room.maxPlayers) { alert('Meja penuh'); return; }
    if (getUserCoins(pkMe) < room.betAmount) { alert('Coin kurang! Butuh ' + room.betAmount); return; }
    await window.fb.joinPokerRoom(roomId, {
      username: pkMe, avatar: getUserAvatar(pkMe),
      ready: false, submitted: false,
      hand: [], held: [false,false,false,false,false]
    });
  }

  document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
  document.getElementById('pokerRoomScreen').style.display = 'flex';

  if (pkUnsub) pkUnsub();
  pkUnsub = window.fb.listenPokerRoom(roomId, data => {
    if (!data) { pkLeaveRoom(true); return; }
    pkRoom = { id: roomId, ...data };
    pkRender(data);
  });
}

window.pkLeaveRoom = async function (silent) {
  if (!silent && pkRoom && pkMe) {
    if (!confirm('Keluar dari meja?')) return;
    await window.fb.leavePokerRoom(pkRoom.id, pkMe);
  }
  if (pkUnsub) { pkUnsub(); pkUnsub = null; }
  pkRoom = null;
  window.openPokerLobby();
};
// ===== MULTIPLAYER: RENDER ROOM =====
function pkRender(room) {
  document.getElementById('pkRoomName').textContent = room.name;
  document.getElementById('pkRoomBet').textContent = room.betAmount;
  document.getElementById('pkRoomPot').textContent = room.pot || 0;
  document.getElementById('pkRoomStatus').textContent =
    room.status === 'waiting' ? '⏳ Nunggu pemain' :
    room.status === 'playing' ? '🎮 Bermain' : '🏁 Selesai';

  const list = document.getElementById('pkPlayerList');
  list.innerHTML = '';
  (room.players || []).forEach(p => {
    const isMe = p.username === pkMe;
    const div = document.createElement('div');
    div.className = 'room-player' + (isMe ? ' me' : '');
    div.innerHTML =
      '<div class="room-player-avatar">' + (p.avatar || '👤') + '</div>' +
      '<div class="room-player-info">' +
        '<div class="room-player-name">' + pkEscape(p.username) + (isMe ? ' (kamu)' : '') + (p.username === room.host ? ' 👑' : '') + '</div>' +
        '<div class="room-player-status">' + (p.submitted ? '✅ Siap' : p.ready ? '✓ Ready' : 'Menunggu') + '</div>' +
      '</div>';
    list.appendChild(div);
  });

  const me = room.players.find(p => p.username === pkMe);
  const btnReady = document.getElementById('pkBtnReady');
  const btnStart = document.getElementById('pkBtnStart');

  if (room.status === 'waiting') {
    btnReady.style.display = 'block';
    btnReady.textContent = me && me.ready ? '❌ BATAL READY' : '✅ READY';
    btnReady.onclick = async () => {
      await window.fb.updatePokerPlayer(pkRoom.id, pkMe, { ready: !me.ready });
    };
    if (pkMe === room.host) {
      btnStart.style.display = 'block';
      const allReady = room.players.length >= 2 && room.players.every(p => p.ready);
      btnStart.disabled = !allReady;
      btnStart.textContent = allReady ? '🎴 MULAI GAME' : '🎴 MULAI (' + room.players.filter(p=>p.ready).length + '/' + room.players.length + ')';
      btnStart.onclick = () => pkStartGame(pkRoom.id);
    } else {
      btnStart.style.display = 'none';
    }
  } else {
    btnReady.style.display = 'none';
    btnStart.style.display = 'none';
  }

  pkRenderMyHand(room);
  pkRenderOpponents(room);

  if (room.status === 'finished' && room.result) pkShowResult(room);
  else document.getElementById('pkResultArea').style.display = 'none';
}

function pkRenderMyHand(room) {
  const me = room.players.find(p => p.username === pkMe);
  const container = document.getElementById('pkMyHand');
  container.innerHTML = '';
  if (!me || !me.hand || me.hand.length === 0) {
    container.innerHTML = '<p style="color:#888;text-align:center;font-size:12px;">Belum ada kartu</p>';
    document.getElementById('pkMyHandName').textContent = '-';
    document.getElementById('pkBtnSubmit').style.display = 'none';
    return;
  }
  me.hand.forEach((card, i) => {
    const el = document.createElement('div');
    el.className = 'poker-card' + (card.color === 'red' ? ' red' : '') + (me.held[i] ? ' held' : '');
    el.innerHTML = '<div class="card-rank">' + card.rank + '</div><div class="card-suit">' + card.suit + '</div>';
    if (!me.submitted) {
      el.onclick = async () => {
        const nh = [...me.held]; nh[i] = !nh[i];
        await window.fb.updatePokerPlayer(pkRoom.id, pkMe, { held: nh });
      };
    }
    container.appendChild(el);
  });
  document.getElementById('pkMyHandName').textContent = pkEval(me.hand).name;

  const btn = document.getElementById('pkBtnSubmit');
  btn.style.display = 'block';
  if (!me.submitted && me.hand.length > 0) {
    btn.disabled = false;
    btn.textContent = '✅ KUNCI & TUKAR';
    btn.onclick = async () => {
      btn.disabled = true;
      btn.textContent = 'Nunggu pemain lain...';
      await window.fb.updatePokerPlayer(pkRoom.id, pkMe, { submitted: true });
      pkCheckAllSubmitted(pkRoom.id);
    };
  } else {
    btn.disabled = true;
    btn.textContent = '✅ Nunggu yang lain';
  }
}

function pkRenderOpponents(room) {
  const container = document.getElementById('pkOpponentList');
  container.innerHTML = '';
  room.players.forEach(p => {
    if (p.username === pkMe) return;
    const div = document.createElement('div');
    div.className = 'opponent-box';
    div.innerHTML =
      '<div class="opponent-name">' + (p.avatar||'👤') + ' ' + pkEscape(p.username) + (p.submitted ? ' ✅' : '') + '</div>' +
      '<div class="opponent-cards">' +
        ((p.hand || []).length > 0
          ? p.hand.slice(0,5).map(() => '<div class="mini-card"></div>').join('')
          : '<span style="color:#666;font-size:11px;">Belum dikasih</span>') +
      '</div>';
    container.appendChild(div);
  });
}

// ===== MULTIPLAYER: START GAME =====
async function pkStartGame(roomId) {
  const room = await window.fb.getPokerRoom(roomId);
  if (!room) return;
  const deck = pkDeck();
  const players = room.players.map(p => ({
    ...p, hand: deck.splice(0, 5), held: [false,false,false,false,false], submitted: false
  }));
  for (const p of players) await window.fb.deductCoins(p.username, room.betAmount);
  await window.fb.updatePokerRoom(roomId, {
    status: 'playing',
    deck,
    pot: room.betAmount * players.length,
    players,
    result: null
  });
}

async function pkCheckAllSubmitted(roomId) {
  const room = await window.fb.getPokerRoom(roomId);
  if (!room) return;
  if (!room.players.every(p => p.submitted)) return;

  const deck = [...(room.deck || [])];
  const players = room.players.map(p => {
    const nh = p.hand.map((c, i) => (p.held[i] ? c : (deck.pop() || c)));
    return { ...p, hand: nh };
  });

  let best = null, bestEval = null;
  const results = [];
  players.forEach(p => {
    const ev = pkEval(p.hand);
    results.push({ username: p.username, name: ev.name, rank: ev.rank, tb: ev.tb });
    if (!bestEval || ev.rank > bestEval.rank || (ev.rank === bestEval.rank && pkTie(ev.tb, bestEval.tb) > 0)) {
      bestEval = ev; best = p;
    }
  });

  if (best) await window.fb.addCoinsToUser(best.username, room.pot);
  await window.fb.updatePokerRoom(roomId, {
    status: 'finished',
    players,
    deck,
    result: {
      winner: best ? best.username : null,
      handName: bestEval ? bestEval.name : '-',
      results,
      finishedAt: Date.now()
    }
  });
}

function pkShowResult(room) {
  const area = document.getElementById('pkResultArea');
  area.style.display = 'block';
  const won = room.result.winner === pkMe;
  const title = document.getElementById('pkResultTitle');
  title.textContent = won ? '🎉 KAMU MENANG!' : (room.result.winner ? '😢 KALAH — ' + room.result.winner : '🤝 Seri');
  title.className = 'poker-outcome ' + (won ? 'win' : 'lose');

  document.getElementById('pkResultDetail').innerHTML = room.result.results.map(r =>
    '<div class="result-row' + (r.username === room.result.winner ? ' winner' : '') + '">' +
      '<span>' + pkEscape(r.username) + (r.username === pkMe ? ' (kamu)' : '') + '</span>' +
      '<span>' + r.name + '</span>' +
    '</div>'
  ).join('');

  const btnAgain = document.getElementById('pkBtnAgain');
  if (pkMe === room.host) {
    btnAgain.style.display = 'block';
    btnAgain.onclick = async () => {
      const fresh = room.players.map(p => ({
        ...p, ready: false, submitted: false,
        hand: [], held: [false,false,false,false,false]
      }));
      await window.fb.updatePokerRoom(pkRoom.id, {
        status: 'waiting', pot: 0, deck: [], players: fresh, result: null
      });
    };
  } else {
    btnAgain.style.display = 'none';
  }
}
// ============================================
// POKER SINGLE PLAYER (vs Dealer)
// ============================================
let spPlayerHand = [];
let spDealerHand = [];
let spHeld = [false,false,false,false,false];
let spBet = 100;
let spPhase = 'idle';
let spDeck = [];

function spNewDeck() {
  const d = [];
  for (const s of PK_SUITS) for (const r of PK_RANKS) d.push({ rank: r, suit: s.s, color: s.c });
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [d[i],d[j]] = [d[j],d[i]];
  }
  return d;
}

window.spOpenModal = function () {
  const session = getSession();
  if (!session) { alert('Login dulu!'); return; }
  const modal = document.getElementById('spModal');
  if (!modal) { alert('Modal SP belum ada di HTML'); return; }
  document.getElementById('spMsg').textContent = '';
  document.getElementById('spCoins').textContent = getUserCoins(session.username);
  document.getElementById('spSetup').style.display = 'block';
  document.getElementById('spPlaying').style.display = 'none';
  document.getElementById('spResult').style.display = 'none';
  spPhase = 'idle';
  modal.style.display = 'flex';
};

window.spSelectBet = function (amount) {
  spBet = amount;
  document.querySelectorAll('.sp-bet-btn').forEach(b => b.classList.remove('selected'));
  const btn = document.querySelector('.sp-bet-btn[data-bet="' + amount + '"]');
  if (btn) btn.classList.add('selected');
};

window.spStart = async function () {
  const session = getSession();
  if (!session) return;
  const coins = getUserCoins(session.username);
  if (coins < spBet) {
    document.getElementById('spMsg').textContent = '❌ Koin kurang! Butuh ' + spBet;
    return;
  }
  await addUserCoins(session.username, -spBet);

  spDeck = spNewDeck();
  spPlayerHand = [spDeck.pop(), spDeck.pop(), spDeck.pop(), spDeck.pop(), spDeck.pop()];
  spDealerHand = [spDeck.pop(), spDeck.pop(), spDeck.pop(), spDeck.pop(), spDeck.pop()];
  spHeld = [false,false,false,false,false];
  spPhase = 'playing';

  document.getElementById('spSetup').style.display = 'none';
  document.getElementById('spPlaying').style.display = 'block';
  document.getElementById('spResult').style.display = 'none';
  document.getElementById('spCoins').textContent = getUserCoins(session.username);
  document.getElementById('spBetDisplay').textContent = spBet;
  document.getElementById('spPot').textContent = spBet * 2;
  document.getElementById('spBtnDraw').style.display = 'block';
  document.getElementById('spDealerHand').innerHTML = '';
  document.getElementById('spDealerHandName').textContent = '-';

  spRenderPlayerHand();
};

function spRenderPlayerHand() {
  const container = document.getElementById('spPlayerHand');
  container.innerHTML = '';
  spPlayerHand.forEach((card, i) => {
    const el = document.createElement('div');
    el.className = 'poker-card' + (card.color === 'red' ? ' red' : '') + (spHeld[i] ? ' held' : '');
    el.innerHTML = '<div class="card-rank">' + card.rank + '</div><div class="card-suit">' + card.suit + '</div>';
    el.onclick = () => {
      if (spPhase !== 'playing') return;
      spHeld[i] = !spHeld[i];
      el.classList.toggle('held');
    };
    container.appendChild(el);
  });
  document.getElementById('spPlayerHandName').textContent = pkEval(spPlayerHand).name;
}

window.spDraw = async function () {
  if (spPhase !== 'playing') return;
  spPhase = 'result';

  for (let i = 0; i < 5; i++) {
    if (!spHeld[i]) spPlayerHand[i] = spDeck.pop();
  }

  const dvEval = pkEval(spDealerHand);
  if (dvEval.rank <= 2) {
    for (let i = 0; i < 3; i++) spDealerHand[i] = spDeck.pop();
  } else if (dvEval.rank === 3) {
    spDealerHand[0] = spDeck.pop();
  }

  spRenderPlayerHand();

  const dc = document.getElementById('spDealerHand');
  dc.innerHTML = '';
  spDealerHand.forEach(card => {
    const el = document.createElement('div');
    el.className = 'poker-card' + (card.color === 'red' ? ' red' : '');
    el.style.cursor = 'default';
    el.innerHTML = '<div class="card-rank">' + card.rank + '</div><div class="card-suit">' + card.suit + '</div>';
    dc.appendChild(el);
  });
  document.getElementById('spDealerHandName').textContent = pkEval(spDealerHand).name;

  const session = getSession();
  const pEval = pkEval(spPlayerHand);
  const dEval = pkEval(spDealerHand);
  let outcome, outcomeClass, payout;

  if (pEval.rank > dEval.rank) {
    outcome = '🎉 MENANG!'; outcomeClass = 'win'; payout = spBet * 2;
  } else if (pEval.rank < dEval.rank) {
    outcome = '😢 KALAH'; outcomeClass = 'lose'; payout = 0;
  } else {
    let tie = 0;
    for (let i = 0; i < 5; i++) {
      if (pEval.tb[i] > dEval.tb[i]) { tie = 1; break; }
      if (pEval.tb[i] < dEval.tb[i]) { tie = -1; break; }
    }
    if (tie > 0) { outcome = '🎉 MENANG!'; outcomeClass = 'win'; payout = spBet * 2; }
    else if (tie < 0) { outcome = '😢 KALAH'; outcomeClass = 'lose'; payout = 0; }
    else { outcome = '🤝 SERI'; outcomeClass = 'tie'; payout = spBet; }
  }

  if (payout > 0 && session) await addUserCoins(session.username, payout);
  document.getElementById('spCoins').textContent = session ? getUserCoins(session.username) : 0;

  const title = document.getElementById('spResultTitle');
  title.textContent = outcome;
  title.className = 'poker-outcome ' + outcomeClass;
  document.getElementById('spResultInfo').textContent = 'Kamu: ' + pEval.name + '  •  Dealer: ' + dEval.name;
  document.getElementById('spResultPayout').textContent = payout > 0 ? '+' + payout + ' koin' : (payout === 0 ? '-' + spBet + ' koin' : 'Balik modal');
  document.getElementById('spResult').style.display = 'block';
  document.getElementById('spBtnDraw').style.display = 'none';
};

window.spPlayAgain = function () {
  document.getElementById('spBtnDraw').style.display = 'block';
  document.getElementById('spResult').style.display = 'none';
  document.getElementById('spPlaying').style.display = 'none';
  document.getElementById('spSetup').style.display = 'block';
  spPhase = 'idle';
  const session = getSession();
  if (session) document.getElementById('spCoins').textContent = getUserCoins(session.username);
};

window.spClose = function () {
  const modal = document.getElementById('spModal');
  if (modal) modal.style.display = 'none';
  const session = getSession();
  if (session && typeof showMenu === 'function') showMenu(session);
};
// ============================================
// EVENT LISTENER — TOMBOL POKER VS DEALER
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  const btnSP = document.getElementById('btnOpenSinglePlayer');
  if (btnSP) {
    btnSP.addEventListener('click', () => {
      if (typeof window.spOpenModal === 'function') {
        window.spOpenModal();
      } else {
        alert('Fungsi spOpenModal belum ke-load!');
      }
    });
  } else {
    console.warn('⚠️ Tombol btnOpenSinglePlayer tidak ditemukan di HTML');
  }
});

console.log('🃏 poker-mp.js loaded — Multiplayer + Single Player ready');