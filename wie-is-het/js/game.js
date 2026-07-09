(function(){
  const $ = (id) => document.getElementById(id);
  const cfg = window.firebaseConfig || {};
  const firebaseReady = cfg && cfg.apiKey && cfg.apiKey !== 'VUL_HIER_IN' && cfg.databaseURL && cfg.databaseURL !== 'VUL_HIER_IN';
  if (!firebaseReady && $('firebaseWarning')) $('firebaseWarning').classList.remove('hidden');

  let db = null;
  if (firebaseReady) { firebase.initializeApp(cfg); db = firebase.database(); }

  const gameId = window.WIE_IS_HET_GAME_ID || 'wie-is-het-2026';
  const ROUND_SECONDS = Number(window.WIE_IS_HET_ROUND_SECONDS || 30);
  const base = db ? db.ref('games/' + gameId) : null;
  const questions = window.WIE_IS_HET_QUESTIONS || [{ type: 'most', prompt: 'Wie is het?' }];
  const players = window.WIE_IS_HET_PLAYERS || [];
  const adminCode = window.WIE_IS_HET_ADMIN_CODE || 'LILLE2026';

  let teamId = localStorage.getItem('wieIsHetTeamId') || ('team_' + Math.random().toString(36).slice(2, 10));
  localStorage.setItem('wieIsHetTeamId', teamId);

  let state = { round: -1, status: 'waiting', startedAt: null, duration: ROUND_SECONDS };
  let teams = {};
  let rounds = {};
  let selectedBet = 1;
  let selectedAnswer = null;
  let lastRound = null;
  let finalizeBusy = false;
  let hostUnlocked = localStorage.getItem('wieIsHetHostUnlocked') === '1';

  const esc = (s) => String(s || '').replace(/[&<>'"]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[m]));
  const norm = (s) => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const hash = (s) => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };

  function makeOrder() {
    const arr = questions.map((_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function normalizeOrder(order) {
    if (Array.isArray(order)) return order.map(Number).filter(n => Number.isInteger(n) && n >= 0 && n < questions.length);
    if (order && typeof order === 'object') {
      return Object.keys(order).sort((a, b) => Number(a) - Number(b)).map(k => Number(order[k])).filter(n => Number.isInteger(n) && n >= 0 && n < questions.length);
    }
    return null;
  }

  function validOrder(order) {
    const o = normalizeOrder(order);
    return o && o.length === questions.length ? o : null;
  }

  function qIndexFor(roundNo, st = state, roundData = null) {
    if (roundData && roundData.questionIndex !== undefined && roundData.questionIndex !== null) {
      const saved = Number(roundData.questionIndex);
      if (Number.isInteger(saved) && saved >= 0 && saved < questions.length) return saved;
    }
    const order = validOrder(st && st.order);
    if (order) return order[((roundNo || 0) % order.length + order.length) % order.length];
    return ((roundNo || 0) % questions.length + questions.length) % questions.length;
  }

  function qFor(roundNo, st = state, roundData = null) {
    return questions[qIndexFor(roundNo, st, roundData)] || questions[0] || { type: 'most', prompt: 'Vraag' };
  }

  function typeLabel(q) { return q.type === 'quote' ? 'Wie zei deze quote?' : q.type === 'truth' ? 'Waar of leugen?' : q.type === 'person' ? 'Foxwild-feit' : 'Most likely'; }
  function typeClass(q) { return q.type === 'quote' ? 'quote' : q.type === 'truth' ? 'truth' : q.type === 'person' ? 'person' : 'most'; }
  function helpFor(q) {
    if (q.type === 'quote') return 'Raad wie deze quote ooit heeft gezegd. Let op: soms is het antwoord “Dit is nooit gezegd”.';
    if (q.type === 'truth') return 'Kies of dit echt uit de groep komt, of gewoon klinkt alsof het had kunnen gebeuren.';
    if (q.type === 'person') return 'Een korte vraag over de groep. Eén antwoord is goed.';
    return 'Kies wie volgens jullie door de meeste auto’s gekozen wordt.';
  }
  function getRound(roundNo = state.round) { return rounds[String(roundNo)] || rounds[roundNo] || {}; }
  function answersObj() { return (getRound().answers) || {}; }
  function timeLeft() { if (state.status !== 'active' || !state.startedAt) return null; const end = Number(state.startedAt) + Number(state.duration || ROUND_SECONDS) * 1000; return Math.max(0, Math.ceil((end - Date.now()) / 1000)); }
  function format(sec) { if (sec === null) return '--:--'; const m = Math.floor(sec / 60), s = String(sec % 60).padStart(2, '0'); return `${m}:${s}`; }
  function currentStatus() { if (state.status === 'active') return timeLeft() === 0 ? 'Tijd voorbij' : 'Open'; if (state.status === 'revealed') return 'Onthuld'; return 'Wachten'; }

  function optionsFor(q) {
    if (q.options) return q.options;
    if (q.type === 'truth') return ['Waar', 'Leugen'];
    if (q.type === 'quote' || q.type === 'person') {
      const answer = q.answer;
      const pool = players.filter(p => norm(p) !== norm(answer));
      let seed = hash(q.prompt + q.answer);
      const picks = [];
      while (pool.length && picks.length < 3) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        const idx = seed % pool.length;
        picks.push(pool.splice(idx, 1)[0]);
      }
      const arr = [answer, ...picks];
      for (let i = arr.length - 1; i > 0; i--) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        const j = seed % (i + 1);
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }
    return players;
  }

  function renderOptions() {
    const q = state.round >= 0 ? qFor(state.round, state, getRound()) : { type: 'most' };
    selectedAnswer = null;
    $('customWrap').classList.add('hidden');
    $('customAnswer').value = '';
    let opts = optionsFor(q);
    if (q.type === 'most') opts = [...opts, 'Andere naam'];
    $('options').innerHTML = opts.map(o => `<button type="button" class="option" data-answer="${esc(o)}">${esc(o)}</button>`).join('');
    document.querySelectorAll('[data-answer]').forEach(btn => btn.onclick = () => {
      document.querySelectorAll('[data-answer]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedAnswer = btn.dataset.answer;
      $('customWrap').classList.toggle('hidden', selectedAnswer !== 'Andere naam');
      if (selectedAnswer === 'Andere naam') $('customAnswer').focus();
    });
  }

  function showGame(name) { $('setup').classList.add('hidden'); $('game').classList.remove('hidden'); $('teamTitle').textContent = name; renderHostControls(); }

  function renderRound() {
    const active = state.status === 'active', revealed = state.status === 'revealed', waiting = !active && !revealed;
    const q = state.round >= 0 ? qFor(state.round, state, getRound()) : { type: 'most', prompt: 'Wacht tot iemand de eerste ronde start...' };
    $('roundLabel').textContent = state.round >= 0 ? 'Ronde ' + (state.round + 1) : 'Nog niet gestart';
    $('categoryBadge').textContent = state.round >= 0 ? typeLabel(q) : 'Wachten';
    $('categoryBadge').className = 'category ' + typeClass(q);
    $('questionText').textContent = q.prompt;
    $('roundHelp').textContent = state.round >= 0 ? helpFor(q) : 'Iedere auto kan de eerste ronde starten.';
    $('statusText').textContent = currentStatus();
    $('startRoundBtn').classList.toggle('hidden', active);
    $('startRoundBtn').textContent = state.round < 0 ? `Start eerste ronde · ${ROUND_SECONDS} sec` : `Start volgende ronde · ${ROUND_SECONDS} sec`;
    $('answerCard').classList.toggle('hidden', waiting || revealed);
    $('answerCard').classList.toggle('disabled', !active || timeLeft() === 0);
    $('submitBtn').disabled = !active || timeLeft() === 0;
    $('answerLabel').textContent = q.type === 'most' ? 'Wie is het meest likely?' : 'Kies jullie antwoord';
    $('closed').classList.toggle('hidden', !(active && timeLeft() === 0));
    if (lastRound !== state.round) {
      lastRound = state.round;
      selectedBet = 1;
      selectedAnswer = null;
      $('submitted').classList.add('hidden');
      document.querySelectorAll('.bet').forEach(b => b.classList.toggle('active', b.dataset.bet === '1'));
      renderOptions();
    }
    const mine = teams[teamId] || {};
    $('myScore').textContent = mine.score || 0;
    updateTimer();
    renderHostControls();
  }

  function updateTimer() {
    const left = timeLeft();
    $('timer').textContent = format(left);
    $('timer').classList.toggle('low', left !== null && left <= 10 && left > 0);
    if (state.status === 'active' && left === 0 && !finalizeBusy) finalizeRound(state.round);
  }

  function renderAnswers() {
    const answers = answersObj();
    const arr = Object.values(answers || {}).sort((a, b) => (a.at || 0) - (b.at || 0));
    $('submitCount').textContent = arr.length;
    if (!arr.length) { $('answersList').innerHTML = '<p class="help">Nog geen antwoorden.</p>'; $('resultSummary').classList.add('hidden'); return; }
    const revealed = state.status === 'revealed';
    const round = getRound();
    if (revealed && round.summary) { $('resultSummary').classList.remove('hidden'); $('resultSummary').innerHTML = esc(round.summary); } else { $('resultSummary').classList.add('hidden'); }
    $('answersList').innerHTML = arr.map(a => {
      const result = ((round.results || {})[a.teamId]) || null;
      const resultHtml = revealed && result ? `<div class="meta ${result.delta > 0 ? 'result-good' : result.delta < 0 ? 'result-bad' : 'result-neutral'}">${result.delta > 0 ? '+' : ''}${result.delta} punten · ${esc(result.label || '')}</div>` : '';
      return `<div class="answer"><b>${esc(a.teamName)}</b>${revealed ? `<div>koos <b>${esc(a.answer)}</b> · inzet ${esc(a.bet)}</div>${resultHtml}` : '<div class="meta">Heeft antwoord vastgezet ✅</div>'}</div>`;
    }).join('');
    renderHostControls();
  }

  function renderLeaderboard() {
    const arr = Object.values(teams || {}).sort((a, b) => (b.score || 0) - (a.score || 0));
    $('leaderboard').innerHTML = arr.length ? arr.map((t, i) => `<div class="score ${i === 0 ? 'winner' : ''}"><b>${i + 1}. ${esc(t.name)}</b><div class="meta">${t.score || 0} punten${t.players ? ' · ' + esc(t.players) : ''}</div></div>`).join('') : '<p class="help">Nog geen teams.</p>';
    const mine = teams[teamId] || {};
    $('myScore').textContent = mine.score || 0;
    renderHostControls();
  }

  function renderHostControls() {
    const unlockBtn = $('hostUnlockBtn');
    const panel = $('hostMini');
    const actionBtn = $('hostActionBtn');
    const help = $('hostMiniHelp');
    if (!unlockBtn || !panel || !actionBtn || !help) return;
    unlockBtn.classList.toggle('hidden', hostUnlocked);
    panel.classList.toggle('hidden', !hostUnlocked);
    if (!hostUnlocked) return;
    const total = Object.keys(teams || {}).length;
    const answered = Object.keys(answersObj() || {}).length;
    if (state.status === 'active') {
      actionBtn.textContent = `⏭ Onthul nu (${answered}/${total})`;
      help.textContent = total > 0 && answered >= total ? 'Iedereen heeft geantwoord. Je kunt de timer overslaan en meteen onthullen.' : 'Gebruik dit alleen als je ziet dat alle auto’s klaar zijn, of als je de ronde sneller wilt afsluiten.';
    } else if (state.status === 'revealed') {
      actionBtn.textContent = '▶ Start volgende ronde';
      help.textContent = 'De uitslag is zichtbaar. Start de volgende ronde wanneer jullie door willen.';
    } else {
      actionBtn.textContent = '▶ Start eerste ronde';
      help.textContent = 'Start het spel zodra alle auto’s klaarstaan.';
    }
  }

  async function startNextRound() {
    if (!firebaseReady) return alert('Firebase is nog niet gekoppeld.');
    const freshOrder = makeOrder();
    const ref = base.child('state');
    ref.transaction(s => {
      s = s || { round: -1, status: 'waiting' };
      if (s.status === 'active') return;
      const order = validOrder(s.order) ? normalizeOrder(s.order) : freshOrder;
      const next = (typeof s.round === 'number' && s.round >= 0 && s.status !== 'waiting') ? s.round + 1 : 0;
      return { ...s, order, round: next, status: 'active', startedAt: Date.now(), duration: ROUND_SECONDS };
    }, async (err, committed, snap) => {
      if (err) return alert('Starten lukte niet: ' + err.message);
      if (committed && snap && snap.val()) {
        const s = snap.val();
        const qi = qIndexFor(s.round, s, null);
        await base.child('rounds/' + s.round).update({ questionIndex: qi, startedAt: s.startedAt, type: questions[qi]?.type || 'most' });
      }
    });
  }

  async function finalizeRound(roundNo) {
    if (!firebaseReady || roundNo < 0) return;
    finalizeBusy = true;
    const lockRef = base.child('rounds/' + roundNo + '/scoreLock');
    lockRef.transaction(v => v ? undefined : teamId, async (err, committed) => {
      if (err || !committed) { finalizeBusy = false; return; }
      try { await calculateAndReveal(roundNo); } finally { finalizeBusy = false; }
    });
  }

  async function calculateAndReveal(roundNo) {
    const snap = await base.once('value');
    const data = snap.val() || {};
    const round = ((data.rounds || {})[roundNo]) || {};
    if (round.scoredAt) { await base.child('state').update({ status: 'revealed' }); return; }
    const q = qFor(roundNo, data.state || state, round);
    const answers = Object.values((round.answers) || {});
    const updates = {};
    if (!answers.length) {
      updates['rounds/' + roundNo + '/summary'] = 'Geen antwoorden deze ronde.';
      updates['rounds/' + roundNo + '/scoredAt'] = Date.now();
      updates['state/status'] = 'revealed';
      await base.update(updates);
      return;
    }
    const currentTeams = data.teams || {};
    let summary = '';
    if (q.type === 'most') {
      const counts = {}, display = {};
      answers.forEach(a => { counts[a.answerKey] = (counts[a.answerKey] || 0) + 1; display[a.answerKey] = display[a.answerKey] || a.answer; });
      const max = Math.max(...Object.values(counts));
      const top = Object.keys(counts).filter(k => counts[k] === max);
      const unique = top.length === 1 && max > 1;
      const allSame = unique && max === answers.length && answers.length > 1;
      summary = allSame ? `Iedereen koos ${display[top[0]]}. Te makkelijk: iedereen krijgt +1.` : unique ? `Meerderheid: ${display[top[0]]} (${max} auto's).` : 'Geen duidelijke meerderheid. Deze ronde blijft puntloos.';
      answers.forEach(a => {
        let delta = 0, label = '';
        if (allSame) { delta = 1; label = 'iedereen hetzelfde'; }
        else if (unique && a.answerKey === top[0]) { delta = Number(a.bet || 1); label = 'meerderheid goed'; }
        else if (unique) { delta = -Number(a.bet || 1); label = 'naast de meerderheid'; }
        else { delta = 0; label = 'gelijke stand'; }
        updates['teams/' + a.teamId + '/score'] = (currentTeams[a.teamId]?.score || 0) + delta;
        updates['rounds/' + roundNo + '/results/' + a.teamId] = { delta, label };
      });
    } else {
      const correctKey = norm(q.answer);
      summary = (q.type === 'quote' && q.answer === 'Dit is nooit gezegd' ? 'Deze quote is nooit gezegd.' : q.type === 'quote' ? `De quote was van ${q.answer}.` : q.type === 'truth' ? `Het was: ${q.answer}.` : `Goede antwoord: ${q.answer}.`) + (q.explain ? ' ' + q.explain : '');
      answers.forEach(a => {
        const good = a.answerKey === correctKey;
        const delta = good ? Number(a.bet || 1) : -Number(a.bet || 1);
        const label = good ? 'goed' : 'fout';
        updates['teams/' + a.teamId + '/score'] = (currentTeams[a.teamId]?.score || 0) + delta;
        updates['rounds/' + roundNo + '/results/' + a.teamId] = { delta, label };
      });
    }
    updates['rounds/' + roundNo + '/summary'] = summary;
    updates['rounds/' + roundNo + '/scoredAt'] = Date.now();
    updates['state/status'] = 'revealed';
    await base.update(updates);
  }

  document.querySelectorAll('.bet').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.bet').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedBet = Number(btn.dataset.bet);
  }));

  $('joinBtn').addEventListener('click', async () => {
    const name = $('teamName').value.trim();
    if (!name) return alert('Vul een teamnaam in.');
    const playersText = $('carPlayers').value.trim();
    if (firebaseReady) await base.child('teams/' + teamId).update({ name, players: playersText, score: 0, joinedAt: firebase.database.ServerValue.TIMESTAMP });
    localStorage.setItem('wieIsHetTeamName', name);
    localStorage.setItem('wieIsHetPlayers', playersText);
    showGame(name);
  });

  $('submitBtn').addEventListener('click', async () => {
    if (!firebaseReady) return alert('Firebase is nog niet gekoppeld.');
    if (state.status !== 'active' || timeLeft() === 0) return;
    let ans = selectedAnswer;
    if (ans === 'Andere naam') ans = $('customAnswer').value.trim();
    if (!ans) return alert('Kies een antwoord.');
    const team = teams[teamId] || { name: localStorage.getItem('wieIsHetTeamName') || 'Onbekend' };
    await base.child('rounds/' + state.round + '/answers/' + teamId).set({ teamId, teamName: team.name, answer: ans, answerKey: norm(ans), bet: selectedBet, at: firebase.database.ServerValue.TIMESTAMP });
    $('submitted').classList.remove('hidden');
  });

  $('startRoundBtn').addEventListener('click', startNextRound);
  $('scoreBtn').onclick = () => $('leaderboardPanel').classList.remove('hidden');
  $('closeScore').onclick = () => $('leaderboardPanel').classList.add('hidden');
  $('helpBtn').onclick = () => $('helpPanel').classList.remove('hidden');
  $('closeHelp').onclick = () => $('helpPanel').classList.add('hidden');

  if ($('hostUnlockBtn')) $('hostUnlockBtn').onclick = () => $('hostCodePanel').classList.remove('hidden');
  if ($('closeHostCode')) $('closeHostCode').onclick = () => $('hostCodePanel').classList.add('hidden');
  if ($('hostCodeBtn')) $('hostCodeBtn').onclick = () => {
    if ($('hostCodeInput').value.trim() !== adminCode) return alert('Verkeerde hostcode');
    hostUnlocked = true;
    localStorage.setItem('wieIsHetHostUnlocked', '1');
    $('hostCodePanel').classList.add('hidden');
    renderHostControls();
  };
  if ($('lockHostBtn')) $('lockHostBtn').onclick = () => {
    hostUnlocked = false;
    localStorage.removeItem('wieIsHetHostUnlocked');
    renderHostControls();
  };
  if ($('hostActionBtn')) $('hostActionBtn').onclick = async () => {
    if (state.status === 'active') await finalizeRound(state.round);
    else await startNextRound();
  };

  const savedName = localStorage.getItem('wieIsHetTeamName');
  if (savedName) { $('teamName').value = savedName; $('carPlayers').value = localStorage.getItem('wieIsHetPlayers') || ''; showGame(savedName); }
  renderHostControls();

  if (firebaseReady) {
    base.child('state').on('value', s => { state = s.val() || { round: -1, status: 'waiting', startedAt: null, duration: ROUND_SECONDS }; renderRound(); renderAnswers(); });
    base.child('teams').on('value', s => { teams = s.val() || {}; renderLeaderboard(); renderRound(); });
    base.child('rounds').on('value', s => { rounds = s.val() || {}; renderRound(); renderAnswers(); });
    setInterval(() => { renderRound(); renderAnswers(); }, 500);
  } else {
    renderRound();
  }
})();
