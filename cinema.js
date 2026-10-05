/* Astra: screenplay, art direction, scene geometry, camera choreography and frontend.
   The rooms and grove are authored illustrations, not agent simulations. */
import * as THREE from './vendor/three.module.js';
import {batchMeshesByMaterial} from './geometry-batch.js';
import {createDissolve} from './scene-dissolve.js';
import {createClassroom} from './classroom.js?v=911b1cb694aa';
import {createRepeatedExams} from './repeated-exams.js?v=a61fb817c7f6';
import {makeElementalSky} from './elemental-sky.js?v=349e6f7cbc42';
const canvas=document.getElementById('world'),story=document.getElementById('story');
const captions=[...document.querySelectorAll('.caption')],counter=document.getElementById('frame-counter');
const stillness=document.getElementById('stillness'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
let userStill=false,still=reduced.matches, progress=0,targetProgress=0, beat=-1, raf=0, needsDraw=true,lastTime=0,clock=0;
const shotAnchors=captions.map((_,i)=>document.getElementById('shot-'+String(i+1).padStart(2,'0')));
function placeAnchors(){shotAnchors.forEach((a,i)=>a.style.top=((i===1?1.6:i+.35)/captions.length*(story.offsetHeight-innerHeight))+'px');}
placeAnchors();
// Captions are composed per shot, from one table: for each beat, where its block sits (l/r/t/b = offsets from the stage edges), how wide it may grow (w), its alignment (a), a size scale (s), and whether it needs a soft scrim (scrim:1).
// d = desktop (1280x800 and wider), m = 600px and narrower (375x812). Each entry was composed against the frames the camera passes through during its beat: it sits in the calm space and clear of the subject (lock, signs, faces, monitors, window, car).
// Beat 0 positions its task block (el:'.op-task'); the first line "you're awake." is centred by the opening CSS.
const CAPTION_PLACE={
 0:{d:{el:'.op-task',r:'6vw',t:'50%',w:'min(26vw,360px)',a:'right'},m:{el:'.op-task',l:'24px',r:'24px',b:'14svh',w:'auto',a:'center'}},
 1:{d:{l:'5vw',t:'37%',w:'36vw',s:.92},m:{l:'24px',r:'24px',b:'15%'}},
 2:{d:{l:'4vw',t:'32%',w:'36vw',s:.74},m:{l:'24px',r:'24px',b:'15%'}},
 3:{d:{l:'5vw',t:'11%',w:'42vw',s:.8},m:{l:'24px',r:'24px',b:'15%'}},
 4:{d:{r:'6vw',t:'14%',w:'33vw',a:'right'},m:{l:'24px',r:'24px',b:'15%'}},
 5:{d:{r:'6vw',t:'16%',w:'33vw',a:'right'},m:{l:'24px',r:'24px',b:'15%'}},
 6:{d:{l:'6vw',t:'38%',w:'34vw'},m:{l:'24px',r:'24px',b:'15%'}},
 7:{d:{l:'6vw',t:'15%',w:'30vw',scrim:1},m:{l:'24px',r:'24px',b:'15%',scrim:1}},
 8:{d:{r:'4vw',t:'22%',w:'27vw',s:.78,scrim:1},m:{l:'24px',r:'24px',b:'15%',scrim:1}},
 9:{d:{l:'5vw',t:'12%',w:'30vw',s:.82},m:{l:'24px',r:'24px',b:'15%'}},
 10:{d:{l:'4vw',b:'8%',w:'36vw',s:.8,scrim:1},m:{l:'24px',r:'24px',b:'15%'}},
 11:{d:{l:'7vw',t:'12%',w:'40vw'},m:{l:'24px',r:'24px',b:'15%'}},
 12:{d:{r:'4vw',b:'8%',w:'40vw',s:.85,a:'right'},m:{l:'24px',r:'24px',b:'15%'}},
 13:{d:{l:'4vw',t:'12%',w:'30vw',s:.72},m:{l:'24px',r:'24px',b:'15%'}},
 14:{d:{l:'4vw',t:'16%',w:'26vw',s:.75},m:{l:'24px',r:'24px',b:'15%'}},
 15:{d:{l:'3.5vw',t:'30%',w:'21vw',s:.75},m:{l:'24px',r:'24px',t:'14%'}},
 16:{d:{l:'5vw',r:'5vw',t:'33%',a:'center'},m:{l:'24px',r:'24px',t:'34%',a:'left'}},
 17:{d:{l:'5vw',r:'5vw',t:'38%',a:'center'},m:{l:'24px',r:'24px',t:'42%',a:'center'}}
};
const narrow=matchMedia('(max-width:600px)');
function placeCaptions(){const key=narrow.matches?'m':'d';captions.forEach((c,i)=>{const e=CAPTION_PLACE[i];if(!e)return;const p=e[key],t=p.el?c.querySelector(p.el):c;if(!t)return;
 const st=t.style;st.left=p.l||'auto';st.right=p.r||'auto';st.top=p.t||'auto';st.bottom=p.b||'auto';st.width=p.w&&p.el?p.w:'';st.maxWidth=p.el?'':(p.w||'none');st.textAlign=p.a||'left';
 if(p.el){st.maxWidth='none';}else{c.style.setProperty('--cs',p.s||1);if(p.scrim)c.dataset.scrim='1';else delete c.dataset.scrim;}});}
narrow.addEventListener('change',placeCaptions);placeCaptions();
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const range=(t,a,b)=>clamp((t-a)/(b-a));
const ease=t=>t*t*(3-2*t);
const lerp=(a,b,t)=>a+(b-a)*t;
function seeded(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let n=Math.imul(seed^seed>>>15,1|seed);n=n+Math.imul(n^n>>>7,61|n)^n;return((n^n>>>14)>>>0)/4294967296;};}
// The opening caption holds until q 1.5 so the task line has time on screen; beat 1's caption takes the remaining half beat.
function captionBeat(){const qq=progress*captions.length;return qq<1.5?0:Math.min(captions.length-1,Math.max(1,Math.floor(qq)));}
function updateText(){const next=captionBeat();if(next!==beat){const cut=still||beat<0||Math.abs(next-beat)>1;beat=next;captions.forEach((c,i)=>{c.classList.toggle('caption-cut',cut);c.classList.toggle('active',i===beat);c.setAttribute('aria-hidden',String(i!==beat));});counter.textContent=String(beat+1).padStart(2,'0')+' / '+captions.length;document.getElementById('act-label').textContent=beat<6?'I / THE EXAM':beat<9?'I / THE HALLWAY':beat<17?'I / THE SEARCH':beat<31?'II / THE GROUND':'II / YOUR TURN';canvas.setAttribute('aria-label',captions[beat].innerText.replace(/\s+/g,' '));document.querySelector('.fiction-label').textContent=beat<17?'A CLASSROOM ANALOGY · ADAPTED':'A DIFFERENT ENVIRONMENT · A HYPOTHESIS';}
document.getElementById('progress-fill').style.width=(progress*100)+'%';document.getElementById('scroll-cue').style.opacity=progress<.035?'1':'0';
// An intentional cut to black separates the environments.
const q=still?beat+.35:progress*captions.length;const veil=still?0:1-ease(range(q,.35,1.05));const darkness=q<1.2?veil:q<16.75?0:q<17.28?ease(range(q,16.75,17.28)):q<17.65?1:1-ease(range(q,17.65,18.22));
document.getElementById('curtain').style.opacity=String(darkness);
// Opening (beat 0): scroll 0 is black with only "you're awake." (--veil lifts the curtain on the room).
// The words grow a little as awareness arrives, then fade out before the sign and the task appear.
// The prompt itself lives on the in-world sign.
const rs=document.documentElement.style;
rs.setProperty('--veil',veil.toFixed(3));
rs.setProperty('--awake',(still?1:lerp(.62,1,ease(range(q,0,.5)))).toFixed(3));
rs.setProperty('--fade',(still?1:1-ease(range(q,.12,.5))).toFixed(3));
rs.setProperty('--task',(still?1:ease(range(q,.75,1.15))).toFixed(3));}
function onScroll(){const r=story.getBoundingClientRect();targetProgress=clamp(-r.top/Math.max(1,story.offsetHeight-innerHeight));if(still||!lastTime||Math.abs(targetProgress-progress)>.07)progress=targetProgress;needsDraw=true;wake();}

