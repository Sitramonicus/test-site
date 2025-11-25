const state={characters:[], assets:{}, eventAudio:{}, grid:null};

function initGridTrail(opts){
  const settings=Object.assign({ spacing:28, amplitude:36, trailLen:28, maxDPR:1.5, maxNodes:2200, canvas: null }, opts||{});
  const canvas = settings.canvas || document.getElementById('grid-trail');
  if(!canvas) return { destroy(){} };
  const ctx = canvas.getContext('2d');
  let DPR = Math.min(settings.maxDPR, Math.max(1, window.devicePixelRatio || 1));
  let nodes = [];
  const mouse = { x: 0, y: 0, down:false };
  const trail = [];
  let rid = null;
  let lastTime = performance.now();
  function resize(){
    DPR = Math.min(settings.maxDPR, Math.max(1, window.devicePixelRatio || 1));
    const w = Math.max(1, innerWidth);
    const h = Math.max(1, innerHeight);
    canvas.width = Math.floor(w * DPR);
    canvas.height = Math.floor(h * DPR);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(DPR,0,0,DPR,0,0);
    rebuildGrid();
  }
  function pushTrail(x,y){ trail.push({x,y,t:performance.now()}); if(trail.length > settings.trailLen) trail.shift(); }
  function rebuildGrid(){
    const spacing = settings.spacing; nodes = [];
    const w = Math.max(1, innerWidth); const h = Math.max(1, innerHeight);
    const cols = Math.ceil(w/spacing) + 1; const rows = Math.ceil(h/spacing) + 1; const cap = Math.max(1, settings.maxNodes);
    for (let j=0;j<rows && nodes.length<cap;j++){
      for (let i=0;i<cols && nodes.length<cap;i++){
        const x = i*spacing - (w%spacing)/2; const y = j*spacing - (h%spacing)/2;
        nodes.push({x,y,ox:x,oy:y,vx:0,vy:0,phase:Math.random()*Math.PI*2});
      }
    }
  }
  function update(dt, t){
    const amp = settings.amplitude;
    for (let n of nodes){
      let influence = 0;
      for (let k = Math.max(0, trail.length - 6); k < trail.length; k++){
        const p = trail[k]; const dx = n.ox - p.x; const dy = n.oy - p.y; const d2 = dx*dx + dy*dy; const fall = Math.exp(-d2 / (amp * amp * 6)); influence = Math.max(influence, fall);
      }
      const wobble = 0.8 + Math.sin(t / 300 + n.phase) * 0.4; const targetY = n.oy - influence * amp * wobble;
      const k_spring = 10; const k_damp = 0.85; n.vy += (targetY - (n.y || n.oy)) * k_spring * dt; n.vy *= Math.pow(k_damp, dt * 60); n.y = (n.y || n.oy) + n.vy * dt * 60;
    }
  }
  function draw(){
    const w = Math.max(1, innerWidth); const h = Math.max(1, innerHeight); ctx.clearRect(0,0,w,h);
    const spacing = settings.spacing; const colsPerRow = Math.ceil(w / spacing) + 1; ctx.lineWidth = 1;
    for (let j = 0; j * colsPerRow < nodes.length; j++){
      const rowStart = j * colsPerRow; ctx.beginPath();
      for (let i = 0; i < colsPerRow; i++){
        const idx = rowStart + i; if (idx >= nodes.length) break; const n = nodes[idx]; if (i === 0) ctx.moveTo(n.x, n.y || n.oy); else ctx.lineTo(n.x, n.y || n.oy);
      }
      let rowAvg = 0; let count = 0;
      for (let i = 0; i < colsPerRow; i++){ const idx = rowStart + i; if (idx >= nodes.length) break; const n = nodes[idx]; rowAvg += Math.abs((n.y || n.oy) - n.oy); count++; }
      rowAvg = count ? rowAvg / count : 0; const alpha = Math.min(1, 0.25 + rowAvg / (settings.amplitude * 2)); ctx.strokeStyle = `rgba(160,210,255,${alpha})`; ctx.stroke();
    }
    for (let n of nodes){ const ny = n.y || n.oy; const off = ny - n.oy; const r = Math.max(0.8, Math.abs(off) / 8 + 0.8); const a = Math.min(1, Math.abs(off) / (settings.amplitude * 1.2) + 0.15); ctx.beginPath(); ctx.arc(n.x, ny, r, 0, Math.PI * 2); ctx.fillStyle = `rgba(140,200,255,${a})`; ctx.fill(); }
    ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 12, 0, Math.PI * 2); ctx.fillStyle = 'rgba(120,200,255,0.06)'; ctx.fill();
  }
  function frame(t){ const dt = Math.min(40, t - lastTime) / 1000; lastTime = t; update(dt, t); draw(); rid = requestAnimationFrame(frame); }
  function onMove(e){ mouse.x = e.clientX; mouse.y = e.clientY; if(mouse.down) pushTrail(mouse.x, mouse.y); }
  function onDown(e){ mouse.down = true; pushTrail(e.clientX, e.clientY); }
  function onUp(){ mouse.down = false; }
  window.addEventListener('resize', resize);
  document.addEventListener('pointermove', onMove, { passive:true });
  document.addEventListener('pointerdown', onDown, { passive:true });
  document.addEventListener('pointerup', onUp, { passive:true });
  { const w = Math.max(1, innerWidth); const h = Math.max(1, innerHeight); for (let i = 0; i < 10; i++) trail.push({x: w / 2, y: h / 2, t: performance.now() - i * 20}); }
  resize(); rid = requestAnimationFrame(frame);
  return { destroy(){ try{ cancelAnimationFrame(rid); }catch{} window.removeEventListener('resize', resize); document.removeEventListener('pointermove', onMove, { passive:true }); document.removeEventListener('pointerdown', onDown, { passive:true }); document.removeEventListener('pointerup', onUp, { passive:true }); nodes = []; trail.length = 0; ctx.clearRect(0,0,canvas.width,canvas.height); }, set(newOpts){ Object.assign(settings, newOpts||{}); }, get(){ return Object.assign({}, settings); } };
}

