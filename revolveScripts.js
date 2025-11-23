let characters=[];
let defaultBg="";
let currentIndex=0;
let sounds={hoverMain:null,clickMain:null,switch:null};
let eventAudio={};
let settings={switchAnimation:true,highlightColor:'#7ec8ff',arrowGapLeftPercent:10,arrowGapRightPercent:10,arrowGapBothPercent:0,animationSpeedPercent:100,centerOffsetPx:0,siteBgColor:'#0c0f12'};
let isCardAnimating=false;
let isBubbleAnimating=false;
let bubbleState={initialized:false, glowSlot:'b'};
let auto={timer:null,intervalMs:5000};

function apply(cardEl, character){
  const bg=(character.bg&&character.bg.trim())?character.bg:defaultBg;
  cardEl.querySelector('.bg').src=bg;
  cardEl.querySelector('.avatar').src='./assets/phavatar.png';
  cardEl.querySelector('.name').textContent=character.name;
  cardEl.querySelector('.handle').textContent=character.handle;
}

function render(){
  const main=document.getElementById('card-main');
  const prev=document.getElementById('card-prev');
  const next=document.getElementById('card-next');
  const preload=document.getElementById('card-preload');
  const n=characters.length;
  const i=currentIndex;
  const p=(i-1+n)%n;
  const q=(i+1)%n;
  const r=(i+2)%n;
  apply(main,characters[i]);
  apply(prev,characters[p]);
  apply(next,characters[q]);
  if(preload){apply(preload,characters[r])}
  if(!isBubbleAnimating){renderBubbles()}
  const s=document.querySelector('.stage');
  s.classList.remove('preload-left','preload-right');
  s.classList.add('preload-right');
}