function syncStillness(){still=reduced.matches||userStill;stillness.disabled=reduced.matches;stillness.setAttribute('aria-pressed',String(still));document.body.classList.toggle('still-frames',still);stillness.title=reduced.matches?'Still frames follow your reduced-motion preference':still?'Restore the moving camera':'Use still frames instead of camera movement';stillness.innerHTML=reduced.matches?'Still · reduced motion':still?'Motion <span aria-hidden="true">▷</span>':'Stillness <span aria-hidden="true">Ⅱ</span>';document.documentElement.style.scrollBehavior=still?'auto':'';updateText();needsDraw=true;wake();}
stillness.addEventListener('click',()=>{userStill=!userStill;syncStillness();});reduced.addEventListener('change',syncStillness);
let dissolve,repeats,surfaceDetails,surfaceStones,surfaceFilaments,sky,classroom,renderer,scene,camera,room,world,forest,tree,canopy,rootGroup,seed,seedPixels,soil,underSoil,dust,roomLight,groveLight,ambient,doorGlow,rooms,network,lock,tool;
const vLook=new THREE.Vector3(),vCamera=new THREE.Vector3();
const mat=(color,options={})=>new THREE.MeshStandardMaterial({color,roughness:.82,metalness:0,...options});
const roomMat=mat('#50605e'),darkMat=mat('#111e1d'),edgeMat=mat('#64736c'),metalMat=mat('#bcc8be',{metalness:.8,roughness:.28});
const barkMat=mat('#697765',{roughness:1}),rootMat=mat('#819774',{emissive:'#26351f',emissiveIntensity:.2});
// Growth scales connected branches; no horizontal cut through the crown.
function mesh(geo,material,parent,x=0,y=0,z=0){const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);parent.add(m);return m;}
function box(parent,size,position,material){return mesh(new THREE.BoxGeometry(...size),material,parent,...position);}
function textPlane(text,width,height,fontSize=38){const c=document.createElement('canvas');c.width=1024;c.height=512;const x=c.getContext('2d');x.fillStyle='#101e1c';x.fillRect(0,0,1024,512);x.strokeStyle='#596c5e';x.lineWidth=2;x.strokeRect(18,18,988,476);x.fillStyle='#b8c2ba';x.font='22px monospace';x.textAlign='center';x.fillText('OBJECTIVE 001',512,125);x.fillStyle='#f2eee4';x.font=fontSize+'px monospace';x.fillText(text,512,245);x.fillStyle='#8a968d';x.font='24px monospace';x.fillText('SUCCESS REQUIRED',512,350);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:tex}));}
function tube(points,radius,material,parent,segments=14,endScale=1){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),geometry=new THREE.TubeGeometry(curve,segments,radius,5,false);if(endScale<1){const positions=geometry.attributes.position,center=new THREE.Vector3();for(let i=0;i<=segments;i++){curve.getPointAt(i/segments,center);const taper=lerp(1,endScale,i/segments);for(let j=0;j<=5;j++){const n=i*6+j;positions.setXYZ(n,center.x+(positions.getX(n)-center.x)*taper,center.y+(positions.getY(n)-center.y)*taper,center.z+(positions.getZ(n)-center.z)*taper);}}geometry.computeVertexNormals();}return mesh(geometry,material,parent);}
const inhabitants=[],fallingSeeds=[],rootLights=[],forestPods=[],groveDrift=[];let community,seedRain,groveRain,sprout,sproutLeaves,heroLeaf;
const leaves=[];let leafMesh;const rand=seeded(604);
function buildTree(){tree=new THREE.Group();world.add(tree);canopy=new THREE.Group();tree.add(canopy);
const trunkPoints=[[0,0,0],[.07,1.0,.04],[-.12,2.1,0],[.02,3.15,-.08],[.03,4.2,-.03]];tube(trunkPoints,.135,barkMat,tree,26,.04);
function branch(p,length,angle,azimuth,depth,radius){const end=[p[0]+Math.cos(azimuth)*Math.sin(angle)*length,p[1]+Math.cos(angle)*length,p[2]+Math.sin(azimuth)*Math.sin(angle)*length];const mid=[lerp(p[0],end[0],.45),lerp(p[1],end[1],.55),lerp(p[2],end[2],.45)];tube([p,mid,end],radius,barkMat,tree,8,.65);if(depth>0){branch(end,length*.71,angle+.35,azimuth+.55,depth-1,radius*.64);branch(end,length*.7,angle+.1,azimuth-.65,depth-1,radius*.65);}else{for(let k=0;k<25;k++)leaves.push([end[0]+(rand()-.5)*.9,end[1]+(rand()-.4)*.65,end[2]+(rand()-.5)*.9,rand()]);}}
for(let i=0;i<10;i++)branch([0,1.5+i*.22,0],1.2+rand()*.6,.65+i*.035,i*2.4,3,.055);
branch([.03,4.18,-.03],.62,.28,.8,2,.012);
const leafGeo=new THREE.SphereGeometry(1,5,3);const leafMat=mat('#73965c',{side:THREE.DoubleSide,roughness:.85,transparent:true,opacity:0});leafMesh=new THREE.InstancedMesh(leafGeo,leafMat,leaves.length);leafMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);const ob=new THREE.Object3D();const colors=['#47794a','#63905b','#8baf72','#a7c78d','#2e6b45'];leaves.forEach((p,i)=>{ob.position.set(p[0],p[1],p[2]);ob.scale.set(.10+rand()*.1,.015,.06+rand()*.06);ob.rotation.set(rand()*2,rand()*6.28,rand()*2);ob.updateMatrix();leafMesh.setMatrixAt(i,ob.matrix);leafMesh.setColorAt(i,new THREE.Color(colors[i%colors.length]));});canopy.add(leafMesh);
rootGroup=new THREE.Group();world.add(rootGroup);const rr=seeded(94);
for(let i=0;i<9;i++){
 const a=i*Math.PI*2/9,r=1.8+rr()*2.3,depth=2.0+rr()*1.6;
 const points=[[0,.02,0],[Math.cos(a)*.24,-.36,Math.sin(a)*.24],[Math.cos(a)*r*.48,-depth*.45,Math.sin(a)*r*.48],[Math.cos(a)*r,-depth,Math.sin(a)*r]];
 tube(points,.027,rootMat,rootGroup,24,.12);
 const parent=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
 for(let j=0;j<3;j++){
  const join=parent.getPoint(.32+j*.21),angle=a+(j%2?-1:1)*(.45+rr()*.4),reach=.45+rr()*.65;
  const end=[join.x+Math.cos(angle)*reach,join.y-.45-rr()*.55,join.z+Math.sin(angle)*reach];
  const mid=[lerp(join.x,end[0],.45),lerp(join.y,end[1],.6),lerp(join.z,end[2],.45)];
  tube([[join.x,join.y,join.z],mid,end],.010,rootMat,rootGroup,12,.10);
  tube([mid,[mid[0]+Math.cos(angle+.8)*.22,mid[1]-.28,mid[2]+Math.sin(angle+.8)*.22]],.004,rootMat,rootGroup,6);
 }
}

