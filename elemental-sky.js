/* Astra — an open sky, drawn procedurally in Bodhi's soil / sage / canopy palette. */
import * as THREE from './vendor/three.module.js';
export function makeElementalSky(parent){
 const uniforms={time:{value:0},strength:{value:0}};
 const material=new THREE.ShaderMaterial({uniforms,depthWrite:false,side:THREE.DoubleSide,transparent:true,
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:`precision mediump float;varying vec2 vUv;uniform float time;uniform float strength;
 void main(){vec2 u=vUv;vec3 col=vec3(0.);float glow=0.;
 for(int i=0;i<3;i++){float n=float(i);float ribbon=.33+n*.13+sin(u.x*6.+time*.07+n*1.9)*.065+sin(u.x*13.-time*.035+n)*.024;
 float d=u.y-ribbon;float lower=exp(-abs(d)*25.);float veil=exp(-max(d,0.)*7.)*smoothstep(-.02,.035,d);
 float threads=.62+.38*sin(u.x*270.+sin(u.x*17.+time*.1)*3.);
 float a=(lower*.30+veil*.22)*threads;glow+=a;
 col+=mix(vec3(.29,.65,.34),vec3(.18,.46,.48),clamp(d*5.+n*.20,0.,1.))*a;}
 float edge=smoothstep(0.,.16,u.x)*smoothstep(0.,.16,1.-u.x)*smoothstep(0.,.12,u.y);
 gl_FragColor=vec4(col*2.3,clamp(glow*1.4,0.,.65)*edge*strength);}`});
 const curtains=new THREE.Mesh(new THREE.PlaneGeometry(140,70),material);curtains.position.set(0,24,-39);curtains.renderOrder=-2;parent.add(curtains);
 const points=[];let n=127;const rand=()=>{n=(n*16807)%2147483647;return n/2147483647;};
 for(let i=0;i<420;i++)points.push((rand()-.5)*120,9+rand()*47,-40-rand()*12);
 const stars=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(points,3)),new THREE.PointsMaterial({color:'#d7e6ce',size:.09,transparent:true,opacity:.65,depthWrite:false}));parent.add(stars);
 const moon=new THREE.Mesh(new THREE.SphereGeometry(.90,24,16),new THREE.MeshBasicMaterial({color:'#dae2c9'}));moon.position.set(-11,17,-36);parent.add(moon);
 const shade=new THREE.Mesh(new THREE.SphereGeometry(.86,24,16),new THREE.MeshBasicMaterial({color:'#12281d'}));shade.position.set(-10.67,17.18,-35.5);parent.add(shade);
 return {update(t,amount){uniforms.time.value=t;uniforms.strength.value=amount;stars.material.opacity=amount*.55;moon.visible=shade.visible=amount>.3;}};
}
