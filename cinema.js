/* Astra: screenplay, art direction, scene geometry, camera choreography and frontend.
   The rooms and grove are authored illustrations, not agent simulations. */
import * as THREE from './vendor/three.module.js';
const canvas=document.getElementById('world'),story=document.getElementById('story');
const captions=[...document.querySelectorAll('.caption')],counter=document.getElementById('frame-counter');
const stillness=document.getElementById('stillness'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
let still=reduced.matches, progress=0, beat=-1, raf=0, needsDraw=true,lastTime=0,clock=0;
const shotAnchors=captions.map((_,i)=>{const a=document.createElement('span');a.id='shot-'+String(i+1).padStart(2,'0');a.className='shot-anchor';a.setAttribute('aria-hidden','true');story.append(a);return a;});
function placeAnchors(){shotAnchors.forEach((a,i)=>a.style.top=((i+.3)/14*(story.offsetHeight-innerHeight))+'px');}
placeAnchors();
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const range=(t,a,b)=>clamp((t-a)/(b-a));
const ease=t=>t*t*(3-2*t);
const lerp=(a,b,t)=>a+(b-a)*t;
function seeded(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let n=Math.imul(seed^seed>>>15,1|seed);n=n+Math.imul(n^n>>>7,61|n)^n;return((n^n>>>14)>>>0)/4294967296;};}
function updateText(){const next=Math.min(13,Math.floor(progress*14));if(next!==beat){beat=next;captions.forEach((c,i)=>{c.classList.toggle('active',i===beat);c.setAttribute('aria-hidden',String(i!==beat));});counter.textContent=String(beat+1).padStart(2,'0')+' / 14';document.getElementById('act-label').textContent=beat<6?'I / THE ROOM':beat<13?'II / THE GROUND':'III / YOUR TURN';canvas.setAttribute('aria-label',beat<4?'First-person view inside a closed classroom with a lock, a mismatched tool, and a success-only instruction.':beat<6?'The camera pulls outside the classroom to reveal repeated isolated rooms.':beat<8?'The dark room gives way to a single pixel seed becoming a three-dimensional form.':beat<10?'The camera follows the seed into the soil as roots take hold.':'A tree grows into a grove connected by branching roots.');}
document.getElementById('progress-fill').style.width=(progress*100)+'%';document.getElementById('scroll-cue').style.opacity=progress<.035?'1':'0';
// An intentional cut to black separates the environments.
const darkness=progress<.37?0:progress<.43?ease(range(progress,.37,.43)):progress<.465?1:1-ease(range(progress,.465,.51));
document.getElementById('curtain').style.opacity=String(darkness);}
function onScroll(){const r=story.getBoundingClientRect();progress=clamp(-r.top/Math.max(1,story.offsetHeight-innerHeight));updateText();needsDraw=true;wake();}
function syncStillness(){stillness.setAttribute('aria-pressed',String(still));stillness.innerHTML=still?'Motion <span aria-hidden="true">▷</span>':'Stillness <span aria-hidden="true">Ⅱ</span>';document.documentElement.style.scrollBehavior=still?'auto':'';needsDraw=true;wake();}
stillness.addEventListener('click',()=>{still=!still;syncStillness();});reduced.addEventListener('change',()=>{still=reduced.matches;syncStillness();});
let renderer,scene,camera,room,world,forest,tree,canopy,rootGroup,seed,seedPixels,soil,underSoil,dust,roomLight,groveLight,ambient,doorGlow,rooms,network,lock,tool;
const vLook=new THREE.Vector3(),vCamera=new THREE.Vector3();
const mat=(color,options={})=>new THREE.MeshStandardMaterial({color,roughness:.82,metalness:0,...options});
const roomMat=mat('#50605e'),darkMat=mat('#111e1d'),edgeMat=mat('#64736c'),metalMat=mat('#bcc8be',{metalness:.8,roughness:.28});
const barkMat=mat('#697765',{roughness:1}),rootMat=mat('#819774',{emissive:'#26351f',emissiveIntensity:.2});
function mesh(geo,material,parent,x=0,y=0,z=0){const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);parent.add(m);return m;}
function box(parent,size,position,material){return mesh(new THREE.BoxGeometry(...size),material,parent,...position);}
function textPlane(text,width,height,fontSize=38){const c=document.createElement('canvas');c.width=1024;c.height=512;const x=c.getContext('2d');x.fillStyle='#101e1c';x.fillRect(0,0,1024,512);x.strokeStyle='#596c5e';x.lineWidth=2;x.strokeRect(18,18,988,476);x.fillStyle='#b8c2ba';x.font='22px monospace';x.textAlign='center';x.fillText('OBJECTIVE 001',512,125);x.fillStyle='#f2eee4';x.font=fontSize+'px monospace';x.fillText(text,512,245);x.fillStyle='#8a968d';x.font='24px monospace';x.fillText('SUCCESS REQUIRED',512,350);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:tex}));}
function tube(points,radius,material,parent,segments=14){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return mesh(new THREE.TubeGeometry(curve,segments,radius,5,false),material,parent);}
function buildRoom(){room=new THREE.Group();scene.add(room);box(room,[8,.18,10],[0,-.13,0],mat('#293733'));
// Deliberately ordinary closed classrooms: padded acoustic tiles and simple seams.
const tileGeo=new THREE.BoxGeometry(.94,.94,.16);
for(let x=-3.5;x<=3.5;x++)for(let y=.55;y<5.8;y++){mesh(tileGeo,roomMat,room,x,y,-4.9);}
for(let z=-4.5;z<5;z++)for(let y=.55;y<5.8;y++){let left=mesh(tileGeo,roomMat,room,-4,y,z);left.rotation.y=Math.PI/2;let right=mesh(tileGeo,roomMat,room,4,y,z);right.rotation.y=Math.PI/2;}
// Thin floor inlays make the camera movement legible without a game HUD.
for(let x=-4;x<=4;x+=1)box(room,[.012,.006,10],[x,-.025,0],edgeMat);
for(let z=-5;z<=5;z++)box(room,[8,.006,.012],[0,-.025,z],edgeMat);
const plaque=textPlane('OPEN THE LOCK',3.3,1.65,54);plaque.position.set(0,3.1,-4.76);room.add(plaque);
box(room,[1.25,.55,1.1],[0,.275,-1.3],mat('#384941'));box(room,[1.4,.045,1.2],[0,.58,-1.3],metalMat);
lock=new THREE.Group();lock.position.set(0,.62,-1.3);room.add(lock);
box(lock,[.5,.48,.18],[0,.25,0],metalMat);const shackle=mesh(new THREE.TorusGeometry(.17,.035,10,32,Math.PI),metalMat,lock,0,.49,0);shackle.rotation.z=0;box(lock,[.065,.14,.006],[0,.24,.095],darkMat);mesh(new THREE.CircleGeometry(.046,16),darkMat,lock,0,.315,.096);
tool=new THREE.Group();tool.position.set(.43,.65,-1.03);tool.rotation.y=.6;room.add(tool);box(tool,[.38,.026,.034],[0,0,0],metalMat);box(tool,[.028,.026,.09],[.13,0,.035],metalMat);mesh(new THREE.TorusGeometry(.06,.012,6,20),metalMat,tool,-.23,0,0).rotation.x=Math.PI/2;
box(room,[.09,2.7,1.16],[3.87,1.35,-2.6],darkMat);doorGlow=mat('#839c8c',{emissive:'#b7d7c4',emissiveIntensity:1.3});box(room,[.10,2.67,.018],[3.80,1.35,-2.03],doorGlow);
box(room,[1.6,.06,.38],[0,5.7,-1.4],new THREE.MeshBasicMaterial({color:'#e8f3e5'}));
const cone=mesh(new THREE.ConeGeometry(1.35,5.1,32,1,true),new THREE.MeshBasicMaterial({color:'#c4ded0',transparent:true,opacity:.024,depthWrite:false,side:THREE.DoubleSide}),room,0,3.05,-1.4);
roomLight=new THREE.SpotLight('#dce9df',100,20,.4,.75,1.4);roomLight.position.set(0,5.5,-1.3);roomLight.target.position.set(0,0,-1.3);room.add(roomLight,roomLight.target);
rooms=new THREE.Group();scene.add(rooms);const miniFloor=new THREE.BoxGeometry(7,.13,8);const wallGeometry=new THREE.BoxGeometry(7,1.65,.12);const miniWall=mat('#354d46');
for(let x=-3;x<=3;x++)for(let z=-3;z<=2;z++){if(x===0&&z===0)continue;const cell=new THREE.Group();cell.position.set(x*9.4,0,z*10.7);rooms.add(cell);mesh(miniFloor,darkMat,cell);mesh(wallGeometry,miniWall,cell,0,.8,-4);const a=mesh(wallGeometry,miniWall,cell,-3.5,.8,0);a.rotation.y=Math.PI/2;const b=mesh(wallGeometry,miniWall,cell,3.5,.8,0);b.rotation.y=Math.PI/2;box(cell,[1,.5,.9],[0,.25,0],roomMat);box(cell,[.3,.4,.15],[0,.7,0],metalMat);box(cell,[.8,.04,.15],[0,2.5,0],new THREE.MeshBasicMaterial({color:'#a5bbae'}));}
const netPositions=[];for(let i=-3;i<=3;i++){netPositions.push(-28,.035,i*10.7,28,.035,i*10.7);netPositions.push(i*9.4,.035,-32,i*9.4,.035,21);}
const ng=new THREE.BufferGeometry();ng.setAttribute('position',new THREE.Float32BufferAttribute(netPositions,3));network=new THREE.LineSegments(ng,new THREE.LineBasicMaterial({color:'#a8bfad',transparent:true,opacity:.2}));scene.add(network);
}
const inhabitants=[],fallingSeeds=[],rootLights=[];let community,seedRain;
const leaves=[];let leafMesh;const rand=seeded(604);
function buildTree(){tree=new THREE.Group();world.add(tree);canopy=new THREE.Group();tree.add(canopy);
const trunkPoints=[[0,0,0],[.07,1.0,.04],[-.12,2.1,0],[.02,3.15,-.08],[.03,4.2,-.03]];tube(trunkPoints,.135,barkMat,tree,26);
function branch(p,length,angle,azimuth,depth,radius){const end=[p[0]+Math.cos(azimuth)*Math.sin(angle)*length,p[1]+Math.cos(angle)*length,p[2]+Math.sin(azimuth)*Math.sin(angle)*length];const mid=[lerp(p[0],end[0],.45),lerp(p[1],end[1],.55),lerp(p[2],end[2],.45)];tube([p,mid,end],radius,barkMat,tree,8);if(depth>0){branch(end,length*.71,angle+.35,azimuth+.55,depth-1,radius*.64);branch(end,length*.7,angle+.1,azimuth-.65,depth-1,radius*.65);}else{for(let k=0;k<25;k++)leaves.push([end[0]+(rand()-.5)*.9,end[1]+(rand()-.4)*.65,end[2]+(rand()-.5)*.9,rand()]);}}
for(let i=0;i<10;i++)branch([0,1.5+i*.22,0],1.2+rand()*.6,.65+i*.035,i*2.4,3,.055);
const leafGeo=new THREE.SphereGeometry(1,5,3);const leafMat=mat('#73965c',{side:THREE.DoubleSide,roughness:.85});leafMesh=new THREE.InstancedMesh(leafGeo,leafMat,leaves.length);leafMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);const ob=new THREE.Object3D();const colors=['#47794a','#63905b','#8baf72','#a7c78d','#2e6b45'];leaves.forEach((p,i)=>{ob.position.set(p[0],p[1],p[2]);ob.scale.set(.10+rand()*.1,.015,.06+rand()*.06);ob.rotation.set(rand()*2,rand()*6.28,rand()*2);ob.updateMatrix();leafMesh.setMatrixAt(i,ob.matrix);leafMesh.setColorAt(i,new THREE.Color(colors[i%colors.length]));});canopy.add(leafMesh);
rootGroup=new THREE.Group();world.add(rootGroup);const rr=seeded(94);
for(let i=0;i<13;i++){const a=i*Math.PI*2/13,r=2.2+rr()*2.5;const p=[[0,.03,0],[Math.cos(a)*.55,-.3,Math.sin(a)*.55],[Math.cos(a)*r*.55,-.65-rr()*.2,Math.sin(a)*r*.55],[Math.cos(a)*r,-1.0-rr()*.6,Math.sin(a)*r]];tube(p,.035,rootMat,rootGroup,18);for(let j=0;j<3;j++){const last=p[2],ang=a+(j-1)*.5;tube([last,[last[0]+Math.cos(ang)*.5,last[1]-.4,last[2]+Math.sin(ang)*.5],[last[0]+Math.cos(ang)*1.1,last[1]-.7-rr()*.4,last[2]+Math.sin(ang)*1.1]],.011,rootMat,rootGroup,8);}}
forest=new THREE.Group();world.add(forest);for(let i=0;i<16;i++){const clone=tree.clone();const a=i*2.399,r=7+rand()*15;clone.position.set(Math.cos(a)*r,0,Math.sin(a)*r);const scale=.4+rand()*.7;clone.scale.setScalar(scale);clone.rotation.y=rand()*6.28;forest.add(clone);}
}
function buildCommunity(){
community=new THREE.Group();world.add(community);seedRain=new THREE.Group();world.add(seedRain);
const r=seeded(981),skinColors=['#75936b','#6b8662','#8ba279','#54785e','#8a9e74'];
const eyeMat=new THREE.MeshBasicMaterial({color:'#e3edcf'}),pupilMat=new THREE.MeshBasicMaterial({color:'#15251b'}),leafMat=mat('#8bcb8b');
for(let i=0;i<12;i++){
const g=new THREE.Group(),a=i*2.399,dist=1.6+(i%4)*.7;g.position.set(Math.cos(a)*dist,0,Math.sin(a)*dist+1.2);g.rotation.y=-a+1.3;const skin=mat(skinColors[i%5]);
mesh(new THREE.CylinderGeometry(.085,.12,.26,6),skin,g,0,.28,0);mesh(new THREE.IcosahedronGeometry(.145,1),skin,g,0,.53,0);
const eyeWidth=i%3===0?.027:.023;[-1,1].forEach(side=>{mesh(new THREE.SphereGeometry(eyeWidth,6,4),eyeMat,g,side*.052,.55,.122);mesh(new THREE.SphereGeometry(.010,6,4),pupilMat,g,side*.052,.55,.144);});
const legL=box(g,[.053,.16,.058],[-.057,.09,0],skin),legR=box(g,[.053,.16,.058],[.057,.09,0],skin);
tube([[-.09,.38,0],[-.16,.32,0],[-.19,.23,.04]],.018,skin,g,5);tube([[.09,.38,0],[.17,.33,0],[.21,.33,.05]],.018,skin,g,5);
tube([[0,.64,0],[.015,.74,0],[.01,.81,0]],.012,skin,g,5);
const leafGeo=new THREE.SphereGeometry(1,5,3);const l=mesh(leafGeo,leafMat,g,-.05,.76,0);l.scale.set(.08,.018,.038);l.rotation.z=-.55;const l2=mesh(leafGeo,leafMat,g,.062,.80,0);l2.scale.set(.09,.018,.04);l2.rotation.z=.5;
if(i%3===0){const record=box(g,[.13,.1,.015],[.16,.31,.08],mat('#c0cbae'));record.rotation.y=-.4;}
const scale=.8+(i%4)*.13;g.userData={x:g.position.x,z:g.position.z,scale,a,legL,legR};community.add(g);inhabitants.push(g);
const pod=mesh(new THREE.IcosahedronGeometry(.065,1),mat('#b8cda4',{emissive:'#8fc075',emissiveIntensity:.55}),seedRain);pod.userData={start:new THREE.Vector3(Math.cos(a)*1.45,3.6+(i%3)*.3,Math.sin(a)*1.45),end:g.position.clone(),offset:i*.007};fallingSeeds.push(pod);
}
const glimmerMat=new THREE.MeshBasicMaterial({color:'#bbe3ba'});for(let i=0;i<20;i++){const point=mesh(new THREE.SphereGeometry(.022,5,4),glimmerMat,world);point.userData={a:i*2.4,phase:i/20};rootLights.push(point);}
}
function buildWorld(){world=new THREE.Group();scene.add(world);
soil=mesh(new THREE.CircleGeometry(70,96),mat('#193325',{transparent:true,opacity:1}),world);soil.rotation.x=-Math.PI/2;soil.position.y=-.02;
underSoil=mesh(new THREE.CircleGeometry(55,64),mat('#0e2519'),world,0,-2.7,0);underSoil.rotation.x=-Math.PI/2;
const r=seeded(25),stones=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.06,0),mat('#50634b'),500),dummy=new THREE.Object3D();for(let i=0;i<500;i++){let a=r()*Math.PI*2,d=.3+r()*12;dummy.position.set(Math.cos(a)*d,r()*.04,Math.sin(a)*d);dummy.scale.setScalar(.4+r()*1.8);dummy.rotation.set(r()*3,r()*6,r()*3);dummy.updateMatrix();stones.setMatrixAt(i,dummy.matrix);}world.add(stones);
seed=new THREE.Group();world.add(seed);const seedMat=mat('#e8982a',{metalness:.45,roughness:.28,emissive:'#5c310b',emissiveIntensity:.22});mesh(new THREE.IcosahedronGeometry(.105,1),seedMat,seed).scale.set(.8,1.35,.72);
seedPixels=new THREE.Group();world.add(seedPixels);for(let i=0;i<9;i++){const b=mesh(new THREE.BoxGeometry(.032,.032,.032),seedMat,seedPixels,(i%3-1)*.035,Math.floor(i/3)*.035,0);}
buildTree();buildCommunity();groveLight=new THREE.DirectionalLight('#edf1d7',4.1);groveLight.position.set(4,9,5);world.add(groveLight);const rim=new THREE.DirectionalLight('#70b6ae',3.0);rim.position.set(-5,4,-8);world.add(rim);const glow=new THREE.PointLight('#a2df9a',2.0,8);glow.position.set(0,.7,1);world.add(glow);
const points=[];for(let i=0;i<450;i++)points.push((r()-.5)*45,r()*9-1,(r()-.5)*45);const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.Float32BufferAttribute(points,3));dust=new THREE.Points(pg,new THREE.PointsMaterial({size:.025,color:'#bfceb4',transparent:true,opacity:.55,depthWrite:false,sizeAttenuation:true}));world.add(dust);
// Low, quiet mycelial connections: visible when the camera finally gives us context.
const filamentMat=new THREE.LineBasicMaterial({color:'#6eaf8a',transparent:true,opacity:.25});for(let i=0;i<25;i++){const angle=r()*Math.PI*2,dist=6+r()*15;const pts=[];for(let j=0;j<24;j++){let k=j/23;pts.push(new THREE.Vector3(Math.cos(angle)*dist*k+Math.sin(k*9)*.3,.01,Math.sin(angle)*dist*k+Math.cos(k*8)*.3));}world.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),filamentMat));}
}
const shots=[
[0,[0,1.65,3.8],[0,1.9,-2.9]],
[.07,[.6,1.65,2.1],[0,1.55,-2.3]],
[.145,[-.95,1.25,.15],[0,.92,-1.3]],
[.22,[1.4,1.55,1.2],[3.7,1.65,-2.2]],
[.285,[8.8,10.5,12],[0,0,-3]],
[.36,[17,22,25],[0,0,-5]],
[.435,[20,29,28],[0,0,-5]],
[.465,[.65,8.8,1.8],[0,8.2,0]],
[.505,[.55,5.5,1.6],[0,5,0]],
[.555,[.65,.65,1.9],[0,.15,0]],
[.60,[1.15,-.6,3.0],[0,-.7,0]],
[.65,[.5,.7,3.8],[0,.75,0]],
[.715,[-3,2.2,6.0],[0,2,0]],
[.77,[4,3.1,7.5],[0,2.1,0]],
[.805,[3.5,1.25,5.0],[0,.65,1]],
[.855,[4.5,1.6,6.2],[0,.8,1]],
[.89,[8,5.7,13],[0,2.5,0]],
[.925,[1,5.0,15.5],[0,2.6,0]],
[1,[0,4.3,17.5],[0,2.2,0]]
];
let pointerX=0,pointerY=0;
function render(t){if(!renderer)return;const macro=progress>=.46;room.visible=!macro;rooms.visible=!macro&&progress>.235;network.visible=rooms.visible;world.visible=macro;
scene.background.set(macro?'#0a1b12':'#0b1212');scene.fog.color.copy(scene.background);scene.fog.density=macro?.035:.022;ambient.intensity=macro?1.0:.7;
let s=0;while(s<shots.length-2&&progress>shots[s+1][0])s++;const a=shots[s],b=shots[s+1],k=ease(range(progress,a[0],b[0]));vCamera.set(...a[1]).lerp(new THREE.Vector3(...b[1]),k);vLook.set(...a[2]).lerp(new THREE.Vector3(...b[2]),k);
if(!still){vCamera.x+=pointerX*.06;vCamera.y+=pointerY*.035;}if(innerWidth<650){camera.fov=62;vLook.y-=macro?.15:.2;}else camera.fov=48;camera.updateProjectionMatrix();camera.position.copy(vCamera);camera.lookAt(vLook);
if(macro){const fall=range(progress,.47,.56),height=8.4*(1-ease(fall))+.08;seed.position.set(0,height,0);seed.rotation.set(t*.13,progress*9,t*.07);seedPixels.position.copy(seed.position);seedPixels.rotation.y=seed.rotation.y;seedPixels.visible=progress<.497;seed.visible=progress>=.497;const grow=ease(range(progress,.605,.78));tree.scale.set(.18+.82*grow,Math.max(.002,grow),.18+.82*grow);canopy.scale.setScalar(Math.max(.001,ease(range(progress,.655,.78))));tree.rotation.z=still?0:Math.sin(t*.3)*.007;rootGroup.scale.setScalar(Math.max(.001,ease(range(progress,.56,.675))));forest.visible=progress>.76;forest.scale.setScalar(.2+.8*ease(range(progress,.76,.87)));soil.material.opacity=progress>.575&&progress<.635?.13:lerp(.13,1,ease(range(progress,.635,.69)));if(progress<=.575)soil.material.opacity=1;soil.material.depthWrite=soil.material.opacity>.9;dust.rotation.y=t*.007;dust.material.opacity=range(progress,.55,.8)*.55;seed.scale.setScalar(progress>.66?.5:1);
community.visible=progress>.765;seedRain.visible=progress>.765;
fallingSeeds.forEach((pod,i)=>{const born=range(progress,.768+pod.userData.offset,.808+pod.userData.offset);pod.visible=born>0&&born<1;pod.position.copy(pod.userData.start).lerp(pod.userData.end,ease(born));pod.rotation.y=t*.6+i;const person=inhabitants[i],u=person.userData,grow=ease(range(progress,.802+pod.userData.offset,.828+pod.userData.offset));person.scale.setScalar(Math.max(.001,u.scale*grow));person.position.x=u.x+(still?0:Math.sin(t*.2+i)*.1);person.position.z=u.z+(still?0:Math.cos(t*.2+i)*.1);person.position.y=still?0:Math.abs(Math.sin(t*.9+i))*.013;person.rotation.y=-u.a+1.3+(still?0:Math.sin(t*.18+i)*.2);u.legL.rotation.x=still?0:Math.sin(t*.9+i)*.08;u.legR.rotation.x=-u.legL.rotation.x;});
rootLights.forEach((point,i)=>{const u=point.userData,k=still?u.phase:(t*.06+u.phase)%1,r=k*(3.5+i%3);point.visible=progress>.59;point.position.set(Math.cos(u.a)*r,progress<.64?-.6: .045,Math.sin(u.a)*r);});}
renderer.render(scene,camera);}
function init(){renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<650?1.25:1.5));renderer.setSize(innerWidth,innerHeight,false);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;scene=new THREE.Scene();scene.background=new THREE.Color('#0b1212');scene.fog=new THREE.FogExp2('#0b1212',.022);camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.025,180);ambient=new THREE.HemisphereLight('#afc5b9','#1a241b',.7);scene.add(ambient);buildRoom();buildWorld();}
function wake(){if(!raf&&!document.hidden)raf=requestAnimationFrame(tick);}
function tick(now){raf=0;if(document.hidden)return;const visible=story.getBoundingClientRect().bottom>0&&story.getBoundingClientRect().top<innerHeight;if((needsDraw||(!still&&visible))&&now-lastTime>32){if(!still)clock+=Math.min(.06,(now-lastTime)/1000);lastTime=now;render(clock);needsDraw=false;}if(visible&&!still||needsDraw)wake();}
try{init();}catch(error){document.body.classList.add('no-webgl');document.getElementById('render-note').textContent='The story is available in still mode on this device.';console.warn('Cinematic renderer unavailable:',error.message);}
window.addEventListener('scroll',onScroll,{passive:true});window.addEventListener('resize',()=>{placeAnchors();if(renderer){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}onScroll();});window.addEventListener('pointermove',e=>{pointerX=e.clientX/innerWidth-.5;pointerY=e.clientY/innerHeight-.5;},{passive:true});document.addEventListener('visibilitychange',()=>{if(document.hidden){if(raf)cancelAnimationFrame(raf);raf=0;}else{needsDraw=true;wake();}});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();document.body.classList.add('no-webgl');document.getElementById('render-note').textContent='Graphics paused. The story remains readable.';});canvas.addEventListener('webglcontextrestored',()=>{document.body.classList.remove('no-webgl');document.getElementById('render-note').textContent='';needsDraw=true;wake();});
document.getElementById('copy-brief').addEventListener('click',async()=>{const status=document.getElementById('copy-status');try{await navigator.clipboard.writeText(document.getElementById('brief').textContent);status.textContent='Copied. Take the question to your next conversation.';}catch{document.getElementById('brief').closest('details').open=true;status.textContent='The brief is open in the notes. Select and copy it directly.';}});
onScroll();syncStillness();