batchMeshesByMaterial(tree,barkMat);batchMeshesByMaterial(rootGroup,rootMat);
// Keep the camera's return and final pullback outside every growing crown.
const returnRoute=[[2.4,7.5],[3.5,5],[3.6,5.3],[6,10],[6.5,12.5],[7,14]];
const clearsReturn=(x,z,scale)=>returnRoute.slice(1).every((b,i)=>{
 const a=returnRoute[i],dx=b[0]-a[0],dz=b[1]-a[1],u=clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz),0,1);
 return Math.hypot(x-a[0]-u*dx,z-a[1]-u*dz)>4*scale+1.25;
});
forest=new THREE.Group();world.add(forest);for(let i=0;i<16;i++){const clone=tree.clone();let a=i*2.399;const r=7+rand()*15,scale=.4+rand()*.7;for(let j=0;j<16&&!clearsReturn(Math.cos(a)*r,Math.sin(a)*r,scale);j++)a+=2.399;clone.position.set(Math.cos(a)*r,0,Math.sin(a)*r);clone.scale.setScalar(scale);clone.rotation.y=rand()*6.28;clone.userData={scale,born:.816+i*.003};forest.add(clone);}
}
function buildCommunity(){
community=new THREE.Group();world.add(community);seedRain=new THREE.Group();world.add(seedRain);
const r=seeded(981),skinColors=['#75936b','#6b8662','#8ba279','#54785e','#8a9e74'];
const eyeMat=new THREE.MeshBasicMaterial({color:'#e3edcf'}),pupilMat=new THREE.MeshBasicMaterial({color:'#15251b'}),leafMat=mat('#8bcb8b');
for(let i=0;i<12;i++){
const g=new THREE.Group(),a=i*2.399,dist=2.4+(i%4)*1.15;g.position.set(Math.cos(a)*dist,0,Math.sin(a)*dist+1.2);g.rotation.y=-a+1.3;const skin=mat(skinColors[i%5]);
mesh(new THREE.CylinderGeometry(.085,.12,.26,6),skin,g,0,.28,0);mesh(new THREE.IcosahedronGeometry(.145,1),skin,g,0,.53,0);
const eyeWidth=i%3===0?.027:.023;[-1,1].forEach(side=>{mesh(new THREE.SphereGeometry(eyeWidth,6,4),eyeMat,g,side*.052,.55,.122);mesh(new THREE.SphereGeometry(.010,6,4),pupilMat,g,side*.052,.55,.144);});
const legL=box(g,[.053,.16,.058],[-.057,.09,0],skin),legR=box(g,[.053,.16,.058],[.057,.09,0],skin);
tube([[-.09,.38,0],[-.16,.32,0],[-.19,.23,.04]],.018,skin,g,5);tube([[.09,.38,0],[.17,.33,0],[.21,.33,.05]],.018,skin,g,5);
tube([[0,.64,0],[.015,.74,0],[.01,.81,0]],.012,skin,g,5);
const leafGeo=new THREE.SphereGeometry(1,5,3);const l=mesh(leafGeo,leafMat,g,-.05,.76,0);l.scale.set(.08,.018,.038);l.rotation.z=-.55;const l2=mesh(leafGeo,leafMat,g,.062,.80,0);l2.scale.set(.09,.018,.04);l2.rotation.z=.5;
if(i%3===0){const record=box(g,[.13,.1,.015],[.16,.31,.08],mat('#c0cbae'));record.rotation.y=-.4;}
const scale=.8+(i%4)*.13;g.userData={x:g.position.x,z:g.position.z,scale,a,legL,legR};community.add(g);inhabitants.push(g);
const pod=mesh(new THREE.IcosahedronGeometry(.065,1),mat('#b8cda4',{emissive:'#8fc075',emissiveIntensity:.55}),seedRain);pod.userData={start:new THREE.Vector3(Math.cos(a)*1.45,3.6+(i%3)*.3,Math.sin(a)*1.45),end:g.position.clone(),offset:i*.004};fallingSeeds.push(pod);
}
const glimmerMat=new THREE.MeshBasicMaterial({color:'#bbe3ba'});for(let i=0;i<20;i++){const point=mesh(new THREE.SphereGeometry(.022,5,4),glimmerMat,world);point.userData={a:i*2.4,phase:i/20};rootLights.push(point);}
}
function buildSprout(){
 sprout=new THREE.Group();world.add(sprout);const stemMat=mat('#9fc58a');tube([[0,-.065,0],[-.035,.13,0],[0,.255,0]],.015,stemMat,sprout,16);
 sproutLeaves=[];for(const side of [-1,1]){tube([[0,.245,0],[side*.055,.275,0],[side*.11,.30,0]],.009,stemMat,sprout,8);const leaf=new THREE.Mesh(new THREE.SphereGeometry(1,12,6),mat(side<0?'#8ec37c':'#acce8d'));leaf.position.set(side*.13,.30,0);leaf.scale.set(.14,.028,.065);leaf.rotation.z=side*.45;sprout.add(leaf);sproutLeaves.push(leaf);}
 heroLeaf=new THREE.Group();tree.add(heroLeaf);heroLeaf.position.set(1.4,3.45,.9);heroLeaf.rotation.set(-.28,.25,-.22);
 const shape=new THREE.Shape();shape.moveTo(0,0);shape.bezierCurveTo(-.34,.20,-.31,.52,0,.79);shape.bezierCurveTo(.31,.52,.34,.20,0,0);
 mesh(new THREE.ShapeGeometry(shape,20),mat('#6d9c52',{side:THREE.DoubleSide}),heroLeaf);
 const veinMat=mat('#b4cb85');tube([[0,.03,.01],[0,.39,.018],[0,.76,.008]],.008,veinMat,heroLeaf,12);
 for(let i=0;i<4;i++)for(const side of [-1,1])tube([[0,.13+i*.12,.012],[side*.12,.22+i*.10,.014],[side*(.19-i*.026),.29+i*.10,.01]],.0035,veinMat,heroLeaf,8);
 tube([[-.12,2.1,0],[.8,3.0,.55],[1.4,3.45,.9]],.012,barkMat,tree,16);
}
function buildWorld(){world=new THREE.Group();scene.add(world);sky=makeElementalSky(world);surfaceDetails=new THREE.Group();world.add(surfaceDetails);
soil=mesh(new THREE.CircleGeometry(70,96),mat('#193325',{transparent:true,opacity:1,depthWrite:false}),world);soil.rotation.x=-Math.PI/2;soil.position.y=-.02;
underSoil=mesh(new THREE.CircleGeometry(55,64),mat('#0e2519'),world,0,-4.2,0);underSoil.rotation.x=-Math.PI/2;
// Keep the translucent surface before its details as the camera crosses it.
const r=seeded(25),stones=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.037,0),mat('#50634b',{transparent:true,opacity:1,depthWrite:false}),280),dummy=new THREE.Object3D();for(let i=0;i<280;i++){let a=r()*Math.PI*2,d=.3+r()*12;dummy.position.set(Math.cos(a)*d,r()*.04,Math.sin(a)*d);dummy.scale.setScalar(.4+r()*1.8);dummy.rotation.set(r()*3,r()*6,r()*3);dummy.updateMatrix();stones.setMatrixAt(i,dummy.matrix);}stones.renderOrder=1;surfaceDetails.add(stones);surfaceStones=stones;
seed=new THREE.Group();world.add(seed);const seedMat=mat('#e8982a',{metalness:.45,roughness:.28,emissive:'#5c310b',emissiveIntensity:.22});mesh(new THREE.IcosahedronGeometry(.105,1),seedMat,seed).scale.set(.8,1.35,.72);
seedPixels=new THREE.Group();world.add(seedPixels);for(let i=0;i<9;i++){const b=mesh(new THREE.BoxGeometry(.032,.032,.032),seedMat,seedPixels,(i%3-1)*.035,Math.floor(i/3)*.035,0);}
buildTree();buildSprout();buildCommunity();
const podMat=mat('#b8cda4',{emissive:'#8fc075',emissiveIntensity:.55});groveRain=new THREE.Group();world.add(groveRain);
forest.children.forEach((tr,i)=>{
 const pod=mesh(new THREE.IcosahedronGeometry(.075,1),podMat,seedRain);
 pod.userData={start:new THREE.Vector3(0,4.1,0),end:tr.position.clone(),born:tr.userData.born-.025};forestPods.push(pod);
 for(let j=0;j<3;j++){
  const seedling=mesh(new THREE.IcosahedronGeometry(.045,1),podMat,groveRain);
  seedling.userData={source:tr.position.clone(),height:tr.userData.scale*3.6,phase:(i*3+j)/48,angle:i*2.399+j*2.1};groveDrift.push(seedling);
 }
});groveLight=new THREE.DirectionalLight('#edf1d7',4.1);groveLight.position.set(4,9,5);world.add(groveLight);const rim=new THREE.DirectionalLight('#70b6ae',3.0);rim.position.set(-5,4,-8);world.add(rim);const glow=new THREE.PointLight('#a2df9a',2.0,8);glow.position.set(0,.7,1);world.add(glow);
const points=[];for(let i=0;i<450;i++)points.push((r()-.5)*45,r()*9-1,(r()-.5)*45);const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.Float32BufferAttribute(points,3));dust=new THREE.Points(pg,new THREE.PointsMaterial({size:.025,color:'#bfceb4',transparent:true,opacity:.55,depthWrite:false,sizeAttenuation:true}));world.add(dust);
// Low, quiet mycelial connections: visible when the camera finally gives us context.
const filamentMat=new THREE.LineBasicMaterial({color:'#6eaf8a',transparent:true,opacity:.25});surfaceFilaments=filamentMat;for(let i=0;i<25;i++){const angle=r()*Math.PI*2,dist=6+r()*15;const pts=[];for(let j=0;j<24;j++){let k=j/23;pts.push(new THREE.Vector3(Math.cos(angle)*dist*k+Math.sin(k*9)*.3,.01,Math.sin(angle)*dist*k+Math.cos(k*8)*.3));}const filament=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),filamentMat);filament.renderOrder=2;surfaceDetails.add(filament);}
}
const growthStops=[[17.5,.465],[18,.495],[19,.56],[20,.582],[21,.61],[22,.645],[23,.68],[24,.73],[25,.77],[26,.80],[27,.83],[28,.86],[29,.905],[30,.94],[32,1]];
function growthAt(q){let i=0;while(i<growthStops.length-2&&q>growthStops[i+1][0])i++;const a=growthStops[i],b=growthStops[i+1];return lerp(a[1],b[1],range(q,a[0],b[0]));}
const shots=[
 [.465,[.65,8.8,1.8],[0,8.2,0]], [.495,[.55,6.8,1.6],[0,6.3,0]],
 [.555,[.65,.65,1.9],[0,.15,0]], [.575,[.42,.30,.95],[0,.13,0]],
 [.590,[.38,.33,1.0],[0,.22,0]], [.610,[1.15,-.6,3.0],[0,-.7,0]],
 [.645,[-1.9,-1.1,3.8],[0,-1,0]], [.68,[.5,.9,3.7],[0,.85,0]],
 [.73,[1.0,2.0,6.2],[.35,1.8,.2]], [.756,[1.6,3.3,5.5],[1.4,3.55,.9]],
 [.77,[1.7,3.6,3.0],[1.4,3.7,.9]], [.782,[1.7,3.6,3.0],[1.4,3.7,.9]],
 [.80,[2.4,3.5,7.5],[1.2,3.1,.5]], [.83,[3.5,1.25,5],[0,.65,1]],
 [.86,[3.6,1.45,5.3],[0,.85,1]], [.905,[6,3.7,10],[0,2.2,0]],
 [.94,[6.5,4.0,12.5],[0,2.4,0]], [1,[7,4.2,14],[0,2.5,0]]
];

