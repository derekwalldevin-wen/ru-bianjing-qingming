import * as T from 'three';

const variation=(x,z)=>{const n=Math.sin(x*91.7+z*173.3)*43758.5453;return n-Math.floor(n);};
// Four curved leaves, three non-degenerate triangles each. Local decoration
// only: the source scroll's roofs, roads and shared random stream stay intact.
export function createShoreVegetation(scene,anchors,ground){
 const positions=[],colors=[],indices=[],roots=[],bottom=new T.Color('#58663f'),tip=new T.Color('#b0a66d'),color=new T.Color();
 for(let blade=0;blade<4;blade++){
  const angle=blade*2.399+.3,height=[.28,.39,.23,.33][blade],width=[.035,.041,.027,.033][blade],bend=[.095,.12,.075,.10][blade],start=positions.length/3;
  for(const [t,side]of [[0,-1],[0,1],[.56,-1],[.56,1],[1,0]]){
   const center=bend*t*t,w=width*(1-t*.7)*side,dx=Math.sin(angle)*center+Math.cos(angle)*w,dz=Math.cos(angle)*center-Math.sin(angle)*w;
   positions.push(dx,height*t,dz);color.copy(bottom).lerp(tip,t*t*.72);colors.push(color.r,color.g,color.b);if(t===0)roots.push([dx,dz]);
  }
  indices.push(start,start+2,start+1,start+1,start+2,start+3,start+2,start+4,start+3);
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.boundingBox.expandByScalar(.045);geometry.computeBoundingSphere();geometry.boundingSphere.radius+=.045;
 const time={value:0},gain={value:1},material=new T.MeshStandardMaterial({color:'#ffffff',vertexColors:true,side:T.DoubleSide,roughness:.94});
 material.name='早春岸草 · 原创三维叶片';material.customProgramCacheKey=()=> 'shore-leaves-v1';
 material.onBeforeCompile=shader=>{
  shader.uniforms.uShoreTime=time;shader.uniforms.uShoreGain=gain;
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float uShoreTime;\nuniform float uShoreGain;');
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   vec3 tuftRoot=(modelMatrix*instanceMatrix*vec4(0.0,0.0,0.0,1.0)).xyz;
   float bladeWind=sin(uShoreTime*1.35+tuftRoot.x*.91+tuftRoot.z*.63)*.018+sin(uShoreTime*2.1+tuftRoot.x*.37)*.007;
   float leafTip=smoothstep(0.03,0.39,position.y);
   transformed.x+=bladeWind*leafTip*uShoreGain;
   transformed.z+=bladeWind*.4*leafTip*uShoreGain;`);
 };
 const cells=new Map(),accepted=[],skipped=[],transform=new T.Object3D(),v=new T.Vector3();
 for(const anchor of anchors){
  const yaw=variation(anchor.x,anchor.z)*Math.PI*2,scale=.65+variation(anchor.z+11,anchor.x)*.48,base=ground(anchor.x,anchor.z);let lift=base;
  for(const [dx,dz]of roots){const x=anchor.x+(Math.cos(yaw)*dx+Math.sin(yaw)*dz)*scale,z=anchor.z+(-Math.sin(yaw)*dx+Math.cos(yaw)*dz)*scale;lift=Math.max(lift,ground(x,z));}
  if(lift-base>.045){skipped.push({...anchor,reason:'stone edge exceeds root tolerance'});continue;}
  const entry={x:anchor.x,z:anchor.z,y:lift+.004,yaw,scale};accepted.push(entry);const key=Math.floor(anchor.x/32)+','+Math.sign(anchor.z);if(!cells.has(key))cells.set(key,[]);cells.get(key).push(entry);
 }
 const meshes=[];for(const [key,items]of cells){
  const mesh=new T.InstancedMesh(geometry,material,items.length);mesh.name='岸缘草簇/'+key;mesh.receiveShadow=true;mesh.castShadow=false;
  items.forEach((a,i)=>{transform.position.set(a.x,a.y,a.z);transform.rotation.set(0,a.yaw,0);transform.scale.setScalar(a.scale);transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);});mesh.computeBoundingBox();mesh.computeBoundingSphere();mesh.userData.shoreAnchors=items;scene.add(mesh);meshes.push(mesh);
 }
 let quality='standard',disposed=false;
 function update(t,reduced,camera){time.value=reduced?0:t;gain.value=reduced||quality==='low'?0:1;for(const mesh of meshes){v.copy(mesh.boundingSphere.center);const distance=camera?camera.position.distanceTo(v):0;mesh.visible=distance<mesh.boundingSphere.radius+(quality==='low'?32:quality==='high'?115:75);}}
 function dispose(){if(disposed)return;disposed=true;for(const mesh of meshes){scene.remove(mesh);mesh.dispose();}geometry.dispose();material.dispose();}
 return {meshes,material,geometry,accepted,skipped,update,dispose,setQuality(value){quality=value;},stats:{sourceAnchors:anchors.length,tufts:accepted.length,skipped:skipped.length,leaves:accepted.length*4,triangles:accepted.length*12,drawables:meshes.length,newModelBytes:0},wind:{time,gain}};
}
