import * as T from 'three';
import {templateParts} from './period-assets.js';
import {createCrowdMotion} from './crowd-motion.js';

export function createPeriodCrowd(scene,kit,people,bridgeHeight,clear,floor){
 const groups=[],transform=new T.Object3D(),matrix=new T.Matrix4(),swing=new T.Matrix4(),v=new T.Vector3();
 const footprints=new Map(),rigs=new Map(),states=new Map();
 for(const role of new Set(people.map(p=>p.role))){
  const list=people.filter(p=>p.role===role),rig={};let radius=0;
  for(const part of templateParts(kit.templates.get('person_'+role))){
   const joint=/leg_left|leg_right|foot_left|foot_right/.exec(part.name)?.[0];
   if(joint&&!rig[joint])rig[joint]={pivot:new T.Vector3().setFromMatrixPosition(part.matrix),box:new T.Box3(),bind:part.matrix.clone()};
   const positions=part.geometry.attributes.position;
   for(let i=0;i<positions.count;i++){
    v.fromBufferAttribute(positions,i).applyMatrix4(part.matrix);radius=Math.max(radius,Math.hypot(v.x,v.z));
    if(joint?.startsWith('foot_'))rig[joint].box.expandByPoint(v);
   }
   const mesh=new T.InstancedMesh(part.geometry,part.material,list.length);mesh.name=`百姓/${role}/${part.name}`;mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
   scene.add(mesh);groups.push({part,list,mesh});
  }
  for(const side of ['left','right']){
   const foot=rig['foot_'+side];if(!foot||foot.box.isEmpty())throw new Error(`Missing ankle rig: ${role}/${side}`);
   foot.probes=[];for(const x of [foot.box.min.x,foot.box.max.x])for(const z of [foot.box.min.z,foot.box.max.z])foot.probes.push(new T.Vector3(x,foot.box.min.y,z));
  }
  footprints.set(role,radius+.07);rigs.set(role,rig);
 }
 const motion=createCrowdMotion(people,{radiusFor:p=>footprints.get(p.role)*p.scale,clear,floor});
 let last=0,quality='standard';const frustum=new T.Frustum(),projection=new T.Matrix4(),sphere=new T.Sphere(new T.Vector3(),1.9);
 function update(time,reduced,camera,visitor){
  const dt=Math.max(0,time-last);last=time;if(!reduced)motion.update(dt,time,visitor);
  if(camera){camera.updateMatrixWorld();frustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));}
  states.clear();
  motion.agents.forEach((a,index)=>{
   const p=a.person,{x,z,yaw}=a,base=floor(x,z),stride=reduced?0:a.stride;
   if(camera){sphere.center.set(x,base+.85,z);const distance=camera.position.distanceTo(sphere.center);if(!frustum.intersectsSphere(sphere)||distance>(quality==='low'?65:quality==='high'?160:120)||(quality==='low'&&distance>28&&index%2))return;}
   transform.position.set(x,base,z);transform.rotation.set(0,yaw,0);transform.scale.setScalar(p.scale);transform.updateMatrix();
   const state={matrix:transform.matrix.clone(),stride,feet:{},legs:{},joints:{}};a.groundY=base;
   const rig=rigs.get(p.role),amplitude=['scholar','woman'].includes(p.role)?.025:.14;
   for(const side of ['left','right']){
    const sign=side==='left'?1:-1,angle=stride*sign*amplitude,leg=rig['leg_'+side],foot=rig['foot_'+side];
    const hip=leg.pivot.clone().applyMatrix4(state.matrix);
    const ankle=foot.pivot.clone().sub(leg.pivot).applyMatrix4(swing.makeRotationX(angle)).add(leg.pivot).applyMatrix4(state.matrix);
    // Each shoe aligns to the deck normal, independently of the upright torso.
    const slope=p.bridge?(floor(ankle.x,ankle.z+.02)-floor(ankle.x,ankle.z-.02))/.04:0;
    const correction=new T.Matrix4().makeTranslation(...ankle.toArray())
     .multiply(new T.Matrix4().makeRotationX(-Math.atan(slope)))
     .multiply(new T.Matrix4().makeRotationY(yaw)).scale(new T.Vector3(p.scale,p.scale,p.scale))
     .multiply(new T.Matrix4().makeTranslation(-foot.pivot.x,-foot.pivot.y,-foot.pivot.z));
    let lift=-Infinity;for(const probe of foot.probes){v.copy(probe).applyMatrix4(correction);lift=Math.max(lift,floor(v.x,v.z)-v.y);}
    lift+=.003+(reduced?0:Math.max(0,stride*sign)*.018);correction.elements[13]+=lift;
    state.feet[side]=correction;
    const stretch=(hip.y-ankle.y-lift)/(hip.y-ankle.y);
    const adjust=new T.Matrix4().makeTranslation(hip.x,hip.y,hip.z).scale(new T.Vector3(1,stretch,1)).multiply(new T.Matrix4().makeTranslation(-hip.x,-hip.y,-hip.z));
    state.legs[side]={adjust,angle};
    state.joints[`person_${p.role}__foot_${side}`]=correction.clone().multiply(foot.bind).toArray();
    state.joints[`person_${p.role}__leg_${side}`]=adjust.clone().multiply(state.matrix).multiply(leg.bind).multiply(new T.Matrix4().makeRotationX(angle)).toArray();
   }
   states.set(p,state);
  });
  for(const {part,list,mesh} of groups){
   let visible=0;for(const p of list){
    const state=states.get(p);if(!state)continue;
    const limb=/leg_left|leg_right|foot_left|foot_right|arm_left|arm_right/.exec(part.name)?.[0],side=limb?.endsWith('left')?'left':'right';
    if(limb?.startsWith('foot_'))matrix.multiplyMatrices(state.feet[side],part.matrix);
    else{
     matrix.multiplyMatrices(state.matrix,part.matrix);
     if(limb?.startsWith('leg_')){const leg=state.legs[side];matrix.multiply(swing.makeRotationX(leg.angle));matrix.premultiply(leg.adjust);}
     if(limb?.startsWith('arm_')&&!['porter','scholar','boatman'].includes(p.role))matrix.multiply(swing.makeRotationX(state.stride*(side==='left'?1:-1)*(p.role==='woman'?-.035:-.07)));
    }
    mesh.setMatrixAt(visible++,matrix);
   }mesh.count=visible;mesh.instanceMatrix.needsUpdate=true;
  }
 }
 update(0,true);
 return {update,groups,people,motion,footprints,states,setQuality(value){quality=value;}};
}