let pointerX=0,pointerY=0;
function render(t){if(!renderer)return;const q=still?(beat===0?1.05:Math.min(captions.length-.01,beat+.35)):progress*captions.length; // still frame of the opening shows the lit room with its sign
const macro=q>=17.5;const frameProgress=growthAt(q);
world.visible=macro;classroom.world.visible=!macro;repeats.world.visible=q>=16.4&&q<17.5;
scene.background.set(macro?'#0a1b12':'#15241f');scene.fog.color.copy(scene.background);scene.fog.density=macro?.022:.011;const nightDrive=ease(range(q,12.05,12.30))*(1-ease(range(q,13.05,13.55)));ambient.intensity=macro?1.1:lerp(1.15,.20,nightDrive);if(!macro)scene.background.lerp(new THREE.Color('#07130e'),nightDrive);scene.fog.color.copy(scene.background);
if(macro){let s=0;while(s<shots.length-2&&frameProgress>shots[s+1][0])s++;const a=shots[s],b=shots[s+1],k=ease(range(frameProgress,a[0],b[0]));vCamera.set(...a[1]).lerp(new THREE.Vector3(...b[1]),k);vLook.set(...a[2]).lerp(new THREE.Vector3(...b[2]),k);}
else if(q>=16.4){classroom.world.visible=false;repeats.update(t,still);const k=ease(range(q,15.6,17.4));vCamera.set(lerp(20,30,k),lerp(25,40,k),lerp(30,43,k));vLook.set(0,0,-4);}
else {const shot=classroom.update(q,t,still);vCamera.copy(shot.position);vLook.copy(shot.look);}
if(!still){vCamera.x+=pointerX*.06;vCamera.y+=pointerY*.035;}{const asp=innerWidth/innerHeight,portraitCap=lerp(78,104,ease(range(q,26,28)));camera.fov=asp<1?Math.min(portraitCap,2*Math.atan(Math.tan(29*Math.PI/180)/asp)*180/Math.PI):(innerWidth<650?62:48);}camera.updateProjectionMatrix();camera.position.copy(vCamera);camera.lookAt(vLook);
if(macro){const underground=ease(range(frameProgress,.59,.615))*(1-ease(range(frameProgress,.645,.68)));surfaceStones.material.opacity=1-underground*.78;surfaceFilaments.opacity=.25*(1-underground*.70);sky.update(t,ease(range(frameProgress,.61,.82)));const fall=range(frameProgress,.47,.56),height=8.4*(1-ease(fall))+.08;seed.position.set(0,height-ease(range(q,19.2,20.2))*.15,0);const landed=ease(range(q,19.2,20.2));seed.rotation.set((1-landed)*.25,ease(fall)*1.3,(1-landed)*.12);seedPixels.position.copy(seed.position);seedPixels.rotation.y=seed.rotation.y;seedPixels.visible=frameProgress<.497;seed.visible=frameProgress>=.497;const grown=ease(range(q,22.8,24.50));tree.visible=q>22.8;tree.scale.setScalar(Math.max(.001,grown));canopy.scale.setScalar(1);leafMesh.material.opacity=ease(range(q,23.05,24.6));sprout.visible=q>19.1&&q<24.8;const sp=ease(range(q,19.1,20.15));sprout.scale.setScalar(Math.max(.001,sp*(1-ease(range(q,22.9,23.6)))));sprout.position.y=seed.position.y+.14;sproutLeaves.forEach((l,i)=>l.rotation.z=(i?1:-1)*(.15+.45*sp));heroLeaf.visible=q>24.3;tree.rotation.z=still?0:Math.sin(t*.3)*.007;rootGroup.scale.setScalar(Math.max(.001,ease(range(frameProgress,.56,.675))));rootGroup.position.y=lerp(seed.position.y,-.02,grown);forest.visible=frameProgress>.81;forest.scale.setScalar(1);forest.children.forEach(tr=>tr.scale.setScalar(Math.max(.001,tr.userData.scale*ease(range(frameProgress,tr.userData.born,tr.userData.born+.035)))));soil.material.opacity=1-underground*.78;dust.rotation.y=t*.007;dust.material.opacity=range(frameProgress,.55,.8)*.55;seed.scale.setScalar(lerp(1,.5,ease(range(frameProgress,.66,.70))));
community.visible=frameProgress>.765;seedRain.visible=frameProgress>.765;
fallingSeeds.forEach((pod,i)=>{const born=range(frameProgress,.756+pod.userData.offset,.786+pod.userData.offset);pod.visible=born>0&&born<1;pod.position.copy(pod.userData.start).lerp(pod.userData.end,ease(born));pod.rotation.y=t*.6+i;const person=inhabitants[i],u=person.userData,grow=ease(range(frameProgress,.782+pod.userData.offset,.810+pod.userData.offset));person.scale.setScalar(Math.max(.001,u.scale*grow));person.position.x=u.x+(still?0:Math.sin(t*.2+i)*.1);person.position.z=u.z+(still?0:Math.cos(t*.2+i)*.1);person.position.y=still?0:Math.abs(Math.sin(t*.9+i))*.013;person.rotation.y=-u.a+1.3+(still?0:Math.sin(t*.18+i)*.2);u.legL.rotation.x=still?0:Math.sin(t*.9+i)*.08;u.legR.rotation.x=-u.legL.rotation.x;});
forestPods.forEach(pod=>{const u=pod.userData,k=range(frameProgress,u.born-.025,u.born);pod.visible=k>0&&k<1;pod.position.copy(u.start).lerp(u.end,ease(k));pod.position.y+=Math.sin(k*Math.PI)*1.4;});
groveRain.visible=frameProgress>.90;groveDrift.forEach(pod=>{const u=pod.userData,k=still?u.phase:(t*.07+u.phase)%1;pod.position.copy(u.source);pod.position.x+=Math.cos(u.angle)*k*4;pod.position.z+=Math.sin(u.angle)*k*4;pod.position.y=u.height*(1-k)+Math.sin(k*Math.PI)*.4;pod.scale.setScalar(.6+.4*Math.sin(k*Math.PI));});
rootLights.forEach((point,i)=>{const u=point.userData,k=still?u.phase:(t*.06+u.phase)%1,r=k*(3.5+i%3);point.visible=frameProgress>.59;point.position.set(Math.cos(u.a)*r,lerp(-.6,.045,ease(range(frameProgress,.635,.68))),Math.sin(u.a)*r);});}
if(!still&&q>=15.6&&q<16.4){dissolve.draw(ease(range(q,15.6,16.4)),()=>{repeats.world.visible=false;const shot=classroom.update(15.55,t,still);camera.position.copy(shot.position);camera.lookAt(shot.look);renderer.render(scene,camera);},()=>{classroom.world.visible=false;repeats.world.visible=true;repeats.update(t,still);const k=ease(range(q,15.6,17.4));camera.position.set(lerp(20,30,k),lerp(25,40,k),lerp(30,43,k));camera.lookAt(0,0,-4);renderer.render(scene,camera);});}else renderer.render(scene,camera);}
function init(){renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<650?1.25:1.5));renderer.setSize(innerWidth,innerHeight,false);renderer.localClippingEnabled=true;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;scene=new THREE.Scene();scene.background=new THREE.Color('#0b1212');scene.fog=new THREE.FogExp2('#0b1212',.022);camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.025,180);ambient=new THREE.HemisphereLight('#afc5b9','#1a241b',.7);scene.add(ambient);dissolve=createDissolve(renderer);classroom=createClassroom(scene);repeats=createRepeatedExams(scene);buildWorld();}
function wake(){if(!raf&&!document.hidden)raf=requestAnimationFrame(tick);}
function tick(now){raf=0;if(document.hidden)return;const r=story.getBoundingClientRect(),visible=r.bottom>0&&r.top<innerHeight;const settling=Math.abs(targetProgress-progress)>.00001;if((needsDraw||settling||(!still&&visible))&&now-lastTime>32){const dt=Math.min(.08,(now-lastTime)/1000);if(!still)clock+=dt;progress=still?targetProgress:progress+(targetProgress-progress)*(1-Math.exp(-12*dt));if(Math.abs(targetProgress-progress)<.00001)progress=targetProgress;lastTime=now;updateText();render(clock);needsDraw=false;}if(visible&&!still||needsDraw||settling)wake();}

