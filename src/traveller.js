import * as T from 'three';
import {templateParts} from './period-assets.js';

// Original project scholar: shared mesh/texture data, owned fade materials.
// People source is not upgraded; scene references also protect shared resources
// from progressive retirement. Dispose only the materials owned here.
export function createTraveller(scene,kit,world){
 const root=new T.Group();root.name='旅人/宋人行旅（场景演绎）';root.visible=false;scene.add(root);
 const parts=templateParts(kit.templates.get('person_scholar')),materials=new Map(),rig={},entries=[];
 const bind=new T.Matrix4(),turn=new T.Matrix4(),correction=new T.Matrix4(),adjust=new T.Matrix4(),matrix=new T.Matrix4();
 const v=new T.Vector3(),hip=new T.Vector3(),ankle=new T.Vector3(),normal=new T.Vector3(),up=new T.Vector3(0,1,0),quaternion=new T.Quaternion();
 let phase=0,blend=0,alpha=1,disposed=false;const stats={meshes:0,vertices:0,triangles:0,radius:0,height:0,minSoleGap:0};
 const bounds=new T.Box3();
 for(const part of parts){
  const source=Array.isArray(part.material)?part.material:[part.material],clones=source.map(m=>{if(!materials.has(m)){const clone=m.clone();clone.transparent=true;materials.set(m,clone);}return materials.get(m);});
  const mesh=new T.Mesh(part.geometry,Array.isArray(part.material)?clones:clones[0]);mesh.name=part.name;mesh.matrixAutoUpdate=false;mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);
  const joint=/leg_left|leg_right|foot_left|foot_right/.exec(part.name)?.[0];
  if(joint&&!rig[joint])rig[joint]={pivot:new T.Vector3().setFromMatrixPosition(part.matrix),points:[],triangles:[]};
  const offset=joint?.startsWith('foot_')?rig[joint].points.length:0;
  const vertices=part.geometry.attributes.position;
  for(let i=0;i<vertices.count;i++){
   v.fromBufferAttribute(vertices,i).applyMatrix4(part.matrix);bounds.expandByPoint(v);stats.radius=Math.max(stats.radius,Math.hypot(v.x,v.z));
   if(joint?.startsWith('foot_'))rig[joint].points.push(v.clone());
  }
  if(joint?.startsWith('foot_')){
   const indices=part.geometry.index,count=indices?.count??vertices.count,foot=rig[joint];
   for(let i=0;i<count;i+=3){
    const ids=[0,1,2].map(j=>offset+(indices?indices.getX(i+j):i+j)),[a,b,c]=ids.map(id=>foot.points[id]);
    if((b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x)>1e-10)foot.triangles.push(...ids);
   }
  }
  stats.vertices+=vertices.count;stats.triangles+=(part.geometry.index?.count??vertices.count)/3;
  entries.push({part,mesh,joint});
 }
 stats.meshes=entries.length;stats.height=bounds.max.y-bounds.min.y;
 world.setVisitorRadius?.(stats.radius+.035);
 for(const side of ['left','right']){
  const foot=rig['foot_'+side];if(!foot?.points.length||!rig['leg_'+side])throw new Error('旅人鞋底/关节缺失');
  foot.surface={vertices:new Float64Array(foot.points.flatMap(p=>p.toArray())),world:new Float64Array(foot.points.length*3),triangles:new Uint32Array(foot.triangles),edges:new Uint32Array(foot.triangles.flatMap((_,i,a)=>i%3===0?[a[i],a[i+1],a[i+1],a[i+2],a[i+2],a[i]]:[]))};
 }
 function update(state,dt,camera,reduced=false){
  if(disposed)return;root.visible=state.visible;if(!root.visible){blend=0;return;}
  const position=state.position,base=world.contactFloor(position.x,position.z),step=Math.min(.1,Math.max(0,dt));
  blend=reduced?0:T.MathUtils.damp(blend,Math.min(1,state.speed/2),16,step);
  phase+=Math.min(6,state.speed)*step*5;const stride=Math.sin(phase)*blend;
  root.position.set(position.x,base,position.z);root.rotation.set(0,state.yaw,0);root.updateMatrix();bind.copy(root.matrix);
  const feet={},legs={};stats.minSoleGap=Infinity;
  for(const side of ['left','right']){
   const sign=side==='left'?1:-1,angle=stride*sign*.025,leg=rig['leg_'+side],foot=rig['foot_'+side];
   hip.copy(leg.pivot).applyMatrix4(bind);ankle.copy(foot.pivot).sub(leg.pivot).applyMatrix4(turn.makeRotationX(angle)).add(leg.pivot).applyMatrix4(bind);
   const hx=(world.contactFloor(ankle.x+.035,ankle.z)-world.contactFloor(ankle.x-.035,ankle.z))/.07,hz=(world.contactFloor(ankle.x,ankle.z+.035)-world.contactFloor(ankle.x,ankle.z-.035))/.07;
   normal.set(-hx,1,-hz).normalize();quaternion.setFromUnitVectors(up,normal);
   correction.makeTranslation(ankle.x,ankle.y,ankle.z).multiply(new T.Matrix4().makeRotationFromQuaternion(quaternion)).multiply(turn.makeRotationY(state.yaw)).multiply(new T.Matrix4().makeTranslation(-foot.pivot.x,-foot.pivot.y,-foot.pivot.z));
   let lift=world.terrainSupport?.clearanceMesh(foot.surface,correction)??-Infinity;
   for(const point of foot.points){v.copy(point).applyMatrix4(correction);lift=Math.max(lift,world.contactFloor(v.x,v.z)-v.y);}
   lift+=.003+Math.max(0,stride*sign)*.018;correction.elements[13]+=lift;
   feet[side]=correction.clone();
   for(const point of foot.points){v.copy(point).applyMatrix4(correction);stats.minSoleGap=Math.min(stats.minSoleGap,v.y-world.contactFloor(v.x,v.z));}
   const stretch=T.MathUtils.clamp((hip.y-ankle.y-lift)/(hip.y-ankle.y),.5,1.15);
   adjust.makeTranslation(hip.x,hip.y,hip.z).scale(new T.Vector3(1,stretch,1)).multiply(new T.Matrix4().makeTranslation(-hip.x,-hip.y,-hip.z));
   legs[side]={angle,adjust:adjust.clone()};
  }
  // Limb calculations above are in world space; convert back into the root.
  const inverse=bind.clone().invert();
  for(const {part,mesh,joint}of entries){
   const side=joint?.endsWith('left')?'left':'right';
   if(joint?.startsWith('foot_'))matrix.multiplyMatrices(feet[side],part.matrix);
   else{matrix.multiplyMatrices(bind,part.matrix);if(joint?.startsWith('leg_'))matrix.multiply(turn.makeRotationX(legs[side].angle)).premultiply(legs[side].adjust);}
   mesh.matrix.multiplyMatrices(inverse,matrix);mesh.matrixWorldNeedsUpdate=true;
  }
  const distance=camera.position.distanceTo(new T.Vector3(position.x,base+1.15,position.z));
  const next=T.MathUtils.clamp((distance-.35)/.85,0,1);if(Math.abs(alpha-next)>.005){alpha=next;for(const material of materials.values()){material.opacity=alpha;material.depthWrite=alpha>.98;}}
  root.visible=alpha>.01;root.updateMatrixWorld(true);
 }
 function dispose(){if(disposed)return;disposed=true;scene.remove(root);for(const material of materials.values())material.dispose();}
 return {root,update,dispose,stats};
}