function toFallback(src){ try{ if(src && src.startsWith('./assets/')){ return 'https://justanassetfolder.netlify.app/' + src.slice('./assets/'.length); } }catch{} return src; }

function attachAudioFallback(a, src){ try{ a.addEventListener('error',()=>{ try{ a.src = toFallback(src); }catch{} }); }catch{} }

async function init(){
  const assets=await fetch('asset.json').then(r=>r.json()).catch(()=>({}));
  const res=await fetch('data.json'); const raw=await res.json().catch(()=>({})); const data=raw.data||raw; const settings=raw.settings||{};
  state.assets=assets; state.characters=(data.characters||[]).slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')));
  const events=assets.events||{}; Object.keys(events).forEach(k=>{ const v=events[k]||{}; if(v.src){ const a=new Audio(v.src); a.volume=typeof v.volume==='number'?v.volume:0.5; attachAudioFallback(a, v.src); state.eventAudio[k]=a; } });
  state.grid = initGridTrail({ canvas: document.getElementById('grid-trail'), spacing:28, amplitude:36, trailLen:28 });
  const modeIcons=(assets.revolve&&assets.revolve.modeIcons)||{}; const modeRevolveBtn=document.querySelector('#mode-revolve img'); const modeListBtn=document.querySelector('#mode-list img'); if(modeRevolveBtn&&modeIcons.revolve){modeRevolveBtn.src=modeIcons.revolve} if(modeListBtn&&modeIcons.list){modeListBtn.src=modeIcons.list}
  if(modeRevolveBtn){ modeRevolveBtn.addEventListener('error',()=>{ try{ modeRevolveBtn.src = toFallback(modeIcons.revolve); }catch{} }); }
  if(modeListBtn){ modeListBtn.addEventListener('error',()=>{ try{ modeListBtn.src = toFallback(modeIcons.list); }catch{} }); }
  const twitch=settings.twitch||{}; const cta=document.getElementById('cta-purple'); const ctaHandle=document.getElementById('cta-handle'); const ctaIcon=document.getElementById('cta-icon'); if(ctaHandle&&typeof twitch.handle!=='undefined'){ ctaHandle.textContent=String(twitch.handle); } if(ctaIcon&&twitch.icon){ ctaIcon.src=String(twitch.icon); }
  if(cta){ cta.addEventListener('mouseenter',()=>{ playEvent('RevolveHover',{target:cta}); }); cta.addEventListener('mouseleave',()=>{ stopHover(cta); }); }
  function adjustCtaWidth(){ if(!cta||!ctaHandle) return; const iconW=ctaIcon?ctaIcon.getBoundingClientRect().width:0; const padL=parseFloat(getComputedStyle(cta).paddingLeft)||0; const padR=parseFloat(getComputedStyle(cta).paddingRight)||0; const textW=Math.ceil(ctaHandle.scrollWidth); const desired=Math.ceil(iconW + textW + padL + padR + 10); cta.style.width=desired+'px'; }
  adjustCtaWidth(); window.addEventListener('resize',adjustCtaWidth);
  if(cta && twitch.link){ cta.addEventListener('click',()=>{ try{ window.open(String(twitch.link),'_blank','noopener,noreferrer'); }catch{} }); }
  renderCatalog(); setupModeSwitch(); setupDialogue(); setupAudio();
}

