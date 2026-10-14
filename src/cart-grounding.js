import * as T from 'three';

// One-time fitting of the featured cart to its actual visible road. The road
// and collision proxies stay unchanged. Only the lower hoof shape is fitted;
// the leg joins, wheels, horns and horizontal hoof footprint stay in place.
export function fitCartToGround(group,scene){
 scene.updateMatrixWorld(true);group.updateMatrixWorld(true);
 const surfaces=scene.children.filter(o=>o.isMesh&&o.name==='街巷/岸坡与细部'&&!o.material.transparent);
 scene.traverse(o=>{if(o.isMesh&&o.name.endsWith('/ground'))surfaces.push(o);});
 const inverse=group.matrixWorld.clone().invert(),ray=new T.Raycaster(),local=new T.Vector3(),world=new T.Vector3(),target=new T.Vector3();
 let fittedVertices=0,clonedGeometries=0;
 group.traverse(mesh=>{
  if(!mesh.isMesh||mesh.material.name!=='Ox dark horn and hoof')return;
  const original=mesh.geometry,geometry=original.clone(),positions=geometry.attributes.position,normal=original.attributes.normal,inverseMesh=mesh.matrixWorld.clone().invert(),unchanged=[];
  for(let i=0;i<positions.count;i++){
   world.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld);local.copy(world).applyMatrix4(inverse);
   if(local.y>.20){unchanged.push(i);continue;}
   const weight=T.MathUtils.clamp((.165-local.y)/.165,0,1);
   if(weight<=1e-6){unchanged.push(i);continue;}
   ray.set(new T.Vector3(world.x,group.position.y+.35,world.z),new T.Vector3(0,-1,0));const hit=ray.intersectObjects(surfaces,false)[0];
   if(!hit){geometry.dispose();throw new Error('牛车蹄底缺少可见道路支撑');}
   target.set(world.x,hit.point.y+.003,world.z).applyMatrix4(inverse);
   local.y+=target.y*weight;world.copy(local).applyMatrix4(group.matrixWorld).applyMatrix4(inverseMesh);positions.setXYZ(i,world.x,world.y,world.z);fittedVertices++;
  }
  geometry.computeVertexNormals();
  // Preserve authored normals for the unaffected horns and upper hoof joins.
  for(const i of unchanged)geometry.attributes.normal.setXYZ(i,normal.getX(i),normal.getY(i),normal.getZ(i));
  geometry.computeBoundingBox();geometry.computeBoundingSphere();positions.needsUpdate=true;mesh.geometry=geometry;clonedGeometries++;
 });
 if(!fittedVertices)throw new Error('牛车精修模型缺少可贴地蹄部');
 group.userData.cartGrounding={fittedVertices,clonedGeometries,clearance:.003};return group.userData.cartGrounding;
}
