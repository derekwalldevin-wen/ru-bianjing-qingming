import * as T from 'three';
import {hollowWorkCloth,averageWorkSeams} from './traveller-work-cloth.js?v=traveller-work-v1';

const smooth=(x,a,b)=>T.MathUtils.smoothstep(x,a,b);
// Source meshes stay immutable. This small CPU skin is only used while working;
// it also resolves the long garment against the real ground before shadow draw.
export function createTravellerWorkRig(entries,world){
 const group=new T.Group();group.name='旅人/同源工作骨架';group.visible=false;
 const armature=new T.Group(),bones=[],byName={},rest={},inverse=[],parts=[],feet={left:{points:[],triangles:[]},right:{points:[],triangles:[]}},palms={};
 const p=new T.Vector3(),q=new T.Vector3(),v=new T.Vector3(),normal=new T.Vector3(),rootWorld=new T.Matrix4(),inverseRoot=new T.Matrix4(),palette=[];
 const axis=new T.Vector3(),pole=new T.Vector3(),elbow=new T.Vector3(),shoulder=new T.Vector3(),goal=new T.Vector3(),parentInverse=new T.Matrix4(),u=new T.Vector3();
 const stats={bones:0,meshes:0,vertices:0,triangles:0,minSoleGap:0,handError:0,maxFloorCorrection:0};
 function bone(name,position,parent=null){const b=new T.Bone();b.name=name;rest[name]=new T.Vector3(...position);b.position.copy(rest[name]);if(parent){b.position.sub(rest[parent]);byName[parent].add(b);}else armature.add(b);b.userData.index=bones.length;bones.push(b);byName[name]=b;return b;}
 bone('Root',[0,0,0]);bone('Hips',[0,.82,0],'Root');bone('Spine',[0,.99,0],'Hips');bone('Chest',[0,1.22,0],'Spine');bone('Neck',[0,1.45,0],'Chest');bone('Head',[0,1.49,0],'Neck');
 for(const side of ['left','right']){const s=side==='left'?-1:1;bone('Clavicle_'+side,[s*.08,1.36,0],'Chest');bone('UpperArm_'+side,[s*.16,1.375,0],'Clavicle_'+side);bone('Forearm_'+side,[s*.24,1.18,.02],'UpperArm_'+side);const cuff=new T.Vector3(s*.11,1.08,.20),wrist=cuff.clone().addScaledVector(cuff.clone().sub(rest['Forearm_'+side]).normalize(),.032);bone('Hand_'+side,wrist.toArray(),'Forearm_'+side);rest['Cuff_'+side]=cuff;bone('Thigh_'+side,[s*.09,.82,0],'Hips');bone('Calf_'+side,[s*.09,.44,0],'Thigh_'+side);bone('Foot_'+side,[s*.09,.10,0],'Calf_'+side);bone('Toe_'+side,[s*.09,.035,.14],'Foot_'+side);}
 const localRest=bones.map(b=>b.position.clone());armature.updateMatrixWorld(true);for(const b of bones){inverse.push(b.matrixWorld.clone().invert());palette.push(new T.Matrix4());}
 const index=name=>byName[name].userData.index;
 function sideWeights(left,right,t){return[[index(left),1-t],[index(right),t]];}
 function weights(name,material,geometry,i,point){
  const side=name.includes('_left')?'left':'right';
  if(name.includes('__props'))return[[index('Hand_left'),1]];
  if(name.includes('__head/'))return[[index('Head'),1]];
  if(name.includes('__foot_'))return[[index('Foot_'+side),1]];
  if(name.includes('__leg_'))return[[index('Calf_'+side),1]];
  if(name.includes('__arm_')){
   if(material.name==='weathered skin')return[[index('Hand_'+side),1]];
   if(material.name!=='washed indigo')return[[index('Forearm_'+side),1]];
   const m=geometry.userData.tailoring;let t;
   if(m){const n=m.rows*(m.radial+1);t=i<n?Math.floor(i/(m.radial+1))/(m.rows-1):i<n+m.radial+2?0:1;}
   else t=Math.min(1,Math.floor(i/20)/6);
   const blend=smooth(t,.36,.64);return[[index('UpperArm_'+side),1-blend],[index('Forearm_'+side),blend]];
  }
  const split=smooth(point.x,-.085,.085),y=point.y;
  if(y<.31){const t=smooth(y,.15,.31);return[...sideWeights('Foot_left','Foot_right',split).map(([b,w])=>[b,w*(1-t)]),...sideWeights('Calf_left','Calf_right',split).map(([b,w])=>[b,w*t])];}
  if(y<.60){const t=smooth(y,.36,.60);return[...sideWeights('Calf_left','Calf_right',split).map(([b,w])=>[b,w*(1-t)]),...sideWeights('Thigh_left','Thigh_right',split).map(([b,w])=>[b,w*t])];}
  if(y<.94){const t=smooth(y,.72,.94);return[...sideWeights('Thigh_left','Thigh_right',split).map(([b,w])=>[b,w*(1-t)]),[index('Hips'),t]];}
  const t=smooth(y,1.02,1.25);return[[index('Spine'),1-t],[index('Chest'),t]];
 }
 for(const entry of entries){
  const source=entry.tailored??entry.part.geometry;let g=source.clone();g.morphAttributes={};g.morphTargetsRelative=false;g.applyMatrix4(entry.part.matrix);g=hollowWorkCloth(g,entry.part.name,entry.mesh.material.name,rest);
  const positions=g.attributes.position,normals=g.attributes.normal,bindPositions=positions.array.slice(),bindNormals=normals.array.slice(),joints=new Uint16Array(positions.count*4),values=new Float32Array(positions.count*4),name=entry.part.name;
  for(let i=0;i<positions.count;i++){p.fromBufferAttribute(positions,i);const influences=weights(name,entry.mesh.material,g,i,p).filter(([,w])=>w>1e-7);let sum=0;for(let k=0;k<influences.length;k++){joints[i*4+k]=influences[k][0];values[i*4+k]=influences[k][1];sum+=influences[k][1];}for(let k=0;k<4;k++)values[i*4+k]/=sum;}
  positions.setUsage(T.DynamicDrawUsage);normals.setUsage(T.DynamicDrawUsage);
  g.boundingBox=new T.Box3(new T.Vector3(-1,-.1,-.8),new T.Vector3(1,1.9,1.3));g.boundingSphere=g.boundingBox.getBoundingSphere(new T.Sphere());
  const mesh=new T.Mesh(g,entry.mesh.material);mesh.name='工作蒙皮/'+name;mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
  const cloth=name.includes('__body/')||name.includes('__arm_')&&entry.mesh.material.name!=='weathered skin'||name.includes('__leg_');
  const part={name,mesh,bindPositions,bindNormals,joints,values,cloth,tailoring:g.userData.tailoring};parts.push(part);
  const side=name.includes('_left')?'left':'right';
  if(name.includes('__arm_')&&entry.mesh.material.name==='weathered skin'){const centre=new T.Vector3();for(let i=0;i<positions.count;i++)centre.add(p.fromBufferAttribute(positions,i));centre.multiplyScalar(1/positions.count);palms[side]=centre.sub(rest['Hand_'+side]).add(new T.Vector3(0,0,.018));}
  if(name.includes('__foot_')){const foot=feet[side],offset=foot.points.length;for(let i=0;i<positions.count;i++)foot.points.push(new T.Vector3().fromBufferAttribute(positions,i));const ix=g.index;for(let i=0;i<(ix?.count??positions.count);i+=3){const ids=[0,1,2].map(k=>offset+(ix?ix.getX(i+k):i+k)),[a,b,c]=ids.map(n=>foot.points[n]);if((b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x)>1e-10)foot.triangles.push(...ids);}}
  stats.meshes++;stats.vertices+=positions.count;stats.triangles+=(g.index?.count??positions.count)/3;
 }
 for(const side of ['left','right']){if(!palms[side])throw Error('工作掌心语义缺失');const foot=feet[side];foot.surface={vertices:new Float64Array(foot.points.flatMap(p=>p.toArray())),world:new Float64Array(foot.points.length*3),triangles:new Uint32Array(foot.triangles),edges:new Uint32Array(foot.triangles.flatMap((_,i,a)=>i%3===0?[a[i],a[i+1],a[i+1],a[i+2],a[i+2],a[i]]:[]))};}
 const footMatrix=new T.Matrix4(),worldFoot=new T.Matrix4(),rootQuaternion=new T.Quaternion(),groundQuaternion=new T.Quaternion(),desiredQuaternion=new T.Quaternion(),parentQuaternion=new T.Quaternion(),up=new T.Vector3(0,1,0),one=new T.Vector3(1,1,1),contacts={left:new T.Vector3(),right:new T.Vector3()};
 function solve(upper,lower,end,target,polePoint){
  armature.updateMatrixWorld(true);upper.getWorldPosition(shoulder);axis.subVectors(target,shoulder);const length=axis.length(),a=lower.position.length(),b=end.position.length(),d=T.MathUtils.clamp(length,Math.abs(a-b)+1e-6,a+b-1e-6);if(length<1e-9)axis.set(0,-1,0);else axis.divideScalar(length);
  pole.subVectors(polePoint,shoulder);pole.addScaledVector(axis,-pole.dot(axis));if(pole.lengthSq()<1e-9)pole.set(1,0,0).addScaledVector(axis,-axis.x);pole.normalize();const along=(a*a+d*d-b*b)/(2*d);elbow.copy(shoulder).addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(Math.max(0,a*a-along*along)));goal.copy(shoulder).addScaledVector(axis,d);
  parentInverse.copy(upper.parent.matrixWorld).invert();u.copy(elbow).applyMatrix4(parentInverse).sub(upper.position).normalize();upper.quaternion.setFromUnitVectors(v.copy(lower.position).normalize(),u);armature.updateMatrixWorld(true);
  parentInverse.copy(lower.parent.matrixWorld).invert();u.copy(goal).applyMatrix4(parentInverse).sub(lower.position).normalize();lower.quaternion.setFromUnitVectors(v.copy(end.position).normalize(),u);armature.updateMatrixWorld(true);
 }
 function orient(end,quaternion){end.parent.getWorldQuaternion(parentQuaternion);end.quaternion.copy(parentQuaternion.invert()).multiply(quaternion);armature.updateMatrixWorld(true);}
 function grip(side,out){return out.copy(palms[side]).applyMatrix4(byName['Hand_'+side].matrixWorld);}
 function hand(side,target,quaternion,weight){if(weight<=1e-7)return;q.copy(palms[side]).applyQuaternion(quaternion);const wrist=target.clone().sub(q),armPole=side==='left'?new T.Vector3(-.45,.15,1):new T.Vector3(.75,.05,.10);solve(byName['UpperArm_'+side],byName['Forearm_'+side],byName['Hand_'+side],wrist,armPole);orient(byName['Hand_'+side],quaternion);if(weight<1){const identity=new T.Quaternion();for(const name of ['UpperArm_','Forearm_','Hand_'])byName[name+side].quaternion.slerpQuaternions(identity,byName[name+side].quaternion.clone(),weight);armature.updateMatrixWorld(true);}}
 function update({matrix,crouch=0,weight=1,rightTarget=null,rightOrientation=0,motion={stride:0,lean:0,sway:0,bob:0,headYaw:0,headPitch:0}}){
  rootWorld.copy(matrix);inverseRoot.copy(matrix).invert();matrix.decompose(p,rootQuaternion,one);bones.forEach((b,i)=>{b.quaternion.identity();b.position.copy(localRest[i]);});byName.Hips.position.set(0,.82-.54*crouch+(motion.bob||0),-.05*crouch);byName.Hips.rotation.set(1.25*crouch+(motion.lean||0),0,motion.sway||0);byName.Neck.rotation.x=-.36*crouch+(motion.headPitch||0);byName.Head.rotation.y=motion.headYaw||0;armature.updateMatrixWorld(true);
  stats.minSoleGap=Infinity;stats.maxFloorCorrection=0;
  for(const side of ['left','right']){
   const s=side==='left'?-1:1,pivot=rest['Foot_'+side],ankle=pivot.clone();ankle.z+=(motion.stride||0)*s*.025;
   p.copy(ankle).applyMatrix4(matrix);const hx=(world.contactFloor(p.x+.035,p.z)-world.contactFloor(p.x-.035,p.z))/.07,hz=(world.contactFloor(p.x,p.z+.035)-world.contactFloor(p.x,p.z-.035))/.07;normal.set(-hx,1,-hz).normalize();groundQuaternion.setFromUnitVectors(up,normal);desiredQuaternion.copy(rootQuaternion).invert().multiply(groundQuaternion).multiply(rootQuaternion);
   footMatrix.makeTranslation(...ankle.toArray()).multiply(new T.Matrix4().makeRotationFromQuaternion(desiredQuaternion)).multiply(new T.Matrix4().makeTranslation(-pivot.x,-pivot.y,-pivot.z));worldFoot.multiplyMatrices(matrix,footMatrix);let lift=world.terrainSupport?.clearanceMesh(feet[side].surface,worldFoot)??-Infinity;
   for(const point of feet[side].points){p.copy(point).applyMatrix4(worldFoot);lift=Math.max(lift,world.contactFloor(p.x,p.z)-p.y);}lift+=.003+Math.max(0,(motion.stride||0)*s)*.018;footMatrix.elements[13]+=lift;
   const target=new T.Vector3().setFromMatrixPosition(footMatrix.clone().multiply(new T.Matrix4().makeTranslation(...pivot.toArray())));byName['Thigh_'+side].getWorldPosition(p);const standingLength=T.MathUtils.clamp(p.distanceTo(target)/.72,.985,1.015),legLength=T.MathUtils.lerp(standingLength,1,smooth(crouch,0,.15));byName['Calf_'+side].position.multiplyScalar(legLength);byName['Foot_'+side].position.multiplyScalar(legLength);solve(byName['Thigh_'+side],byName['Calf_'+side],byName['Foot_'+side],target,new T.Vector3(s*.09,.45,.60));orient(byName['Foot_'+side],desiredQuaternion);
  }
  const leftBase=grip('left',new T.Vector3()),leftGoal=new T.Vector3(-.28,1.07,.28).sub(rest.Hips).applyQuaternion(byName.Hips.quaternion).add(byName.Hips.position);leftGoal.x-=.06*crouch+.035*Math.sin(Math.PI*crouch);leftGoal.y+=.25*crouch;leftBase.lerp(leftGoal,weight);desiredQuaternion.setFromAxisAngle(up,-Math.PI*weight);hand('left',leftBase,desiredQuaternion,weight);
  const rightBase=grip('right',new T.Vector3()),target=rightTarget?new T.Vector3(...rightTarget).applyMatrix4(inverseRoot):new T.Vector3(.18,1.04,.32);rightBase.lerp(target,weight);desiredQuaternion.setFromAxisAngle(new T.Vector3(1,0,0),rightOrientation);hand('right',rightBase,desiredQuaternion,weight);
  stats.handError=rightTarget?grip('right',p).distanceTo(target):0;
  for(let i=0;i<bones.length;i++)palette[i].multiplyMatrices(bones[i].matrixWorld,inverse[i]);
  for(const part of parts){const g=part.mesh.geometry,positions=g.attributes.position,normals=g.attributes.normal;let clipped=false;
   for(let i=0;i<positions.count;i++){
    const o=i*3,x=part.bindPositions[o],y=part.bindPositions[o+1],z=part.bindPositions[o+2],nx=part.bindNormals[o],ny=part.bindNormals[o+1],nz=part.bindNormals[o+2];let px=0,py=0,pz=0,ax=0,ay=0,az=0;
    for(let k=0;k<4;k++){const w=part.values[i*4+k];if(!w)continue;const e=palette[part.joints[i*4+k]].elements;px+=(e[0]*x+e[4]*y+e[8]*z+e[12])*w;py+=(e[1]*x+e[5]*y+e[9]*z+e[13])*w;pz+=(e[2]*x+e[6]*y+e[10]*z+e[14])*w;ax+=(e[0]*nx+e[4]*ny+e[8]*nz)*w;ay+=(e[1]*nx+e[5]*ny+e[9]*nz)*w;az+=(e[2]*nx+e[6]*ny+e[10]*nz)*w;}
    if(part.cloth){p.set(px,py,pz).applyMatrix4(matrix);const floor=world.contactFloor(p.x,p.z)+.025;if(p.y<floor){const fix=floor-p.y;py+=fix;clipped=true;stats.maxFloorCorrection=Math.max(stats.maxFloorCorrection,fix);}}
    positions.setXYZ(i,px,py,pz);normal.set(ax,ay,az).normalize();normals.setXYZ(i,normal.x,normal.y,normal.z);
   }
   if(clipped){g.computeVertexNormals();averageWorkSeams(g);}
   positions.needsUpdate=normals.needsUpdate=true;
   if(part.name.includes('__foot_'))for(let i=0;i<positions.count;i++){p.fromBufferAttribute(positions,i).applyMatrix4(matrix);stats.minSoleGap=Math.min(stats.minSoleGap,p.y-world.contactFloor(p.x,p.z));}
  }
  for(const side of ['left','right'])grip(side,contacts[side]).applyMatrix4(matrix);return contacts;
 }
 let disposed=false;function dispose(){if(disposed)return;disposed=true;for(const p of parts)p.mesh.geometry.dispose();group.removeFromParent();}
 stats.bones=bones.length;return{group,parts,bones,rest,inverse,palette,palms,stats,contacts,update,dispose};
}
