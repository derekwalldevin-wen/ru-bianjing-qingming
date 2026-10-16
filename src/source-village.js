import * as T from 'three';
import {mergeGeometries} from '../vendor/BufferGeometryUtils.js';
import {projectSurfaceUV} from './surface-textures.js?v=shore-art-v1';

export const villageIds=new Set(['countryside-1','countryside-2']);
// Source roof silhouettes and gabled timber faces; dimensions, openings,
// unseen sides, thatch binding and the opening door are interpretation.
export function createSourceVillage(scene,materials,placements,references){
 const root=new T.Group();root.name='原画建筑/卷首村舍';scene.add(root);
 const originalPlacements=[];for(const [name,items]of placements)for(let i=items.length-1;i>=0;i--)if(villageIds.has(items[i].id))originalPlacements.push({name,...items.splice(i,1)[0]});
 if(originalPlacements.length!==2)throw Error('卷首两处源屋顶缺失');
 const thatch=materials.straw.clone();thatch.color.set('#9e8a5e');for(const key of ['map','normalMap','roughnessMap'])thatch[key]=materials.wood[key];thatch.normalScale.copy(materials.wood.normalScale).multiplyScalar(.6);thatch.userData={textureMeters:1.1,surfaceKind:'wood'};
 const mats={...materials,thatch},ownedMaterials=[thatch],buckets=new Map(),box=new T.BoxGeometry(1,1,1),rod=new T.CylinderGeometry(1,1,1,4,1,true),frame=new T.Object3D(),local=new T.Object3D(),a=new T.Vector3(),b=new T.Vector3(),doors=[],bodies=[];
 function add(g,key,pos=[0,0,0],size=[1,1,1],rotation=[0,0,0]){
  local.position.set(...pos);local.scale.set(...size);local.rotation.set(...rotation);local.updateMatrix();const part=g.index?g.toNonIndexed():g.clone();for(const k of Object.keys(part.attributes))if(!['position','normal'].includes(k))part.deleteAttribute(k);part.applyMatrix4(local.matrix).applyMatrix4(frame.matrix);projectSurfaceUV(part,mats[key]);if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(part);
 }
 const cube=(key,pos,size,rotation)=>add(box,key,pos,size,rotation);
 function beam(from,to,width,key='wood'){
  a.fromArray(from);b.fromArray(to);const length=a.distanceTo(b);local.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());add(box,key,a.add(b).multiplyScalar(.5).toArray(),[width,length,width],[local.rotation.x,local.rotation.y,local.rotation.z]);
 }
 function straw(from,to,width){
  a.fromArray(from);b.fromArray(to);const length=a.distanceTo(b);local.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());add(rod,'pale',a.add(b).multiplyScalar(.5).toArray(),[width,length,width],[local.rotation.x,local.rotation.y,local.rotation.z]);
 }
 function roof(cx,cz,w,d,eave,rise,detail=36){
  const height=(x,z)=>eave+rise*Math.pow(Math.max(0,1-Math.abs(x)/(w/2)),1.08)+.025*Math.cos(z*7.1)+.020*Math.sin(z*13.7+x*.8);
  const nx=20,nz=16,pos=[],ix=[],count=(nx+1)*(nz+1);
  for(const lower of [0,1])for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){const x=-w/2+i*w/nx,z=-d/2+j*d/nz;pos.push(cx+x,height(x,z)-lower*.20,cz+z);}
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const n=j*(nx+1)+i,k=n+nx+1;ix.push(n,k,n+1,n+1,k,k+1,n+count,n+1+count,k+count,n+1+count,k+1+count,k+count);}
  const edge=[];for(let i=0;i<=nx;i++)edge.push(i);for(let j=1;j<=nz;j++)edge.push(j*(nx+1)+nx);for(let i=nx-1;i>=0;i--)edge.push(nz*(nx+1)+i);for(let j=nz-1;j>0;j--)edge.push(j*(nx+1));
  for(let i=0;i<edge.length;i++){const n=edge[i],k=edge[(i+1)%edge.length];ix.push(n,k,n+count,k,k+count,n+count);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(ix);g.computeVertexNormals();add(g,'thatch');g.dispose();
  for(let row=0;row<detail;row++)for(const side of [-1,1])for(let step=0;step<8;step++){
   const z=-d/2+(row+.5)*d/detail,seed=Math.sin(row*71.3+step*17.7),x1=side*(.06+step*(w/2-.1)/8),x2=side*(.06+(step+1)*(w/2-.1)/8);
   straw([cx+x1,height(x1,z)+.015,cz+z],[cx+x2,height(x2,z)+.015,cz+z+.025*seed],.012+.003*seed);
  }
  // Bundled ridge and a restrained tied eave retain real thatch thickness.
  for(let row=0;row<detail;row++)for(const side of [-1,1])for(let stem=0;stem<3;stem++){
   const seed=Math.sin(row*47.1+stem*13.7),z=-d/2+(row+.25+stem*.23)*d/detail,x=side*(w/2-.055);
   straw([cx+x,height(x,z)-.015,cz+z],[cx+x+side*(.04+.025*seed),eave-.17-.07*(seed+1),cz+z+.025*seed],.010);
  }
  for(const z of [-d/2+.12,0,d/2-.12])beam([cx-.15,height(0,z)+.055,cz+z],[cx+.15,height(0,z)+.055,cz+z],.055,'dark');
  for(const side of [-1,1])beam([cx+side*w/2,eave-.08,cz-d/2],[cx+side*w/2,eave-.08,cz+d/2],.07,'wood');
 }
 function lattice(x,y,z,w,h){
  cube('dark',[x,y,z-.025],[w,h,.10]);
  for(let i=0;i<=Math.ceil(w/.20);i++)cube('pale',[x-w/2+i*w/Math.ceil(w/.20),y,z+.035],[.028,h,.035]);
  for(const yy of [-h/2,0,h/2])cube('wood',[x,y+yy,z+.055],[w+.12,.065,.065]);
 }
 for(const source of originalPlacements){
  const large=source.id==='countryside-1',w=9*source.scale,d=7*source.scale,h=large?2.35:2.18;
  frame.position.set(source.x,.62,source.z);frame.rotation.set(0,source.yaw,0);frame.scale.set(1,1,1);frame.updateMatrix();
  bodies.push({id:source.id,x:source.x,z:source.z,w,d,h,yaw:source.yaw,scale:1});
  const mainW=large?w*.76:w*.92,cx=large?w*.10:0,mainD=d*.84,front=mainD/2;
  cube('stone',[cx,.065,0],[mainW,.13,mainD]);cube('wall',[cx,h/2,-front],[mainW,h,.14]);
  for(const side of [-1,1]){cube('wall',[cx+side*mainW/2,h/2,0],[.14,h,mainD]);for(const yy of [.22,h-.06])cube('wood',[cx+side*mainW/2,yy,0],[.13,.12,mainD+.10]);}
  // Front is split around a genuine doorway, not a dark rectangle on a wall.
  const doorX=cx+.12*mainW,doorW=large?1.24:1.10,doorH=large?1.92:1.82;
  const left=cx-mainW/2,right=cx+mainW/2,leftWidth=doorX-doorW/2-left,rightWidth=right-doorX-doorW/2;
  cube('wall',[left+leftWidth/2,h/2,front],[leftWidth,h,.14]);cube('wall',[right-rightWidth/2,h/2,front],[rightWidth,h,.14]);cube('wall',[doorX,(h+doorH)/2,front],[doorW,h-doorH,.14]);
  cube('dark',[doorX,doorH/2,front-.36],[doorW,doorH,.06]);cube('wood',[doorX,.04,front-.18],[doorW,.08,.45]);
  for(const side of [-1,1])cube('wood',[doorX+side*(doorW/2+.045),doorH/2,front+.02],[.09,doorH+.12,.18]);cube('wood',[doorX,doorH+.05,front+.02],[doorW+.22,.10,.18]);
  for(const x of [left,cx-mainW*.17,right]){cube('wood',[x,h/2,front+.035],[.13,h,.13]);cube('stone',[x,.09,front+.035],[.22,.18,.22]);}
  lattice(cx-mainW*.30,1.40,front+.085,mainW*.22,.79);
  // Side framing gives the original arrival view legible woodwork too.
  for(const side of [-1,1])for(const z of [-front,0,front])cube('wood',[cx+side*mainW/2,h/2,z],[.13,h,.13]);
  roof(cx,0,mainW+.52,mainD+.60,h+.15,large?1.20:1.05,large?36:30);
  const gableRise=large?1.20:1.05;
  for(const side of [-1,1]){
   const g=new T.BufferGeometry(),z=side*front;g.setAttribute('position',new T.Float32BufferAttribute([left,h-.02,z,cx,h+gableRise+.10,z,right,h-.02,z],3));g.setIndex(side>0?[0,2,1]:[0,1,2]);g.computeVertexNormals();add(g,'wall');g.dispose();
   beam([left,h,z],[cx,h+gableRise+.08,z],.11,'dark');beam([right,h,z],[cx,h+gableRise+.08,z],.11,'dark');beam([left,h,z],[right,h,z],.12);beam([cx,h,z],[cx,h+gableRise+.08,z],.10);
  }
  if(large){const lx=-w*.36,lw=w*.23,ld=d*.70,lh=1.62;cube('wall',[lx,lh/2,-.1],[lw,lh,ld]);roof(lx,-.1,lw+.35,ld+.40,lh+.12,.43,18);for(const zz of [-ld/2,ld/2])cube('wood',[lx+lw/2,lh/2,zz-.1],[.10,lh,.10]);}
  const doorFrame=new T.Group();doorFrame.position.copy(frame.position);doorFrame.rotation.copy(frame.rotation);root.add(doorFrame);
  const pivot=new T.Group();pivot.name='村舍门轴/'+source.id;pivot.position.set(doorX-doorW/2,.04,front+.025);doorFrame.add(pivot);
  const doorParts=new Map();
  function doorCube(key,pos,size){const part=box.toNonIndexed();local.position.set(...pos);local.scale.set(...size);local.rotation.set(0,0,0);local.updateMatrix();part.applyMatrix4(local.matrix);projectSurfaceUV(part,mats[key]);if(!doorParts.has(key))doorParts.set(key,[]);doorParts.get(key).push(part);}
  const planks=7;for(let i=0;i<planks;i++)doorCube('wood',[(i+.5)*doorW/planks,(doorH-.04)/2,0],[doorW/planks-.010,doorH-.04,.07]);
  for(const yy of [.35,1.30])doorCube('dark',[doorW/2,yy,-.045],[doorW-.08,.075,.04]);doorCube('dark',[doorW*.86,.94,.06],[.06,.16,.055]);
  for(const [key,parts]of doorParts){const mesh=new T.Mesh(mergeGeometries(parts),mats[key]);parts.forEach(g=>g.dispose());mesh.name='村舍门扉/'+source.id+'/'+key;mesh.userData={assetTemplate:'building_source_village',sourceIds:[source.id],villageMaterial:key,door:source.id};mesh.castShadow=mesh.receiveShadow=true;pivot.add(mesh);}
  doors.push({id:source.id,pivot,halfWidth:w/2+.15,halfDepth:d/2+.15});
  const ref=references.find(p=>p.id===source.id);ref.referenceModel='source-thatched-village';ref.modelInterpretation='原画草檐/山面/前后关系；尺寸、门窗、背面及开合为三维补全';
 }
 for(const [key,parts]of buckets){const mesh=new T.Mesh(mergeGeometries(parts),mats[key]);parts.forEach(g=>g.dispose());mesh.name='长卷/town/卷首村舍/'+key;mesh.userData={assetTemplate:'building_source_village',sourceIds:[...villageIds],villageMaterial:key};mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);}box.dispose();rod.dispose();
 const stats={sourceGroups:2,drawables:0,triangles:0,modelBytesAdded:0,doors:doors.length};root.traverse(o=>{if(o.isMesh){stats.drawables++;stats.triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});
 const activeDoor=doors.find(door=>door.id==='countryside-1');let target=0,progress=0,disposed=false;
 function setDoorProgress(value){progress=T.MathUtils.clamp(value,0,1);activeDoor.pivot.rotation.y=progress*1.12;}
 function toggleDoor(reduced=false){target=target?0:1;if(reduced)setDoorProgress(target);return Boolean(target);}
 function update(dt,reduced){if(reduced)setDoorProgress(target);else setDoorProgress(T.MathUtils.damp(progress,target,6,Math.max(0,Math.min(dt,.1))));}
 function dispose(){if(disposed)return;disposed=true;scene.remove(root);root.traverse(o=>{if(o.isMesh)o.geometry.dispose();});for(const m of ownedMaterials)m.dispose();}
 return{root,bodies,originalPlacements,doors,ownedMaterials,stats,update,toggleDoor,setDoorProgress,dispose,get open(){return Boolean(target);},get progress(){return progress;}};
}
