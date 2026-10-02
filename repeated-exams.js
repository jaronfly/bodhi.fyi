/* Astra — the exam becomes a repeating environment, an illustration of scale. */
import * as THREE from './vendor/three.module.js';
export function createRepeatedExams(scene){
 const world=new THREE.Group();scene.add(world);world.visible=false;
 const count=81,positions=[];for(let z=-4;z<=4;z++)for(let x=-4;x<=4;x++)positions.push([x*10,0,z*12]);
 const dummy=new THREE.Object3D();
 function instances(geo,material,offset){const m=new THREE.InstancedMesh(geo,material,count);positions.forEach((p,i)=>{dummy.position.set(p[0]+offset[0],offset[1],p[2]+offset[2]);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);});world.add(m);return m;}
 const mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:.82});
 const floor=mat('#162c25'),walls=mat('#344d42'),metal=mat('#8a9c8d'),dark=mat('#13211b');
 instances(new THREE.BoxGeometry(8,.15,10),floor,[0,-.1,0]);
 instances(new THREE.BoxGeometry(8,3.7,.12),walls,[0,1.85,-5]);
 for(const x of [-4,4])instances(new THREE.BoxGeometry(.12,3.7,10),walls,[x,1.85,0]);
 instances(new THREE.BoxGeometry(1.65,.64,1.25),walls,[0,.32,-1.3]);
 instances(new THREE.BoxGeometry(1.8,.05,1.4),metal,[0,.665,-1.3]);
 instances(new THREE.BoxGeometry(.5,.46,.22),metal,[0,.95,-1.3]);
 instances(new THREE.BoxGeometry(.07,.16,.015),dark,[0,.95,-1.18]);
 const lamps=instances(new THREE.BoxGeometry(1.9,.05,.24),new THREE.MeshBasicMaterial({color:'#b0d2be'}),[0,3.6,-1.3]);
 // Thin floor seams retain the language of the first room at a distance.
 for(const z of [-4,-2,0,2,4])instances(new THREE.BoxGeometry(8,.006,.012),mat('#385446'),[0,.005,z]);
 const key=new THREE.DirectionalLight('#b8dfc2',1.8);key.position.set(10,25,15);world.add(key);
 return {world,update(t,still){for(let i=0;i<count;i++){const v=still?.65:.46+.4*(.5+.5*Math.sin(t*.5+i*2.399));lamps.setColorAt(i,new THREE.Color(v*.88,v,v*.9));}lamps.instanceColor.needsUpdate=true;}};
}
