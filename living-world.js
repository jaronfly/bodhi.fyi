/* GLM/ZCode living grove, adapted by Astra: palette, sprites, timing, accessibility and lifecycle. */
(()=>{
/* ═══ Pixel engine v7 — whole pixels, living world ═══
   1 bone · 2 ink · 3 saffron · 4 sprout · 5 canopy · 6 moss · 7 sage · 8 lichen · 9 night */
const C = {1:'#F2EEE4',2:'#17231B',3:'#E8982A',4:'#8BCB8B',5:'#2E6B45',6:'#2E3B33',7:'#B8C2BA',8:'#8A968D',9:'#0E1712'};
const G = {L:'#8eae79', M:'#668960', D:'#385b42', GOLD:'#d9e4b2'};
const BARK = ['#a4ab84','#758566','#c2c7a4','#879b7e'];
let generation=3;

function lerpHex(a,b,t){
  const pa=[parseInt(a.slice(1,3),16),parseInt(a.slice(3,5),16),parseInt(a.slice(5,7),16)];
  const pb=[parseInt(b.slice(1,3),16),parseInt(b.slice(3,5),16),parseInt(b.slice(5,7),16)];
  return 'rgb('+pa.map((v,i)=>Math.round(v+(pb[i]-v)*t)).join(',')+')';
}
function lerpRGB(a,b,t){const pa=a.match(/\d+/g).map(Number),pb=b.match(/\d+/g).map(Number);return 'rgb('+pa.map((v,i)=>Math.round(v+(pb[i]-v)*t)).join(',')+')';}
function pxr(ctx,color,x,y,w,h){ ctx.fillStyle=color; ctx.fillRect(x,y,w,h); }

/* sheets first — TDZ-safe */
const sheet = new Image(); sheet.src = 'assets/spritesheet.webp';
const codexSheet = new Image(); codexSheet.src = 'assets/codex-pet.webp';

/* ═══ THE SCENE ═══ */
const sc = document.getElementById('sceneCanvas');
if(innerWidth<650)sc.width=720;
const sx = sc.getContext('2d');
const SU = 5, SW = sc.width/SU, GROUND = 66;
const TREE_X = 34;
let T = 1350;
let worldPaused=matchMedia('(prefers-reduced-motion: reduce)').matches,worldVisible=false,worldFrame=0,worldLast=0;
const DAY_LEN = 2100, SEASON_LEN = 3600, TRANS = 0.22;  /* approximately 70 seconds per day and two minutes per season at 30 fps */

const CANOPY_ROWS = [
  {y:14,x0:26,x1:44},{y:15,x0:22,x1:48},{y:16,x0:19,x1:51},{y:17,x0:16,x1:54},
  {y:18,x0:13,x1:57},{y:19,x0:11,x1:59},{y:20,x0:9, x1:61},{y:21,x0:8, x1:62},
  {y:22,x0:7, x1:63},{y:23,x0:6, x1:64},{y:24,x0:6, x1:64},{y:25,x0:5, x1:65},
  {y:26,x0:5, x1:65},{y:27,x0:4, x1:66},{y:28,x0:4, x1:66},{y:29,x0:4, x1:66},
  {y:30,x0:4, x1:66},{y:31,x0:5, x1:65},{y:32,x0:5, x1:65},{y:33,x0:6, x1:64},
  {y:34,x0:7, x1:63},{y:35,x0:8, x1:62},{y:36,x0:10,x1:60},{y:37,x0:12,x1:58},
  {y:38,x0:14,x1:56},{y:39,x0:17,x1:53},{y:40,x0:20,x1:50},{y:41,x0:23,x1:47},
];
const BRANCH = [[44,[32,36]],[42,[31,37]],[40,[30,38]],[38,[29,39]],[46,[33,35]]];

/* seasons: canopy palette [main, edge] + effects */
const SEASONS = [
  {name:'spring', leaf:[G.M,G.D], bloom:true },
  {name:'summer', leaf:[G.D,'#294835'],       bloom:false},
  {name:'autumn', leaf:['#b67b3d','#765136'],     bloom:false},
  {name:'winter', leaf:null,            bloom:false},
];

/* weather state machine */
let weather = 'clear', weatherT = 600, weatherBlend = 0, weatherNext = 'clear';
let drops = [];

/* actors */
let actors = [
 {type:'pet',variant:0,x:78,mode:'inspect',timer:240,scale:.16,frame:0,dir:1},
 {type:'pet',variant:1,x:119,mode:'note',timer:210,scale:.18,frame:50,dir:-1},
 {type:'pet',variant:2,x:Math.min(SW-12,141),mode:'walk',timer:200,scale:.17,frame:100,target:110,dir:-1},
 {type:'pet',variant:3,sprite:'bodhi',name:'Bodhi',x:94,mode:'think',timer:280,scale:.20,frame:0,dir:1},
 {type:'pet',variant:4,sprite:'codex',name:'The returning scout',x:SW-18,mode:'walk',timer:380,scale:.20,frame:0,dir:-1,target:TREE_X+16,returning:true}
], nextSeed = 50, held = null;
actors.forEach(a=>{a.age=0;a.stay=1800+Math.random()*2000;});

let pointer = {x:0, y:0, down:false};

/* treeperson renderer — hair canopy, face, body, root feet; modes change the arms */
function drawTP(ctx, pxX, pxY, u, mode, t, heldSwing, side=1, variant=0){
  const bark=BARK[variant%BARK.length];
  const g = ['001111100','011111110','111111111','111111111','001101100','001111100',
             '001111100','001111100','001111100','001111100','001111100','001101100','001000100'];
  const swing = heldSwing ? Math.sin(t/6)*1.5 : 0;
  const X = pxX + swing;
  for (let yy=0; yy<g.length; yy++){
    for (let xx=0; xx<9; xx++){
      const v = g[yy][xx];
      if (v==='0') continue;
      let col;
      if (yy<=3) col = (yy===0||xx===0||xx===8||((xx+yy)%4===0)) ? G.D : G.L;
      else if (yy===4) col = bark;
      else if (yy===11) col = G.D;
      else col = xx===2 ? '#5b6f55' : bark;
      if (yy===4 && (xx===3||xx===5)) col = heldSwing ? bark : ((Math.floor(t/30)%4===3) ? bark : C[2]); /* blink */
      pxr(ctx,col, X+xx*u, pxY+yy*u, u, u);
    }
  }
  const kick = heldSwing ? Math.floor(t/4)%2 : 0;
  if (mode==='type'){
    pxr(ctx,C[2], X+1*u, pxY+8*u, 7*u, u);
    pxr(ctx,C[2], X+1.5*u, pxY+5.5*u, 6*u, 2.5*u);
    pxr(ctx,C[4], X+2*u, pxY+6*u, 5*u, 0.5*u);
  } else if (mode==='paint'){
    /* little easel + canvas, brush arm swipes */
    pxr(ctx,C[8], X-3*u, pxY+5*u, 0.6*u, 5*u); pxr(ctx,C[8], X+8.4*u, pxY+5*u, 0.6*u, 5*u);
    pxr(ctx,C[1], X-3*u, pxY+4*u, 9*u, 3.4*u);
    const swipe = Math.sin(t/5)*1.2;
    pxr(ctx,C[4], X+2.4*u+swipe, pxY+5*u, u, 0.7*u);
    pxr(ctx,C[7], X+2.4*u+swipe, pxY+5.7*u, u, 0.5*u);
  } else if (mode==='inspect'){
    /* magnifying glass over the ground */
    const gx = X + 7.5*u + Math.sin(t/9)*u;
    pxr(ctx,C[2], gx, pxY+7*u, 2.6*u, 2.6*u);
    pxr(ctx,C[4], gx+0.4*u, pxY+7.4*u, 1.8*u, 1.8*u);
    pxr(ctx,C[1], gx+2.4*u, pxY+9.2*u, 1.2*u, 0.7*u);
  } else if (mode==='note'){
    /* sits with a little notebook, pen ticks */
    pxr(ctx,C[2], X+0.5*u, pxY+8*u, 4*u, 2.6*u);
    pxr(ctx,C[1], X+0.8*u, pxY+8.3*u, 3.4*u, 2*u);
    const tick = Math.floor(t/9)%2;
    pxr(ctx,C[7], X+3.2*u+tick, pxY+7.6*u, 0.7*u, 1.6*u);
  } else if (mode==='wave'){
    const up = Math.sin(t/6)>0 ? 0 : -u;
    pxr(ctx,bark, X+7.5*u, pxY+6*u+up, u, 2*u);
  } else if (mode==='walk'){
    const step = Math.floor(t/4)%2;
    pxr(ctx,G.D, X+(step?2:3)*u, pxY+11*u, u, 2*u);
    pxr(ctx,G.D, X+(step?5:4)*u, pxY+11*u, u, 2*u);
  }
  if (heldSwing){
    /* kicking legs while suspended */
    pxr(ctx,G.D, X+(kick?2:3)*u, pxY+11*u, u, 2*u+ (kick?u:0));
    pxr(ctx,G.D, X+(kick?5:4)*u, pxY+11*u, u, 2*u);
  }
  if (mode==='talk'){
    const b = Math.floor(t/25)%3;
    pxr(ctx,C[1], X+(side>0?9.5*u:-3*u), pxY-2*u-((b%2)*u), 2.5*u, 1.6*u);
    pxr(ctx,C[7], X+(side>0?10.2*u:-2.3*u), pxY-1.6*u-((b%2)*u), u*0.6, u*0.6);
  }
  if (mode==='think'){
    const bob = Math.sin(t/8)>0 ? 0 : 1;
    pxr(ctx,C[7], X+4*u, pxY-3*u-bob*u, u, 2*u);
    pxr(ctx,C[7], X+3*u, pxY-4*u-bob*u, u, u);
    pxr(ctx,C[7], X+5*u, pxY-4*u-bob*u, u, u);
  }
}

function spawnSeed(){
  /* seeds come FROM the canopy: pick a random canopy cell on the lower half */
  const rows = CANOPY_ROWS.filter(r=>r.y>=26);
  const r = rows[Math.floor(Math.random()*rows.length)];
  actors.push({type:'seed', x:r.x0+2+Math.random()*(r.x1-r.x0-4), y:r.y+1, vy:0, sway:Math.random()*6.28, dangle:26});
}
function updateActors(){
  if (--nextSeed <= 0){
    const season = SEASONS[Math.floor(T/SEASON_LEN)%4];
    if (actors.length < 16) spawnSeed();
    nextSeed = 150 + Math.random()*130;
  }
  for (const a of actors){
    if (a.type==='seed'){
      if (a.dangle>0){ a.dangle--; a.x += Math.sin(T/5)*0.06; continue; }  /* hangs off the branch first */
      a.vy = Math.min(a.vy+0.018, 0.22);
      a.y += a.vy; a.sway += 0.07; a.x += Math.sin(a.sway)*0.14;           /* helicopter sway */
      if (a.y >= GROUND-2){ a.type='sprout'; a.x=Math.round(a.x); a.stage=0; a.timer=70; a.dir=Math.random()<0.5?-1:1; a.homeX=a.x; }
    } else if (a.type==='sprout'){
      if (--a.timer<=0){ a.stage++; a.timer=80;
        if (a.stage>2){ a.type='pet'; a.variant=generation++; a.mode='walk'; a.timer=160+Math.random()*160; a.scale=0.10; a.frame=0; a.target=SW*(.45+Math.random()*.4); a.dir=1; a.age=0; a.stay=1500+Math.random()*1800; if(a.variant%5===0){a.sprite='codex';a.name='A new scout';}else if(a.variant%5===3){a.sprite='bodhi';a.name='A carried seed';} } }
    } else if (a.type==='pet'){
      if (a===held) continue;
      a.age=(a.age||0)+1;
      if(a.age>a.stay&&!a.meet&&a.dropV==null){a.departing=true;a.mode='walk';a.dir=1;a.x+=.17;if(a.x>SW+15)a.gone=true;continue;}
      if(a.returning&&Math.abs(a.x-(TREE_X+16))<2){a.returning=false;a.mode='note';a.timer=360;}

      a.scale = Math.min(0.20, (a.scale||0.10)+0.002);
      a.frame++;
      /* community: two idle pets near each other meet, blip, part */
      if (!a.meet && !a.departing && !a.returning && a.mode!=='type' && Math.random()<0.0016){
        const other = actors.find(o=>o!==a && o.type==='pet' && !o.meet && Math.abs(o.x-a.x)<20 && !o.departing && o.mode!=='held');
        if (other){
          const mid = (a.x+other.x)/2;
          const direction=a.x<other.x?1:-1;
          a.meet = {with:other, side:direction}; other.meet = {with:a, side:-direction};
          a.target = mid - direction*3; other.target = mid + direction*3; a.dir = direction; other.dir = -direction;
          a.mode = other.mode = 'walk';
        }
      }
      if (a.meet && a.meet.with){
        if (Math.abs(a.x - a.meet.with.x) <= 7){
          a.mode = 'talk'; a.blip = Math.floor(T/30)%3;
          if (a.meetT == null || !Number.isFinite(a.meetT)) a.meetT = 150;
          if (--a.meetT <= 0){ a.meet = null; a.meetT = undefined; a.mode='walk'; a.target = 6+Math.random()*(SW-12); a.dir = a.target>a.x?1:-1; }
          continue;
        }
        a.x += a.dir*0.18;
        continue;
      }
      if (a.mode==='walk'){
        if (a.target==null || Math.abs(a.x-a.target)<1){
          a.target = 6 + Math.random()*(SW-12);
          a.dir = a.target>a.x ? 1 : -1;
          if (Math.random()<0.3){ a.mode = pickMode(); a.timer=160+Math.random()*160; }
        }
        a.x += a.dir*0.20;
        if (a.x<4){ a.x=4; a.dir=1; } if (a.x>SW-4){ a.x=SW-4; a.dir=-1; }
        if (--a.timer<=0){ a.mode = pickMode(); a.timer=170+Math.random()*170; }
      } else {
        if (--a.timer<=0){
          const r = Math.random();
          a.mode = r<0.35 ? 'wave' : r<0.6 ? 'walk' : pickMode();
          a.timer=150+Math.random()*150; a.homeX=a.x;
        }
      }
    }
  }
  actors = actors.filter(a => !a.gone);for(const a of actors)if(a.meet?.with?.gone){a.meet=null;a.mode='think';a.timer=120;}
}
function pickMode(){
  const m = ['type','paint','inspect','note','think','hop'];
  return m[Math.floor(Math.random()*m.length)];
}

/* pointer interaction: pick up, drag (dangling), drop */
sc.addEventListener('pointerdown', e=>{
  const r = sc.getBoundingClientRect();
  const mx = (e.clientX-r.left)*(sc.width/r.width), my = (e.clientY-r.top)*(sc.height/r.height);
  let best=null, bd=1e9;
  for (const a of actors){
    if (a.type!=='pet') continue;
    const b=a.bounds;if(!b)continue;const d=Math.hypot(b.x+b.w/2-mx,b.y+b.h/2-my);if(mx>b.x-8&&mx<b.x+b.w+8&&my>b.y-8&&my<b.y+b.h+8&&d<bd){bd=d;best=a;}
  }
  if (best){sc.setPointerCapture(e.pointerId);if(best.meet){best.meet.with.meet=null;best.meet=null;}held=best;best.mode='held';best.holdY=my/SU;best.dropV=null;best.departing=false;best.age=0;sc.style.cursor='grabbing';document.getElementById('world-status').textContent=(best.name||'Grove resident '+(best.variant+1))+' · Picked up. Set them down anywhere in the grove.';if(worldPaused)drawScene(false);}
});
sc.addEventListener('pointermove', e=>{
  const r = sc.getBoundingClientRect();
  pointer.x = (e.clientX-r.left)*(sc.width/r.width);
  pointer.y = (e.clientY-r.top)*(sc.height/r.height);
  if (held){
    held.x = Math.max(4, Math.min(SW-4, pointer.x/SU));
    held.holdY = Math.max(14, Math.min(GROUND-6, pointer.y/SU));if(worldPaused)drawScene(false);
  }
});
function releasePerson(){
  if (held){
    held.mode='wave'; held.timer=200;held.age=0;held.dropV=0;
    const h=held.sprite?78:13*SU*(held.scale/.2);held.heldY=(held.holdY||GROUND-16)-h*.6/SU;
    document.getElementById('world-status').textContent=(held.name||'A grove resident')+' has a new place to start.';
    held = null; sc.style.cursor='default';if(worldPaused)drawScene(false);
  }
}
window.addEventListener('pointerup',releasePerson);sc.addEventListener('pointercancel',releasePerson);

// Sprite sheets and procedural residents share the same hit boxes and lifecycle.
function drawResident(a,x,y,w,h,u,mode,picked){
 if(a.sprite){
  const img=a.sprite==='codex'?codexSheet:sheet;
  const row=mode==='held'?(a.sprite==='codex'?10:4):mode==='walk'?(a.dir>0?1:2):mode==='wave'?3:mode==='hop'?4:mode==='talk'?6:mode==='think'?7:mode==='inspect'?8:0;
  const count=a.sprite==='codex'?[7,8,8,4,5,8,6,6,6,8,8][row]:[6,8,8,4,5,8,6,6,6][row];
  const frame=Math.floor((T+a.frame)/(mode==='walk'?7:13))%count;
  const scale=picked?1.55:1,ww=w*scale,hh=h*scale,xx=x-(ww-w)/2,yy=y-(hh-h)*.4;
  if(img.complete&&img.naturalWidth){sx.imageSmoothingEnabled=false;sx.drawImage(img,frame*192,row*208,192,208,xx,yy,ww,hh);}else drawTP(sx,x,y,u,mode,T+a.frame,picked,a.dir,a.variant);
  a.bounds={x:xx,y:yy,w:ww,h:hh};
  if(a.returning){pxr(sx,C[1],xx+ww*.65,yy+hh*.68,11,9);pxr(sx,C[5],xx+ww*.68,yy+hh*.71,7,1);}
 }else{drawTP(sx,x,y,u,mode,T+a.frame,picked,a.meet?a.meet.side:a.dir,a.variant);a.bounds={x,y,w,h};}
}

let keyboardIndex=0;
sc.addEventListener('keydown',e=>{
 if(e.code==='Space'){e.preventDefault();if(held){releasePerson();keyboardIndex++;}else{const people=actors.filter(a=>a.type==='pet');held=people[keyboardIndex%people.length];if(held){if(held.meet){held.meet.with.meet=null;held.meet=null;}held.mode='held';held.holdY=GROUND-23;held.dropV=null;document.getElementById('world-status').textContent=(held.name||'Grove resident '+(held.variant+1))+' · Use the arrows to move. Space sets them down.';}}if(worldPaused)drawScene(false);}
 else if(e.key==='Escape'&&held){e.preventDefault();releasePerson();}
 else if(held&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();held.x=Math.max(8,Math.min(SW-8,held.x+(e.key==='ArrowRight'?3:e.key==='ArrowLeft'?-3:0)));held.holdY=Math.max(14,Math.min(GROUND-6,held.holdY+(e.key==='ArrowDown'?3:e.key==='ArrowUp'?-3:0)));if(worldPaused)drawScene(false);}
});

function drawScene(advance=true){
  const dayPhase = (T/DAY_LEN)%1;
  const sIdx = Math.floor(T/SEASON_LEN)%4;
  const sNext = SEASONS[(sIdx+1)%4], sCur = SEASONS[sIdx];
  const sT = (T%SEASON_LEN)/SEASON_LEN;
  const inTrans = sT > 1-TRANS;
  const blend = inTrans ? (sT-(1-TRANS))/TRANS : 0;

  // A shared atmosphere takes the film back into the deliberately pixel-made world.
  const nightAmt=(1-Math.cos(dayPhase*Math.PI*2))/2;
  const isNight=nightAmt>.62;
  const skyTop=lerpHex('#627c6a','#0c1a18',nightAmt);
  const skyBottom=lerpHex('#b2b99b','#29463a',nightAmt);
  for(let y=0;y<GROUND;y+=2){sx.fillStyle=lerpRGB(skyTop,skyBottom,y/GROUND);sx.fillRect(0,y*SU,sc.width,2*SU);}
  // Northern lights: a different kind of ceiling, open to weather.
  if(nightAmt>.28){
    sx.globalAlpha=(nightAmt-.28)*.55;
    for(let band=0;band<3;band++)for(let x=0;x<sc.width;x+=SU*2){
      const u=x/sc.width,top=(12+band*5+Math.sin(u*7+T*.0008+band)*6+Math.sin(u*17-band)*2)*SU;
      const grad=sx.createLinearGradient(0,top-12*SU,0,top+3*SU);grad.addColorStop(0,'rgba(79,138,116,0)');grad.addColorStop(.75,band===1?'#78aead':'#85b577');grad.addColorStop(1,'rgba(76,136,86,0)');sx.fillStyle=grad;sx.fillRect(x,top-12*SU,SU*2,15*SU);
    }sx.globalAlpha=1;
  }
  if(isNight){
    for(let i=0;i<30;i++){const x=(i*73+31)%SW,y=(i*29+7)%35;
      sx.globalAlpha=.3+.35*Math.sin(T/55+i)**2;pxr(sx,C[1],x*SU,y*SU,2,2);}
    sx.globalAlpha=1;
  }
  const moonX=(SW-27)*SU,moonY=15*SU;
  pxr(sx,isNight?'#d6dfbe':'#e7e5c9',moonX,moonY,3*SU,3*SU);
  if(isNight)pxr(sx,skyTop,moonX+SU,moonY-SU,3*SU,3*SU);
  // Slow layers of weather, terrain and distant trees give the inhabitants a place.
  sx.globalAlpha=.16;
  for(const cl of [[20,8,14],[80,16,26],[140,9,18]]){
    const x=((cl[0]+T*.008)%(SW+45))-25;
    pxr(sx,C[1],x*SU,cl[1]*SU,cl[2]*SU,SU);pxr(sx,C[1],(x+4)*SU,(cl[1]-1)*SU,(cl[2]-8)*SU,SU);
  }
  sx.globalAlpha=1;
  for(let layer=0;layer<3;layer++){
    sx.fillStyle=[lerpHex('#81937b','#274438',nightAmt),lerpHex('#5b795f','#203d2d',nightAmt),lerpHex('#3f6048','#1a3225',nightAmt)][layer];
    for(let x=0;x<SW;x+=2){const y=45+layer*6+Math.sin(x*.026+layer*2.2)*4+Math.cos(x*.06+layer)*2;sx.fillRect(x*SU,Math.floor(y)*SU,2*SU,(GROUND-y)*SU);}
  }
  for(let i=0;i<14;i++){
    const x=62+(i*37)%(SW+12),base=55+Math.sin(i*3.1)*3,h=6+(i%4)*2;
    pxr(sx,'#385842',x*SU,(base-h)*SU,SU,h*SU);
    for(let row=-3;row<=3;row++){const span=6-Math.abs(row);pxr(sx,i%2?'#375940':'#41634b',(x-span)*SU,(base-h+row)*SU,span*2*SU,SU);}
  }
  let snow=0;
  if(sIdx===3)snow=.25+sT*.75;
  else if(sIdx===0)snow=Math.max(0,1-sT*4.5);
  pxr(sx,'#4b674a',0,(GROUND-1)*SU,sc.width,2*SU);
  pxr(sx,'#111e16',0,(GROUND+1)*SU,sc.width,sc.height);
  if(snow>.05){sx.globalAlpha=snow;pxr(sx,C[1],0,GROUND*SU,sc.width,SU);sx.globalAlpha=1;}
  for(let x=0;x<SW;x+=3){const h=1+(x*17%4);pxr(sx,x%2?'#6b8960':'#375a3d',x*SU,(GROUND-h)*SU,2,SU*h);}
  // The same root network persists beneath passing generations.
  const rootY=(GROUND+1)*SU;
  for(let i=0;i<9;i++){
    const end=20+i*(SW-30)/8,start=TREE_X*SU;
    sx.strokeStyle=i%2?'#304832':'#3c5138';sx.lineWidth=i%3===0?2:1;sx.beginPath();sx.moveTo(start,rootY);
    for(let j=1;j<50;j++){const k=j/49,x=start+(end*SU-start)*k,y=rootY+Math.sin(k*Math.PI)*(20+i*3)+k*(4+i%3*6);sx.lineTo(Math.round(x/SU)*SU,Math.round(y/SU)*SU);}
    sx.stroke();
    const k=((T*.001+i*.13)%1),x=start+(end*SU-start)*k,y=rootY+Math.sin(k*Math.PI)*(20+i*3)+k*(4+i%3*6);
    pxr(sx,'#94bb7c',Math.round(x/SU)*SU,Math.round(y/SU)*SU,2,2);
  }
  const sway=Math.round(Math.sin(T/70));
  // Root flare, a shaded trunk and branching timber under the canopy.
  for(let y=36;y<=GROUND;y++){
    const w=y>60?6:y>48?4:3,x=TREE_X+Math.round(Math.sin(y*.15)*.6);
    pxr(sx,'#586b50',(x-1)*SU,y*SU,w*SU,SU);
    pxr(sx,'#9ba47f',x*SU,y*SU,SU,SU);
    if(y%5<3)pxr(sx,'#788966',(x+1)*SU,y*SU,SU,SU);
  }
  for(const [x,y] of [[-6,65],[-4,64],[5,65],[7,66],[-2,63]])pxr(sx,'#6f805d',(TREE_X+x)*SU,y*SU,3*SU,SU);
  for(let side=-1;side<=1;side+=2){
    for(let i=0;i<3;i++){
      sx.strokeStyle=i%2?'#879773':'#677e5c';sx.lineWidth=(3-i)*SU;sx.beginPath();sx.moveTo((TREE_X+1)*SU,(49-i*5)*SU);
      sx.lineTo((TREE_X+side*(8+i*4))*SU,(39-i*5)*SU);sx.lineTo((TREE_X+side*(17+i*3)+sway)*SU,(31-i*3)*SU);sx.stroke();
    }
  }
  const leafA=sCur.leaf,leafB=sNext.leaf;
  const density=sIdx===0?Math.min(1,sT/.35):sIdx===1?1:sIdx===2?Math.max(0,1-sT):0;
  if(density>0){
    const main=leafA?lerpHex(leafA[0],leafB?leafB[0]:leafA[0],blend):G.D,edge=leafA?lerpHex(leafA[1],leafB?leafB[1]:leafA[1],blend):G.M;const highlight=sIdx===2?'#d7a758':sIdx===1?lerpHex('#92a878','#d7a758',blend):'#92a878';
    CANOPY_ROWS.forEach(row=>{
      const off=row.y<32?sway:sway*.5;
      for(let x=row.x0;x<=row.x1;x++){
        const n=((x*73+row.y*151)%97)/97;
        if(n>density||((x+row.y*3)%23===0))continue;
        const light=Math.sin(x*.30+row.y*.24)*Math.cos(row.y*.47-x*.11);
        sx.fillStyle=light>.38?highlight:light<-.4?edge:main;
        sx.fillRect(Math.round(x+off)*SU,row.y*SU,SU,SU);
        if(sCur.name==='spring'&&n<.025)pxr(sx,'#cfdaa5',(x+off)*SU,row.y*SU,2,2);
      }
    });
  }
  /* autumn leaf-fall */
  if ((sIdx===2 && sT>0.03) || (inTrans && sIdx===2)){
    if (advance&&Math.random()<0.38) drops.push({kind:'leaf', x:(8+Math.random()*58)*SU, y:(20+Math.random()*18)*SU, vy:0.4+Math.random()*0.3, sway:Math.random()*6.28});
  }
  /* weather particles */
  if (weather!=='clear'){
    const n = weather==='rain'?26 : weather==='snow'?18 : 10;
    const want = Math.floor(n*weatherBlend);
    while(drops.filter(d=>d.kind===weather).length < want)
      drops.push({kind:weather, x:Math.random()*sc.width, y:Math.random()*GROUND*SU, vy: weather==='rain'?7:2, sway:Math.random()*6.28});
  }
  for (const d of drops){
    if (d.kind==='rain'){ pxr(sx,'rgba(184,194,186,0.7)',d.x,d.y,1.6,SU); d.y+=d.vy; d.x+=0.5; }
    else if (d.kind==='snow'){ pxr(sx,C[1],d.x,d.y,2.5,2.5); d.y+=d.vy*0.25; d.x+=Math.sin((d.y+T)/14)*0.8; }
    else if (d.kind==='wind'){ pxr(sx, sIdx===2?C[8]:C[4], d.x,d.y,SU/2,SU/2); d.x+=2.2; d.y+=Math.sin((d.x+T)/16)*0.8; }
    else if (d.kind==='leaf'){ pxr(sx,d.sway%2>1?'#c18a46':'#a96537',d.x+Math.sin(d.sway+=0.05)*6,d.y,4,3); d.y+=d.vy; }
    if (d.y > GROUND*SU+30 || d.x>sc.width+10){ d.dead=true; }
  }
  drops = drops.filter(d=>!d.dead);

  /* the day counter — days pass whether you watch or not */
  const dayN = Math.floor(T/DAY_LEN) + 1;
  sx.font = '8px "Geist Mono", monospace';
  sx.fillStyle = 'rgba(242,238,228,0.55)';
  sx.fillText('DAY ' + dayN + ' · ' + SEASONS[sIdx].name.toUpperCase() + (weather!=='clear' ? ' · ' + weather.toUpperCase() : ''), 10, 16);

  /* actors */
  if(advance)updateActors();
  for (const a of actors){
    if (a.type==='seed'){
      if (a.dangle>0){ pxr(sx,C[3],a.x*SU,a.y*SU,SU,SU); pxr(sx,C[1],a.x*SU,(a.y-1)*SU,1,SU); continue; }
      pxr(sx,C[3],a.x*SU,a.y*SU,SU,SU);
    } else if (a.type==='sprout'){
      pxr(sx,C[2],a.x*SU-2,GROUND*SU,SU+4,3);
      sx.fillStyle = G.L;
      if (a.stage>0) sx.fillRect(a.x*SU,(GROUND-2)*SU,2,2*SU);
      if (a.stage>1){ sx.fillRect((a.x-1)*SU,(GROUND-3)*SU,2,2); sx.fillRect((a.x+1)*SU,(GROUND-3)*SU,2,2); }
    } else if (a.type==='pet'){
      const u=SU*(a.scale/.2);const w=a.sprite?72*(a.scale/.2):9*u,h=a.sprite?78*(a.scale/.2):13*u;
      let pxX, pxY;
      if (a===held){
        pxX = Math.round(a.x*SU - w/2);
        pxY = Math.round((a.holdY||GROUND-16)*SU - h*0.6);
        drawResident(a,pxX,pxY,w,h,u,'held',true);
      } else if (a.dropV!=null){
        /* falling after release */
        a.dropV += 0.5; a.heldY += a.dropV;
        if (a.heldY >= GROUND-h/SU){ a.heldY = GROUND-h/SU; a.dropV = null; a.mode='idle'; a.timer=40; }
        pxX = Math.round(a.x*SU - w/2); pxY = Math.round(a.heldY*SU);
        drawResident(a,pxX,pxY,w,h,u,'idle',false);
      } else {
        const mode = a.mode;
        const hopY = (mode==='hop' && Math.floor(T/10)%2===0) ? 3 : 0;
        pxX = Math.round(a.x*SU - w/2); pxY = Math.round(GROUND*SU - h - hopY);
        drawResident(a,pxX,pxY,w,h,u,mode,false);
      }
    }
  }


  if(advance)T++;
  if(T%900===0){const kinds=['clear','wind','clear',sIdx===3?'snow':'rain'];weather=kinds[Math.floor(T/900)%kinds.length];weatherBlend=1;}
  const worldLabel=document.getElementById('world-weather');if(worldLabel)worldLabel.textContent='DAY '+dayN+' / '+SEASONS[sIdx].name.toUpperCase()+' / '+weather.toUpperCase();
}



function runWorld(now){worldFrame=0;if(document.hidden||!worldVisible||worldPaused)return;if(now-worldLast>32){drawScene();worldLast=now;}worldFrame=requestAnimationFrame(runWorld);}
function startWorld(){if(!worldFrame&&worldVisible&&!worldPaused&&!document.hidden)worldFrame=requestAnimationFrame(runWorld);}
function stopWorld(){cancelAnimationFrame(worldFrame);worldFrame=0;}
new IntersectionObserver(entries=>{worldVisible=entries[0].isIntersecting;if(worldVisible)startWorld();else stopWorld();},{threshold:.02}).observe(sc);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopWorld();else startWorld();});
const pause=document.getElementById('world-pause');function pauseLabel(){document.body.classList.toggle('world-still',worldPaused);pause.textContent=worldPaused?'Let it move ▷':'Pause the world Ⅱ';pause.setAttribute('aria-pressed',String(worldPaused));}
pause.addEventListener('click',()=>{worldPaused=!worldPaused;pauseLabel();worldPaused?stopWorld():startWorld();});
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',e=>{worldPaused=e.matches;pauseLabel();worldPaused?stopWorld():startWorld();});
document.getElementById('plant-seed').addEventListener('click',()=>{if(actors.length<18){spawnSeed();if(worldPaused)drawScene(false);document.getElementById('world-status').textContent=worldPaused?'A seed is ready. Let the world move to watch it grow.':'A new seed is falling. Give it a moment to find its feet.';}else document.getElementById('world-status').textContent='The grove is full of company. Stay a while.';});
document.getElementById('next-season').addEventListener('click',()=>{T=(Math.floor(T/SEASON_LEN)+1)*SEASON_LEN+Math.floor(SEASON_LEN*.18);drops=[];weather='clear';weatherBlend=0;drawScene(false);document.getElementById('world-status').textContent='A change of season. The same roots, different weather.';});
spawnSeed();spawnSeed();actors[actors.length-1].y=52;actors[actors.length-1].dangle=0;
pauseLabel();drawScene(false);sheet.onload=codexSheet.onload=()=>{if(worldPaused||!worldVisible)drawScene(false);};
})();
