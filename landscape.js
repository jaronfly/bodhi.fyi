/* Astra — one open landscape after the film, and an orchard for the people
   whose tools helped it grow. Original pixel drawing; no image assets or audio. */
(()=>{
  const root=document.getElementById('outside-world');
  if(!root)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const mix=(a,b,t)=>a+(b-a)*t;
  const blend=(a,b,t)=>{a=a.match(/\w\w/g).map(x=>parseInt(x,16));b=b.match(/\w\w/g).map(x=>parseInt(x,16));return '#'+a.map((x,i)=>Math.round(mix(x,b[i],t)).toString(16).padStart(2,'0')).join('');};
  const rng=(seed)=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let n=Math.imul(seed^seed>>>15,1|seed);n=n+Math.imul(n^n>>>7,61|n)^n;return((n^n>>>14)>>>0)/4294967296;};
  const B=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
  const rect=(c,color,x,y,w=1,h=1)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
  function line(c,color,points,width=1){c.strokeStyle=color;c.lineWidth=width;c.lineJoin='miter';c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(Math.round(x),Math.round(y)));c.stroke();}
  function disk(c,color,x,y,r){for(let j=-r;j<=r;j++){const w=Math.floor(Math.sqrt(r*r-j*j));rect(c,color,x-w,y+j,w*2+1,1);}}
  const skies=new Map();
  function bands(c,w,h,colors){const key=[w,h,...colors].join();let cv=skies.get(key);if(!cv){cv=document.createElement('canvas');cv.width=w;cv.height=h;const x=cv.getContext('2d');for(let y=0;y<h;y++){const p=y/h*(colors.length-1),i=Math.min(colors.length-2,Math.floor(p)),f=p-i;for(let xx=0;xx<w;xx++)rect(x,B[(y%4)*4+xx%4]/16<f?colors[i+1]:colors[i],xx,y);}if(skies.size>6)skies.clear();skies.set(key,cv);}c.drawImage(cv,0,0);}
  function cloud(c,x,y,k,color){for(const [dx,dy,ww,hh] of [[0,0,34,3],[6,-3,22,3],[12,-6,11,3],[28,1,18,2],[-5,2,17,2]])rect(c,color,x+dx*k,y+dy*k,ww*k,hh*k);}
  function valley(c,w,h,t,sunset=false,night=0){
    const horizon=Math.round(h*.56),r=rng(2019);
    bands(c,w,horizon+24,sunset?['#655263','#9c6971','#c6856c','#dfa075','#e9bb82']:['#19352d','#355749','#637c60','#a5b58a']);
    const sunX=w*.24,sunY=horizon-16+(sunset?3:Math.sin(t*.014)*3);
    disk(c,sunset?'#f3d5a0':'#dbe2bd',Math.round(sunX),Math.round(sunY),Math.round(Math.min(w,h)*.067));
    for(let i=0;i<7;i++)cloud(c,((i*83+t*.2)%(w+70))-40,18+i%3*17,1+i%2*.4,sunset?'#b47d78':'#708873');
    for(let layer=0;layer<4;layer++){
      const colors=sunset?['#69686c','#626d60','#73794f','#7e824d']:['#526f61','#3c6253','#31573f','#284a36'];
      c.fillStyle=colors[layer];
      for(let x=0;x<w;x++){const y=horizon+layer*15+Math.sin(x*.019+layer*1.9)*12+Math.sin(x*.048+layer)*4;c.fillRect(x,Math.floor(y),1,h-y);}
    }
    // A river winds all the way to the viewer, with banks and moving reflections.
    for(let y=horizon+13;y<h;y++){
      const p=(y-horizon-13)/(h-horizon-13),x=w*(.43+Math.sin(p*5.5+.1)*.16),half=1+Math.pow(p,1.7)*w*.095;
      rect(c,sunset?'#a09269':'#597e6b',x-half-2,y,half*2+4);
      rect(c,sunset?'#c1b38b':'#83a99c',x-half,y,half*2);
      if(y%4===0){const shine=(Math.sin(y*.33+t*.6)+1)/2;rect(c,sunset?'#dfc592':'#b0c8b5',x-half+shine*half,y,Math.max(1,half*.6));}
    }
    for(let i=0;i<700;i++){
      const x=r()*w,y=horizon+16+r()*(h-horizon-16),p=(y-horizon)/(h-horizon),riverX=w*(.43+Math.sin(((y-horizon-13)/(h-horizon-13))*5.5+.1)*.16);
      if(Math.abs(x-riverX)<3+Math.pow(clamp((y-horizon-13)/(h-horizon-13)),1.7)*w*.095)continue;
      const color=sunset?['#a9a263','#666f48','#c1ac6b'][i%3]:['#527553','#214d36','#709363'][i%3];
      rect(c,color,x,y,1+Math.floor(p*2),1);if(i%7===0)rect(c,color,x,y-2,1,3);
    }
    // Far bank: reeds, tiny trees and fence posts give the scene a human scale.
    for(let i=0;i<10;i++){let x=i*w/9+Math.sin(i)*9,y=horizon+18+Math.sin(x*.019+1.9)*12;rect(c,'#354a35',x,y-9,2,11);for(let j=-4;j<=4;j++)rect(c,'#38553d',x-Math.floor(5-Math.abs(j)/2),y-8+j,10-Math.abs(j),1);}
    if(night>0){c.fillStyle=`rgba(6,19,22,${night*.75})`;c.fillRect(0,0,w,h);for(let i=0;i<65;i++)rect(c,`rgba(221,231,207,${night*(.5+.5*Math.sin(t*.3+i))})`,r()*w,r()*h*.4);disk(c,'#d9dfbd',Math.round(w*.82),Math.round(h*.18),6);disk(c,'#163029',Math.round(w*.82+3),Math.round(h*.18-2),6);}
  }
  function orchardTree(c,x,y,size,t){
    const r=rng(840),s=size;
    // Shadow, roots and knotted trunk. Every branch actually joins the trunk.
    for(let j=0;j<5;j++)rect(c,'#3b4930',x-34*s+j*3*s,y+j*s,(76-j*5)*s,s);
    line(c,'#39402c',[[x-19*s,y+2*s],[x-5*s,y-8*s],[x+3*s,y-31*s],[x-4*s,y-66*s],[x+2*s,y-99*s]],10*s);
    line(c,'#72754b',[[x-17*s,y],[x-2*s,y-9*s],[x+8*s,y-31*s],[x+1*s,y-67*s],[x+4*s,y-100*s]],4*s);
    line(c,'#a29b60',[[x-12*s,y],[x+1*s,y-10*s],[x+6*s,y-32*s],[x,y-57*s]],s);
    const clusters=[];
    for(let i=0;i<14;i++){
      const a=i*2.399,rr=18+Math.sqrt(i/14)*27,bx=x+Math.cos(a)*rr*s,by=y-(80+Math.sin(a)*rr*.5)*s;
      line(c,'#424b31',[[x+4*s,y-42*s],[x+(bx-x)*.45,y-67*s],[bx,by]],(i<5?4:2)*s);
      clusters.push([bx,by,(12+r()*8)*s]);
    }
    clusters.sort((a,b)=>a[1]-b[1]);
    for(const [cx,cy,rad] of clusters){
      for(let dy=-rad;dy<rad;dy+=s)for(let dx=-rad;dx<rad;dx+=s){if(dx*dx+dy*dy>rad*rad*(.88+r()*.2))continue;
        const light=(dx-dy)/(rad*2)+r()*.4;
        rect(c,light>.6?'#b5ad69':light>.25?'#829252':light>-.12?'#526d3e':'#304c31',cx+dx,cy+dy,Math.ceil(s),Math.ceil(s));
      }
    }
    line(c,'#424a31',[[x,y-51*s],[x-13*s,y-71*s],[x-18*s,y-93*s]],3*s);
    const ax=x-19*s,ay=y-74*s;
    rect(c,'#3b4e2e',ax,ay-6*s,s,6*s);rect(c,'#9ab16a',ax+s,ay-6*s,4*s,s);
    disk(c,'#9d5529',Math.round(ax),Math.round(ay),Math.round(4*s));
    disk(c,'#e8982a',Math.round(ax-s),Math.round(ay-s),Math.round(3*s));
    rect(c,'#ffe0a0',ax-2*s,ay-2*s,s,2*s);
    // Just enough wind to make this a place, rather than a poster.
    for(let i=0;i<3;i++){const k=(t*.035+i*.31)%1;rect(c,i%2?'#8d9c5d':'#a9b56b',x+(Math.sin(k*5+i)*18-24)*s,y-(76-k*72)*s,2*s,s);}
  }
  function dog(c,x,y,s,t,hello){
    // A small tricolour hound facing the tree: dark floppy ears, a white blaze,
    // a dark saddle, white chest and paws. It jumps up at the fruit in a little
    // cycle — crouch, hop, land, beat of anticipation — and goes properly
    // ecstatic when greeted. The tail is raised, white-tipped, three wag poses.
    const cyc=t%1.5;
    let hop=0,crouch=false;
    if(hello>0) hop=Math.abs(Math.sin(hello*6))*5;
    else if(cyc<0.16){crouch=true;hop=0;}
    else if(cyc<0.66) hop=Math.sin((cyc-0.16)/0.5*Math.PI)*4.5;
    const body=[
    '...............',
    '..........dd...',
    '.........dggd..',
    '........dgWWd..',
    '.......gggWgnd.',
    '........ggggd..',
    '.....lggggggl..',
    '..WWgggggggWW..',
    '.WdWgKKKKKgWd..',
    '.WdWWd...dWd...',
    '.ddWd....dWd...',
    '..dd......dd...'];
    const colors={d:'#704c2c',B:'#c38b46',g:'#c38b46',l:'#e4b668',n:'#263728',K:'#263728',W:'#f2eee4'};
    const wag=Math.floor(t*5)%3;
    // the tail is UP and wagging, and it follows the hop: short stepped pixels
    // hinged at the rump, white-tipped, three poses.
    const ty=y-8*s-hop*s+(crouch?s:0);
    if(wag===0){rect(c,'#c38b46',x+1*s,ty,3*s,2*s);rect(c,'#c38b46',x-1*s,ty-1*s,2*s,2*s);rect(c,'#f2eee4',x-2*s,ty-1*s,s,s);}
    else if(wag===1){rect(c,'#c38b46',x+1*s,ty-1*s,3*s,2*s);rect(c,'#c38b46',x-1*s,ty-3*s,2*s,3*s);rect(c,'#f2eee4',x-2*s,ty-4*s,s,2*s);}
    else{rect(c,'#c38b46',x+1*s,ty,3*s,2*s);rect(c,'#c38b46',x-2*s,ty-2*s,2*s,2*s);rect(c,'#f2eee4',x-3*s,ty-3*s,s,2*s);}
    const yy=y-12*s-(hop*s)+(crouch?s:0);
    body.forEach((row,j)=>[...row].forEach((a,i)=>{if(a!=='.')rect(c,colors[a],x+i*s,yy+j*s,s,s);}));
    // one bright eye above the white blaze, dark nose at the muzzle's end
    rect(c,'#17231b',x+10*s,yy+2*s,s,s);
    if(hello>0||hop>3){line(c,'#f2eee4',[[x+13*s,yy+2*s],[x+16*s,yy]],s);line(c,'#f2eee4',[[x+13*s,yy+5*s],[x+17*s,yy+5*s]],s);}
    else if(Math.floor(t*2)%4===1){line(c,'#f2eee4',[[x+13*s,yy+5*s],[x+16*s,yy+5*s]],s);}
  }
  const background=document.getElementById('landscapeCanvas'),orchard=document.getElementById('orchardCanvas');
  const scenes=[{cv:background,kind:'field',visible:false},{cv:orchard,kind:'orchard',visible:false}].filter(s=>s.cv);
  let raf=0,last=0,time=0,hello=0,dirty=true;
  const motion=()=>!reduced.matches&&!document.body.classList.contains('still-frames')&&document.querySelector('[data-motion-toggle]')?.getAttribute('aria-pressed')!=='false';
  function size(s){const r=s.cv.getBoundingClientRect();s.cv.width=Math.max(160,Math.round(r.width/4));s.cv.height=Math.max(150,Math.round(r.height/4));s.ctx=s.cv.getContext('2d');s.ctx.imageSmoothingEnabled=false;}
  function draw(s){const c=s.ctx,w=s.cv.width,h=s.cv.height;
    if(s.kind==='orchard'){
      // The credits live ON this section now: the vista grows and the canvas
      // paints behind them. The composed scene (sun, valley, tree, dog) anchors
      // to the band above the credits; below it the sunset's ground tones
      // continue, dithered down into dusk, so the picture persists under the
      // words like a held last frame.
      const band=Math.max(150,Math.min(h,Math.round(s.band||h)));
      valley(c,w,band,time,true);
      for(let y=band;y<h;y++){
        const k=(y-band)/Math.max(1,h-band);
        for(let x=0;x<w;x++){const th=B[(y%4)*4+x%4]/16;
          rect(c,k<0.16?(th>0.5?'#5d6040':'#545738'):k<0.45?(th>0.5?'#4d4a30':'#464427'):k<0.75?(th>0.6?'#3b3a25':'#353420'):(th>0.7?'#2c2c1c':'#272817'),x,y);}
      }
      const x=w*.74,y=band*.90,scale=Math.min(w/260,band/120);
      orchardTree(c,x,y,scale,time);dog(c,x-39*scale,y+2*scale,scale,time,hello);
      for(let i=0;i<40;i++){const x=i*w/39;line(c,i%2?'#566b3e':'#859355',[[x,band],[x+Math.sin(time+i)*2,band-4-i%5]],1);}
    }else{
      const r=root.getBoundingClientRect(),p=clamp(-r.top/(r.height-innerHeight));valley(c,w,h,time,false,clamp((p-.72)/.28));
      c.fillStyle='#0e24186b';c.fillRect(0,0,w,h);
    }
  }
  function frame(now){raf=0;if(document.hidden)return;if(now-last>=66||dirty){const dt=Math.min(.1,(now-last)/1000);last=now;if(motion()){time+=dt;hello=Math.max(0,hello-dt);}scenes.filter(s=>s.visible).forEach(draw);dirty=false;}if(motion()&&scenes.some(s=>s.visible))raf=requestAnimationFrame(frame);}
  const lower=document.querySelector('.orchard-lower');
  const measure=()=>{scenes.forEach(s=>{if(s.kind!=='orchard')return;const r=s.cv.getBoundingClientRect();if(!r.height)return;s.band=Math.round((lower?lower.getBoundingClientRect().top-r.top:r.height)/(r.height/s.cv.height));});};
  const wake=()=>{scenes.forEach(s=>{const r=s.cv.getBoundingClientRect();if(Math.max(160,Math.round(r.width/4))!==s.cv.width||Math.max(150,Math.round(r.height/4))!==s.cv.height)size(s);});measure();root.dataset.ambient=motion()?'on':'off';dirty=true;if(!raf&&!document.hidden)raf=requestAnimationFrame(frame);};
  const io=new IntersectionObserver(entries=>{entries.forEach(e=>{const s=scenes.find(s=>s.cv===e.target);s.visible=e.isIntersecting;});wake();});
  scenes.forEach(s=>{size(s);draw(s);io.observe(s.cv);});
  addEventListener('resize',()=>{scenes.forEach(size);wake();});addEventListener('scroll',wake,{passive:true});document.addEventListener('visibilitychange',wake);reduced.addEventListener('change',wake);
  new MutationObserver(wake).observe(document.body,{attributes:true,attributeFilter:['class']});
  const ambient=document.querySelector('[data-motion-toggle]');if(ambient)new MutationObserver(wake).observe(ambient,{attributes:true,attributeFilter:['aria-pressed']});
  document.getElementById('greet-dog')?.addEventListener('click',()=>{hello=2.4;document.getElementById('orchard-status').textContent='A wag, two barks. Still very interested in that fruit.';wake();});
})();

