import * as T from 'three';
import {createAssetObject,templateParts} from './period-assets.js';
import {mergeGeometries} from '../vendor/BufferGeometryUtils.js';

const clamp=T.MathUtils.clamp;
export function boatCrewPose(time,phase=0,look=0,moving=false,out={}){
 const t=time*.58+phase;
 out.pitch=Math.sin(t)*.018*(moving?1:.55);
 out.roll=Math.sin(t*.73+.6)*.014;
 out.yaw=Math.sin(t*.43)*.025;
 out.breath=Math.sin(t*1.6)*.002;
 out.headYaw=clamp(look,-.45,.45)+Math.sin(t*.57)*.065;
 out.headPitch=Math.sin(t*.67+1)*.035;
 return out;
}

// The original feet/boat positions stay intact: give them visible support.
function workingDeck(){
 const pieces=[];
 const box=(x,y,z,w,h,d)=>pieces.push(new T.BoxGeometry(w,h,d).translate(x,y,z));
 for(let i=-3;i<=3;i++)box(i*.12,-.0305,0,.119,.055,.88);
 for(const z of [-.30,.30])box(0,-.103,z,.82,.09,.075);
 const geometry=mergeGeometries(pieces);for(const g of pieces)g.dispose();
 // Metre-scale grain runs along each narrow board, matching the old timber.
 const p=geometry.attributes.position,uv=geometry.attributes.uv;
 for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)*2.3,p.getZ(i)*1.1);
 geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}
function timber(kit){return templateParts(kit.templates.get('boat_cargo')).find(p=>p.material.name==='aged-timber')?.material??templateParts(kit.templates.get('boat_cargo'))[0].material;}

export function createBoatCrew(kit){
 const root=createAssetObject(kit,'person_boatman'),parts=templateParts(kit.templates.get('person_boatman')).map((part,i)=>({part,mesh:root.children[i],rest:part.matrix.clone()}));
 for(const entry of parts)entry.mesh.name=entry.part.name;
 const deck=new T.Mesh(workingDeck(),timber(kit));deck.name='船家/七片工作铺板（场景演绎）';deck.castShadow=deck.receiveShadow=true;root.add(deck);
 const torso=new T.Matrix4(),head=new T.Matrix4(),rotation=new T.Matrix4(),identity=new T.Matrix4(),a=new T.Matrix4(),b=new T.Matrix4(),euler=new T.Euler(),viewer=new T.Vector3(),inverse=new T.Matrix4(),target={};
 const pose={pitch:0,roll:0,yaw:0,breath:0,headYaw:0,headPitch:0};let disposed=false;
 const stats={drawablesAdded:1,trianglesAdded:deck.geometry.index.count/3,modelBytesAdded:0,sourceParts:parts.length};
 function setPose(value){
  Object.assign(pose,value);rotation.makeRotationFromEuler(euler.set(pose.pitch,pose.yaw,pose.roll,'YXZ'));
  torso.makeTranslation(0,.82+pose.breath,0).multiply(rotation).multiply(a.makeTranslation(0,-.82,0));
  head.copy(torso).multiply(a.makeTranslation(0,1.45,0)).multiply(rotation.makeRotationFromEuler(euler.set(pose.headPitch,pose.headYaw,0,'YXZ'))).multiply(b.makeTranslation(0,-1.45,0));
  for(const {part,mesh,rest} of parts){const name=part.name;mesh.matrix.copy(name.includes('__head')?head:name.includes('__body')||name.includes('__arm_')||name.includes('__props')?torso:identity).multiply(rest);mesh.matrixWorldNeedsUpdate=true;}
 }
 function update(time,dt,{reduced=false,moving=false,phase=0,observer=null}={}){
  if(disposed||reduced)return;
  let look=0;
  if(observer&&!moving){
   root.updateWorldMatrix(true,false);inverse.copy(root.matrixWorld).invert();viewer.copy(observer).applyMatrix4(inverse);
   const near=1-T.MathUtils.smoothstep(Math.hypot(viewer.x,viewer.z),4,24);
   look=clamp(Math.atan2(viewer.x,viewer.z),-.45,.45)*near;
  }
  boatCrewPose(time,phase,look,moving,target);
  const blend=1-Math.exp(-Math.max(0,Math.min(dt,.1))*4);
  for(const key of Object.keys(pose))pose[key]+= (target[key]-pose[key])*blend;
  setPose(pose);
 }
 function dispose(){if(disposed)return;disposed=true;deck.geometry.dispose();root.removeFromParent();}
 return {root,parts,deck,pose,stats,setPose,update,setDeckVisible:value=>deck.visible=Boolean(value),setMaterial:next=>deck.material=timber(next),dispose};
}
