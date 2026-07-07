(() => {
  const GAME_ID = window.BINGO_GAME_ID || "lille-barcrawl-2026";
  const ADMIN_CODE = window.BINGO_ADMIN_CODE || "LILLE2026";
  const $ = (id) => document.getElementById(id);
  const els = {
    login: $("adminLogin"), code: $("adminCode"), panel: $("adminPanel"), status: $("adminStatus"),
    list: $("adminLeaderboard"), count: $("adminPlayerCount"), reset: $("resetGameBtn"), download: $("downloadScoresBtn"), toast: $("toast")
  };
  let db = null;
  let players = {};

  initFirebase();
  els.login.addEventListener("submit", (e) => {
    e.preventDefault();
    if (els.code.value.trim() !== ADMIN_CODE) return toast("Verkeerde hostcode");
    els.login.classList.add("hidden");
    els.panel.classList.remove("hidden");
    listenPlayers();
  });
  els.reset.addEventListener("click", resetGame);
  els.download.addEventListener("click", downloadScores);

  function initFirebase() {
    const config = window.firebaseConfig || {};
    const hasConfig = config.apiKey && !String(config.apiKey).includes("VUL_HIER_IN") && config.databaseURL && !String(config.databaseURL).includes("VUL_HIER_IN");
    if (!hasConfig || !window.firebase?.apps) {
      els.status.textContent = "Firebase-config ontbreekt nog.";
      return;
    }
    try {
      if (!firebase.apps.length) firebase.initializeApp(config);
      db = firebase.database();
      els.status.textContent = "Verbonden met Firebase ✅";
    } catch (err) {
      console.error(err);
      els.status.textContent = "Firebase kon niet verbinden.";
    }
  }

  function listenPlayers() {
    if (!db) return toast("Firebase is nog niet gekoppeld.");
    db.ref(`games/${GAME_ID}/players`).on("value", (snap) => {
      players = snap.val() || {};
      render();
    });
  }

  function render() {
    const list = Object.values(players).sort(sortPlayers);
    els.count.textContent = `${list.length} speler${list.length === 1 ? "" : "s"}`;
    els.list.innerHTML = list.map((p, i) => {
      const medal = ["🥇", "🥈", "🥉"][i] || `#${i + 1}`;
      return `<li><span class="rank">${medal}</span><div><div class="player-name">${escapeHtml(p.name || "Speler")}</div><div class="progress-line">${p.score || 0}/25 · ${p.bingoCount || 0} bingo · ${new Date(p.updatedAt || Date.now()).toLocaleTimeString("nl-NL", {hour:"2-digit", minute:"2-digit"})}</div></div><span class="score-badge">${p.percent || 0}%</span></li>`;
    }).join("") || `<li><span class="rank">🍻</span><div><div class="player-name">Nog geen spelers</div><div class="progress-line">Wacht tot iemand start.</div></div><span class="score-badge">0%</span></li>`;
  }

  function resetGame() {
    if (!db) return toast("Firebase is nog niet gekoppeld.");
    if (!confirm("Weet je zeker dat je het hele spel wilt resetten voor iedereen?")) return;
    const resetAt = Date.now();
    db.ref(`games/${GAME_ID}`).update({ players: null, settings: { resetAt } })
      .then(() => toast("Spel gereset 🔄"))
      .catch(() => toast("Resetten is mislukt. Check Firebase regels."));
  }

  function downloadScores() {
    const list = Object.values(players).sort(sortPlayers);
    const header = ["plaats", "naam", "score", "percentage", "bingos", "volle_kaart", "laatst_bijgewerkt"];
    const rows = list.map((p, i) => [i + 1, p.name, p.score || 0, p.percent || 0, p.bingoCount || 0, p.fullCard ? "ja" : "nee", new Date(p.updatedAt || Date.now()).toISOString()]);
    const csv = [header, ...rows].map(row => row.map(cell => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "lille-bingo-scores.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function sortPlayers(a, b) {
    return (b.bingoCount || 0) - (a.bingoCount || 0) || (b.score || 0) - (a.score || 0) || (a.updatedAt || 0) - (b.updatedAt || 0);
  }
  function toast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => els.toast.classList.remove("show"), 2400);
  }
  function escapeHtml(str) {
    return String(str).replace(/[&<>'"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[c]));
  }
})();
