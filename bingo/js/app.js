(() => {
  const GAME_ID = window.BINGO_GAME_ID || "lille-barcrawl-2026";
  const TASKS = window.BINGO_TASKS || [];
  const FREE_TEXT = "🍺 CHEERS!";
  const STORAGE_KEY = `lille-bingo:${GAME_ID}`;
  const COLORS = ["#ff2daa", "#ff9f1c", "#7c3cff", "#21d17a", "#00c2ff"];

  const $ = (id) => document.getElementById(id);
  const state = loadState();
  let db = null;
  let players = {};
  let lastBingoCount = 0;

  const els = {
    welcome: $("welcome"), game: $("game"), joinForm: $("joinForm"), playerName: $("playerName"),
    helloName: $("helloName"), board: $("bingoBoard"), scoreCount: $("scoreCount"), bingoCount: $("bingoCount"),
    rankText: $("rankText"), leaderboard: $("leaderboard"), playerCount: $("playerCount"), toast: $("toast"),
    connectionStatus: $("connectionStatus"), shareBtn: $("shareBtn"), newCardBtn: $("newCardBtn"), resetMineBtn: $("resetMineBtn"), confetti: $("confetti")
  };

  init();

  function init() {
    initFirebase();
    if (state.name) showGame();
    els.joinForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = els.playerName.value.trim();
      if (!name) return;
      state.name = name;
      if (!state.playerId) state.playerId = cryptoRandomId();
      if (!state.seed) state.seed = cryptoRandomId();
      ensureCard();
      saveState();
      showGame();
    });
    els.shareBtn.addEventListener("click", shareGame);
    els.newCardBtn.addEventListener("click", () => {
      if (!confirm("Nieuwe kaart maken? Je huidige voortgang wordt gereset.")) return;
      state.seed = cryptoRandomId();
      state.marked = { 12: true };
      state.card = makeCard(state.seed);
      saveState();
      renderAll();
      syncPlayer();
      toast("Nieuwe kaart gemaakt 🎲");
    });
    els.resetMineBtn.addEventListener("click", () => {
      if (!confirm("Alleen jouw kaart resetten?")) return;
      state.marked = { 12: true };
      saveState();
      renderAll();
      syncPlayer();
    });
  }

  function initFirebase() {
    const config = window.firebaseConfig || {};
    const hasConfig = config.apiKey && !String(config.apiKey).includes("VUL_HIER_IN") && config.databaseURL && !String(config.databaseURL).includes("VUL_HIER_IN");
    if (!hasConfig || !window.firebase?.apps) {
      els.connectionStatus.textContent = "Offline modus: Firebase-config ontbreekt nog.";
      return;
    }
    try {
      if (!firebase.apps.length) firebase.initializeApp(config);
      db = firebase.database();
      els.connectionStatus.textContent = "Live-scorebord verbonden ✅";
      const playersRef = db.ref(`games/${GAME_ID}/players`);
      playersRef.on("value", (snap) => {
        players = snap.val() || {};
        renderLeaderboard();
        renderRank();
      });
      db.ref(`games/${GAME_ID}/settings/resetAt`).on("value", (snap) => {
        const resetAt = Number(snap.val() || 0);
        if (resetAt && resetAt > (state.lastResetAt || 0)) {
          state.marked = { 12: true };
          state.lastResetAt = resetAt;
          saveState();
          renderAll();
          syncPlayer();
          toast("De host heeft het spel gereset 🔄");
        }
      });
    } catch (err) {
      console.error(err);
      els.connectionStatus.textContent = "Firebase kon niet verbinden. Check firebase-config.js.";
    }
  }

  function showGame() {
    els.welcome.classList.remove("screen--active");
    els.game.classList.add("screen--active");
    els.helloName.textContent = `Hoi ${state.name} 👋`;
    ensureCard();
    saveState();
    renderAll();
    syncPlayer();
  }

  function ensureCard() {
    if (!state.playerId) state.playerId = cryptoRandomId();
    if (!state.seed) state.seed = `${state.playerId}:${Date.now()}`;
    if (!state.marked) state.marked = { 12: true };
    if (!state.marked[12]) state.marked[12] = true;
    if (!Array.isArray(state.card) || state.card.length !== 25) state.card = makeCard(state.seed);
  }

  function makeCard(seed) {
    const available = TASKS.slice();
    const shuffled = seededShuffle(available, hashString(seed));
    const selected = shuffled.slice(0, 24);
    selected.splice(12, 0, FREE_TEXT);
    return selected;
  }

  function renderAll() {
    renderBoard();
    renderStats();
    renderLeaderboard();
    renderRank();
  }

  function renderBoard() {
    els.board.innerHTML = "";
    state.card.forEach((task, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `tile ${state.marked[idx] ? "done" : ""} ${idx === 12 ? "free" : ""}`;
      btn.textContent = task;
      btn.setAttribute("aria-pressed", state.marked[idx] ? "true" : "false");
      btn.addEventListener("click", () => {
        if (idx === 12) return;
        const before = countBingos(state.marked).count;
        state.marked[idx] = !state.marked[idx];
        saveState();
        renderAll();
        syncPlayer();
        const after = countBingos(state.marked).count;
        if (after > before && after > lastBingoCount) {
          lastBingoCount = after;
          toast("BINGO! 🎉");
          fireConfetti();
        }
      });
      els.board.appendChild(btn);
    });
  }

  function renderStats() {
    const score = getScore();
    const bingo = countBingos(state.marked).count;
    lastBingoCount = Math.max(lastBingoCount, bingo);
    els.scoreCount.textContent = `${score}/25`;
    els.bingoCount.textContent = String(bingo);
  }

  function renderLeaderboard() {
    let list = Object.values(players);
    if (!list.some(p => p.playerId === state.playerId) && state.name) list.push(getPlayerPayload());
    list = list.sort(sortPlayers);
    els.playerCount.textContent = `${list.length} speler${list.length === 1 ? "" : "s"}`;
    els.leaderboard.innerHTML = list.map((p, i) => playerRow(p, i)).join("") || `<li><span class="rank">🍻</span><div><div class="player-name">Nog geen spelers</div><div class="progress-line">Start de bingo om te verschijnen.</div></div><span class="score-badge">0</span></li>`;
  }

  function renderRank() {
    let list = Object.values(players);
    if (!list.some(p => p.playerId === state.playerId) && state.name) list.push(getPlayerPayload());
    list = list.sort(sortPlayers);
    const rank = list.findIndex(p => p.playerId === state.playerId) + 1;
    els.rankText.textContent = rank ? `#${rank}` : "–";
  }

  function playerRow(p, i) {
    const medal = ["🥇", "🥈", "🥉"][i] || `#${i + 1}`;
    const bingoText = p.fullCard ? "Volle kaart" : (p.bingoCount ? `${p.bingoCount} bingo` : "geen bingo");
    return `<li><span class="rank">${medal}</span><div><div class="player-name">${escapeHtml(p.name || "Speler")}</div><div class="progress-line">${p.score || 0}/25 · ${bingoText}</div></div><span class="score-badge">${p.percent || 0}%</span></li>`;
  }

  function syncPlayer() {
    if (!db || !state.name) return;
    db.ref(`games/${GAME_ID}/players/${state.playerId}`).set(getPlayerPayload()).catch((err) => {
      console.error(err);
      toast("Scorebord opslaan lukt niet. Check Firebase regels.");
    });
  }

  function getPlayerPayload() {
    const score = getScore();
    const bingo = countBingos(state.marked);
    return {
      playerId: state.playerId,
      name: state.name,
      score,
      percent: Math.round((score / 25) * 100),
      bingoCount: bingo.count,
      fullCard: score === 25,
      updatedAt: Date.now()
    };
  }

  function getScore() { return Object.values(state.marked || {}).filter(Boolean).length; }

  function countBingos(marked) {
    const lines = [];
    for (let r = 0; r < 5; r++) lines.push([0,1,2,3,4].map(c => r * 5 + c));
    for (let c = 0; c < 5; c++) lines.push([0,1,2,3,4].map(r => r * 5 + c));
    lines.push([0,6,12,18,24], [4,8,12,16,20]);
    const won = lines.filter(line => line.every(i => marked[i]));
    return { count: won.length, lines: won };
  }

  function sortPlayers(a, b) {
    return (b.bingoCount || 0) - (a.bingoCount || 0) || (b.score || 0) - (a.score || 0) || (a.updatedAt || 0) - (b.updatedAt || 0);
  }

  async function shareGame() {
    const text = "Doe mee met Lille Bar Crawl Bingo 🍻";
    if (navigator.share) {
      try { await navigator.share({ title: "Lille Bar Crawl Bingo", text, url: location.href }); return; } catch (_) {}
    }
    await navigator.clipboard?.writeText(location.href);
    toast("Link gekopieerd 📋");
  }

  function fireConfetti() {
    const wrap = els.confetti;
    for (let i = 0; i < 70; i++) {
      const bit = document.createElement("i");
      bit.style.left = `${Math.random() * 100}vw`;
      bit.style.background = COLORS[i % COLORS.length];
      bit.style.animationDelay = `${Math.random() * 0.28}s`;
      bit.style.transform = `rotate(${Math.random() * 360}deg)`;
      wrap.appendChild(bit);
      setTimeout(() => bit.remove(), 2200);
    }
  }

  function toast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => els.toast.classList.remove("show"), 2400);
  }

  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
  }
  function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

  function seededShuffle(arr, seed) {
    const out = arr.slice();
    let s = seed || 1;
    for (let i = out.length - 1; i > 0; i--) {
      s = (s * 1664525 + 1013904223) >>> 0;
      const j = s % (i + 1);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
  function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function cryptoRandomId() {
    if (crypto?.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
  function escapeHtml(str) {
    return String(str).replace(/[&<>'"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[c]));
  }
})();