async function init(){
  const assetsRes=await fetch('asset.json');
  const assets=await assetsRes.json().catch(()=>({}));
  const res=await fetch('data.json');
  const raw=await res.json();
  const dataSection=raw.data||raw;
  const settingsSection=raw.settings||raw.settings||{};
  characters=dataSection.characters||[];
  defaultBg=(assets.revolve&&assets.revolve.defaultBg)||dataSection.defaultBg||"";
  const events=assets.events||{};
  Object.keys(events).forEach(k=>{ const v=events[k]||{}; if(v.src){ const a=new Audio(v.src); a.volume=typeof v.volume==='number'?v.volume:0.5; eventAudio[k]=a; } });
  const page=settingsSection.page||settingsSection||{};
  const cards=settingsSection.cards||{};
  const bubble=settingsSection.bubble||{};
  const controls=settingsSection.controls||{};
  const switchButtons=controls.switchButtons||{};
  if(typeof cards.switchAnimation!=="undefined"){settings.switchAnimation=!!cards.switchAnimation}
  if(cards.highlightColor){settings.highlightColor=cards.highlightColor}
  if(typeof page.arrowGapLeftPercent!=="undefined"){settings.arrowGapLeftPercent=Number(page.arrowGapLeftPercent)||0}
  if(typeof page.arrowGapRightPercent!=="undefined"){settings.arrowGapRightPercent=Number(page.arrowGapRightPercent)||0}
  if(typeof page.arrowGapBothPercent!=="undefined"){settings.arrowGapBothPercent=Number(page.arrowGapBothPercent)||0}
  if(typeof cards.animationSpeedPercent!=="undefined"){settings.animationSpeedPercent=Math.max(1,Number(cards.animationSpeedPercent)||100)}
  if(typeof bubble.gapPx!=="undefined"){document.documentElement.style.setProperty('--bubble-gap',`${Number(bubble.gapPx)||20}px`)}
  if(typeof page.centerOffsetPx!=="undefined"){document.documentElement.style.setProperty('--center-offset',`${Number(page.centerOffsetPx)||0}px`)}
  if(typeof page.siteBgColor!=="undefined"){document.body.style.backgroundColor=String(page.siteBgColor)}
  if(typeof cards.showHandles!=="undefined"&&!cards.showHandles){document.body.classList.add('no-handles')} else {document.body.classList.remove('no-handles')}
  document.documentElement.style.setProperty('--hl',settings.highlightColor);
  if(switchButtons.fillColor){document.documentElement.style.setProperty('--mode-fill',String(switchButtons.fillColor))}
  if(switchButtons.borderColor){document.documentElement.style.setProperty('--mode-border',String(switchButtons.borderColor))}
  const leftGap=((settings.arrowGapLeftPercent+settings.arrowGapBothPercent)/100);
  const rightGap=((settings.arrowGapRightPercent+settings.arrowGapBothPercent)/100);
  document.documentElement.style.setProperty('--arrow-gap-left',`calc(var(--card-w)*${leftGap})`);
  document.documentElement.style.setProperty('--arrow-gap-right',`calc(var(--card-w)*${rightGap})`);
  const baseP1=250, baseP2=360; const scale=100/settings.animationSpeedPercent;
  document.documentElement.style.setProperty('--phase1-dur',`${Math.round(baseP1*scale)}ms`);
  document.documentElement.style.setProperty('--phase2-dur',`${Math.round(baseP2*scale)}ms`);
  const baseGlow=220; document.documentElement.style.setProperty('--glow-dur',`${Math.round(baseGlow*scale)}ms`);
  if(cards.main){
    if(typeof cards.main.opacity!=="undefined"){document.documentElement.style.setProperty('--main-opacity',String(cards.main.opacity))}
    if(typeof cards.main.centerOffsetPx!=="undefined"){document.documentElement.style.setProperty('--main-offset-px',`${Number(cards.main.centerOffsetPx)||0}px`)}
    if(typeof cards.main.zIndex!=="undefined"){document.documentElement.style.setProperty('--z-main',String(cards.main.zIndex))}
    if(cards.main.tilt){
      const t=cards.main.tilt; document.documentElement.style.setProperty('--main-tilt-x',`${Number(t.xDeg||0)}deg`); document.documentElement.style.setProperty('--main-tilt-y',`${Number(t.yDeg||0)}deg`); document.documentElement.style.setProperty('--main-tilt-z',`${Number(t.zDeg||0)}deg`);
    }
    if(typeof cards.main.scaleSm!=="undefined"){document.documentElement.style.setProperty('--scale-sm',String(cards.main.scaleSm))}
  }
  if(cards.prev){
    if(typeof cards.prev.opacity!=="undefined"){document.documentElement.style.setProperty('--prev-opacity',String(cards.prev.opacity))}
    if(typeof cards.prev.offsetFactor!=="undefined"){document.documentElement.style.setProperty('--prev-offset-factor',String(cards.prev.offsetFactor))}
    if(typeof cards.prev.zIndex!=="undefined"){document.documentElement.style.setProperty('--z-prev',String(cards.prev.zIndex))}
    if(cards.prev.tilt){
      const t=cards.prev.tilt; document.documentElement.style.setProperty('--prev-tilt-x',`${Number(t.xDeg||0)}deg`); document.documentElement.style.setProperty('--prev-tilt-y',`${Number(t.yDeg||0)}deg`); document.documentElement.style.setProperty('--prev-tilt-z',`${Number(t.zDeg||0)}deg`);
    }
    if(typeof cards.prev.scale!=="undefined"){document.documentElement.style.setProperty('--prev-scale',String(cards.prev.scale))}
  }
  if(cards.next){
    if(typeof cards.next.opacity!=="undefined"){document.documentElement.style.setProperty('--next-opacity',String(cards.next.opacity))}
    if(typeof cards.next.offsetFactor!=="undefined"){document.documentElement.style.setProperty('--next-offset-factor',String(cards.next.offsetFactor))}
    if(typeof cards.next.zIndex!=="undefined"){document.documentElement.style.setProperty('--z-next',String(cards.next.zIndex))}
    if(cards.next.tilt){
      const t=cards.next.tilt; document.documentElement.style.setProperty('--next-tilt-x',`${Number(t.xDeg||0)}deg`); document.documentElement.style.setProperty('--next-tilt-y',`${Number(t.yDeg||0)}deg`); document.documentElement.style.setProperty('--next-tilt-z',`${Number(t.zDeg||0)}deg`);
    }
    if(typeof cards.next.scale!=="undefined"){document.documentElement.style.setProperty('--next-scale',String(cards.next.scale))}
  }
  characters=characters.slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')));
  const params=new URLSearchParams(location.search);
  const id=params.get('id');
  if(id){
    const idx=characters.findIndex(c=>c.id===id);
    currentIndex=idx>=0?idx:0;
  }
  render();
  document.getElementById('arrow-left').addEventListener('click',()=>{navigate('right','manual')});
  document.getElementById('arrow-right').addEventListener('click',()=>{navigate('left','manual')});
  const stage=document.querySelector('.stage');
  stage.addEventListener('click',(e)=>{
    const rect=stage.getBoundingClientRect();
    const mid=rect.left+rect.width/2;
    
    // Calculate height limits: between About Us title and switch buttons
    const aboutTitle=document.querySelector('.about-title');
    const uiStack=document.querySelector('.ui-stack');
    const aboutTitleRect=aboutTitle.getBoundingClientRect();
    const uiStackRect=uiStack.getBoundingClientRect();
    
    // Only trigger navigation if click is within the valid height range
      if(e.clientY > aboutTitleRect.bottom && e.clientY < uiStackRect.top) {
      if(e.clientX<mid){navigate('right','manual')} else {navigate('left','manual')}
      }
  });
  const modeIcons=(assets.revolve&&assets.revolve.modeIcons)||{};
  const modeRevolveBtn=document.querySelector('#mode-revolve img');
  const modeListBtn=document.querySelector('#mode-list img');
  if(modeRevolveBtn&&modeIcons.revolve){modeRevolveBtn.src=modeIcons.revolve}
  if(modeListBtn&&modeIcons.list){modeListBtn.src=modeIcons.list}
  const twitch=settingsSection.twitch||{};
  const cta=document.getElementById('cta-purple');
  const ctaHandle=document.getElementById('cta-handle');
  const ctaIcon=document.getElementById('cta-icon');
  if(ctaHandle&&typeof twitch.handle!=="undefined"){ ctaHandle.textContent=String(twitch.handle); }
  if(ctaIcon&&twitch.icon){ ctaIcon.src=String(twitch.icon); }
  function adjustCtaWidth(){
    if(!cta||!ctaHandle) return;
    const iconW=ctaIcon?ctaIcon.getBoundingClientRect().width:0;
    const padL=parseFloat(getComputedStyle(cta).paddingLeft)||0;
    const padR=parseFloat(getComputedStyle(cta).paddingRight)||0;
    const textW=Math.ceil(ctaHandle.scrollWidth);
    const desired=Math.ceil(iconW + textW + padL + padR + 10);
    cta.style.width=desired+"px";
  }
  adjustCtaWidth();
  window.addEventListener('resize',adjustCtaWidth);
  if(cta && twitch.link){ cta.addEventListener('click',()=>{ try{ window.open(String(twitch.link),'_blank','noopener,noreferrer'); }catch{} }); }
  const main=document.getElementById('card-main');
  let dragStartX=null;
  main.addEventListener('mouseenter',()=>{const a=eventAudio['CardHover']; if(a){a.currentTime=0; a.play().catch(()=>{})}});
  main.addEventListener('pointerdown',(e)=>{
    dragStartX=e.clientX;
  });
  main.addEventListener('click',(e)=>{
    // Don't open sheet if we were dragging
    if(dragStartX!==null && Math.abs(e.clientX-dragStartX)>10){
      dragStartX=null;
      return;
    }
    dragStartX=null;
    
    e.stopPropagation();
    { const a=eventAudio['CardClick']; if(a){a.currentTime=0; a.play().catch(()=>{})} }
    const c=characters[currentIndex];
    if(c&&c.id){ openSheet(c.id); }
  });
  setupSwipe();
  function handleResize(){ if(!isBubbleAnimating){ renderBubbles(); } }
  stage.addEventListener('mouseenter',(e)=>{
    const pt=document.elementFromPoint(e.clientX, e.clientY);
    if(pt && (pt.closest('.card')||pt.closest('.arrow'))) return;
    const a=eventAudio['RevolveHover']; if(a){a.currentTime=0; a.play().catch(()=>{})}
  });
  window.addEventListener('resize',handleResize);
  document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible'){ ensureGlow(); const t=document.getElementById('about-title'); if(t){ t.classList.remove('animate__animated','animate__slideInDown'); t.offsetHeight; t.classList.add('animate__animated','animate__slideInDown'); t.addEventListener('animationend',()=>{ t.classList.remove('animate__animated','animate__slideInDown'); },{once:true}); } } });
  setupAutoRotate();
}
init();

