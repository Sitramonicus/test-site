function qs(p){return new URLSearchParams(location.search).get(p)}
function el(id){return document.getElementById(id)}

function monthsBetween(birth){
  if(!birth) return {years:0, months:0, days:0};
  const b=new Date(birth);
  if(isNaN(b.getTime())) return {years:0, months:0, days:0};
  const now=new Date();
  let years=now.getFullYear()-b.getFullYear();
  let months=now.getMonth()-b.getMonth();
  let days=now.getDate()-b.getDate();
  if(days<0){
    const prevMonth=new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days+=prevMonth; months-=1;
  }
  while(months<0){ months+=12; years-=1; }
  if(years<0){ years=0; months=0; days=0; }
  months=Math.max(0, Math.min(11, months));
  return {years, months, days};
}

function fitTextToContainer(el){
  if(!el) return;
  const parent=el.parentElement; if(!parent) return;
  const available=parent.getBoundingClientRect().width - 16; // margin
  let size=parseFloat(getComputedStyle(el).fontSize)||24;
  const min=12; const max=48;
  size=Math.min(Math.max(size, min), max);
  el.style.fontSize=size+"px";
  let loops=0;
  while(el.scrollWidth>available && size>min && loops<24){ size-=1; el.style.fontSize=size+"px"; loops++; }
}

function mkStat(iconSrc, label, val, side){
  const d=document.createElement('div'); d.className= side==='right' ? 'stat right' : 'stat';
  const img=document.createElement('img'); img.className='icon'; img.alt=label; img.src=iconSrc||'';
  const t=document.createElement('div'); t.className='text';
  const v=document.createElement('div'); v.className='value'; v.textContent=(val??'-');
  const l=document.createElement('div'); l.className='label'; l.textContent=String(label||'');
  t.appendChild(v); t.appendChild(l);
  if(side==='right'){ d.appendChild(t); d.appendChild(img); }
  else{ d.appendChild(img); d.appendChild(t); }
  return d;
}

