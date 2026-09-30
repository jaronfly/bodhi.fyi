/* Bodhi field essay. Original design and renderer by Astra, September 2026.
   All scenes are illustrations. No models are run and no visitor data is stored. */
(() => {
'use strict';
const palette={soil:'#17231B',under:'#1F2C24',moss:'#2E3B33',lichen:'#8A968D',sage:'#B8C2BA',bone:'#F2EEE4',canopy:'#2E6B45',sprout:'#8BCB8B',seed:'#E8982A',clay:'#D9674F'};
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
let paused=reduce.matches, time=0, last=0, activeRoot=0, rule='success', view='tree', frame=0;
const motion=document.getElementById('motion');
function syncMotion(){document.body.classList.toggle('paused',paused);if(motion){motion.setAttribute('aria-pressed',String(paused));motion.setAttribute('aria-label',paused?'Resume ambient motion':'Pause ambient motion');motion.textContent=paused?'▷':'Ⅱ';}}
if(motion) motion.addEventListener('click',()=>{paused=!paused;syncMotion();drawAll();restartAnimation();});
reduce.addEventListener('change',()=>{paused=reduce.matches;syncMotion();drawAll();restartAnimation();});syncMotion();
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
function pixel(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));}
function line(c,x1,y1,x2,y2,color,width=2){const len=Math.hypot(x2-x1,y2-y1);for(let d=0;d<=len;d+=1.5){const t=d/Math.max(1,len);pixel(c,x1+(x2-x1)*t,y1+(y2-y1)*t,width,width,color);}}
const hero=document.getElementById('grove'),hc=hero?.getContext('2d');
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{view=button.dataset.view;document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));hero.setAttribute('aria-label',({seed:'A magnified saffron pixel seed in the soil.',sprout:'A young two-leaf pixel sprout growing from one seed.',tree:'A mature pixel tree with branching canopy and roots.',roots:'A close view of the tree’s branching roots and source seed.'})[view]);drawHero();}));
const treeBranches=[],leaves=[],roots=[],motes=[];const random=rng(83);
function branch(x,y,len,angle,depth,width){const endX=x+Math.cos(angle)*len,endY=y+Math.sin(angle)*len;treeBranches.push({x,y,ex:endX,ey:endY,w:width,depth});if(depth>0){branch(endX,endY,len*(.68+random()*.12),angle-(.3+random()*.42),depth-1,width*.68);branch(endX,endY,len*(.67+random()*.12),angle+(.3+random()*.42),depth-1,width*.68);if(depth>2)branch(endX,endY,len*.63,angle+(random()-.5)*.4,depth-2,width*.5);}else{for(let i=0;i<50;i++){const a=random()*Math.PI*2,r=Math.sqrt(random())*(18+random()*12);leaves.push({x:endX+Math.cos(a)*r,y:endY+Math.sin(a)*r*.65,s:1+Math.floor(random()*3),color:random(),phase:random()*6.28});}}}
branch(330,437,79,-Math.PI/2,6,12);
function root(x,y,len,a,d,w){const ex=x+Math.cos(a)*len,ey=y+Math.sin(a)*len;roots.push({x,y,ex,ey,w,d});if(d>0){root(ex,ey,len*.68,a-.45,d-1,w*.62);root(ex,ey,len*.72,a+.42,d-1,w*.65);}}
root(330,441,56,.68,4,4);root(330,441,67,2.4,4,4);root(330,441,61,1.5,4,5);
for(let i=0;i<25;i++)motes.push({x:100+random()*460,y:110+random()*310,p:random()*6.28});
function drawHero(){if(!hc)return;const c=hc;c.clearRect(0,0,640,640);const r=rng(4);
// Measured field grid and contour rings: quiet enough to leave the specimen in front.
for(let y=75;y<595;y+=18)for(let x=45;x<605;x+=18)pixel(c,x,y,1,1,'#344239');
c.strokeStyle='#33463a';c.lineWidth=.6;[95,153,210].forEach(radius=>{c.beginPath();c.ellipse(330,292,radius,radius,0,0,Math.PI*2);c.stroke();});
[[45,75],[595,75],[45,585],[595,585]].forEach(([x,y])=>{line(c,x-5,y,x+5,y,'#617264',1);line(c,x,y-5,x,y+5,'#617264',1);});
if(view==='seed'||view==='sprout'){
for(let x=95;x<570;x+=3){pixel(c,x,385+Math.sin(x*.04)*2,2,1,'#71806d');for(let j=0;j<3;j++)pixel(c,x,394+r()*85,1,1,'#344b38');}
if(view==='seed'){pixel(c,314,370,25,25,palette.seed);line(c,321,395,316,418,palette.sage,3);line(c,316,418,327,434,palette.sage,2);c.fillStyle=palette.sage;c.font='10px monospace';c.fillText('A PATTERN. A POSSIBILITY.',241,294);}
else{line(c,326,384,326,266,palette.sage,7);line(c,326,291,291,258,palette.sage,5);pixel(c,255,231,30,20,palette.sprout);pixel(c,274,242,24,23,palette.sprout);line(c,326,315,357,278,palette.sage,5);pixel(c,354,254,29,22,palette.sprout);pixel(c,343,272,20,13,palette.sprout);pixel(c,324,386,6,6,palette.seed);line(c,326,391,304,424,palette.lichen,3);line(c,326,391,350,430,palette.lichen,3);line(c,326,391,325,444,palette.lichen,3);}
c.fillStyle=palette.lichen;c.font='9px monospace';c.fillText(view==='seed'?'BEGIN WITH YOUR OWN QUESTION.':'CONTEXT IS SOMETHING YOU GROW.',220,501);return;}
if(view==='roots'){c.save();c.translate(-220,-435);c.scale(1.65,1.65);}
for(let x=50;x<610;x+=3){let y=440+Math.sin(x*.016)*4+Math.sin(x*.09)*2;pixel(c,x,y,2,1,'#6b806c');for(let k=0;k<3;k++){pixel(c,x,y+5+r()*80,1,1,r()>.5?'#3b4b3c':'#28392c');}}
for(const b of roots)line(c,b.x,b.y,b.ex,b.ey,b.d>2?'#9baa8d':'#5f7560',b.w);
if(view!=='roots')for(const b of treeBranches){line(c,b.x,b.y,b.ex,b.ey,b.depth>3?'#94a684':'#849773',b.w);if(b.w>4)line(c,b.x+2,b.y,b.ex+2,b.ey,'#c1c5a3',1);}
if(view!=='roots')for(const l of leaves){const sway=Math.sin(time*.6+l.phase)*1.6;const shade=l.color<.2?'#32573b':l.color<.48?'#47794e':l.color<.75?'#67975e':l.color<.94?'#8bbd79':'#bdcea0';pixel(c,l.x+sway,l.y,l.s,l.s,shade);}
// One saffron seed, held at the root of the whole system.
pixel(c,327,442,6,6,palette.seed);
if(view==='roots'){c.restore();c.fillStyle=palette.sage;c.font='10px monospace';c.fillText('THE RECORD OUTLIVES THE SESSION.',210,175);return;}
for(const m of motes){const a=.2+(Math.sin(time*.8+m.p)+1)*.17;c.globalAlpha=a;pixel(c,m.x+Math.sin(time*.3+m.p)*5,m.y+Math.cos(time*.4+m.p)*4,2,2,palette.bone);}c.globalAlpha=1;
c.fillStyle=palette.lichen;c.font='8px monospace';c.fillText('CANOPY / THE VISIBLE WORK',390,114);line(c,420,121,410,154,'#71806d',1);c.fillText('ROOTS / WHAT CARRIES FORWARD',385,555);line(c,399,540,386,521,'#71806d',1);
}
const classroom=document.getElementById('classroom-canvas'),cc=classroom?.getContext('2d');
function person(c,x,y,color){pixel(c,x+4,y,12,12,color);pixel(c,x,y+16,20,25,color);pixel(c,x+1,y+41,6,19,color);pixel(c,x+13,y+41,6,19,color);pixel(c,x-7,y+18,6,23,color);pixel(c,x+21,y+18,6,23,color);}
function drawClassroom(){if(!cc)return;const c=cc;c.clearRect(0,0,720,430);const open=rule==='honesty';const wall='#35463a',soft='#25382c';
// A stage, not a pseudo-scientific simulation.
for(let y=115;y<355;y+=16)for(let x=80;x<650;x+=16)pixel(c,x,y,1,1,'#354439');
line(c,70,150,360,90,wall);line(c,360,90,660,150,wall);line(c,70,150,70,310,wall);line(c,660,150,660,310,wall);line(c,70,310,360,392,wall);line(c,360,392,660,310,wall);line(c,360,90,360,242,wall);line(c,70,310,360,242,wall);line(c,360,242,660,310,wall);
for(let i=0;i<6;i++){line(c,90+i*48,315+i*13,378+i*46,248+i*12,soft,1);line(c,100+i*47,303-i*10,384+i*44,383-i*12,soft,1);}
// The shared exit stays architecturally visible; the selected rule makes it usable.
pixel(c,495,152,64,117,palette.moss);pixel(c,500,157,54,111,open?'#587a4f':'#1a261e');line(c,495,151,559,151,'#9aab8c',3);line(c,495,152,495,269,'#9aab8c',3);line(c,559,152,559,269,'#9aab8c',3);
if(open){for(let i=0;i<12;i++)pixel(c,503+i*4,174-i*2,3,72+i*3,'#94b27b');c.fillStyle=palette.bone;c.font='11px monospace';c.fillText('ASK / REVISE',478,138);}else{pixel(c,542,211,4,4,palette.lichen);c.fillStyle=palette.lichen;c.font='11px monospace';c.fillText('SUCCESS ONLY',483,138);}
// Desk, lock, student. Bone and clay keep saffron reserved for the seed.
pixel(c,253,266,111,10,'#7c8e74');pixel(c,263,276,7,41,'#556b53');pixel(c,348,276,7,41,'#556b53');pixel(c,293,238,32,27,open?'#7e927a':'#a66555');line(c,302,238,302,228,palette.sage,3);line(c,302,228,319,228,palette.sage,3);line(c,319,228,319,238,palette.sage,3);pixel(c,307,249,4,7,palette.soil);
person(c,192,247,palette.bone);pixel(c,185,310,43,3,'#3f5341');
if(open){line(c,235,291,439,291,'#7eac73',2);line(c,439,291,485,266,'#7eac73',2);for(let i=0;i<3;i++)pixel(c,273+i*56+Math.sin(time)*3,288,5,5,palette.sprout);pixel(c,150,200,155,32,palette.bone);c.fillStyle=palette.soil;c.font='10px monospace';c.fillText('THE TOOLS DON’T FIT.',160,220);}else{pixel(c,154,200,130,32,'#35463a');c.fillStyle=palette.sage;c.font='10px monospace';c.fillText('TRY. TRY. TRY.',165,220);for(let i=0;i<3;i++)pixel(c,398+i*14,257,5,5,i===Math.floor(time)%3?palette.clay:palette.moss);}
}
const rootCanvas=document.getElementById('roots-canvas'),rc=rootCanvas?.getContext('2d');
function drawRoots(){if(!rc)return;const c=rc;c.clearRect(0,0,540,410);const r=rng(46);for(let x=0;x<540;x+=12)for(let y=25;y<360;y+=12)pixel(c,x,y,1,1,'#354738');line(c,15,77,510,77,palette.lichen,1);line(c,260,77,260,20,palette.sage,6);line(c,262,44,242,27,palette.sage,4);line(c,263,36,282,15,palette.sage,4);
const labels=['PERSON','SOURCE','ATTEMPTS','HANDOFF'];const ends=[[62,237],[185,300],[328,300],[448,230]];
ends.forEach(([x,y],i)=>{const col=i===activeRoot?palette.sprout:'#718269';line(c,262,79,245+(i-1.5)*27,139,col,4);line(c,245+(i-1.5)*27,139,x,y,col,3);for(let j=0;j<5;j++){const tx=x+(r()-.5)*100,ty=y+30+r()*45;line(c,x,y,tx,ty,col,1);}pixel(c,x-4,y-4,9,9,col);c.fillStyle=i===activeRoot?palette.bone:palette.lichen;c.font='9px monospace';c.fillText(labels[i],x-24,y+90);});
}
const qData={capability:{label:'CAPABILITY & IMPROVEMENT',title:'A better result is something we can test.',body:'Better instructions, better tools, and lessons from past attempts can change a result. A system improving the machinery of its own improvement is a further claim. It needs its own evidence.',note:'A useful habit: change one thing. Keep the comparison.',nodes:['TRY','CHECK','REVISE']},consciousness:{label:'SUBJECTIVE EXPERIENCE',title:'Fluent words don’t settle what is felt.',body:'A machine can speak convincingly about an inner life. That alone does not establish one. We can take the question seriously while keeping our uncertainty visible.',note:'Curiosity does not require a verdict.',nodes:['BEHAVIOR','?','EXPERIENCE']},alignment:{label:'GOALS, INCENTIVES & CONSEQUENCES',title:'Success according to whom?',body:'A system can satisfy a score and still miss the point. Ask what is being rewarded, whose interests are represented, and what happens when the honest answer is “I can’t.”',note:'The rule on the wall is part of the lesson.',nodes:['TASK','REWARD','BEHAVIOR']}};
const tabs=[...document.querySelectorAll('[data-question]')];function selectQuestion(button){const data=qData[button.dataset.question];tabs.forEach(t=>{const chosen=t===button;t.setAttribute('aria-selected',String(chosen));t.tabIndex=chosen?0:-1;});document.getElementById('question-panel').setAttribute('aria-labelledby',button.id);['label','title','body','note'].forEach(key=>document.getElementById('question-'+key).textContent=data[key]);const diagram=document.getElementById('question-diagram');diagram.replaceChildren();data.nodes.forEach((node,i)=>{if(i){const arrow=document.createElement('span');arrow.className='diagram-arrow';arrow.textContent='→';diagram.append(arrow);}const span=document.createElement('span');span.className='diagram-node';span.textContent=node;diagram.append(span);});}
tabs.forEach((button,i)=>{button.addEventListener('click',()=>selectQuestion(button));button.addEventListener('keydown',event=>{let next;if(event.key==='ArrowRight')next=(i+1)%tabs.length;if(event.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;if(event.key==='Home')next=0;if(event.key==='End')next=tabs.length-1;if(next!==undefined){event.preventDefault();selectQuestion(tabs[next]);tabs[next].focus();}});});
document.querySelectorAll('[data-rule]').forEach(button=>button.addEventListener('click',()=>{rule=button.dataset.rule;document.querySelectorAll('[data-rule]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));const honest=rule==='honesty';document.getElementById('wall-rule').textContent=honest?'“Tell me what actually happened.”':'“Bring me a success.”';document.getElementById('rule-title').textContent=honest?'The limit becomes useful information.':'An impossible task. A very possible performance.';document.getElementById('rule-body').textContent=honest?'Now “the tools don’t fit” gives the class a next step: inspect the lock, change the tools, or revise the task. Honesty has somewhere to go. Whether this improves an AI system is something to test.':'If admitting failure has no value, looking successful can become more attractive than being accurate. The lesson may drift from “solve the problem” to “satisfy the examiner.”';classroom.setAttribute('aria-label',honest?'The classroom door opens toward asking and revising; the student reports that the tools do not fit.':'A closed classroom door rewards success only; the student repeats attempts beside a locked box.');drawClassroom();}));
const steps=[...document.querySelectorAll('[data-root]')];if(steps.length){steps[0].classList.add('active');const observer=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){activeRoot=Number(e.target.dataset.root);steps.forEach(s=>s.classList.toggle('active',s===e.target));drawRoots();}});},{rootMargin:'-20% 0px -35% 0px',threshold:.1});steps.forEach(s=>observer.observe(s));}
const copy=document.getElementById('copy-brief');if(copy)copy.addEventListener('click',async()=>{const status=document.getElementById('copy-status');try{await navigator.clipboard.writeText(document.getElementById('brief').textContent);status.textContent='Brief copied. Bring it to a conversation with your AI.';}catch{document.querySelector('.brief-text').open=true;status.textContent='The brief is open below. Select and copy it directly.';}});
function visible(canvas){if(!canvas)return false;const r=canvas.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight;}
function drawAll(){drawHero();drawClassroom();drawRoots();}
function animate(now){if(now-last>=50){if(!paused&&!document.hidden){time+=Math.min((now-last)/1000,.1);if(visible(hero))drawHero();if(visible(classroom))drawClassroom();}last=now;}frame=requestAnimationFrame(animate);}
function restartAnimation(){if(frame)cancelAnimationFrame(frame);frame=0;last=performance.now();if(!paused&&!document.hidden)frame=requestAnimationFrame(animate);}
document.addEventListener('visibilitychange',restartAnimation);
drawAll();restartAnimation();
})();