function navigate(direction,mode){
  if(isCardAnimating||isBubbleAnimating)return;
  const dir=direction==='left'?1:-1;
  if(mode==='manual'){
    const a=eventAudio[direction==='left'?'CardNext':'CardPrev']; if(a){a.currentTime=0; a.play().catch(()=>{})}
  }
  if(!settings.switchAnimation){
    currentIndex=(currentIndex+dir+characters.length)%characters.length;
    render();
    return;
  }
  const s=document.querySelector('.stage');
  const preload=document.getElementById('card-preload');
  if(preload){
    const n=characters.length;const i=currentIndex;
    const idx=direction==='left'?((i+2)%n):((i-2+n)%n);
    apply(preload,characters[idx]);
  }
  animateBubbles(direction);
  isCardAnimating=true;
  s.classList.remove('anim-left','anim-right','preload-left','preload-right','size-left','size-right','move-left','move-right','phase1','phase2');
  s.classList.add(direction==='left'?'preload-right':'preload-left');
  s.classList.add('phase1');
  s.offsetHeight;
  s.classList.add(direction==='left'?'size-left':'size-right');
  const scale=100/settings.animationSpeedPercent; const gapMs=Math.round(140*scale); const moveMs=Math.round(360*scale);
  setTimeout(()=>{
    s.classList.remove('phase1');
    s.classList.add('phase2');
    s.classList.add(direction==='left'?'move-left':'move-right');
  setTimeout(()=>{
      currentIndex=(currentIndex+dir+characters.length)%characters.length;
      s.classList.remove('phase2','size-left','size-right','move-left','move-right','preload-left','preload-right');
      s.classList.add('finalize');
      render();
      const main=document.getElementById('card-main');
      if(main){main.classList.add('settle');setTimeout(()=>{main.classList.remove('settle')},Math.round(220*(100/settings.animationSpeedPercent)))}
      s.offsetHeight;
      s.classList.remove('finalize');
      isCardAnimating=false;
    },moveMs);
  },gapMs);
}

