const $=id=>document.getElementById(id),tv=location.pathname==='/tv';let state,authenticated=false,busy=false;
const stages=['One line','Two lines','Full card'];
const label=n=>n?String(n):'—';

document.body.classList.toggle('tv',tv);$('title').textContent=tv?'Eyes down. Good luck.':'Let’s play bingo.';$('tv-link').hidden=tv;
for(let c=0;c<5;c++){const row=document.createElement('div');row.className='board-row';const letter=document.createElement('strong');letter.textContent='BINGO'[c];row.append(letter);for(let n=c*15+1;n<=c*15+15;n++){const cell=document.createElement('span');cell.id=`n${n}`;cell.textContent=n;row.append(cell);}$('board').append(row);}
async function api(url,data){const response=await fetch(url,{method:data?'POST':'GET',headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(8000)});const result=await response.json();if(!response.ok)throw Error(result.error||'Request failed.');return result;}
function render(){if(!state)return;$('ball').textContent=label(state.draws.at(-1));$('count').textContent=`${state.draws.length} of 75 numbers called`;$('remaining').textContent=`${75-state.draws.length} remaining`;
 for(let n=1;n<=75;n++){const cell=$(`n${n}`);cell.classList.toggle('called',state.draws.includes(n));cell.classList.toggle('latest',n===state.draws.at(-1));cell.setAttribute('aria-label',`${n}${state.draws.includes(n)?', called':', not called'}`);}
 $('recent').replaceChildren(...state.draws.slice(-6).reverse().map(n=>{const el=document.createElement('span');el.className='chip';el.textContent=label(n);return el;}));
 $('stages').replaceChildren(...stages.map((name,i)=>{const el=document.createElement('div');el.className='stage '+(i<state.stage?'complete':i===state.stage?'active':'');const small=document.createElement('small');small.textContent=i<state.stage?'✓ AWARDED':i===state.stage?'PLAYING FOR':'UP NEXT';const strong=document.createElement('strong');strong.textContent=name;el.append(small,strong);return el;}));
 $('pause').textContent=state.paused?'Resume game':'Pause game';$('pause-status').textContent=state.paused?'Game paused':state.stage===3?'All three prizes awarded':'';
 $('draw').disabled=busy||state.paused||state.draws.length===75||state.stage===3;$('winner').disabled=busy||state.stage===3||!state.draws.length;
 $('winners').replaceChildren(...state.winners.map(w=>{const p=document.createElement('p');p.textContent=`${stages[w.stage]}: ${w.name} · after call ${w.draw}`;return p;}));
 document.querySelectorAll('.host-only').forEach(el=>el.hidden=tv||!authenticated);$('login').hidden=tv||authenticated;
}
async function refresh(){try{state=await api('/api/state');$('connection').textContent='● Live';$('connection').className='live';render();}catch{$('connection').textContent='● Connection lost — board may be outdated';$('connection').className='offline';$('draw').disabled=true;}}
async function action(name,extra={}){if(busy||!state)return;busy=true;render();$('message').textContent='';try{state=await api(`/api/${name}`,{gameId:state.id,revision:state.updatedAt,...extra});}catch(error){$('message').textContent=error.message;await refresh();}finally{busy=false;render();}}
 $('login-form').onsubmit=async event=>{event.preventDefault();try{await api('/api/login',{password:$('password').value});$('password').value='';authenticated=true;$('message').textContent='';render();}catch(error){$('message').textContent=error.message;}};
 $('draw').onclick=()=>action('draw');$('pause').onclick=()=>action('pause');$('winner').onclick=()=>{if(confirm(`Have you manually checked the paper card for ${stages[state.stage].toLowerCase()}?`)){action('winner',{name:$('winner-name').value});$('winner-name').value='';}};
 $('reset').onclick=()=>{if(confirm('Start a new game? All current calls and recorded winners will be cleared.'))action('reset');};
 $('fullscreen').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen().catch(()=>{$('message').textContent='Full screen is unavailable in this browser.';});};
 $('print').onclick=async()=>{try{const result=await api('/api/cards',{count:Number($('strips').value)});const elements=result.strips.map((strip,i)=>{const sheet=document.createElement('section');sheet.className='paper-strip';strip.forEach((card,j)=>{const title=document.createElement('h2');title.textContent='BAR COWBOY · BINGO';const table=document.createElement('table');const head=document.createElement('tr');for(const l of 'BINGO'){const th=document.createElement('th');th.textContent=l;head.append(th);}table.append(head);for(const row of card){const tr=document.createElement('tr');for(const n of row){const td=document.createElement('td');td.textContent=n;tr.append(td);}table.append(tr);}const id=document.createElement('p');id.textContent=`${result.batch} / ${i+1}-${j+1}`;sheet.append(title,table,id);});return sheet;});$('cards').replaceChildren(...elements);$('print-dialog').showModal();}catch(error){$('message').textContent=error.message;}};
 $('do-print').onclick=()=>window.print();$('close-print').onclick=()=>$('print-dialog').close();
 async function start(){try{authenticated=(await api('/api/session')).authenticated;}catch{}await refresh();setInterval(refresh,1500);}start();
