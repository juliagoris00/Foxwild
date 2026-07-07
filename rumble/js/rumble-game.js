(function(){
  const $ = (id)=>document.getElementById(id);
  const cfg = window.firebaseConfig || {};
  const firebaseReady = cfg && cfg.apiKey && cfg.apiKey !== 'VUL_HIER_IN' && cfg.databaseURL && cfg.databaseURL !== 'VUL_HIER_IN';
  if(!firebaseReady){ $('firebaseWarning').classList.remove('hidden'); }
  let db = null;
  if(firebaseReady){ firebase.initializeApp(cfg); db = firebase.database(); }
  const gameId = window.RUMBLE_GAME_ID || 'rijsel-rumble-2026';
  const base = db ? db.ref('games/'+gameId) : null;
  let teamId = localStorage.getItem('rumbleTeamId') || ('team_'+Math.random().toString(36).slice(2,10));
  localStorage.setItem('rumbleTeamId', teamId);
  let state = {round:0, revealed:false};
  let selectedBet = 1;

  function norm(s){return (s||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
  function qFor(i){ return window.RUMBLE_QUESTIONS[i % window.RUMBLE_QUESTIONS.length]; }
  function showGame(name){$('setup').classList.add('hidden');$('game').classList.remove('hidden');$('teamTitle').textContent=name;}
  function renderRound(){
    const q = qFor(state.round||0);
    $('roundLabel').textContent = 'Ronde '+((state.round||0)+1);
    $('roundType').textContent = q.type;
    $('questionText').textContent = q.text;
    const helps = {
      'Majority':'Raad welk antwoord de meerderheid van de auto’s kiest.',
      'Roast':'Raad de meerderheid. Beste motivatie kan bonuspunten krijgen.',
      'Blind Bet':'Extra spanning: kies met lef. Host kan dit dubbel laten tellen.',
      'Minority':'Probeer uniek te zijn of precies de slimme underdog te pakken.',
      'Double':'Deze ronde kan extra hard meetellen.',
      'Sabotage':'Winnaar mag via de host eventueel iemand punten laten verliezen.'
    };
    $('roundHelp').textContent = helps[q.type] || helps.Majority;
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
  function escapeHtml(str){return String(str||'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));}

  document.querySelectorAll('.bet').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.bet').forEach(b=>b.classList.remove('active'));btn.classList.add('active');selectedBet=Number(btn.dataset.bet);}));
  $('joinBtn').addEventListener('click', async()=>{
    const name = $('teamName').value.trim();
    if(!name) return alert('Vul een teamnaam in.');
    if(!firebaseReady) return alert('Firebase is nog niet gekoppeld. Vul js/firebase-config.js in.');
    const players = $('carPlayers').value.trim();
    await base.child('teams/'+teamId).update({name, players, score:0, joinedAt:Date.now()});
    localStorage.setItem('rumbleTeamName', name);
    showGame(name);
  });
  $('submitBtn').addEventListener('click', async()=>{
    const teamName = localStorage.getItem('rumbleTeamName');
    const answer = $('answerInput').value.trim();
    if(!answer) return alert('Vul een antwoord in.');
    await base.child('rounds/'+state.round+'/answers/'+teamId).set({teamId, teamName, answer, answerKey:norm(answer), reason:$('reasonInput').value.trim(), bet:selectedBet, at:Date.now()});
    $('submitted').classList.remove('hidden');
  });
  $('scoreBtn').onclick=()=> $('leaderboardPanel').classList.remove('hidden');
  $('closeScore').onclick=()=> $('leaderboardPanel').classList.add('hidden');

  if(firebaseReady){
    base.child('state').on('value', snap=>{state = snap.val() || {round:0, revealed:false}; renderRound(); $('answerInput').value=''; $('reasonInput').value=''; $('submitted').classList.add('hidden');});
    base.child('rounds').on('value', snap=>{const rounds=snap.val()||{}; renderAnswers((rounds[state.round]||{}).answers||{});});
    base.child('teams').on('value', snap=>renderLeaderboard(snap.val()||{}));
  }
  const saved = localStorage.getItem('rumbleTeamName');
  if(saved && firebaseReady){ showGame(saved); }
})();