function openSheet(id){
  const overlay=document.getElementById('sheet-overlay');
  const frame=document.getElementById('sheet-frame');
  const close=document.getElementById('sheet-close');
  if(frame){ frame.src=`charSheet.html?id=${encodeURIComponent(id)}`; }
  overlay.classList.remove('hidden');
  document.querySelector('.page').classList.add('modal-blur');
  function doClose(){ overlay.classList.add('hidden'); document.querySelector('.page').classList.remove('modal-blur'); frame.src='about:blank'; }
  close.addEventListener('click',doClose,{once:true});
  overlay.addEventListener('click',(e)=>{ if(e.target===overlay){ doClose(); } });
  document.addEventListener('keydown',function esc(e){ if(e.key==='Escape'){ doClose(); } },{once:true});
}

function renderBubbles(){
  const el=document.getElementById('tracker');
  el.innerHTML='';
  const slots=['a','b','c'];
  slots.forEach(slot=>{
    const slotEl=document.createElement('div');
    slotEl.className=`bubble-slot slot-${slot}`;
    const bubble=document.createElement('div');
    bubble.className='bubble';
    bubble.setAttribute('data-slot',slot);
    slotEl.appendChild(bubble);
    el.appendChild(slotEl);
  });
  const n=characters.length; const i=currentIndex;
  bubbleState.glowSlot = i===0 ? 'a' : (i===n-1 ? 'c' : 'b');
  ensureGlow();
}

