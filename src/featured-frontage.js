import * as T from 'three';
import {createAssetObject} from './period-assets.js';

// Remove only the focused instance from its existing spatial/material batches.
// Packing keeps the remaining matrices intact and avoids a singular zero-scale
// instance matrix (which would produce invalid shader normals).
export function createFeaturedFrontage(scene,placements,{template='building_workshop',anchor=[23,25],detail='detail_tea_frontage',verticalOffset=0,prepare=()=>{}}={}){
 const item=placements.get(template)?.find(p=>p.x===anchor[0]&&p.z===anchor[1]);
 if(!item)throw new Error('Featured frontage anchor missing: '+template);
 const saved=new Map(),matrix=new T.Matrix4();let group=null,refined=false;
 function mask(batches){
  for(const mesh of batches){if(mesh.userData.assetTemplate!==template)continue;
   const items=mesh.userData.assetPlacements,index=items.indexOf(item);if(index<0)continue;
   mesh.getMatrixAt(index,matrix);saved.set(mesh,matrix.clone());const last=mesh.count-1;
   if(index!==last){mesh.getMatrixAt(last,matrix);mesh.setMatrixAt(index,matrix);items[index]=items[last];}
   items.pop();mesh.count--;mesh.visible=mesh.count>0;mesh.instanceMatrix.needsUpdate=true;mesh.boundingSphere=null;mesh.computeBoundingSphere();
  }
 }
 function restore(){
  for(const [mesh,original]of saved){mesh.setMatrixAt(mesh.count++,original);mesh.userData.assetPlacements.push(item);mesh.visible=true;mesh.instanceMatrix.needsUpdate=true;mesh.boundingSphere=null;mesh.computeBoundingSphere();}
  saved.clear();
 }
 return {get group(){return group;},get refined(){return refined;},
  apply(kit,batches){
   const next=createAssetObject(kit,detail);next.position.set(item.x,item.y+verticalOffset,item.z);next.rotation.y=item.yaw;next.scale.setScalar(item.scale);
   prepare(next);
   mask(batches);group=next;refined=true;scene.add(group);
  },replaceBatches(next,old){for(const mesh of old)saved.delete(mesh);if(refined)mask(next);},
  setVisible(value,batches){if(!group)return false;value=Boolean(value);if(value!==refined){if(value)mask(batches);else restore();refined=value;group.visible=value;}return true;}
 };
}
