import * as T from 'three';

// Static 3D walls, roofs and bridge geometry can block a nearby interaction.
// Reflections, sprites, people and the target object's own front surface do not.
export function createDiscoveryVisibility(scene,world,camera,visitorPosition=null){
 const ray=new T.Raycaster(),target=new T.Vector3(),direction=new T.Vector3();
 let version=-1,occluders=[];
 return object=>{
  if(version!==world.enhancedKinds.size){
   version=world.enhancedKinds.size;occluders=[];
   scene.traverse(mesh=>{if(mesh.isMesh&&(mesh.userData.assetTemplate?.startsWith('building_')||mesh.name.startsWith('长卷/gate/')))occluders.push(mesh);});
   if(world.bridgeObject)occluders.push(world.bridgeObject);
  }
  target.fromArray(object.point);
  for(const origin of visitorPosition?[visitorPosition,camera.position]:[camera.position]){
   direction.subVectors(target,origin);const distance=direction.length();if(distance<.8)continue;
   ray.set(origin,direction.normalize());ray.near=.05;ray.far=distance-.75;
   // A camera around a corner must not allow the visitor to reach through it.
   if(ray.intersectObjects(occluders,true).length)return false;
  }
  return true;
 };
}