function ensureGlow(){
  const el=document.getElementById('tracker');
  const glowExisting=el.querySelector('.bubble-glow');
  const targetSlot=el.querySelector(`.bubble-slot.slot-${bubbleState.glowSlot} .bubble`);
  if(!targetSlot) return;
  if(!glowExisting){
    const glow=document.createElement('div');
    glow.className='bubble-glow';
    targetSlot.appendChild(glow);
  }else{
    glowExisting.parentNode&&glowExisting.parentNode.removeChild(glowExisting);
    targetSlot.appendChild(glowExisting);
  }
}

function despawnBubble(slot){
  const el=document.getElementById('tracker');
  const bubble=el.querySelector(`.bubble-slot.slot-${slot} .bubble`);
  if(!bubble) return Promise.resolve();
  return new Promise(resolve=>{
    bubble.classList.add('despawn');
    bubble.addEventListener('transitionend',function handler(){
      bubble.removeEventListener('transitionend',handler);
      bubble.parentNode&&bubble.parentNode.removeChild(bubble);
      resolve();
    });
  });
}

function spawnBubble(slot){
  const el=document.getElementById('tracker');
  const slotEl=el.querySelector(`.bubble-slot.slot-${slot}`);
  if(!slotEl) return Promise.resolve();
  const bubble=document.createElement('div');
  bubble.className='bubble spawn';
  bubble.setAttribute('data-slot',slot);
  slotEl.appendChild(bubble);
  bubble.offsetHeight;
  bubble.classList.add('spawn-in');
  return new Promise(resolve=>{
    bubble.addEventListener('transitionend',function handler(){
      bubble.removeEventListener('transitionend',handler);
      bubble.classList.remove('spawn','spawn-in');
      resolve();
    });
  });
}

function animateBubbles(direction){
  if(isBubbleAnimating) return;
  const el=document.getElementById('tracker');
  const scale=100/settings.animationSpeedPercent; const moveMs=Math.round(360*scale);
  const n=characters.length; const dir = direction==='left'?1:-1; const newIndex=(currentIndex+dir+n)%n;
  isBubbleAnimating=true;
  if(direction==='left'){
    despawnBubble('a').then(()=>{
      el.classList.add('moving-left');
      setTimeout(()=>{
        el.classList.remove('moving-left');
        const aSlot=el.querySelector('.bubble-slot.slot-a');
        const bSlot=el.querySelector('.bubble-slot.slot-b');
        const cSlot=el.querySelector('.bubble-slot.slot-c');
        const bBubble=bSlot.querySelector('.bubble');
        const cBubble=cSlot.querySelector('.bubble');
        if(bBubble){bSlot.removeChild(bBubble); aSlot.appendChild(bBubble);}        
        if(cBubble){cSlot.removeChild(cBubble); bSlot.appendChild(cBubble);}        
        const glow=el.querySelector('.bubble-glow');
        const targetA=aSlot.querySelector('.bubble');
        if(glow&&glow.parentNode!==targetA){ glow.parentNode&&glow.parentNode.removeChild(glow); targetA&&targetA.appendChild(glow); }
        spawnBubble('c').then(()=>{
          bubbleState.glowSlot = newIndex===0 ? 'a' : (newIndex===n-1 ? 'c' : 'b');
          ensureGlow();
          isBubbleAnimating=false;
        });
      },moveMs);
    });
  }else{
    despawnBubble('c').then(()=>{
      el.classList.add('moving-right');
      setTimeout(()=>{
        el.classList.remove('moving-right');
        const aSlot=el.querySelector('.bubble-slot.slot-a');
        const bSlot=el.querySelector('.bubble-slot.slot-b');
        const cSlot=el.querySelector('.bubble-slot.slot-c');
        const aBubble=aSlot.querySelector('.bubble');
        const bBubble=bSlot.querySelector('.bubble');
        if(bBubble){bSlot.removeChild(bBubble); cSlot.appendChild(bBubble);}        
        if(aBubble){aSlot.removeChild(aBubble); bSlot.appendChild(aBubble);}        
        const glow=el.querySelector('.bubble-glow');
        const targetC=cSlot.querySelector('.bubble');
        if(glow&&glow.parentNode!==targetC){ glow.parentNode&&glow.parentNode.removeChild(glow); targetC&&targetC.appendChild(glow); }
        spawnBubble('a').then(()=>{
          bubbleState.glowSlot = newIndex===0 ? 'a' : (newIndex===n-1 ? 'c' : 'b');
          ensureGlow();
          isBubbleAnimating=false;
        });
      },moveMs);
    });
  }
}