function playEvent(name,ctx){ const au=state.eventAudio[name]; if(!au) return; try{ au.currentTime=0; au.play().catch(()=>{}); if(ctx&&ctx.target){ hoverMap.set(ctx.target, au); } }catch{} }
function stopHover(el){ const au=hoverMap.get(el); if(au){ try{ au.pause(); }catch{} hoverMap.delete(el); } }
const hoverMap=new WeakMap();

let lastSelectedCard=null; let closingGuard=false;
function renderCatalog(){
  const el=document.getElementById('catalog'); el.innerHTML='';
  const defaultBg=(state.assets.revolve&&state.assets.revolve.defaultBg)||'';
  state.characters.forEach(c=>{
    const card=document.createElement('div'); card.className='card'; card.setAttribute('data-id', c.id);
    const bg=document.createElement('img'); bg.className='bg'; bg.alt='background'; bg.src=String((c.bg&&c.bg.trim())?c.bg:defaultBg); bg.addEventListener('error',()=>{ try{ bg.src = toFallback(bg.src); }catch{} });
    const av=document.createElement('img'); av.className='avatar'; av.alt='avatar'; av.src='./assets/phavatar.png'; av.addEventListener('error',()=>{ try{ av.src = toFallback(av.src); }catch{} });
    const text=document.createElement('div'); text.className='text';
    const name=document.createElement('div'); name.className='name'; name.textContent=String(c.name||'');
    const handle=document.createElement('div'); handle.className='handle'; handle.textContent=String(c.handle||'');
    text.appendChild(name); text.appendChild(handle);
    card.appendChild(bg); card.appendChild(av); card.appendChild(text);
    card.addEventListener('mouseenter',()=>playEvent('CardHover',{target:card}));
    card.addEventListener('mouseleave',()=>stopHover(card));
    card.addEventListener('click',()=>{
      playEvent('CardClick');
      lastSelectedCard=card;
      try{
        card.classList.remove('animate__animated','animate__bounceOutUp'); card.offsetHeight;
        card.classList.add('animate__animated','animate__bounceOutUp');
        const done=()=>{ card.removeEventListener('animationend',done); openSheet(c.id); };
        card.addEventListener('animationend',done,{once:true});
        setTimeout(()=>{ try{ card.removeEventListener('animationend',done); }catch{} openSheet(c.id); }, 900);
      }catch{ openSheet(c.id); }
    });
    el.appendChild(card);
  });
}

