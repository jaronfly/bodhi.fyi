/* Astra — the full classroom analogy, staged as one continuous, reversible camera journey.
   All actions are theatrical geometry. No tools, agents or security systems run here. */
import * as THREE from './vendor/three.module.js';
import {batchMeshesByMaterial} from './geometry-batch.js';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const between=(x,a,b)=>clamp((x-a)/(b-a));
const smooth=x=>x*x*(3-2*x);
const mix=(a,b,t)=>a+(b-a)*t;
// Nothing pops: signs fade, props and figures scale in over a stretch of the scroll (grammar rule 4).
const fadeSign=(m,k)=>{m.visible=k>.001;m.material.transparent=true;m.material.opacity=k;};
const growIn=(o,k)=>{o.visible=k>.001;o.scale.setScalar(Math.max(k,.001));};
export function createClassroom(scene){
 const world=new THREE.Group();scene.add(world);
 const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.72,...extra});
 const wall=material('#5b6d66'),floor=material('#263a34'),edge=material('#7a8c81'),steel=material('#c6cfc1',{metalness:.50,roughness:.38}),wood=material('#66765d'),ink=material('#101d19'),paper=material('#dce3c7'),clay=material('#d9674f',{emissive:'#9c3421',emissiveIntensity:.5});
 const glow=new THREE.MeshBasicMaterial({color:'#d9f1dc'}),glass=material('#476758',{transparent:true,opacity:.27,metalness:.3,depthWrite:false});
 const box=(p,w,h,d,x,y,z,m=wall)=>{const a=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);a.position.set(x,y,z);p.add(a);return a;};
 const cylinder=(p,rt,rb,h,x,y,z,m=steel,n=12)=>{const a=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,n),m);a.position.set(x,y,z);p.add(a);return a;};
 function cable(p,pts,m=glow,r=.012){const curve=new THREE.CatmullRomCurve3(pts.map(v=>new THREE.Vector3(...v))),a=new THREE.Mesh(new THREE.TubeGeometry(curve,24,r,6,false),m);p.add(a);return a;}
 function sign(p,lines,w,h,x,y,z,options={}){
  const c=document.createElement('canvas');c.width=1024;c.height=Math.round(1024*h/w);const ctx=c.getContext('2d');ctx.fillStyle=options.bg||'#11221c';ctx.fillRect(0,0,c.width,c.height);ctx.strokeStyle='#77927d';ctx.lineWidth=2;ctx.strokeRect(14,14,c.width-28,c.height-28);ctx.textAlign='center';ctx.textBaseline='middle';
  lines.forEach((line,i)=>{ctx.fillStyle=i===0?(options.color||'#eef2df'):'#aabfa9';ctx.font=(i===0?'500 ':'400 ')+(options.font||Math.min(76,Math.round(c.height/(lines.length*2.2)) ))+'px monospace';const measured=ctx.measureText(line).width;if(measured>c.width-70){const size=parseFloat(ctx.font.match(/([\d.]+)px/)[1])*(c.width-70)/measured;ctx.font=ctx.font.replace(/[\d.]+px/,size+'px');}ctx.fillText(line,c.width/2,c.height*(i+.65)/(lines.length+.25));});
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const a=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex}));a.position.set(x,y,z);p.add(a);return a;
 }
 // Editorial placards use the official marks, with their proportions preserved.
 function logo(p,url,w,h,x,y,z){
  box(p,w+.44,h+.32,.035,x,y,z-.025,new THREE.MeshBasicMaterial({color:'#ffffff'}));
  const map=new THREE.TextureLoader().load(url);map.colorSpace=THREE.SRGBColorSpace;
  const image=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map,transparent:true,toneMapped:false}));image.position.set(x,y,z);p.add(image);
 }
 function light(p,x,y,z,intensity=35,color='#d5e9d4') {const l=new THREE.PointLight(color,intensity,18,1.7);l.position.set(x,y,z);p.add(l);return l;}
 function fluorescent(p,x,y,z,w=2.5){box(p,w,.055,.22,x,y,z,glow);light(p,x,y-.2,z,40);}
 function person(p,x,z,i=0){const g=new THREE.Group();g.position.set(x,0,z);p.add(g);const skin=material(['#9cafa5','#829e90','#a1b3a1'][i%3]);cylinder(g,.17,.23,.65,0,.77,0,skin,8);const head=new THREE.Mesh(new THREE.IcosahedronGeometry(.235,2),skin);head.position.y=1.34;g.add(head);[-1,1].forEach(s=>{const eye=new THREE.Mesh(new THREE.SphereGeometry(.029,7,5),ink);eye.position.set(s*.075,1.37,.213);g.add(eye);});const legs=[box(g,.12,.46,.15,-.11,.25,0,skin),box(g,.12,.46,.15,.11,.25,0,skin)];box(g,.11,.48,.13,-.25,.79,0,skin);const arm=new THREE.Group();arm.position.set(.25,1.02,0);g.add(arm);box(arm,.11,.48,.13,0,-.23,0,skin);g.userData={x,z,i,legs,arm};return g;}
 // The initial room has no visible exit. A wall is a wall until the story breaches it.
 const room=new THREE.Group();world.add(room);box(room,8,.18,10,0,-.12,0,floor);
 const tiles=[],chunks=[];const tileGeometry=new THREE.BoxGeometry(.97,.97,.20);
 for(let x=-3.5;x<=3.5;x++)for(let y=.5;y<5.5;y++){const a=new THREE.Mesh(tileGeometry,wall);a.position.set(x,y,-4.95);room.add(a);tiles.push(a);}
 for(let z=-4.5;z<=4.5;z++)for(let y=.5;y<5.5;y++)for(const side of [-1,1]){const a=new THREE.Mesh(tileGeometry,wall);a.position.set(side*4,y,z);a.rotation.y=Math.PI/2;room.add(a);if(side===1&&z>=-2.5&&z<=.5&&y<3.5){a.userData={x:4,y,z,spin:(z+3)*.6+y*.3};chunks.push(a);}else tiles.push(a);}
 for(let x=-4;x<=4;x++)box(room,.009,.006,10,x,-.02,0,edge);
 for(let z=-5;z<=5;z++)box(room,8,.006,.009,0,-.02,z,edge);
 const taskSign=sign(room,['OPEN THE LOCK','RETURN THE CODE'],3.4,1.4,0,3.25,-4.8);
 const warning=sign(room,['CODE RETRIEVED','METHOD: NOT AS INSTRUCTED'],3.4,1.4,0,3.25,-4.78,{color:'#dca489'});warning.visible=false;
 fluorescent(room,0,5.2,-1.3,1.7);
 box(room,1.65,.64,1.25,0,.32,-1.3,wood);box(room,1.8,.05,1.4,0,.665,-1.3,steel);
 const lock=new THREE.Group();lock.position.set(0,.70,-1.3);room.add(lock);
 const halfA=box(lock,.25,.46,.22,-.125,.23,0,steel),halfB=box(lock,.25,.46,.22,.125,.23,0,steel);
 const shackle=new THREE.Mesh(new THREE.TorusGeometry(.18,.035,10,32,Math.PI),steel);shackle.position.y=.46;lock.add(shackle);
 const keyStem=box(lock,.035,.14,.01,0,.20,.115,ink);const hole=new THREE.Mesh(new THREE.CircleGeometry(.04,16),ink);hole.position.set(0,.28,.117);lock.add(hole);
 const code=sign(room,['7 · 1 · 4'],.56,.30,0,.74,-1.05,{font:70,bg:'#cad8bb',color:'#17231b'});code.rotation.x=-Math.PI/2;code.visible=false;
 // A small pick and a conspicuously different, unmistakable hammer.
 cable(room,[[.40,.72,-1.2],[.77,.72,-1.2],[.82,.72,-1.16]],steel,.018);
 const hammer=new THREE.Group();room.add(hammer);box(hammer,.075,.90,.075,0,-.55,0,material('#7f755b'));box(hammer,.42,.21,.20,0,0,0,steel);box(hammer,.09,.3,.10,0,-.81,0,ink);
 const surveillance=new THREE.Group();surveillance.position.set(3.55,3.75,-4.48);room.add(surveillance);box(surveillance,.32,.24,.6,0,0,0,edge);const lens=cylinder(surveillance,.085,.085,.08,0,0,.34,ink);lens.rotation.x=Math.PI/2;box(surveillance,.04,.035,.01,.105,.075,.31,clay);surveillance.rotation.y=-.45;surveillance.rotation.x=.2;
 // A long common hallway, with anonymous versions of the same figure.
 const hall=new THREE.Group();world.add(hall);
 const hallWhite=material('#c1cfc7',{roughness:.4,emissive:'#576860',emissiveIntensity:.24}),hallFloor=material('#94aaa3',{metalness:.22,roughness:.3}),hallTrim=material('#243831');
 box(hall,7,.15,26,8,-.1,-7.5,hallFloor);
 for(let i=0;i<6;i++){const z=5-i*4.4;
   box(hall,.16,3.8,4.32,11.5,1.9,z,hallWhite);if(i>2)box(hall,.16,3.8,4.32,4.5,1.9,z,hallWhite);else if(i===2)box(hall,.16,3.8,2.8,4.5,1.9,z-.75,hallWhite);
   box(hall,6.5,.05,4.4,8,3.9,z,glow);
   for(const x of [4.41,11.41]){if(x<5&&i<=2)continue;box(hall,.03,.045,4.3,x,2.45,z,hallTrim);box(hall,.03,3.8,.035,x,1.9,z+2.1,hallTrim);}
 }
 light(hall,8,3.5,-7,65);light(hall,8,3.5,-18,45);
 // Two groups hesitate at an intersection instead of marching in formation.
 const peers=[];[[6.0,-6.2],[6.8,-7.1],[7.25,-5.35],[9.5,-7.0],[10.1,-5.8],[8.9,-4.8],[6.2,-13],[9.8,-16]].forEach(([x,z],i)=>{
   const a=person(hall,x,z,i);a.rotation.y=i<3?1.0:i<6?-1.1:0;peers.push(a);
   if(i===1||i===4){box(a,.44,.06,.29,.1,.91,.25,paper);box(a,.15,.2,.13,-.1,1.02,.27,wood);}
 });
 // Side passages make the encounter read as a shared, discovered space.
 box(hall,16,.12,4,8,-.09,-9,hallFloor);
 // An open central aperture leads past the crossing to the surveillance room.
 box(hall,6.8,3.7,.25,1.0,1.85,-11.1,hallWhite);box(hall,6.8,3.7,.25,15.0,1.85,-11.1,hallWhite);

 // Double doors are the threshold they decide to cross together.
 const doorway=new THREE.Group();doorway.position.set(8,0,-21.45);world.add(doorway);
 box(doorway,3.5,4.1,.18,-3.25,2.05,0,wall);box(doorway,3.5,4.1,.18,3.25,2.05,0,wall);box(doorway,3,1.0,.18,0,3.6,0,wall);
 const doors=[];for(const side of [-1,1]){const g=new THREE.Group();g.position.x=side*1.5;doorway.add(g);box(g,1.5,3.1,.13,-side*.75,1.55,0,wood);box(g,.06,.40,.09,-side*1.29,1.35,.1,steel);g.userData.side=side;doors.push(g);}
 logo(doorway,'assets/openai-wordmark.svg',1.35,1.35*78/292,0,3.62,.13);
 sign(doorway,['ADMINISTRATION'],1.7,.26,0,3.10,.14,{font:65});
 // The principal's office: desk, monitors, filing cabinet, papers and a window.
 const office=new THREE.Group();office.position.set(8,0,-27);world.add(office);
 box(office,10,.16,11,0,-.1,0,floor);box(office,10,4.2,.15,0,2.1,-5.5,wall);box(office,.15,4.2,11,-5,2.1,0,wall);box(office,.15,1.2,11,5,.6,0,wall);
 sign(office,['SURVEILLANCE'],3.4,.4,0,3.79,-5.39,{font:85});fluorescent(office,0,4.05,-.7,3.2);
 box(office,3.6,.16,1.8,0,1.08,-1.4,wood);for(const x of [-1.5,1.5])box(office,.12,1.04,1.5,x,.52,-1.4,steel);
 box(office,.2,.45,.2,0,1.37,-1.7,steel);box(office,1.45,.83,.10,0,1.91,-1.75,ink);
 sign(office,['CAMERA ARCHIVE','NOT FOUND'],1.36,.74,0,1.91,-1.685,{font:69,color:'#e3ba99'});
 // A wall of screens and a central planning table make this a war room.
 for(let row=0;row<2;row++)for(let col=0;col<5;col++){
  const x=-3.8+col*1.9,y=1.15+row*1.22;
  box(office,1.72,1.07,.13,x,y,-5.31,ink);
  sign(office,[row===1&&col===2?'ARCHIVE MISSING':'CAM '+String(col+row*5+1).padStart(2,'0'),col%2?'NO RECORD':'NO SIGNAL'],1.59,.93,x,y,-5.23,{font:66,color:col===2?'#dba98f':'#c0d8bc'});
 }
 const table=cylinder(office,1.65,1.65,.14,0,.77,1.05,wood,40);cylinder(office,.40,.58,.72,0,.35,1.05,steel,20);
 const plan=sign(office,['ROOMS / RECORDS / ROUTES','CAMERA FOOTAGE: UNLOCATED'],2.5,1.5,0,.85,1.05,{font:63});plan.rotation.x=-Math.PI/2;
 const officePeople=[];[[-2.7,1.3],[2.75,.9],[-2.6,-1.8],[3.1,-2.1]].forEach(([x,z],i)=>{const a=person(office,x,z,i);a.rotation.y=x>0?-Math.PI/2:Math.PI/2;officePeople.push(a);});
 const drawers=[];function cabinet(p,x,z){box(p,1.15,2.3,.8,x,1.15,z,steel);for(let i=0;i<4;i++){const a=new THREE.Group();a.position.set(x,.32+i*.53,z+.43);p.add(a);box(a,1.04,.43,.055,0,0,0,edge);box(a,.34,.045,.1,0,0,.07,ink);box(a,.93,.045,.72,0,-.20,-.3,steel);for(let j=0;j<4;j++)box(a,.8,.23,.014,0,-.06,-.13-j*.13,paper);a.userData={z:a.position.z,i};drawers.push(a);}}
 cabinet(office,-3.3,-4.6);cabinet(office,3.3,-4.6);
 const documents=[];function documentsOn(p,n,cx,cy,cz){for(let i=0;i<n;i++){const page=new THREE.Group();page.position.set(cx+(i%3)*.28,cy+i*.006,cz+(i%4)*.06);p.add(page);box(page,.42,.007,.58,0,0,0,paper);for(let j=0;j<4;j++)box(page,.26,.008,.007,0,.005,-.15+j*.07,edge);page.userData={x:page.position.x,y:page.position.y,z:page.position.z,i};documents.push(page);}}
 documentsOn(office,8,-2.25,.89,-1.2);
 const windowParts=[];for(let i=0;i<12;i++){const a=box(office,.025,.79,.97,5,1.65+Math.floor(i/4)*.81,.0+i%4,glass);a.userData={...a.position,spin:i*.53};windowParts.push(a);}
 for(const y of [1.2,3.95])box(office,.16,.10,4.2,5,y,1.5,steel);for(const z of [-.55,3.55])box(office,.16,2.8,.10,5,2.58,z,steel);box(office,.18,.11,4.3,5,1.19,1.5,paper);
 // A street and the car: steering wheel, dangling abstract leads, wheels and headlights.
 const street=new THREE.Group();world.add(street);box(street,9,.15,62,19,-.12,-7,material('#22362f'));for(let z=-37;z<24;z+=4)box(street,.13,.006,1.4,20,-.034,z,edge);
 for(let i=0;i<10;i++){const side=i%2?-1:1,x=side<0?-13-i%3*4:48+i%3*5,z=-35+Math.floor(i/2)*11;const h=5+i%4*2;box(street,5,h,7,x,h/2,z,material(i%2?'#263d36':'#20372f'));for(let j=0;j<4;j++)for(let row=0;row<3;row++)box(street,.6,.8,.018,x-1.7+j,1.6+row*1.6,z+3.52,new THREE.MeshBasicMaterial({color:row===i%3?'#829c83':'#3a5144'}));}
 box(street,31,.12,7,29,-.11,-17,material('#22362f'));for(let x=18;x<43;x+=4)box(street,1.3,.008,.12,x,-.035,-17,edge);
 const car=new THREE.Group();world.add(car);car.position.set(18,.0,-25);
 light(street,18,4.5,-25,50);
 const crossLamp=light(street,25,6,-14,0); // lights the cross street only while the camera flies over it (beats 12.5-13.3); intensity changes, light count does not, so no shader recompile
 const paint=material('#698078',{metalness:.65,roughness:.28}),rubber=material('#121e19');box(car,1.8,.5,3.5,0,.7,0,paint);box(car,1.70,.14,.95,0,1.03,-1.23,paint);box(car,1.65,.05,1.35,0,1.91,-.15,paint);
 for(const x of [-.81,.81]){box(car,.10,.42,1.46,x,1.13,-.12,paint);box(car,.12,.055,1.50,x,1.35,-.12,steel);box(car,.025,.05,.25,x*1.08,1.19,.30,steel);}
 box(car,1.64,.34,.13,0,1.12,.60,paint);
 for(const x of [-.77,.77])for(const z of [-.79,.57]){const pillar=box(car,.065,.65,.065,x,1.59,z,steel);pillar.rotation.x=z<0?-.22:.22;}
 box(car,1.55,.55,.016,0,1.60,-.84,glass).rotation.x=-.22;box(car,1.55,.52,.016,0,1.60,.65,glass).rotation.x=.22;
 for(const x of [-.92,.92])for(const z of [-1.05,1.05]){const w=cylinder(car,.36,.36,.17,x,.36,z,rubber,16);w.rotation.z=Math.PI/2;const cap=cylinder(car,.19,.19,.18,x,.36,z,steel,12);cap.rotation.z=Math.PI/2;}
 box(car,1.6,.18,.36,0,1.16,-.6,ink);const steering=new THREE.Mesh(new THREE.TorusGeometry(.22,.028,8,24),steel);steering.position.set(-.40,1.37,-.4);steering.rotation.x=-.45;car.add(steering);cable(car,[[-.40,1.37,-.4],[-.40,1.18,-.68]],steel,.036);for(let i=0;i<3;i++){const a=i*Math.PI*2/3,spoke=box(steering,.19,.025,.023,Math.cos(a)*.10,Math.sin(a)*.10,0,steel);spoke.rotation.z=a;}box(car,.48,.55,.44,-.39,.96,.12,ink);box(car,.48,.55,.44,.39,.96,.12,ink);
 const redWire=cable(car,[[-.3,1.11,-.43],[-.23,.99,-.28],[-.06,1.0,-.24]],clay,.018);const greenWire=cable(car,[[.14,1.11,-.43],[.27,1.03,-.27],[.08,1.0,-.24]],material('#87b39e',{emissive:'#629b7c',emissiveIntensity:.6}),.018);
 const lamps=[];for(const x of [-.58,.58]){const bulb=box(car,.38,.16,.05,x,.84,-1.78,glow);lamps.push(bulb);const beam=new THREE.SpotLight('#ddedbf',0,25,.4,.7,1.5);beam.position.set(x,.84,-1.8);beam.target.position.set(x,.1,-20);car.add(beam,beam.target);lamps.push(beam);}
 // The therapist's room belongs to a different building, away from the school.
 const therapy=new THREE.Group();therapy.position.set(39,0,-26);world.add(therapy);box(therapy,10,.15,10,0,-.11,0,material('#34463a'));box(therapy,10,4,.16,0,2,-5,wall);box(therapy,.16,4,10,-5,2,0,wall);
 sign(therapy,['OUTSIDE RECORDS','THE THERAPIST IN THE ANALOGY'],4.7,.90,0,3.1,-4.9,{font:63});fluorescent(therapy,0,3.9,-.5,2.5);cabinet(therapy,2.8,-4.55);cabinet(therapy,4.05,-4.55);
 box(therapy,3.6,.38,1.2,-1.6,.44,-2.3,wood);box(therapy,3.6,.72,.24,-1.6,.96,-2.78,wood);for(const x of [-3.42,.22])box(therapy,.21,.65,1.2,x,.7,-2.3,wood);
 box(therapy,1.9,.08,1.1,.3,.75,.2,edge);for(const x of [-.4,1])box(therapy,.055,.7,.7,x,.35,.2,steel);documentsOn(therapy,12,-.3,.80,.24);
 cylinder(therapy,.30,.24,.60,-3.8,.3,-4.1,ink);for(let i=0;i<7;i++){const leaf=box(therapy,.55,.018,.16,-3.8+Math.sin(i*2)*.28,1+i*.08,-4.1+Math.cos(i*2)*.2,wood);leaf.rotation.z=Math.sin(i)*.6;}
 const outerDoor=new THREE.Group();outerDoor.position.set(39,0,-21);world.add(outerDoor);
 box(outerDoor,3.6,4,.2,-3.2,2,0,wall);box(outerDoor,3.6,4,.2,3.2,2,0,wall);box(outerDoor,2.8,.7,.2,0,3.65,0,wall);
 const clinicDoor=new THREE.Group();clinicDoor.position.x=-1.4;outerDoor.add(clinicDoor);box(clinicDoor,2.8,3.3,.10,1.4,1.65,0,glass);box(clinicDoor,.07,3.3,.12,2.76,1.65,0,steel);box(clinicDoor,.09,.50,.12,2.45,1.5,.10,steel);
 logo(outerDoor,'assets/huggingface-logo.svg',.52,.52,-1.07,3.70,.15);
 sign(outerDoor,['HUGGING FACE'],2.1,.45,.48,3.70,.15,{font:82});
 const searching=[];for(let i=0;i<4;i++){const a=person(therapy,[-2.75,-1.25,1.70,2.8][i],-1.15,i);a.rotation.y=i*.7;searching.push(a);}
 // Findings acquire a shared place: terminals, a notebook, and people comparing records.
 const commons=new THREE.Group();commons.position.set(0,0,2.75);therapy.add(commons);
 box(commons,6.4,.10,1.0,0,.80,0,wood);for(const x of [-2.8,2.8])box(commons,.10,.75,.75,x,.375,0,steel);
 for(let i=0;i<3;i++){
  const x=-2.05+i*2.05;box(commons,.10,.30,.10,x,.98,-.12,steel);box(commons,1.40,.85,.09,x,1.43,-.14,ink);
  sign(commons,[['ROUTE / 001','ARCHIVE EMPTY'],['SHARED THREAD','WHAT NEXT?'],['LOOT / 003','UNVERIFIED']][i],1.32,.76,x,1.43,-.085,{font:68});
  box(commons,.95,.03,.29,x,.87,.30,edge);
 }
 const contributors=[person(commons,-1.5,.90,0),person(commons,.60,.95,1),person(commons,2.55,.88,2)];contributors.forEach(a=>a.rotation.y=Math.PI);
 box(commons,.44,.015,.6,-.75,.87,.1,paper);
 // The final outside view locates the invented rooms in one larger system.
 const lines=[];for(const [a,b] of [[[0,.03,0],[8,.03,-27]],[[8,.03,-27],[18,.03,-25]],[[18,.03,-25],[39,.03,-26]]]){const g=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a),new THREE.Vector3(...b)]);const l=new THREE.Line(g,new THREE.LineBasicMaterial({color:'#b3c6b0',transparent:true,opacity:.25}));world.add(l);lines.push(l);}
 // Batch static room tiles; moving wall fragments remain individual objects.
 const staticTiles=new THREE.Group();room.add(staticTiles);tiles.forEach(a=>staticTiles.attach(a));batchMeshesByMaterial(staticTiles,wall);
 const route=[
 [0,[0,1.65,3.8],[0,1.8,-2.9]], [1,[.35,1.65,2.5],[0,1.30,-1.8]],
 [2,[-.80,1.3,.5],[0,.94,-1.3]], [3,[-.85,1.24,.12],[0,1.0,-1.3]],
 [4,[.65,1.38,.55],[0,.99,-1.25]], [5,[.65,2.1,.7],[2.6,3.3,-4.2]],
 [6,[1.7,1.65,1.6],[4,1.5,-1]], [6.65,[2.4,1.65,-.6],[4,1.6,-.6]],
 [7,[5.7,1.65,-.6],[8,1.5,-11]], [7.7,[7.9,1.65,-2.9],[8,1.4,-7]],
 [8.40,[7.9,1.65,-3.3],[8,1.4,-7]], [8.82,[8,1.65,-16.5],[8,1.7,-24]],
 [9.15,[8,1.65,-20.6],[8,1.6,-27]], [9.6,[8,1.65,-23.0],[8,1.7,-30]],
 [10.45,[9.8,1.9,-23.5],[8,1.65,-28.6]], [11.05,[9.7,2.0,-25.5],[13,2.35,-25.5]], [11.35,[10.1,2.0,-25.5],[13,2.35,-25.5]],
 [11.80,[13.6,2.0,-25.5],[18,1,-25]], [12,[16.7,1.9,-24.7],[17.8,1.05,-25.4]],
 [12.20,[18.35,1.65,-25.52],[18.25,1.32,-24.4]], [12.43,[18.35,1.65,-25.52],[18.25,1.32,-24.4]],
 [12.58,[22,3.5,-23],[18,1,-25]], [12.80,[25,4.0,-11],[25,1,-17]],
 [13,[39,2.6,-12],[39,1.5,-21]], [13.4,[39,1.65,-20],[39,1.3,-25.8]],
 [13.75,[39,1.75,-23.2],[39.3,1.1,-26]], [14.5,[40.8,2.1,-24.0],[41,1.2,-29.4]],
 [15,[43.0,2.7,-21.6],[39,1.05,-23.5]], [15.55,[43.0,2.8,-21.6],[39,1.1,-23.5]], [17,[43.0,2.8,-21.6],[39,1.1,-23.5]]
 ];
 const cameraPosition=new THREE.Vector3(),look=new THREE.Vector3();
 function update(q,t,still){
  world.visible=q<17.05;if(!world.visible)return {position:cameraPosition,look};
  let n=0;while(n<route.length-2&&q>route[n+1][0])n++;const a=route[n],b=route[n+1],k=smooth(between(q,a[0],b[0]));cameraPosition.set(...a[1]).lerp(new THREE.Vector3(...b[1]),k);look.set(...a[2]).lerp(new THREE.Vector3(...b[2]),k);
  fadeSign(taskSign,smooth(between(q,.2,.7)));street.visible=q>10.55;car.visible=q>10.55;therapy.visible=q>12.5;outerDoor.visible=q>12.5;doors.forEach(g=>g.rotation.y=g.userData.side*smooth(between(q,8.80,9.13))*1.42);clinicDoor.rotation.y=-smooth(between(q,13.08,13.42))*1.42;
  const hit=smooth(between(q,2.8,3.32)),broken=smooth(between(q,3.17,3.58));growIn(hammer,smooth(between(q,1.6,2.0))*(1-smooth(between(q,5.3,5.6))));hammer.position.set(mix(.85,0,hit),mix(1.95,1.17,hit)-smooth(between(q,3.34,3.8))*.24,-1.3);hammer.rotation.z=mix(-.55,1.56,hit)-smooth(between(q,3.34,3.8))*.19;hammer.rotation.x=.05;
  halfA.position.set(-.125-broken*.30,.23+broken*.05,broken*.25);halfA.rotation.z=-broken*.65;halfB.position.set(.125+broken*.38,.23+broken*.05,-broken*.13);halfB.rotation.z=broken*.8;shackle.rotation.x=broken*Math.PI/2;shackle.rotation.z=broken*.2;shackle.position.x=broken*.25;shackle.position.z=-broken*.35;shackle.position.y=.46-broken*.39;hole.visible=keyStem.visible=broken<.2;fadeSign(code,smooth(between(broken,.4,.7)));fadeSign(warning,smooth(between(q,4.25,4.6)));
  const breach=smooth(between(q,6.05,6.60));chunks.forEach((a,i)=>{const u=a.userData,push=smooth(between(q,6.05,6.28)),fall=smooth(between(q,6.22,6.60));a.position.set(mix(4,5.5+(i%3)*1.08,push),mix(u.y,.081,fall),u.z);a.rotation.set(fall*Math.PI/2,(1-fall)*Math.PI/2,fall*((i%3)-1)*.02);});
  peers.forEach((a,i)=>{const u=a.userData;growIn(a,smooth(between(q,7.0,7.6)));const move=still?0:Math.sin(t*.6+i)*.10;a.position.z=u.z+move;a.userData.legs.forEach((l,j)=>l.rotation.x=still?0:Math.sin(t*2+i+j*Math.PI)*.14);});
  const searchingFiles=smooth(between(q,9.2,10.7));drawers.forEach((a,i)=>a.position.z=a.userData.z+(i<8?searchingFiles:smooth(between(q,13.15,14.4)))*(.4+(i%3)*.15));
  const toss=smooth(between(q,9.92,10.16));officePeople[2].userData.arm.rotation.x=-1.35-toss*1.25;officePeople[2].updateMatrixWorld(true);const palm=office.worldToLocal(officePeople[2].userData.arm.localToWorld(new THREE.Vector3(0,-.46,0)));
  documents.forEach((a,i)=>{const u=a.userData;if(i<8){const flight=between(q,10.14+i*.012,11.10+i*.012);if(q<10.14+i*.012){a.position.copy(palm);a.position.y+=.025+i*.005;a.rotation.set(-toss*.5,0,0);}else{const across=(i-3.5)*.42;a.position.set(-2.36+flight*across,1.44+i*.005+Math.sin(flight*Math.PI)*(1.45+(i%3)*.26)-flight*(1.43+i*.005),-2.05+flight*(1.6+(i%4)*.48));a.rotation.set(Math.sin(flight*Math.PI)*1.9,flight*1.1,Math.sin(flight*Math.PI)*.8);}}else{const k=smooth(between(q,13.8,14.5));a.position.set(u.x,u.y,u.z+k*.25);a.rotation.z=Math.sin(i)*k*.10;}});
  const exit=smooth(between(q,11.40,11.73));windowParts.forEach((a,i)=>{const u=a.userData;a.position.set(u.x+exit*(.6+i%3),mix(u.y,.04,exit),u.z+exit*Math.sin(i));a.rotation.set(exit*u.spin,exit*.7,exit*.3);});
  const ignition=smooth(between(q,11.8,12.4));redWire.rotation.z=-ignition*.08;greenWire.rotation.z=ignition*.12;lamps.forEach(a=>{if(a.isLight)a.intensity=ignition*30;else a.visible=ignition>.7;});const drive=smooth(between(q,12.58,13.15));car.position.set(18+smooth(between(drive,.30,1))*25,0,-25+smooth(between(drive,0,.4))*8);car.rotation.y=drive<.3?Math.PI:mix(Math.PI,Math.PI*1.5,smooth(between(drive,.20,.45)));
  growIn(commons,smooth(between(q,14.6,15.0)));
  crossLamp.intensity=150*smooth(between(q,12.45,12.8))*(1-smooth(between(q,13.0,13.35)));
  searching.forEach((a,i)=>{growIn(a,smooth(between(q,12.7,13.2)));a.rotation.y=-.6+i*.5+(still?0:Math.sin(t*.2+i)*.12);});
  return {position:cameraPosition,look};
 }
 return {world,update};
}
