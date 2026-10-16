import * as T from 'three';
import {createCameraRayIndex} from './camera-ray-index.js?v=visible-traveller-v1';

// One camera owner (navigation) calls this solver. Architecture references are
// refreshed when progressive batches are replaced; raycasts never include people.
export function createFollowCollision(scene,world,camera){
 const ray=new T.Raycaster(),direction=new T.Vector3(),right=new T.Vector3(),up=new T.Vector3(),origin=new T.Vector3();
 let version=-1,index,tracked=[];const cache=new WeakMap();
 function refresh(){
  if(version===world.enhancedKinds.size&&tracked.every(({mesh,matrix,count})=>mesh.matrixWorld.equals(matrix)&&mesh.count===count))return;
  version=world.enhancedKinds.size;const meshes=[];
  scene.traverse(o=>{if(o.isMesh&&(o.userData.assetTemplate?.startsWith('building_')||o.name.startsWith('长卷/gate/')))meshes.push(o);});
  world.bridgeObject?.traverse(o=>{if(o.isMesh)meshes.push(o);});
  scene.updateMatrixWorld(true);
  const unique=[...new Set(meshes)];index=createCameraRayIndex(unique,cache);tracked=unique.map(mesh=>({mesh,matrix:mesh.matrixWorld.clone(),count:mesh.count}));
 }
 function clip(anchor,desired,out){
  refresh();direction.subVectors(desired,anchor);const length=direction.length();if(length<1e-7)return out.copy(anchor);
  direction.divideScalar(length);right.crossVectors(direction,camera.up);if(right.lengthSq()<.001)right.set(1,0,0);else right.normalize();up.crossVectors(right,direction).normalize();
  // Cover the near plane and an extra shoulder margin, including diagonals.
  const halfHeight=Math.max(.16,Math.tan(T.MathUtils.degToRad(camera.fov/2))*camera.near+.08),halfWidth=Math.max(.16,halfHeight*camera.aspect);
  let distance=length;
  for(const [x,y]of [[0,0],[-1,-1],[-1,1],[1,-1],[1,1]]){
   origin.copy(anchor).addScaledVector(right,x*halfWidth).addScaledVector(up,y*halfHeight);ray.set(origin,direction);ray.near=0;ray.far=length+.12;
   const hit=index.nearest(ray.ray,length+.12);if(Number.isFinite(hit))distance=Math.min(distance,Math.max(0,hit-.22));
  }
  out.copy(anchor).addScaledVector(direction,distance);
  const ground=world.contactFloor?.(out.x,out.z)??world.floor(out.x,out.z);
  if(out.y<ground+.22){
   // Raising after clipping could pass through a ceiling. Retreat toward the
   // safe standing anchor instead, checking the raised path in the next frame.
   for(let i=0;i<12&&out.y<(world.contactFloor?.(out.x,out.z)??world.floor(out.x,out.z))+.22;i++)out.lerp(anchor,.25);
  }
  return out;
 }
 // Prepare while the scene is still loading instead of on the first walk key.
 refresh();return clip;
}

export function createFollowCamera(camera,clip=(a,b,out)=>out.copy(b)){
 const anchor=new T.Vector3(),desired=new T.Vector3(),safe=new T.Vector3(),blended=new T.Vector3(),target=new T.Vector3();
 return {update(position,yaw,pitch,dt,{snap=false,reduced=false,focusDrop=0}={}){
  anchor.copy(position);anchor.y-=.4+focusDrop;
  const elevation=T.MathUtils.clamp(.24-pitch,-.10,.85),distance=camera.aspect<.85?6.2:4.8;
  desired.set(Math.sin(yaw)*Math.cos(elevation),Math.sin(elevation),Math.cos(yaw)*Math.cos(elevation)).multiplyScalar(distance).add(anchor);
  clip(anchor,desired,safe);
  if(snap||reduced)blended.copy(safe);else blended.copy(camera.position).lerp(safe,1-Math.exp(-Math.min(.1,Math.max(0,dt))*12));
  // A damped pose can cut through a corner even if the endpoint is safe.
  clip(anchor,blended,camera.position);target.copy(anchor).add(new T.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)).multiplyScalar(.8));camera.lookAt(target);
 }};
}