function openSheet(id){
  const overlay=document.getElementById('sheet-overlay'); const frame=document.getElementById('sheet-frame'); const close=document.getElementById('sheet-close');
  if(frame){ frame.src=`charSheet.html?id=${encodeURIComponent(id)}`; }
  overlay.classList.remove('hidden'); document.querySelector('.page').classList.add('modal-blur');
  function doClose(){ if(closingGuard) return; closingGuard=true; try{ overlay.classList.add('hidden'); document.querySelector('.page').classList.remove('modal-blur'); frame.src='about:blank'; }catch{} try{ if(lastSelectedCard){ lastSelectedCard.classList.remove('magictime','puffIn'); lastSelectedCard.offsetHeight; lastSelectedCard.classList.add('magictime','puffIn'); const clear=()=>{ lastSelectedCard&&lastSelectedCard.classList.remove('magictime','puffIn'); closingGuard=false; }; lastSelectedCard.addEventListener('animationend',clear,{once:true}); setTimeout(clear, 900); } else { closingGuard=false; } }catch{ closingGuard=false; }
  }
  close.addEventListener('click',doClose,{once:true});
  overlay.addEventListener('click',(e)=>{ if(e.target===overlay){ doClose(); } });
  document.addEventListener('keydown',function esc(e){ if(e.key==='Escape'){ doClose(); } },{once:true});
}

function setupModeSwitch(){
  const rev=document.getElementById('mode-revolve'); const list=document.getElementById('mode-list');
  if(rev){ rev.addEventListener('click',()=>{ location.href='revolve.html'; }); rev.addEventListener('mouseenter',()=>playEvent('RevolveHover',{target:rev})); rev.addEventListener('mouseleave',()=>stopHover(rev)); }
  if(list){ list.addEventListener('mouseenter',()=>playEvent('RevolveHover',{target:list})); list.addEventListener('mouseleave',()=>stopHover(list)); }
}

/** removed setupCta; integrate width and click in init **/

async function setupDialogue(){
  let startPending=false; try{ startPending = sessionStorage.getItem('startDialogue')==='pending'; }catch{}
  if(!startPending) return;
  try{ sessionStorage.removeItem('startDialogue'); }catch{}
  const cfg=await fetch('dialogue.json').then(r=>r.json()).catch(()=>({}));
  const overlay=document.getElementById('dialogue-overlay'); const panel=document.getElementById('dialogue-panel'); const nameEl=document.getElementById('dlg-name'); const moodEl=document.getElementById('dlg-mood'); const textEl=document.getElementById('dlg-text'); const caret=document.getElementById('dlg-caret'); const actions=document.getElementById('dlg-actions');
  function typeLine(line){ return new Promise(resolve=>{ let i=0; caret.style.display='inline-block'; textEl.textContent=''; const t=line.text||''; nameEl.textContent=line.name||''; const speed=26; (function step(){ if(i<=t.length){ textEl.textContent=t.slice(0,i); i++; setTimeout(()=>{ if(i<=t.length) step(); else { caret.style.display='none'; resolve(); } }, speed); } })(); }); }
  function show(){ overlay.classList.remove('hidden'); overlay.classList.add('show'); }
  function setPrelude(on){ overlay.classList.toggle('prelude', !!on); }
  show(); setPrelude(true);
  for(const l of (cfg.prelude||[])){ await typeLine(l); }
  setPrelude(false);
  for(const l of ((cfg.start&&cfg.start.lines)||[])){ await typeLine(l); }
  function setChoices(keys){ actions.innerHTML=''; (keys||[]).forEach(k=>{ const def=(cfg.nodes&&cfg.nodes[k])||{}; const btn=document.createElement('button'); btn.className='choice'; const label=(cfg.start&&cfg.start.choices||[]).concat([]).find(x=>x.id===k)?.label || def.label || k; btn.textContent=label; btn.addEventListener('click',async()=>{ const node=def; actions.innerHTML=''; for(const ln of (node.lines||[])){ await typeLine(ln); } setChoices(node.choices||[]); }); actions.appendChild(btn); }); }
  setChoices((cfg.start&&cfg.start.choices)||[]);
}

function setupAudio(){
  const bgm=document.getElementById('bgm'); let audioRefreshed=false; function refreshOnce(){ if(audioRefreshed) return; audioRefreshed=true; const wasMuted=bgm.muted; try{ bgm.muted=true; setTimeout(()=>{ try{ bgm.muted=wasMuted; }catch{} }, 120); }catch{} }
  function start(){ bgm.play().then(()=>{ refreshOnce(); }).catch(()=>{}); }
  document.addEventListener('click',()=>{ start(); },{ once:true });
}

window.addEventListener('load', init);