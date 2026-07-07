(function(){
  const $=(id)=>document.getElementById(id);
  const cfg=window.firebaseConfig||{};
  const ready=cfg && cfg.apiKey && cfg.apiKey!=='VUL_HIER_IN' && cfg.databaseURL && cfg.databaseURL!=='VUL_HIER_IN';
  if(!ready) alert('Firebase is nog niet gekoppeld. Vul js/firebase-config.js in.');
  firebase.initializeApp(cfg);
  const db=firebase.database();
  const gameId=window.RUMBLE_GAME_ID||'rijsel-rumble-2026';
  const base=db.ref('games/'+gameId);
  let state={round:0,revealed:false}; let teams={}; let rounds={};
  const qFor=i=>window.RUMBLE_QUESTIONS[i % window.RUMBLE_QUESTIONS.length];
  const norm=s=>(s||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const esc=s=>String(s||'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));
  function render(){
    const q=qFor(state.round||0);
    $('hostRoundLabel').textContent='Ronde '+((state.round||0)+1);
    $('hostRoundType').textContent=q.type+(state.revealed?' · onthuld':'');
    $('hostQuestion').textContent=q.text;
    const answers=(((rounds||{})[state.round]||{}).answers)||{};
    const arr=Object.values(answers);
    $('hostAnswers').innerHTML=arr.length?arr.map(a=>`<div class="answer"><b>${esc(a.teamName)}</b><div>Antwoord: <b>${esc(a.answer)}</b> · inzet ${a.bet}</div><div class="meta">${esc(a.reason||'Geen motivatie')}</div></div>`).join(''):'<p class="help">Nog geen antwoorden.</p>';
    $('bonusList').innerHTML=arr.length?arr.map(a=>`<div class="bonus-row"><span><b>${esc(a.teamName)}</b></span><button class="ghost" data-bonus="1" data-team="${a.teamId}">+1</button><button class="ghost" data-bonus="3" data-team="${a.teamId}">+3</button></div>`).join(''):'<p class="help">Nog niemand om bonus te geven.</p>';
    document.querySelectorAll('[data-bonus]').forEach(b=>b.onclick=()=>addScore(b.dataset.team,Number(b.dataset.bonus)));
    renderScores();
  }
  function renderScores(){
    const arr=Object.values(teams||{}).sort((a,b)=>(b.score||0)-(a.score||0));
    $('hostLeaderboard').innerHTML=arr.length?arr.map((t,i)=>`<div class="score ${i===0?'winner':''}"><b>${i+1}. ${esc(t.name)}</b><div class="meta">${t.score||0} punten · ${esc(t.players||'')}</div></div>`).join(''):'<p class="help">Nog geen teams.</p>';
  }
  async function addScore(teamId, points){
    const ref=base.child('teams/'+teamId+'/score');
    await ref.transaction(v=>(v||0)+points);
  }
  async function revealAndScore(){
    const answers=(((rounds||{})[state.round]||{}).answers)||{};
    const arr=Object.values(answers);
    if(arr.length<2 && !confirm('Er zijn minder dan 2 antwoorden. Toch onthullen?')) return;
    const counts={}; arr.forEach(a=>counts[a.answerKey]=(counts[a.answerKey]||0)+1);
    const max=Math.max(0,...Object.values(counts));
    const winners=Object.keys(counts).filter(k=>counts[k]===max && max>1);
    const allSame = winners.length===1 && max===arr.length && arr.length>1;
    const updates={};
    arr.forEach(a=>{
      let delta=0;
      if(winners.includes(a.answerKey)) delta=allSame?1:(a.bet||1);
      else delta=-(a.bet||1);
      updates['teams/'+a.teamId+'/score']=(teams[a.teamId]?.score||0)+delta;
      updates['rounds/'+state.round+'/results/'+a.teamId]=delta;
    });
    updates['state/revealed']=true;
    await base.update(updates);
    alert('Onthuld! Meerderheid: '+(winners.length?winners.join(', '):'geen duidelijke meerderheid')+'. Punten zijn bijgewerkt.');
  }
  $('loginBtn').onclick=()=>{ if($('code').value.trim() !== (window.RUMBLE_ADMIN_CODE||'LILLE2026')) return alert('Verkeerde code'); $('login').classList.add('hidden'); $('host').classList.remove('hidden'); };
  $('nextBtn').onclick=()=> base.child('state').set({round:(state.round||0)+1,revealed:false,startedAt:Date.now()});
  $('prevBtn').onclick=()=> base.child('state').set({round:Math.max(0,(state.round||0)-1),revealed:false,startedAt:Date.now()});
  $('revealBtn').onclick=revealAndScore;
  $('resetBtn').onclick=async()=>{ if(confirm('Hele spel resetten? Scores en antwoorden verdwijnen.')) await base.set({state:{round:0,revealed:false}}); };
  base.child('state').on('value',s=>{state=s.val()||{round:0,revealed:false};render();});
  base.child('teams').on('value',s=>{teams=s.val()||{};render();});
  base.child('rounds').on('value',s=>{rounds=s.val()||{};render();});
})();