// The crew changes; the structure and its source record persist.
// Both scroll-driven assembly and explicit slider/stepper controls (no hidden button).
(()=>{
  const section = document.querySelector('.ghost-harbor');
  if (!section) return;

  const ship = section.querySelector('.ship');
  const crewNumber = document.getElementById('crew-number');
  const crewHeading = document.getElementById('crew-heading');
  const crewEntry = document.getElementById('crew-entry');
  const passBtn = document.getElementById('pass-log');
  const range = document.getElementById('crew-range');
  const stepBtns = [...section.querySelectorAll('.crew-step-btn')];
  const ticks = section.querySelectorAll('.slider-ticks .tick');
  const panel = section.querySelector('.ship-log');

  if (panel) {
    if (!panel.id) panel.id = 'crew-log-panel';
    panel.setAttribute('role', 'tabpanel');
    panel.tabIndex = 0;
  }
  stepBtns.forEach((btn, i) => {
    if (!btn.id) btn.id = `crew-stage-tab-${i + 1}`;
    if (panel) btn.setAttribute('aria-controls', panel.id);
  });

  const logs = [
    ['01 / THE FIRST CREW', 'Leave more than a finished plank.', '“We see no crew before us. The keel is set, so someone began. We leave the seam repair and its test with the hull.”'],
    ['02 / ANOTHER VOICE', 'Read the ship by the work it carries.', '“No voice answers from the dark. The ribs are joined, and a note marks the leak. We add rigging and flag one loose knot.”'],
    ['03 / THE NEXT RETURN', 'Carry the correction with the craft.', '“We never met the hands that made this. The ship carries their work. We retie the knot and leave the reason for whoever comes next.”']
  ];

  let manualSelection = false;
  let wasInChapter = false;
  const currentStage = () => Number(section.dataset.crewStage || 0);

  function setStage(idx, isUserAction = false) {
    idx = Number(idx);
    idx = Math.max(0, Math.min(logs.length - 1, Number.isFinite(idx) ? Math.round(idx) : 0));
    if (isUserAction) manualSelection = true;

    section.dataset.crewStage = String(idx);
    if (ship) ship.dataset.build = idx;
    if (crewNumber) crewNumber.textContent = logs[idx][0];
    if (crewHeading) crewHeading.textContent = logs[idx][1];
    if (crewEntry) crewEntry.textContent = logs[idx][2];
    if (range && Number(range.value) !== idx) range.value = idx;

    stepBtns.forEach((btn, i) => {
      const active = i === idx;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', String(active));
      btn.tabIndex = active ? 0 : -1;
    });
    if (panel && stepBtns[idx]) panel.setAttribute('aria-labelledby', stepBtns[idx].id);

    ticks.forEach((tick, i) => {
      tick.classList.toggle('active', i <= idx);
    });

    if (passBtn) {
      passBtn.textContent = idx === logs.length - 1 ? 'Begin again with the first crew ↺' : 'Pass the log to the next crew ↗';
    }

    section.dispatchEvent(new CustomEvent('bodhi:crew-stage', {
      bubbles: true,
      detail: { stage: idx }
    }));
  }

  if (range) {
    range.addEventListener('input', (e) => {
      setStage(Number(e.target.value), true);
    });
  }

  stepBtns.forEach((btn, i) => {
    btn.addEventListener('click', () => {
      const st = Number(btn.dataset.stage);
      setStage(st, true);
    });

    btn.addEventListener('keydown', (event) => {
      let next;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (i + 1) % stepBtns.length;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (i - 1 + stepBtns.length) % stepBtns.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = stepBtns.length - 1;
      else return;

      event.preventDefault();
      setStage(next, true);
      stepBtns[next].focus();
    });
  });

  if (passBtn) {
    passBtn.addEventListener('click', () => {
      setStage((currentStage() + 1) % logs.length, true);
    });
  }

  function onScroll() {
    const rect = section.getBoundingClientRect();
    const winH = window.innerHeight;
    const inChapter = rect.bottom > 0 && rect.top < winH;
    if (!inChapter) {
      if (wasInChapter) manualSelection = false;
      wasInChapter = false;
      return;
    }
    wasInChapter = true;
    if (manualSelection) return;

    const totalDist = rect.height + winH * 0.3;
    const travelled = (winH * 0.75) - rect.top;
    const progress = Math.max(0, Math.min(1, travelled / totalDist));

    let autoStage = 0;
    if (progress >= 0.65) autoStage = 2;
    else if (progress >= 0.30) autoStage = 1;
    else autoStage = 0;

    if (autoStage !== currentStage()) {
      setStage(autoStage, false);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  setStage(Number(section.dataset.crewStage || 0), false);
  onScroll();
})();
