import * as T from 'three';
import {templateParts} from './period-assets.js';
import {createCrowdMotion} from './crowd-motion.js';
import {sampleVendorGesture,vendorGestureTarget,advanceVendorGestureWeight,VENDOR_GESTURE_RADIUS,VENDOR_GESTURE_SOURCE_SHA256} from './vendor-gesture.js';
import {createVendorGestureRig,vendorJoint} from './vendor-gesture-rig.js';
import {chooseVendorGestureActor} from './vendor-gesture-actor.js?v=original-scroll-v1';

export function createPeriodCrowd(scene,kit,people,bridgeHeight,clear,floor,contactFloor=floor,footClearance=null){
 const groups=[],transform=new T.Object3D(),matrix=new T.Matrix4(),swing=new T.Matrix4(),v=new T.Vector3(),supportCache=new Map();
 const footprints=new Map(),rigs=new Map(),states=new Map();let vendorParts=[];
 for(const role of new Set(people.map(p=>p.role))){
  const list=people.filter(p=>p.role===role),rig={};let radius=0;
  const parts=templateParts(kit.templates.get('person_'+role));if(role==='vendor')vendorParts=parts;
  for(const part of parts){
   const joint=/leg_left|leg_right|foot_left|foot_right/.exec(part.name)?.[0];
   if(joint&&!rig[joint])rig[joint]={pivot:new T.Vector3().setFromMatrixPosition(part.matrix),box:new T.Box3(),bind:part.matrix.clone(),soles:[]};
   const positions=part.geometry.attributes.position;
   for(let i=0;i<positions.count;i++){
    v.fromBufferAttribute(positions,i).applyMatrix4(part.matrix);radius=Math.max(radius,Math.hypot(v.x,v.z));
    if(joint?.startsWith('foot_'))rig[joint].box.expandByPoint(v);
   }
   if(joint?.startsWith('foot_')){const indices=part.geometry.index,count=indices?indices.count:positions.count;
    for(let i=0;i<count;i+=3){const triangle=Array.from({length:3},(_,j)=>new T.Vector3().fromBufferAttribute(positions,indices?indices.getX(i+j):i+j).applyMatrix4(part.matrix)),[a,b,c]=triangle;
     if((b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x)>1e-10)rig[joint].soles.push(triangle);
    }
   }
   const mesh=new T.InstancedMesh(part.geometry,part.material,list.length);mesh.name=`百姓/${role}/${part.name}`;mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
   scene.add(mesh);groups.push({part,list,mesh,gestureIndex:-1});
  }
  for(const side of ['left','right']){
   const foot=rig['foot_'+side];if(!foot||foot.box.isEmpty())throw new Error(`Missing ankle rig: ${role}/${side}`);
   foot.probes=[];for(const x of [foot.box.min.x,foot.box.max.x])for(const z of [foot.box.min.z,foot.box.max.z])foot.probes.push(new T.Vector3(x,foot.box.min.y,z));
   const vertices=[],triangles=[],edges=[],ids=new Map(),edgeIds=new Set();
   for(const triangle of foot.soles){const indices=triangle.map(p=>{const key=p.toArray().map(n=>n.toFixed(8)).join(',');if(!ids.has(key)){ids.set(key,vertices.length/3);vertices.push(p.x,p.y,p.z);}return ids.get(key);});triangles.push(...indices);for(let i=0;i<3;i++){const a=indices[i],b=indices[(i+1)%3],key=Math.min(a,b)+','+Math.max(a,b);if(!edgeIds.has(key)){edgeIds.add(key);edges.push(a,b);}}}
   foot.surface={vertices:new Float64Array(vertices),world:new Float64Array(vertices.length),triangles:new Uint32Array(triangles),edges:new Uint32Array(edges)};foot.soles.length=0;
  }
  footprints.set(role,radius+.07);rigs.set(role,rig);
 }
 const motion=createCrowdMotion(people,{radiusFor:p=>footprints.get(p.role)*p.scale,clear,floor});
 const gestureRig=kit.vendorSourceHash===VENDOR_GESTURE_SOURCE_SHA256&&vendorParts.length?createVendorGestureRig(vendorParts):null;
 const gestureAgent=gestureRig?chooseVendorGestureActor(motion.agents,clear):null;
 if(gestureAgent)gestureAgent.radius=VENDOR_GESTURE_RADIUS*gestureAgent.person.scale;
 const gesture={actor:gestureAgent?.person||null,weight:0,target:0,phase:'wait',enabled:true};
 const gestureAdjustment=new T.Matrix4(),gesturePart=new T.Matrix4();
 let last=0,quality='standard',groundingEnabled=true;const frustum=new T.Frustum(),projection=new T.Matrix4(),sphere=new T.Sphere(new T.Vector3(),1.9);
 function update(time,reduced,camera,visitor){
  const supportFloor=groundingEnabled?contactFloor:floor;
  const dt=Math.max(0,time-last);last=time;if(!reduced)motion.update(dt,time,visitor);
  if(camera){camera.updateMatrixWorld();frustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));}
  if(gestureAgent){
   const a=gestureAgent;sphere.center.set(a.x,supportFloor(a.x,a.z)+.85,a.z);
   const disabled=reduced||quality==='low'||!gesture.enabled;
   gesture.target=camera?vendorGestureTarget(camera.position.distanceTo(sphere.center),quality,reduced,frustum.intersectsSphere(sphere)&&gesture.enabled):0;
   gesture.weight=advanceVendorGestureWeight(gesture.weight,gesture.target,dt,disabled);
   const pose=sampleVendorGesture(time,a.person.phase,gesture.weight);gesture.phase=gesture.weight>.001?pose.phase:'wait';gestureRig.setPose(pose);
  }
  states.clear();
  motion.agents.forEach((a,index)=>{
   const p=a.person,{x,z,yaw}=a,base=supportFloor(x,z),stride=reduced?0:a.stride;
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
    let lift=-Infinity;
    if(groundingEnabled&&!p.bridge&&footClearance){
     if(!supportCache.has(p))supportCache.set(p,{});const cache=supportCache.get(p),prior=cache[side],pose=[x,z,yaw,base,angle,p.scale];
     if(prior&&pose.every((n,i)=>n===prior.pose[i]))lift=prior.lift;else{lift=footClearance(foot.surface,correction);cache[side]={pose,lift};}
     for(const probe of foot.probes){v.copy(probe).applyMatrix4(correction);const stable=floor(v.x,v.z);if(stable>.62)lift=Math.max(lift,stable-v.y);}
    }else for(const probe of foot.probes){v.copy(probe).applyMatrix4(correction);lift=Math.max(lift,supportFloor(v.x,v.z)-v.y);}
    if(!Number.isFinite(lift))throw new Error('人物鞋底缺少可见地面支撑');
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
  for(const group of groups){
   const {part,list,mesh}=group;group.gestureIndex=-1;
   let visible=0;for(const p of list){
    const state=states.get(p);if(!state)continue;
    const limb=/leg_left|leg_right|foot_left|foot_right|arm_left|arm_right/.exec(part.name)?.[0],side=limb?.endsWith('left')?'left':'right';
    if(limb?.startsWith('foot_'))matrix.multiplyMatrices(state.feet[side],part.matrix);
    else{
     if(p===gesture.actor&&gesture.weight>0&&['head','arm_right'].includes(vendorJoint(part))){gesturePart.multiplyMatrices(gestureRig.adjustment(part,gestureAdjustment),part.matrix);matrix.multiplyMatrices(state.matrix,gesturePart);}
     else matrix.multiplyMatrices(state.matrix,part.matrix);
     if(limb?.startsWith('leg_')){const leg=state.legs[side];matrix.multiply(swing.makeRotationX(leg.angle));matrix.premultiply(leg.adjust);}
     if(limb?.startsWith('arm_')&&!['porter','scholar','boatman'].includes(p.role))matrix.multiply(swing.makeRotationX(state.stride*(side==='left'?1:-1)*(p.role==='woman'?-.035:-.07)));
    }
    if(p===gesture.actor)group.gestureIndex=visible;
    mesh.setMatrixAt(visible++,matrix);
   }mesh.count=visible;mesh.instanceMatrix.needsUpdate=true;
  }
 }
 update(0,true);
 return {get groundingEnabled(){return groundingEnabled;},setGroundingEnabled(value){groundingEnabled=Boolean(value);},update,groups,people,motion,footprints,states,gesture,supportStats:[...rigs].flatMap(([role,rig])=>['left','right'].map(side=>({role,side,vertices:rig['foot_'+side].surface.vertices.length/3,triangles:rig['foot_'+side].surface.triangles.length/3,edges:rig['foot_'+side].surface.edges.length/2}))),setGesturesEnabled(value){gesture.enabled=Boolean(value);if(!gesture.enabled)gesture.weight=0;},setQuality(value){quality=value;if(value==='low')gesture.weight=0;}};
}
