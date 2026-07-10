(function(){
  const $ = (id) => document.getElementById(id);
  const cfg = window.firebaseConfig || {};
  const ready = cfg && cfg.apiKey && cfg.apiKey !== 'VUL_HIER_IN' && cfg.databaseURL && cfg.databaseURL !== 'VUL_HIER_IN';
  if (!ready) alert('Firebase is nog niet gekoppeld. Vul js/firebase-config.js in.');
  firebase.initializeApp(cfg);
  const db = firebase.database();
  const gameId = window.WIE_IS_HET_GAME_ID || 'wie-is-het-2026';
  const ROUND_SECONDS = Number(window.WIE_IS_HET_ROUND_SECONDS || 30);
  const base = db.ref('games/' + gameId);
  const questions = window.WIE_IS_HET_QUESTIONS || [{ type: 'most', prompt: 'Vraag' }];
  let state = { round: -1, status: 'waiting', startedAt: null, duration: ROUND_SECONDS };
  let teams = {};
  let rounds = {};
  let revealBusy = false;

  const esc = (s) => String(s || '').replace(/[&<>'"]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[m]));
  const norm = (s) => {
    const cleaned = String(s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
    if (['wouter', 'chandler', 'wouter chandler', 'chandler wouter'].includes(cleaned)) return 'wouter chandler';
    return cleaned;
  };
  const format = (sec) => { if (sec === null) return '--:--'; const m = Math.floor(sec / 60), s = String(sec % 60).padStart(2, '0'); return `${m}:${s}`; };

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
    if (order && typeof order === 'object') return Object.keys(order).sort((a, b) => Number(a) - Number(b)).map(k => Number(order[k])).filter(n => Number.isInteger(n) && n >= 0 && n < questions.length);
    return null;
  }
  function validOrder(order) { const o = normalizeOrder(order); return o && o.length === questions.length ? o : null; }
  function getRound(roundNo = state.round) { return rounds[String(roundNo)] || rounds[roundNo] || {}; }
  function qIndexFor(roundNo, st = state, roundData = null) {
    if (roundData && roundData.questionIndex !== undefined && roundData.questionIndex !== null) {
      const saved = Number(roundData.questionIndex);
      if (Number.isInteger(saved) && saved >= 0 && saved < questions.length) return saved;
    }
    const order = validOrder(st && st.order);
    if (order) return order[((roundNo || 0) % order.length + order.length) % order.length];
    return ((roundNo || 0) % questions.length + questions.length) % questions.length;
  }
  function qFor(roundNo, st = state, roundData = null) { return questions[qIndexFor(roundNo, st, roundData)] || questions[0] || { type: 'most', prompt: 'Vraag' }; }
  function typeLabel(q) { return q.type === 'quote' ? 'Wie zei deze quote?' : q.type === 'truth' ? 'Waar of leugen?' : q.type === 'person' ? 'Foxwild-feit' : 'Most likely'; }
  function typeClass(q) { return q.type === 'quote' ? 'quote' : q.type === 'truth' ? 'truth' : q.type === 'person' ? 'person' : 'most'; }
  function timeLeft() {
    if (state.status === 'paused') return Number(state.pausedRemaining || state.duration || ROUND_SECONDS);
    if (state.status !== 'active' || !state.startedAt) return null;
    const end = Number(state.startedAt) + Number(state.duration || ROUND_SECONDS) * 1000;
    return Math.max(0, Math.ceil((end - Date.now()) / 1000));
  }
  function currentStatus() { if (state.status === 'active') return timeLeft() === 0 ? 'Tijd voorbij' : 'Open'; if (state.status === 'paused') return 'Gepauzeerd'; if (state.status === 'stopped') return 'Gestopt'; if (state.status === 'revealed') return 'Onthuld'; return 'Wachten'; }

  function render() {
    const q = state.round >= 0 ? qFor(state.round, state, getRound()) : { type: 'most', prompt: 'Nog niet gestart.' };
    $('hostRoundLabel').textContent = state.round >= 0 ? 'Ronde ' + (state.round + 1) : 'Nog niet gestart';
    $('hostCategory').textContent = state.round >= 0 ? typeLabel(q) : 'Wachten';
    $('hostCategory').className = 'category ' + typeClass(q);
    $('hostQuestion').textContent = q.prompt;
    const left = timeLeft();
    $('hostTimer').textContent = format(left);
    $('hostTimer').classList.toggle('low', left !== null && left <= 10 && left > 0);
    $('teamCount').textContent = Object.keys(teams || {}).length;
    const answers = (getRound().answers) || {};
    const arr = Object.values(answers);
    $('answerCount').textContent = arr.length;
    $('hostStatus').textContent = currentStatus();
    if ($('pauseBtn')) {
      $('pauseBtn').classList.remove('hidden');
      $('pauseBtn').textContent = (state.status === 'paused' || state.status === 'stopped') ? '▶ Verdergaan' : '⏸ Stop/pauzeer';
    }
    const round = getRound();
    if (round.summary) { $('hostSummary').classList.remove('hidden'); $('hostSummary').innerHTML = esc(round.summary); } else { $('hostSummary').classList.add('hidden'); }
    $('hostAnswers').innerHTML = arr.length ? arr.sort((a, b) => (a.at || 0) - (b.at || 0)).map(a => {
      const result = ((round.results || {})[a.teamId]) || null;
      const r = result ? `<div class="meta ${result.delta > 0 ? 'result-good' : result.delta < 0 ? 'result-bad' : 'result-neutral'}">${result.delta > 0 ? '+' : ''}${result.delta} punten · ${esc(result.label || '')}</div>` : '';
      return `<div class="answer"><b>${esc(a.teamName)}</b><div>koos <b>${esc(a.answer)}</b> · inzet ${esc(a.bet)}</div>${r}</div>`;
    }).join('') : '<p class="help">Nog geen antwoorden.</p>';
    renderScores();
    if (state.status === 'active' && left === 0 && !revealBusy) revealAndScore();
  }

  function renderScores() {
    const arr = Object.values(teams || {}).sort((a, b) => (b.score || 0) - (a.score || 0));
    $('hostLeaderboard').innerHTML = arr.length ? arr.map((t, i) => `<div class="score ${i === 0 ? 'winner' : ''}"><b>${i + 1}. ${esc(t.name)}</b><div class="meta">${t.score || 0} punten${t.players ? ' · ' + esc(t.players) : ''}</div></div>`).join('') : '<p class="help">Nog geen teams.</p>';
  }

  async function startNextRound() {
    const freshOrder = makeOrder();
    const ref = base.child('state');
    ref.transaction(s => {
      s = s || { round: -1, status: 'waiting' };
      if (s.status === 'active' || s.status === 'paused' || s.status === 'stopped') return;
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

  async function revealAndScore() {
    if (state.round < 0) return;
    revealBusy = true;
    const lockRef = base.child('rounds/' + state.round + '/scoreLock');
    lockRef.transaction(v => v ? undefined : 'admin', async (err, committed) => {
      if (err || !committed) { revealBusy = false; return; }
      try { await calculate(state.round); } finally { revealBusy = false; }
    });
  }

  async function calculate(roundNo) {
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


  async function togglePause() {
    if (state.status === 'active') {
      const remaining = timeLeft();
      await base.child('state').update({ status: 'paused', pausedRemaining: remaining === null ? ROUND_SECONDS : remaining, stoppedFrom: 'active', pausedAt: Date.now() });
    } else if (state.status === 'paused') {
      const remaining = Number(state.pausedRemaining || state.duration || ROUND_SECONDS);
      await base.child('state').update({ status: 'active', startedAt: Date.now(), duration: remaining, pausedRemaining: null, stoppedFrom: null, resumedAt: Date.now() });
    } else if (state.status === 'revealed' || state.status === 'waiting') {
      await base.child('state').update({ status: 'stopped', stoppedFrom: state.status, stoppedAt: Date.now() });
    } else if (state.status === 'stopped') {
      const from = state.stoppedFrom || 'revealed';
      await base.child('state').update({ status: from, stoppedFrom: null, resumedAt: Date.now() });
    }
  }

  $('loginBtn').onclick = () => {
    if ($('code').value.trim() !== (window.WIE_IS_HET_ADMIN_CODE || 'LILLE2026')) return alert('Verkeerde code');
    $('login').classList.add('hidden');
    $('host').classList.remove('hidden');
  };
  $('nextBtn').onclick = startNextRound;
  $('revealBtn').onclick = revealAndScore;
  if ($('pauseBtn')) $('pauseBtn').onclick = togglePause;
  $('resetBtn').onclick = async () => {
    if (confirm('Hele spel resetten? Teams, scores en antwoorden verdwijnen. De vragen krijgen meteen een nieuwe willekeurige volgorde.')) {
      await base.set({ state: { round: -1, status: 'waiting', startedAt: null, duration: ROUND_SECONDS, order: makeOrder(), resetAt: Date.now() } });
    }
  };

  base.child('state').on('value', s => { state = s.val() || { round: -1, status: 'waiting', startedAt: null, duration: ROUND_SECONDS }; render(); });
  base.child('teams').on('value', s => { teams = s.val() || {}; render(); });
  base.child('rounds').on('value', s => { rounds = s.val() || {}; render(); });
  setInterval(render, 500);
})();