Promise.all([
  fetch('data.json').then(r=>r.json()).catch(()=>({})),
  fetch('asset.json').then(r=>r.json()).catch(()=>({}))
]).then(([raw, assets])=>{
  const data=raw.data||raw; const id=qs('id');
  const c=(data.characters||[]).find(x=>x.id===id)|| (data.characters||[])[0];
  if(!c) return;
  el('name').textContent=c.name||'Character';
  el('bg').src=(c.bg && String(c.bg).trim())?c.bg:(data.defaultBg||'');
  el('avatar').src='./assets/phavatar.png';
  fitTextToContainer(el('name'));
  window.addEventListener('resize',()=>fitTextToContainer(el('name')));

  const statIcons=(assets.stats||{});
  const events=(assets.events||{});
  const eventAudio={};
  Object.keys(events).forEach(k=>{ const v=events[k]||{}; if(v.src){ const au=new Audio(v.src); au.volume=typeof v.volume==='number'?v.volume:0.5; eventAudio[k]=au; } });
  function playEvent(name){ const au=eventAudio[name]; if(au){ try{ au.currentTime=0; au.play().catch(()=>{}); }catch{} } }
  const iconLeft=statIcons.leftIcon||''; const iconRight=statIcons.rightIcon||iconLeft||'';
  const perIcons=(statIcons.icons||{});
  if(typeof statIcons.iconSizePx!=="undefined"){ document.documentElement.style.setProperty('--stat-icon-size', `${Number(statIcons.iconSizePx)||24}px`); }
  const left=['wisdom','dexterity','intelligence'];
  const right=['strength','charisma','constitution'];
  left.forEach(k=>{ const src=perIcons[k]||iconLeft; el('stats-left').appendChild(mkStat(src, k, c[k], 'left')); });
  right.forEach(k=>{ const src=perIcons[k]||iconRight; el('stats-right').appendChild(mkStat(src, k, c[k], 'right')); });

  // Visibility switch
  const switchEl=document.getElementById('vis-switch');
  const visIcon=document.getElementById('vis-icon');
  const initialVisible = (raw.settings&&typeof raw.settings.stat_visibility!=="undefined")?!!raw.settings.stat_visibility:true;
  let visible=initialVisible;
  function setVisible(on){
    visible=!!on;
    const leftBox=el('stats-left'); const rightBox=el('stats-right');
    const doAnim=(box, name)=>{
      box.classList.remove('animate__animated','animate__fadeOutLeftBig','animate__fadeOutRightBig','animate__zoomInLeft','animate__zoomInRight');
      box.offsetHeight;
      box.classList.add('animate__animated', name);
      box.addEventListener('animationend',()=>{
        box.classList.remove('animate__animated', name);
        if(!visible){ box.style.visibility='hidden'; box.style.zIndex='0'; }
      },{once:true});
    };
    if(on){
      visIcon.src='./assets/vis.png'; switchEl.classList.remove('off');
      leftBox.style.visibility='visible'; rightBox.style.visibility='visible'; leftBox.style.zIndex='2'; rightBox.style.zIndex='2';
      doAnim(leftBox,'animate__zoomInLeft'); doAnim(rightBox,'animate__zoomInRight');
    }else{
      visIcon.src='./assets/novis.png'; switchEl.classList.add('off');
      doAnim(leftBox,'animate__fadeOutLeftBig'); doAnim(rightBox,'animate__fadeOutRightBig');
    }
  }
  switchEl.addEventListener('click',()=>{ playEvent('VisSwitch'); setVisible(!visible); });
  setVisible(initialVisible);

  const storedAges = JSON.parse(sessionStorage.getItem('characterAges')||'{}');
  const age = storedAges[c.id] || monthsBetween(c.birthdate);
  const lvl=age.years; const month=age.months;
  el('lvl-value').textContent=`LVL: ${lvl}`;
  const fill=el('xp-fill');
  if(fill){ fill.style.width = ((month/12)*100) + '%'; }
  const desc=el('tab-desc');
  if(Array.isArray(c.desc)){
    const frag=document.createDocumentFragment();
    const ul=document.createElement('ul');
    c.desc.forEach(d=>{
      if(d && d.type==='p'){
        const p=document.createElement('p'); p.textContent=String(d.content||''); frag.appendChild(p);
      }else if(d && d.type==='b'){
        const li=document.createElement('li'); li.textContent=String(d.content||''); ul.appendChild(li);
      }
    });
    if(ul.childNodes.length){ frag.appendChild(ul); }
    desc.innerHTML=''; desc.appendChild(frag);
  }else{
    desc.textContent=c.desc||'';
  }

  const items=(data.items||[]).filter(i=> (c.items||[]).includes(i.id));
  const p=el('tab-portfolio');
  
  // Create inventory container
  const inventoryContainer=document.createElement('div');
  inventoryContainer.className='inventory-container';
  
  // Create inventory slots (6 slots in 2 rows of 3)
  const slotsContainer=document.createElement('div');
  slotsContainer.className='inventory-slots';
  
  let selectedSlot=null;
  let selectedItem=null;
  
  // Create 6 slots
  for(let i=0; i<6; i++){
    const slot=document.createElement('div');
    slot.className='inventory-slot';
    slot.dataset.slotIndex=i;
    
    // Add item if available
    if(items[i]){
      const itemImg=document.createElement('img');
      itemImg.src=items[i].image||'./assets/tempItem.png';
      itemImg.alt=items[i].title||'Item';
      slot.appendChild(itemImg);
      slot.dataset.itemId=items[i].id;
    }
    
    slot.addEventListener('mouseenter',()=>{ playEvent('InventoryHover'); });
    slot.addEventListener('click',()=>{
      // Remove previous selection
      document.querySelectorAll('.inventory-slot').forEach(s=>s.classList.remove('selected'));
      
      // Select current slot
      if(slot.dataset.itemId){
        slot.classList.add('selected');
        selectedSlot=slot;
        selectedItem=items.find(item=>item.id===slot.dataset.itemId);
        playEvent('InventorySelect');
        updateItemDetails(selectedItem);
      }
    });
    
    slotsContainer.appendChild(slot);
  }
  
  // Create details container
  const detailsContainer=document.createElement('div');
  detailsContainer.className='inventory-details';
  detailsContainer.innerHTML=`
    <div class="dispbox-container">
      <div class="dispbox" id="dispbox">
        <span style="color:#666;font-size:0.9rem;">Select an item</span>
      </div>
      <div class="item-info">
        <div class="item-name" id="item-name">—</div>
        <div class="item-desc" id="item-desc">Select an item from your inventory to view details.</div>
        <div class="related-links" id="related-links">
          <h3>Related Links:</h3>
        </div>
      </div>
    </div>
  `;
  
  function syncDispboxSize(){
    const dispbox=document.getElementById('dispbox');
    const itemName=document.getElementById('item-name');
    const header=document.querySelector('#related-links h3');
    if(!(dispbox && itemName && header)) return;
    const nameRect=itemName.getBoundingClientRect();
    const hRect=header.getBoundingClientRect();
    const desired=Math.max(0, Math.round(hRect.bottom - nameRect.top));
    dispbox.style.height=Math.max(80, desired) + 'px';
  }
  
  // Function to update item details
  function updateItemDetails(item){
    if(!item) return;
    
    const dispbox=document.getElementById('dispbox');
    const itemName=document.getElementById('item-name');
    const itemDesc=document.getElementById('item-desc');
    const relatedLinks=document.getElementById('related-links');
    
    // Update dispbox
    dispbox.innerHTML='';
    const img=document.createElement('img');
    img.src=item.image||'./assets/tempItem.png';
    img.alt=item.title||'Item';
    dispbox.appendChild(img);
    
    // Update name and description
    itemName.textContent=item.title||'—';
    itemDesc.textContent=item.desc||'—';
    
    // Update related links
    relatedLinks.innerHTML='<h3>Related Links:</h3>';
    if(item.links && item.links.length>0){
      item.links.forEach(link=>{
        const linkBtn=document.createElement('a');
        linkBtn.href=link;
        linkBtn.target='_blank';
        linkBtn.rel='noopener noreferrer';
        linkBtn.className='link-button';
        linkBtn.innerHTML='<img src="./assets/link.png" alt="link" />';
        relatedLinks.appendChild(linkBtn);
      });
    }
    // Recompute size after content changes
    requestAnimationFrame(syncDispboxSize);
  }
  
  inventoryContainer.appendChild(slotsContainer);
  inventoryContainer.appendChild(detailsContainer);
  // Initial sizing
  requestAnimationFrame(syncDispboxSize);
  
  if(items.length>0){
    p.appendChild(inventoryContainer);
  } else {
    p.textContent='No portfolio items.';
  }
  const s=el('tab-socials');
  function buildSocialOrbit(){
    s.innerHTML='';
    const box=document.createElement('div'); box.className='socials-box';
    const stage=document.createElement('div'); stage.className='socials-stage';
    const axis=document.createElement('div'); axis.className='axis-wrap';
    stage.appendChild(axis); box.appendChild(stage); s.appendChild(box);
    const rect=box.getBoundingClientRect();
    const autoBaseline=Math.max(160, Math.floor(Math.min(rect.width, rect.height) * 0.9));
    const scfg=(raw.settings&&raw.settings.socials&&raw.settings.socials.diameter)||{};
    const baseVal=Number((scfg.base&&scfg.base.value)!=null?scfg.base.value:1.3);
    const baseUnit=String((scfg.base&&scfg.base.unit)||'scale');
    const minVal=(scfg.min&&scfg.min.value)!=null?scfg.min.value:0;
    const minUnit=String((scfg.min&&scfg.min.unit)||'auto');
    const compat=(scfg.compatSmoothing||{});
    const orbFactor=typeof compat.orbSizeFactor==='number'?compat.orbSizeFactor:0.2;
    const centerGapPx=typeof compat.centerGapPx==='number'?compat.centerGapPx:16;
    const bannerMaxH=typeof compat.bannerMaxHeightPx==='number'?compat.bannerMaxHeightPx:48;
    const baseCandidate = (baseUnit==='px')? Math.max(0, Number(baseVal)) : Math.floor(autoBaseline * (Number(baseVal)||1.3));
    const minResolved = (minUnit==='px')? Math.max(0, Number(minVal)) : autoBaseline;
    const ringSize=Math.max(minResolved, baseCandidate);
    const orbSize=Math.max(44, Math.min(72, Math.floor(ringSize * orbFactor)));
    const centerSize=Math.max(60, ringSize - orbSize - centerGapPx);
    const R=Math.floor(ringSize / 2);
    axis.style.width=ringSize+'px'; axis.style.height=ringSize+'px';
    const ring=document.createElement('div'); ring.className='ring'; ring.style.width=ringSize+'px'; ring.style.height=ringSize+'px'; axis.appendChild(ring);
    const center=document.createElement('div'); center.className='center'; center.style.width=centerSize+'px'; center.style.height=centerSize+'px';
    const bg=document.createElement('div'); bg.className='bg'; bg.style.backgroundImage=`url('${(c.bg && String(c.bg).trim())?c.bg:(data.defaultBg||'')}')`;
    const fg=document.createElement('img'); fg.className='fg'; fg.src='./assets/phavatar.png'; fg.alt='emblem';
    center.appendChild(bg); center.appendChild(fg); axis.appendChild(center);
    const orbit=document.createElement('div'); orbit.className='orbit'; orbit.style.width=ringSize+'px'; orbit.style.height=ringSize+'px'; axis.appendChild(orbit);
    const socialsRaw=assets.socialsRepo||{};
    const sitesRaw=assets.sitesRepo||{};
    let ls={}; try{ ls=JSON.parse(localStorage.getItem('socialsRepo')||'{}')||{}; }catch{}
    const repo=Object.assign({}, socialsRaw, ls);
    const used=new Set();
    (data.characters||[]).forEach(ch=>{ (ch.socials||[]).forEach(si=>{ if(si&&si.name) used.add(String(si.name)); }); });
    const now=Date.now();
    Object.keys(repo).forEach(k=>{
      const v=repo[k]||{}; const lu=v.lastUsed?Number(v.lastUsed):0; if(v.created!=='default' && !used.has(k) && lu && now-lu>3*24*60*60*1000){ delete repo[k]; }
    });
    (data.characters||[]).forEach(ch=>{ (ch.socials||[]).forEach(si=>{ const key=String(si.name||''); if(key && !repo[key]){ repo[key]={ icon:'', color:'', created: String(new Date().toISOString()) }; } }); });
    Object.keys(repo).forEach(k=>{ if(repo[k] && !repo[k].created){ repo[k].created=String(new Date().toISOString()); } });
    localStorage.setItem('socialsRepo', JSON.stringify(repo));
    const items=(c.socials||[]);
    if(!items.length){ s.textContent='No socials.'; return; }
    const n=items.length;
    const rotation=(raw.settings&&raw.settings.socials&&raw.settings.socials.rotation)||{};
    let lastAngle=0; let startTime=performance.now(); let spinMs=(typeof rotation.revolutionMs==='number'?rotation.revolutionMs:12000); let rafId=null;
    const bcfg=(raw.settings&&raw.settings.socials&&raw.settings.socials.banner)||{};
    const gapCfg=typeof bcfg.gapPx==='number'?bcfg.gapPx:12;
    const marginCfg=typeof bcfg.marginPx==='number'?bcfg.marginPx:12;
    const vOffsetCfg=typeof bcfg.verticalOffsetPx==='number'?bcfg.verticalOffsetPx:0;
    const ptr=(bcfg.pointer||{});
    const ptrSize=typeof ptr.sizePx==='number'?ptr.sizePx:12;
    const ptrOffset=(typeof ptr.offsetPx==='number'?ptr.offsetPx:-6);
    const ptrRadius=(typeof ptr.radiusPx==='number'?ptr.radiusPx:2);
    items.forEach((it,i)=>{
      const angle=(360/n)*i;
      const el=document.createElement('button'); el.className='orb'; el.setAttribute('aria-label', (it.name||'') + ' ' + (it.handle||c.handle||'')); el.style.width=orbSize+'px'; el.style.height=orbSize+'px';
      el.style.marginLeft=(orbSize/-2)+'px'; el.style.marginTop=(orbSize/-2)+'px';
      el.style.transform=`rotate(${angle}deg) translateX(${R}px) rotate(${-angle}deg)`;
      const logo=document.createElement('img'); logo.className='logo';
      const rpKey=String(it.name||'');
      if(rpKey){ if(!repo[rpKey]) repo[rpKey]={}; if(!repo[rpKey].icon) repo[rpKey].icon='./assets/link.png'; if(!repo[rpKey].color) repo[rpKey].color='#000000'; }
      const rp=repo[rpKey]||{}; const icon= (rp.icon && String(rp.icon).trim()) ? rp.icon : './assets/link.png';
      logo.src=icon; logo.alt=it.name||'social'; logo.style.width='62%'; logo.style.height='62%'; logo.style.objectFit='contain';
      el.appendChild(logo);
      const col=String(rp.color||'').trim()||'#ffffff';
      const hh=col.replace('#','');
      const hex=hh.length===3? hh.split('').map(x=>x+x).join('') : hh;
      const r=parseInt(hex.substring(0,2),16)||0; const g=parseInt(hex.substring(2,4),16)||0; const b=parseInt(hex.substring(4,6),16)||0;
      el.style.setProperty('--orb-color', '#'+hex);
      el.style.setProperty('--orb-glow', `rgba(${r},${g},${b},0.35)`);
      const banner=document.createElement('div'); banner.className='banner'; banner.innerHTML=`<span class="handle">${it.handle||c.handle||''}</span><span class="cta">Visit</span>`; banner.style.maxHeight=bannerMaxH+'px';
      banner.style.setProperty('--pointer-size', ptrSize+'px');
      banner.style.setProperty('--pointer-offset', ptrOffset+'px');
      banner.style.setProperty('--pointer-radius', ptrRadius+'px');
      document.body.appendChild(banner);
      let retractTimer=null; let clickedOnce=false;
      function showBanner(){
        orbit.classList.add('paused');
        if(!document.body.contains(banner)) document.body.appendChild(banner);
        banner.style.visibility='hidden';
        const bRect=banner.getBoundingClientRect();
        const orbRect=el.getBoundingClientRect();
        const axisRect=center.getBoundingClientRect();
        const orbCx=orbRect.left + orbRect.width/2;
        const axisCx=axisRect.left + axisRect.width/2;
        const side=(orbCx<axisCx)?'left':'right';
        const gap=gapCfg;
        const vw=window.innerWidth||document.documentElement.clientWidth;
        const vh=window.innerHeight||document.documentElement.clientHeight;
        const top=orbRect.top + orbRect.height/2 - bRect.height/2 + vOffsetCfg;
        const clampedTop=Math.min(Math.max(marginCfg, top), vh - bRect.height - marginCfg);
        let left= side==='left' ? (orbCx - bRect.width - gap) : (orbCx + gap);
        const clampedLeft=Math.min(Math.max(marginCfg, left), vw - bRect.width - marginCfg);
        banner.classList.remove('left','right');
        banner.classList.add(side);
        banner.style.top=clampedTop+'px';
        banner.style.left=clampedLeft+'px';
        banner.style.visibility='visible';
        requestAnimationFrame(()=>{ banner.classList.add('show'); });
        clickedOnce=false;
      }
      function hideBanner(){ banner.classList.remove('show'); orbit.classList.remove('paused'); clickedOnce=false; }
      function scheduleRetract(){ clearTimeout(retractTimer); retractTimer=setTimeout(()=>{ hideBanner(); }, 500); }
      function cancelRetract(){ clearTimeout(retractTimer); }
      el.addEventListener('mouseenter',()=>{ playEvent('SocialHover'); showBanner(); });
      el.addEventListener('mouseleave',()=>{ scheduleRetract(); });
      banner.addEventListener('mouseenter',()=>{ cancelRetract(); orbit.classList.add('paused'); });
      banner.addEventListener('mouseleave',()=>{ scheduleRetract(); });
      el.addEventListener('click',(ev)=>{ ev.stopPropagation(); if(!banner.classList.contains('show')){ showBanner(); return; } if(!clickedOnce){ clickedOnce=true; banner.classList.add('show'); setTimeout(()=>{ window.open(it.link||'#','_blank'); }, 120); } else { window.open(it.link||'#','_blank'); } });
      document.addEventListener('click',(e)=>{ if(!el.contains(e.target) && !banner.contains(e.target)) scheduleRetract(); });
      if(document.fonts&&document.fonts.ready){ document.fonts.ready.then(()=>{ if(banner.classList.contains('show')) showBanner(); }).catch(()=>{}); }
      orbit.appendChild(el);
      const key=String(it.name||''); if(key && repo[key]){ repo[key].lastUsed=String(Date.now()); }
    });
    localStorage.setItem('socialsRepo', JSON.stringify(repo));
    function animate(time){
      const paused=orbit.classList.contains('paused');
      if(!paused){ const elapsed=time-startTime; const ang=(elapsed/spinMs*360)%360; lastAngle=ang; orbit.style.transform=`rotate(${ang}deg)`; document.querySelectorAll('.orb .logo').forEach(l=>{ l.style.transform=`rotate(${-ang}deg)`; }); }
      else{ orbit.style.transform=`rotate(${lastAngle}deg)`; document.querySelectorAll('.orb .logo').forEach(l=>{ l.style.transform=`rotate(${-lastAngle}deg)`; }); startTime=performance.now() - (lastAngle/360)*spinMs; }
      rafId=requestAnimationFrame(animate);
    }
    rafId=requestAnimationFrame(animate);
    window.addEventListener('resize',()=>{ buildSocialOrbit(); });
  }
  buildSocialOrbit();
  // resize listener attached in buildSocialOrbit

  document.querySelectorAll('.tab-buttons button').forEach(b=>{
    b.addEventListener('click',()=>{
      playEvent('InventoryTab');
      document.querySelectorAll('.tab-buttons button').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      const t=b.dataset.tab;
      el('tab-desc').style.display=t==='desc'?'block':'none';
      el('tab-portfolio').style.display=t==='portfolio'?'block':'none';
      el('tab-socials').style.display=t==='socials'?'block':'none';
      if(t==='portfolio'){ requestAnimationFrame(syncDispboxSize); }
    })
  })
  window.addEventListener('resize',()=>{ requestAnimationFrame(syncDispboxSize); });
}).catch(()=>{})