function startAuto(){ if(auto.timer) return; auto.timer=setInterval(()=>{ if(!isCardAnimating&&!isBubbleAnimating){ navigate('left'); } },auto.intervalMs); }
function stopAuto(){ if(!auto.timer) return; clearInterval(auto.timer); auto.timer=null; }
function setupAutoRotate(){
  startAuto();
  const stage=document.querySelector('.stage');
  stage.addEventListener('mouseenter',stopAuto);
  stage.addEventListener('mouseleave',startAuto);
  stage.addEventListener('pointerdown',stopAuto);
  window.addEventListener('blur',stopAuto);
  window.addEventListener('focus',startAuto);
  document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible'){ startAuto(); } else { stopAuto(); } });
}

function setupSwipe(){
  const s=document.querySelector('.stage');
  const mainCard=document.getElementById('card-main');
  let startX=0;
  let startT=0;
  let isDragging=false;
  let dragThreshold=10; // Minimum drag distance to trigger navigation
  
  function pd(e){
    // Only start dragging if clicking on the main card (not on other elements)
    const target=e.target;
    if(!mainCard.contains(target)) return;
    
    startX=(e.touches?e.touches[0].clientX:e.clientX);
    startT=performance.now();
    isDragging=false;
    s.classList.add('dragging');
  }
  
  function pm(e){
    if(startX===0) return; // Not dragging
    const currentX=(e.touches?e.touches[0].clientX:e.clientX);
    const dx=currentX-startX;
    
    // Only consider it a drag if we've moved past the threshold
    if(Math.abs(dx) > dragThreshold) {
      isDragging=true;
    }
  }
  
  function pu(e){
    if(startX===0) return; // Not dragging
    
    const endX=(e.touches&&e.touches[0]?e.touches[0].clientX:(e.changedTouches&&e.changedTouches[0]?e.changedTouches[0].clientX:e.clientX));
    const dx=(endX||startX)-startX;
    const dt=Math.max(1,performance.now()-startT);
    const v=dx/dt;
    
    s.classList.remove('dragging');
    
    // Only navigate if we were actually dragging
    if(isDragging) {
      if(v<-0.6||dx<-60){navigate('left','manual')}
      else if(v>0.6||dx>60){navigate('right','manual')}
    }
    
    // Reset
    startX=0;
    isDragging=false;
  }
  
  s.addEventListener('pointerdown',pd,{passive:true});
  window.addEventListener('pointermove',pm,{passive:true});
  window.addEventListener('pointerup',pu,{passive:true});
  s.addEventListener('touchstart',pd,{passive:true});
  window.addEventListener('touchmove',pm,{passive:true});
  window.addEventListener('touchend',pu,{passive:true});
}
