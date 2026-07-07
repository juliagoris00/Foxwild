(function(){
  const $ = (id)=>document.getElementById(id);
  const cfg = window.firebaseConfig || {};
  const firebaseReady = cfg && cfg.apiKey && cfg.apiKey !== 'VUL_HIER_IN' && cfg.databaseURL && cfg.databaseURL !== 'VUL_HIER_IN';
  if(!firebaseReady){ $('firebaseWarning').classList.remove('hidden'); }
  let db = null;
  if(firebaseReady){ firebase.initializeApp(cfg); db = firebase.database(); }
  const gameId = window.RUMBLE_GAME_ID || 'wie-is-het-2026';
  const base = db ? db.ref('games/'+gameId) : null;
  let teamId = localStorage.getItem('wieIsHetTeamId') || ('team_'+Math.random().toString(36).slice(2,10));
  localStorage.setItem('wieIsHetTeamId', teamId);
  let state = {round:0, revealed:false, startedAt:null, duration:60};
  let selectedBet = 1;
  let lastRound = null;
  let timerHandle = null;

  function norm(s){return (s||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
  function qFor(i){ return window.RUMBLE_QUESTIONS[i % window.RUMBLE_QUESTIONS.length]; }
  function showGame(name){$('setup').classList.add('hidden');$('game').classList.remove('hidden');$('teamTitle').textContent=name;}
  function escapeHtml(str){return String(str||'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));}

  function timeLeft(){
    if(!state.startedAt) return null;
    const end = state.startedAt + ((state.duration || 60) * 1000);
    return Math.max(0, Math.ceil((end - Date.now())/1000));
  }
  function format(sec){
    if(sec === null) return '--:--';
    const m = Math.floor(sec/60);
    const s = String(sec%60).padStart(2,'0');
    return `${m}:${s}`;
  }
  function updateTimer(){
    const left = timeLeft();
    $('timer').textContent = format(left);
    $('timer').classList.toggle('low', left !== null && left <= 10 && left > 0);
    const closed = left === 0 || state.revealed || !state.startedAt;
    $('answerCard').classList.toggle('disabled', closed && !state.revealed);
    $('submitBtn').disabled = closed;
    $('closed').classList.toggle('hidden', !(left === 0 && !state.revealed));
  }
  function renderRound(){
    const q = qFor(state.round||0);
    $('roundLabel').textContent = 'Ronde '+((state.round||0)+1);
    $('questionText').textContent = q.text;
    $('roundHelp').textContent = 'Kies de persoon waarvan jullie denken dat de meeste auto’s hem/haar kiezen. Kies daarna je inzet: 1, 3 of 5 punten.';
    if(lastRound !== state.round){
      $('answerInput').value=''; $('reasonInput').value=''; $('submitted').classList.add('hidden'); $('closed').classList.add('hidden');
      lastRound = state.round;
    }
    updateTimer();
  }
  function renderAnswers(answers){
    const arr = Object.values(answers||{});
    if(!arr.length){$('answersList').innerHTML='<p class="help">Nog geen antwoorden.</p>';return;}
    $('answersList').innerHTML = arr.map(a=>`<div class="answer"><b>${escapeHtml(a.teamName)}</b>${state.revealed?`<div>Antwoord: <b>${escapeHtml(a.answer)}</b> · inzet ${a.bet}</div><div class="meta">${escapeHtml(a.reason||'Geen motivatie')}</div>`:'<div class="meta">Heeft antwoord vastgezet ✅</div>'}</div>`).join('');
  }
  function renderLeaderboard(teams){
    const arr = Object.values(teams||{}).sort((a,b)=>(b.score||0)-(a.score||0));
    $('leaderboard').innerHTML = arr.length ? arr.map((t,i)=>`<div class="score ${i===0?'winner':''}"><b>${i+1}. ${escapeHtml(t.name)}</b><div class="meta">${t.score||0} punten</div></div>`).join('') : '<p class="help">Nog geen teams.</p>';
  }

  document.querySelectorAll('.bet').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.bet').forEach(b=>b.classList.remove('active'));btn.classList.add('active');selectedBet=Number(btn.dataset.bet);}));
  $('joinBtn').addEventListener('click', async()=>{
    const name = $('teamName').value.trim();
    if(!name) return alert('Vul een teamnaam in.');
    if(!firebaseReady) return alert('Firebase is nog niet gekoppeld. Vul js/firebase-config.js in.');
    const players = $('carPlayers').value.trim();
    const snap = await base.child('teams/'+teamId+'/score').once('value');
    await base.child('teams/'+teamId).update({name, players, score:snap.val()||0, joinedAt:Date.now()});
    localStorage.setItem('wieIsHetTeamName', name);
    showGame(name);
  });
  $('submitBtn').addEventListener('click', async()=>{
    if(timeLeft() === 0) return alert('Tijd is voorbij. Wacht op de volgende ronde.');
    const teamName = localStorage.getItem('wieIsHetTeamName');
    const answer = $('answerInput').value.trim();
    if(!answer) return alert('Vul een antwoord in.');
    await base.child('rounds/'+state.round+'/answers/'+teamId).set({teamId, teamName, answer, answerKey:norm(answer), reason:$('reasonInput').value.trim(), bet:selectedBet, at:Date.now()});
    $('submitted').classList.remove('hidden');
  });
  $('scoreBtn').onclick=()=> $('leaderboardPanel').classList.remove('hidden');
  $('closeScore').onclick=()=> $('leaderboardPanel').classList.add('hidden');

  if(firebaseReady){
    base.child('state').on('value', snap=>{state = snap.val() || {round:0, revealed:false, startedAt:null, duration:60}; renderRound();});
    base.child('rounds').on('value', snap=>{const rounds=snap.val()||{}; renderAnswers((rounds[state.round]||{}).answers||{});});
    base.child('teams').on('value', snap=>renderLeaderboard(snap.val()||{}));
    timerHandle = setInterval(updateTimer, 500);
  }
  const saved = localStorage.getItem('wieIsHetTeamName');
  if(saved && firebaseReady){ showGame(saved); }
})();
