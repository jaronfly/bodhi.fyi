/* A short, reversible dissolve between two views of the same thought experiment. */
import * as THREE from './vendor/three.module.js';
export function createDissolve(renderer){
 const a=new THREE.WebGLRenderTarget(1,1),b=new THREE.WebGLRenderTarget(1,1);
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
 const material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{first:{value:a.texture},second:{value:b.texture},amount:{value:0}},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:'uniform sampler2D first; uniform sampler2D second; uniform float amount; varying vec2 vUv; void main(){gl_FragColor=mix(texture2D(first,vUv),texture2D(second,vUv),amount);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'});
 scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),material));
 let width=0,height=0;
 return {draw(amount,first,second){
  const size=renderer.getSize(new THREE.Vector2()),ratio=Math.min(1,1600/size.x);
  const w=Math.round(size.x*ratio),h=Math.round(size.y*ratio);if(w!==width||h!==height){a.setSize(w,h);b.setSize(w,h);width=w;height=h;}
  renderer.setRenderTarget(a);first();renderer.setRenderTarget(b);second();renderer.setRenderTarget(null);material.uniforms.amount.value=amount;renderer.render(scene,camera);
 }};
}
