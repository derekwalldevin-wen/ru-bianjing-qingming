import * as T from 'three';

// A small read-only triangle BVH for static camera obstruction queries. It
// does not change source geometry, renderer raycasts, or physical walk bounds.
export function createTriangleRayIndex(geometry){
 const position=geometry.attributes.position,index=geometry.index,count=(index?.count??position.count)/3;
 const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),point=new T.Vector3();
 let bounds=new Float32Array(count*6),centres=new Float64Array(count*3);
 for(let triangle=0;triangle<count;triangle++){
  let minX=Infinity,minY=Infinity,minZ=Infinity,maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity;
  for(let j=0;j<3;j++){point.fromBufferAttribute(position,index?index.getX(triangle*3+j):triangle*3+j);minX=Math.min(minX,point.x);minY=Math.min(minY,point.y);minZ=Math.min(minZ,point.z);maxX=Math.max(maxX,point.x);maxY=Math.max(maxY,point.y);maxZ=Math.max(maxZ,point.z);}
  bounds.set([minX,minY,minZ,maxX,maxY,maxZ],triangle*6);centres.set([(minX+maxX)/2,(minY+maxY)/2,(minZ+maxZ)/2],triangle*3);
 }
 function build(ids){
  let minX=Infinity,minY=Infinity,minZ=Infinity,maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity;
  for(const id of ids){const p=id*6;minX=Math.min(minX,bounds[p]);minY=Math.min(minY,bounds[p+1]);minZ=Math.min(minZ,bounds[p+2]);maxX=Math.max(maxX,bounds[p+3]);maxY=Math.max(maxY,bounds[p+4]);maxZ=Math.max(maxZ,bounds[p+5]);}
  const box=new T.Box3(new T.Vector3(minX,minY,minZ),new T.Vector3(maxX,maxY,maxZ));
  if(ids.length<=12)return {box,ids};
  const size=box.getSize(new T.Vector3()),axis=size.x>=size.y&&size.x>=size.z?0:size.y>=size.z?1:2;
  ids.sort((x,y)=>centres[x*3+axis]-centres[y*3+axis]);const middle=ids.length>>1;
  return {box,left:build(ids.slice(0,middle)),right:build(ids.slice(middle))};
 }
 const root=build(Array.from({length:count},(_,i)=>i));
 bounds=null;centres=null;
 return {box:root.box,triangles:count,nearest(ray,maxDistance){
  let nearest=maxDistance,found=false;const stack=[root];
  while(stack.length){
   const node=stack.pop();if(!node.box.containsPoint(ray.origin)){
    if(!ray.intersectBox(node.box,point)||point.distanceToSquared(ray.origin)>nearest*nearest)continue;
   }
   if(node.ids)for(const id of node.ids){
    a.fromBufferAttribute(position,index?index.getX(id*3):id*3);b.fromBufferAttribute(position,index?index.getX(id*3+1):id*3+1);c.fromBufferAttribute(position,index?index.getX(id*3+2):id*3+2);
    if(ray.intersectTriangle(a,b,c,false,point)){const distance=point.distanceTo(ray.origin);if(distance<=nearest){nearest=distance;found=true;}}
   }else stack.push(node.left,node.right);
  }
  return found?nearest:Infinity;
 }};
}

export function createCameraRayIndex(meshes,cache=new WeakMap()){
 const records=[],matrix=new T.Matrix4(),instance=new T.Matrix4(),localRay=new T.Ray(),point=new T.Vector3(),end=new T.Vector3();
 let triangles=0;
 for(const mesh of meshes){
  if(!cache.has(mesh.geometry))cache.set(mesh.geometry,createTriangleRayIndex(mesh.geometry));const tree=cache.get(mesh.geometry);triangles+=tree.triangles;
  const count=mesh.isInstancedMesh?mesh.count:1;
  for(let i=0;i<count;i++){
   if(mesh.isInstancedMesh){mesh.getMatrixAt(i,instance);matrix.multiplyMatrices(mesh.matrixWorld,instance);}else matrix.copy(mesh.matrixWorld);
   records.push({tree,matrix:matrix.clone(),inverse:matrix.clone().invert(),box:tree.box.clone().applyMatrix4(matrix)});
  }
 }
 return {stats:{records:records.length,triangles},nearest(ray,maxDistance){
  let nearest=maxDistance,found=false;
  for(const record of records){
   if(!record.box.containsPoint(ray.origin)){
    if(!ray.intersectBox(record.box,point)||point.distanceToSquared(ray.origin)>nearest*nearest)continue;
   }
   localRay.copy(ray).applyMatrix4(record.inverse);ray.at(nearest,end).applyMatrix4(record.inverse);
   const distance=record.tree.nearest(localRay,end.distanceTo(localRay.origin));
   if(Number.isFinite(distance)){localRay.at(distance,point).applyMatrix4(record.matrix);nearest=point.distanceTo(ray.origin);found=true;}
  }
  return found?nearest:Infinity;
 }};
}