// Automatic calling controls — host screen only.
if (!tv) {
  const controls = document.createElement('div');
  controls.className = 'host-only';
  controls.hidden = true;

  const intervalLabel = document.createElement('label');
  intervalLabel.textContent = 'Seconds between calls';
  intervalLabel.htmlFor = 'auto-seconds';

  const seconds = document.createElement('input');
  seconds.id = 'auto-seconds';
  seconds.type = 'number';
  seconds.min = '3';
  seconds.max = '120';
  seconds.value = '10';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.textContent = 'Start automatic calling';

  controls.append(intervalLabel, seconds, toggle);
  $('pause').after(controls);

  let running = false;
  let timeout;

  function stopAuto() {
    running = false;
    clearTimeout(timeout);
    toggle.textContent = 'Start automatic calling';
    seconds.disabled = false;
  }

  async function tick() {
    if (!running) return;

    if (
      !authenticated ||
      !state ||
      state.paused ||
      state.stage >= 3 ||
      state.draws.length >= 75 ||
      !$('connection').classList.contains('live')
    ) {
      stopAuto();
      return;
    }

    if (!busy) {
      const previousCount = state.draws.length;
      await action('draw');

      // Stop if the draw failed or the game finished.
      if (
        state.draws.length <= previousCount ||
        state.stage >= 3 ||
        state.draws.length >= 75
      ) {
        stopAuto();
        return;
      }
    }

    if (running) {
      timeout = setTimeout(tick, Number(seconds.value) * 1000);
    }
  }

  toggle.onclick = () => {
    if (running) {
      stopAuto();
      return;
    }

    const delay = Number(seconds.value);
    if (!Number.isInteger(delay) || delay < 3 || delay > 120) {
      $('message').textContent =
        'Choose a whole number between 3 and 120 seconds.';
      return;
    }

    if (!state || state.paused || state.stage >= 3) {
      $('message').textContent =
        'Resume the game or start a new game first.';
      return;
    }

    running = true;
    seconds.disabled = true;
    toggle.textContent = 'Stop automatic calling';

    // First draw happens after the selected delay.
    timeout = setTimeout(tick, delay * 1000);
  };

  // Stop the timer before checking a claim or changing games.
  $('pause').addEventListener('click', stopAuto);
  $('winner').addEventListener('click', stopAuto);
  $('reset').addEventListener('click', stopAuto);

  render();
}

// English announcements on the host screen only.
if (!tv && 'speechSynthesis' in window) {
  const speechButton = document.createElement('button');
  speechButton.type = 'button';
  speechButton.textContent = 'Enable English announcements';

  const speechControls = document.createElement('div');
  speechControls.className = 'host-only';
  speechControls.hidden = true;
  speechControls.append(speechButton);
  $('pause').after(speechControls);

  let speechEnabled = false;
  let observedGame;
  let observedCount;

  function announce(text) {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-GB';
    utterance.rate = 0.85;

    const voices = window.speechSynthesis.getVoices();
    const voice =
      voices.find(v => v.lang === 'en-GB') ||
      voices.find(v => v.lang.startsWith('en'));

    if (voice) utterance.voice = voice;

    window.speechSynthesis.speak(utterance);
  }

  speechButton.onclick = () => {
    speechEnabled = !speechEnabled;

    // Start from the current number; don't announce old calls.
    observedGame = state?.id;
    observedCount = state?.draws.length;

    speechButton.textContent = speechEnabled
      ? 'Disable English announcements'
      : 'Enable English announcements';

    if (speechEnabled) {
      announce('English announcements enabled.');
    } else {
      window.speechSynthesis.cancel();
    }
  };

  setInterval(() => {
    if (!state) return;

    // A new game or initial page load should not read old calls.
    if (observedGame !== state.id || observedCount === undefined) {
      observedGame = state.id;
      observedCount = state.draws.length;
      return;
    }

    if (state.draws.length > observedCount && speechEnabled) {
      announce(`Number ${state.draws.at(-1)}`);
    }

    observedCount = state.draws.length;
  }, 300);

  render();
}