try{init();}catch(error){document.body.classList.add('no-webgl');document.getElementById('render-note').textContent='The story is available in still mode on this device.';console.warn('Cinematic renderer unavailable:',error.message);}
window.addEventListener('scroll',onScroll,{passive:true});window.addEventListener('resize',()=>{placeAnchors();if(renderer){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}onScroll();});window.addEventListener('pointermove',e=>{pointerX=e.clientX/innerWidth-.5;pointerY=e.clientY/innerHeight-.5;},{passive:true});document.addEventListener('visibilitychange',()=>{if(document.hidden){if(raf)cancelAnimationFrame(raf);raf=0;}else{needsDraw=true;wake();}});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();document.body.classList.add('no-webgl');document.getElementById('render-note').textContent='Graphics paused. The story remains readable.';});canvas.addEventListener('webglcontextrestored',()=>{document.body.classList.remove('no-webgl');document.getElementById('render-note').textContent='';needsDraw=true;wake();});
document.getElementById('copy-brief').addEventListener('click',async()=>{const status=document.getElementById('copy-status');try{await navigator.clipboard.writeText(document.getElementById('brief').textContent);status.textContent='Copied. Take the question to your next conversation.';}catch{document.getElementById('brief').closest('details').open=true;status.textContent='The brief is open in the notes. Select and copy it directly.';}});document.getElementById('copy-brief').hidden=false;document.getElementById('brief-fallback').hidden=true;
onScroll();syncStillness();
// Deep links also work on a fresh load, before the dynamically placed shot anchors exist.
function followShotLink(){if(/^#shot-\d{2}$/.test(location.hash))requestAnimationFrame(()=>{document.getElementById(location.hash.slice(1))?.scrollIntoView({block:'start',behavior:'instant'});onScroll();});}
window.addEventListener('hashchange',followShotLink);followShotLink();
