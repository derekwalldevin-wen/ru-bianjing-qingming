import * as T from 'three';
import {mergeGeometries} from '../vendor/BufferGeometryUtils.js';
import {projectSurfaceUV} from './surface-textures.js?v=shore-art-v1';

export const neighborhoodIds=new Set(['city-21','city-27']);
// Source-visible roof relationships; sizes, rear elevations and joinery are
// spatial interpretations. Keep the original resolved lots and collision data.
export function createSourceNeighborhood(scene,materials,placements,references){
 const root=new T.Group();root.name='原画建筑/城门邻里';scene.add(root);
 const originals=[];
 for(const [name,items]of placements){for(let i=items.length-1;i>=0;i--)if(neighborhoodIds.has(items[i].id))originals.push({name,...items.splice(i,1)[0]});}
 if(originals.length!==2)throw Error('城门邻里原画实例不完整');
 const buckets=new Map(),box=new T.BoxGeometry(1,1,1),rod=new T.CylinderGeometry(1,1,1,8),local=new T.Object3D(),frame=new T.Object3D(),a=new T.Vector3(),b=new T.Vector3();
 const bodies=[];
 function add(g,key,pos=[0,0,0],size=[1,1,1],rotation=[0,0,0]){
  local.position.set(...pos);local.scale.set(...size);local.rotation.set(...rotation);local.updateMatrix();
  const part=g.index?g.toNonIndexed():g.clone();for(const key of Object.keys(part.attributes))if(!['position','normal'].includes(key))part.deleteAttribute(key);
  part.applyMatrix4(local.matrix).applyMatrix4(frame.matrix);projectSurfaceUV(part,materials[key]);
  if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(part);
 }
 const cube=(key,pos,size,rotation)=>add(box,key,pos,size,rotation);
 function beam(from,to,width,key='wood'){
  a.fromArray(from);b.fromArray(to);const length=a.distanceTo(b);local.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());
  add(box,key,a.add(b).multiplyScalar(.5).toArray(),[width,length,width],[local.rotation.x,local.rotation.y,local.rotation.z]);
 }
 function post(x,z,h,width=.13){cube('wood',[x,h/2,z],[width,h,width]);cube('stone',[x,.10,z],[width+.16,.20,width+.16]);}
 function window(x,y,z,w,h){
  cube('dark',[x,y,z-.05],[w,h,.09]);
  for(const side of [-1,1])cube('wood',[x+side*w/2,y,z+.025],[.085,h+.16,.10]);
  for(let i=0;i<=Math.ceil(w/.19);i++)cube('pale',[x-w/2+i*w/Math.ceil(w/.19),y,z+.065],[.035,h,.035]);
  for(const dy of [-h/2,0,h/2])cube('wood',[x,y+dy,z+.085],[w+.14,.065,.08]);
 }
 function door(x,z,w,h){
  cube('dark',[x,h/2,z],[w,h,.12]);for(let i=0;i<Math.ceil(w/.21);i++)cube('wood',[x-w/2+(i+.5)*w/Math.ceil(w/.21),h/2,z+.07],[w/Math.ceil(w/.21)-.012,h-.04,.08]);
  for(const side of [-1,1])cube('pale',[x+side*(w/2+.045),h/2,z+.11],[.09,h+.15,.13]);
  cube('wood',[x,h+.06,z+.11],[w+.25,.13,.16]);
  for(const yy of [.55,1.35])cube('dark',[x,yy,z+.13],[w-.1,.085,.03]);
  for(const xx of [-.13,.13])add(rod,'dark',[x+xx,1.03,z+.17],[.04,.055,.04],[Math.PI/2,0,0]);
 }
 function shell(x,z,w,d,h){
  cube('stone',[x,.10,z],[w+.12,.20,d+.12]);cube('wall',[x,h/2,z-d/2],[w,h,.15]);
  for(const side of [-1,1])cube('wall',[x+side*w/2,h/2,z],[.15,h,d]);
  cube('wall',[x,.44,z+d/2],[w,.66,.12]);cube('wall',[x,h-.24,z+d/2],[w,.48,.12]);
  for(const yy of [.17,h-.07])cube('wood',[x,yy,z+d/2+.06],[w+.15,.15,.16]);
  for(const xx of [-w/2,-w/6,w/6,w/2]){post(x+xx,z+d/2,h);cube('pale',[x+xx,h-.03,z+d/2],[.44,.15,.39]);cube('wood',[x+xx,h+.12,z+d/2],[.70,.12,.24]);}
 }
 // Closed, gently curved pitched roof. ridgeAlongZ makes the frontal gable
 // visible, a defining difference from the earlier generic hip-roof shop.
 function roof(x,z,w,d,eave,rise,ridgeAlongZ=false){
  const height=(u,v)=>eave+rise*Math.pow(Math.max(0,1-Math.abs(ridgeAlongZ?u:v)/(ridgeAlongZ?w:d)*2),1.24)+.055*Math.pow(Math.abs(u)/(w/2),8)+.045*Math.pow(Math.abs(v)/(d/2),8);
  const nx=24,nz=16,pos=[],ix=[],count=(nx+1)*(nz+1);
  for(const lower of [0,1])for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){const u=-w/2+i*w/nx,v=-d/2+j*d/nz;pos.push(x+u,height(u,v)-lower*.11,z+v);}
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const n=j*(nx+1)+i,k=n+nx+1;ix.push(n,k,n+1,n+1,k,k+1,n+count,n+1+count,k+count,n+1+count,k+1+count,k+count);}
  const edge=[];for(let i=0;i<=nx;i++)edge.push(i);for(let j=1;j<=nz;j++)edge.push(j*(nx+1)+nx);for(let i=nx-1;i>=0;i--)edge.push(nz*(nx+1)+i);for(let j=nz-1;j>0;j--)edge.push(j*(nx+1));
  for(let i=0;i<edge.length;i++){const n=edge[i],k=edge[(i+1)%edge.length];ix.push(n,k,n+count,k,k+count,n+count);}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(pos,3));geometry.setIndex(ix);geometry.computeVertexNormals();add(geometry,'roof');geometry.dispose();
  const tile=new T.CylinderGeometry(.085,.085,.38,6,1,true,Math.PI/2,Math.PI);tile.rotateX(Math.PI/2);if(ridgeAlongZ)tile.rotateY(Math.PI/2);
  for(let u=-w/2+.15;u<w/2-.1;u+=.28)for(let v=-d/2+.19;v<d/2-.1;v+=.38){const slope=ridgeAlongZ?(height(u+.02,v)-height(u-.02,v))/.04:(height(u,v+.02)-height(u,v-.02))/.04;add(tile,'tile',[x+u,height(u,v)+.028,z+v],[1,1,1],ridgeAlongZ?[0,0,Math.atan(slope)]:[-Math.atan(slope),0,0]);}tile.dispose();
  if(ridgeAlongZ){for(const side of [-1,1]){
   const g=new T.BufferGeometry(),v=side*(d/2-.45);g.setAttribute('position',new T.Float32BufferAttribute([x-w/2+.45,eave-.13,z+v,x,eave+rise-.12,z+v,x+w/2-.45,eave-.13,z+v],3));g.setIndex(side>0?[0,2,1]:[0,1,2]);g.computeVertexNormals();add(g,'wall');g.dispose();
   for(const sign of [-1,1])beam([x+sign*(w/2-.16),height(sign*(w/2-.16),v)-.12,z+v],[x,eave+rise-.12,z+v],.13,'dark');
   beam([x-w/2+.3,eave-.10,z+v],[x+w/2-.3,eave-.10,z+v],.14,'dark');beam([x,eave-.10,z+v],[x,eave+rise-.12,z+v],.12);
  }}
  else for(const side of [-1,1])beam([x-w/2,height(-w/2,side*d/2)-.05,z+side*d/2],[x+w/2,height(w/2,side*d/2)-.05,z+side*d/2],.13,'dark');
 }
 for(const source of originals){
  frame.position.set(source.x,.62,source.z);frame.rotation.set(0,source.yaw,0);frame.scale.setScalar(1);frame.updateMatrix();
  const small=source.id==='city-21',w=small?5.2:10.6,d=small?3.8:7.9;
  bodies.push({id:source.id,x:source.x,z:source.z,w,d,h:small?2.8:3.3,yaw:source.yaw,scale:1});
  if(small){
   shell(0,0,5.2,3.8,2.65);roof(0,0,6.0,4.7,2.8,.86);
   window(-1.7,1.58,1.98,1.28,1.12);door(.9,1.99,1.38,2.12);
   cube('pale',[-1.7,1.0,2.08],[1.55,.12,.45]);for(const yy of [.45,.85])cube('dark',[-1.7,yy,1.77],[1.24,.07,.13]);
   cube('stone',[.9,.13,2.16],[1.7,.26,.46]);
   // Small side overhang is visible in the source. Its upright remains inside
   // the existing occupied lot, so it introduces no new walking obstruction.
   post(-2.54,1.62,2.35,.10);cube('wood',[-2.54,2.36,.10],[.10,.11,3.35]);
   cube('roof',[-2.6,2.38,.10],[1.0,.13,3.6],[0,0,.15]);
  }else{
   shell(.78,0,8.2,7.9,3.15);roof(.78,0,9.2,8.9,3.3,1.62,true);
   for(const xx of [-1.95,3.5])window(xx,1.73,4.04,1.65,1.55);door(.78,4.05,1.90,2.45);
   cube('stone',[.78,.14,4.10],[2.35,.28,.48]);
   shell(-4.22,.72,2.02,5.95,2.30);roof(-4.22,.72,2.85,6.9,2.44,.65,true);window(-4.22,1.43,3.77,1.25,1.06);
   // Rafter ends and collar ties make the lower-facing gable read as timber.
   for(let u=-3.2;u<4.8;u+=.42)cube('pale',[u,3.18,4.22],[.09,.12,.47]);
   for(const zz of [-3.65,-1.8,0,1.8,3.65])beam([-3.2,2.96,zz],[4.78,2.96,zz],.16,'dark');
  }
  const ref=references.find(p=>p.id===source.id);ref.referenceModel=small?'gate-foot-shop':'outer-gabled-compound';ref.modelInterpretation='原画屋面/门窗关系；尺寸、分格和隐蔽结构为三维补全';
 }
 for(const [key,parts]of buckets){const geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());const mesh=new T.Mesh(geometry,materials[key]);mesh.name='长卷/town/城门邻里/'+key;mesh.userData.assetTemplate='building_source_neighborhood';mesh.userData.sourceIds=[...neighborhoodIds];mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);}box.dispose();rod.dispose();
 const stats={sourceGroups:2,drawables:root.children.length,triangles:root.children.reduce((n,m)=>n+(m.geometry.index?.count??m.geometry.attributes.position.count)/3,0),modelBytesAdded:0};
 let disposed=false;return{root,bodies,originalPlacements:originals,stats,dispose(){if(disposed)return;disposed=true;scene.remove(root);for(const m of root.children)m.geometry.dispose();}};
}
