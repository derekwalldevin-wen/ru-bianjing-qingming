import * as T from 'three';
import {mergeGeometries} from '../vendor/BufferGeometryUtils.js';
import {templateParts} from './period-assets.js';
import {projectSurfaceUV} from './surface-textures.js?v=shore-art-v1';
import {visibleRoofPlan,heroFrames} from './painting-layout.js?v=source-compound-v1';

export const compoundIds=new Set(['city-10','city-11','city-12']);
export function createSourceCompound(scene,materials,colliders,kit){
 materials={...materials};
 const root=new T.Group();root.name='原画建筑/正店复合屋群';scene.add(root);
 const [cx,cz]=heroFrames.market.to,main=visibleRoofPlan.find(p=>p.id==='city-11'),offset=cx-main.x;
 const bodies=[{id:'city-11',x:cx,z:cz,w:16.8,d:7.2,h:6.6,role:'七开间主楼'},{id:'city-10',x:visibleRoofPlan.find(p=>p.id==='city-10').x+offset,z:cz+3.5,w:11.2,d:5.4,h:2.65,role:'左翼'},{id:'city-12',x:visibleRoofPlan.find(p=>p.id==='city-12').x+offset,z:cz+8.5,w:6,d:5.4,h:2.65,role:'右前翼'}];
 const buckets=new Map(),transform=new T.Object3D(),box=new T.BoxGeometry(1,1,1),rod=new T.CylinderGeometry(1,1,1,8),p=new T.Vector3(),q=new T.Vector3();
 function add(geometry,key,position,scale=[1,1,1],rotation=[0,0,0],keepUV=false){transform.position.set(...position);transform.scale.set(...scale);transform.rotation.set(...rotation);transform.updateMatrix();const g=geometry.index?geometry.toNonIndexed():geometry.clone();for(const key of Object.keys(g.attributes))if(!['position','normal',...(keepUV?['uv']:[])].includes(key))g.deleteAttribute(key);g.applyMatrix4(transform.matrix);if(!keepUV)projectSurfaceUV(g,materials[key]);if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(g);}
 const cube=(key,pos,size,rot)=>add(box,key,pos,size,rot);
 function beam(a,b,width,key='wood'){p.fromArray(a);q.fromArray(b);const length=p.distanceTo(q);transform.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),q.sub(p).normalize());const rotation=[transform.rotation.x,transform.rotation.y,transform.rotation.z];add(box,key,p.add(new T.Vector3(...b)).multiplyScalar(.5).toArray(),[width,length,width],rotation);}
 function post(x,z,bottom,top,width=.15){cube('wood',[x,(bottom+top)/2,z],[width,top-bottom,width]);}
 function rail(ax,az,bx,bz,y){const length=Math.hypot(bx-ax,bz-az),steps=Math.ceil(length/.45);for(let i=0;i<=steps;i++){const t=i/steps;post(ax+(bx-ax)*t,az+(bz-az)*t,y+.09,y+.92,i===0||i===steps?.10:.05);}for(const dy of [.16,.91])beam([ax,y+dy,az],[bx,y+dy,bz],dy>.5?.095:.07,'dark');}
 function lattice(x,y,z,w,h){cube('dark',[x,y,z],[w,.065,h],[Math.PI/2,0,0]);for(let i=0;i<=Math.ceil(w/.22);i++){const u=-w/2+i*w/Math.ceil(w/.22);cube('pale',[x+u,y,z+.045],[.035,h,.04]);}for(const dy of [-h/2,0,h/2])cube('wood',[x,y+dy,z+.055],[w+.08,.065,.07]);}
 function shell(b,levels=1){const y=.62;cube('stone',[b.x,y+.075,b.z],[b.w+.12,.15,b.d+.12]);cube('wall',[b.x,y+b.h/2,b.z-b.d/2],[b.w,b.h,.16]);for(const side of [-1,1])cube('wall',[b.x+side*b.w/2,y+b.h/2,b.z],[.16,b.h,b.d]);
  const bays=levels===2?7:Math.max(3,Math.round(b.w/2.2));
  for(let i=0;i<=bays;i++){const x=b.x-b.w/2+i*b.w/bays;post(x,b.z+b.d/2,y,y+b.h);post(x,b.z-b.d/2,y,y+b.h);for(const yy of [y+2.7,...(levels===2?[y+3.3,y+6.15]:[])])cube('dark',[x,yy,b.z+b.d/2],[.28,.13,.30]);}
  for(const yy of levels===2?[y+.13,y+3.25,y+6.55]:[y+.13,y+b.h-.12]){cube('wood',[b.x,yy,b.z+b.d/2],[b.w+.15,.18,.18]);cube('wood',[b.x,yy,b.z-b.d/2],[b.w+.15,.18,.18]);}
  if(levels===2){cube('dark',[b.x,y+3.3,b.z],[b.w,.18,b.d]);for(let i=0;i<7;i++)lattice(b.x-b.w/2+(i+.5)*b.w/7,y+4.95,b.z+b.d/2+.03,1.7,1.45);}
  else{for(let i=0;i<bays;i++){const x=b.x-b.w/2+(i+.5)*b.w/bays;if(i===Math.floor(bays/2)){cube('dark',[x,y+1.05,b.z+b.d/2+.02],[1.25,2.1,.10]);for(const side of [-1,1])cube('pale',[x+side*.57,y+1.05,b.z+b.d/2+.10],[.075,2.1,.07]);cube('stone',[x,y+.10,b.z+b.d/2+.17],[1.6,.20,.33]);}else lattice(x,y+1.62,b.z+b.d/2+.03,Math.min(1.5,b.w/bays-.4),1.15);}}
 }
 function roof(x,z,w,d,eave,rise,gabled=false){
  const height=(xx,zz)=>.62+eave+rise*Math.pow(Math.max(0,gabled?1-Math.abs(xx)/(w/2):Math.min(1-Math.abs(zz)/(d/2),(w/2-Math.abs(xx))/(d*.47))),1.3)+.075*Math.pow(Math.abs(xx)/(w/2),8)+.05*Math.pow(Math.abs(zz)/(d/2),8);
  const nx=40,nz=20,positions=[],indices=[];
  for(const lower of [0,1])for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){const xx=-w/2+i*w/nx,zz=-d/2+j*d/nz;positions.push(x+xx,height(xx,zz)-lower*.12,z+zz);}
  const count=(nx+1)*(nz+1);for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+1,c=a+nx+1,e=c+1;indices.push(a,c,b,b,c,e,a+count,b+count,c+count,b+count,e+count,c+count);}
  const boundary=[];for(let i=0;i<=nx;i++)boundary.push(i);for(let j=1;j<=nz;j++)boundary.push(j*(nx+1)+nx);for(let i=nx-1;i>=0;i--)boundary.push(nz*(nx+1)+i);for(let j=nz-1;j>0;j--)boundary.push(j*(nx+1));for(let i=0;i<boundary.length;i++){const a=boundary[i],b=boundary[(i+1)%boundary.length];indices.push(a,b,a+count,b,b+count,a+count);}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();add(geometry,'roof',[0,0,0]);geometry.dispose();
  const tile=new T.CylinderGeometry(.10,.10,.46,6,1,true,Math.PI/2,Math.PI);tile.rotateX(Math.PI/2);if(gabled)tile.rotateY(Math.PI/2);
  // Raised tile channels follow each slope; bounded shared material batches.
  for(let xx=-w/2+.18;xx<w/2-.1;xx+=.30)for(let zz=-d/2+.23;zz<d/2-.1;zz+=.46){const slope=gabled?(height(xx+.02,zz)-height(xx-.02,zz))/.04:(height(xx,zz+.02)-height(xx,zz-.02))/.04;add(tile,'tile',[x+xx,height(xx,zz)+.035,z+zz],[1,1,1],gabled?[0,0,Math.atan(slope)]:[-Math.atan(slope),0,0]);}tile.dispose();
  for(const side of [-1,1])for(let i=0;i<40;i++){const xx=-w/2+i*w/40,next=-w/2+(i+1)*w/40;beam([x+xx,height(xx,side*d/2)-.045,z+side*d/2],[x+next,height(next,side*d/2)-.045,z+side*d/2],.115,'dark');}
  if(gabled){for(const side of [-1,1]){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([x-w/2+.6,.62+eave-.02,z+side*(d/2-.6),x,.62+eave+rise-.06,z+side*(d/2-.6),x+w/2-.6,.62+eave-.02,z+side*(d/2-.6)],3));g.setIndex(side>0?[0,2,1]:[0,1,2]);g.computeVertexNormals();add(g,'wall',[0,0,0]);g.dispose();}}
 }
 for(const b of bodies){shell(b,b.id==='city-11'?2:1);roof(b.x,b.z,b.w+2.4,b.d+1.8,b.id==='city-11'?6.55:2.75,b.id==='city-11'?1.8:1.05,b.id==='city-10');colliders.push({x:b.x,z:b.z,w:b.w/2+.15,d:b.d/2+.15,sourceCompound:b.id});}
 const floor=.62+3.3,front=cz+5.6;cube('pale',[cx,floor,cz+4.55],[17.8,.16,2.25]);rail(cx-8.85,front,cx+8.85,front,floor);for(const side of [-1,1])rail(cx+side*8.85,cz+3.5,cx+side*8.85,front,floor);for(const dx of [-8.4,-3.6,3.6,8.4])post(cx+dx,cz+5.2,.62,floor-.1,.19);
 // Side stair is an architectural reconstruction, not a new walking layer.
 const stairX=bodies[2].x-3.85,topZ=cz+5.1,steps=14;cube('pale',[(cx-8.5+stairX)/2,floor,topZ],[Math.abs(cx-8.5-stairX)+1.2,.16,1.2]);
 for(let i=0;i<steps;i++){const z=topZ+(steps-i)*.42,y=.62+(i+1)*3.3/steps;cube('wood',[stairX,y-.075,z],[1.2,.15,.45]);for(const side of [-1,1])if(i%2===0){post(stairX+side*.55,z,y,y+.8,.06);if(i<steps-2)beam([stairX+side*.55,y+.8,z],[stairX+side*.55,y+.8+2*3.3/steps,z-.84],.065);}}
 colliders.push({x:stairX,z:topZ+3.1,w:.77,d:3.3,sourceCompound:'side-stair'});
 for(const dx of [-8.4,-3.6,3.6,8.4])colliders.push({x:cx+dx,z:cz+5.2,w:.12,d:.12,sourceCompound:'gallery-post'});
 const staticPeople=[];
 for(const [i,dx]of [-6,-2.4,2.4,6].entries()){const role=i%2?'scholar':'woman',y=floor+.083,z=cz+4.65;staticPeople.push({role,x:cx+dx,y,z,interpretation:'楼上静置人物为场景演绎'});for(const part of templateParts(kit.templates.get('person_'+role))){const key='figure/'+part.material.uuid;materials[key]=part.material;const g=part.geometry.clone().applyMatrix4(part.matrix);add(g,key,[cx+dx,y,z],[1,1,1],[0,0,0],true);g.dispose();}}
 const canvas=document.createElement('canvas');canvas.width=128;canvas.height=256;const context=canvas.getContext('2d');context.fillStyle='#d0b98c';context.fillRect(0,0,128,256);context.strokeStyle='#6c4d2d';context.lineWidth=6;context.strokeRect(7,7,114,242);context.fillStyle='#332e25';context.textAlign='center';context.font='70px SimSun';context.fillText('正',64,108);context.fillText('店',64,204);const signTexture=new T.CanvasTexture(canvas);signTexture.colorSpace=T.SRGBColorSpace;const sign=new T.Mesh(new T.PlaneGeometry(.74,1.5),new T.MeshStandardMaterial({map:signTexture,roughness:.94,side:T.DoubleSide}));sign.name='长卷/town/正店招幌';sign.position.set(cx+9.55,2.68,cz+7.3);sign.userData.assetTemplate='building_compound';sign.castShadow=true;root.add(sign);
 colliders.push({x:cx+9.75,z:cz+7.3,w:.58,d:.14,sourceCompound:'sign'});
 cube('dark',[cx+9.98,2.68,cz+7.26],[.09,1.8,.1]);beam([cx+9.98,3.5,cz+7.26],[cx+8.98,3.5,cz+7.26],.07);
 for(const [key,parts]of buckets){const geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());const mesh=new T.Mesh(geometry,materials[key]);mesh.name='长卷/town/正店屋群/'+key;mesh.userData.assetTemplate='building_compound';mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);}box.dispose();rod.dispose();
 const placements=bodies.map(b=>{const source=visibleRoofPlan.find(p=>p.id===b.id);return{...b,y:.62,yaw:0,scale:1,source:source.source,reference:source.reference,nativeAnchor:source.nativeAnchor,evidence:'original-visible',referenceModel:'source-compound',depthAdjustment:b.z-source.z,longitudinalAdjustment:b.x-source.x};});
 const stats={sourceGroups:3,bays:7,storeys:2,sideWings:2,staticPeople:staticPeople.length,modelBytesAdded:0,drawables:root.children.length,triangles:root.children.reduce((n,o)=>n+(o.geometry.index?.count??o.geometry.attributes.position.count)/3,0)};
 let disposed=false;return {root,placements,bodies,stats,staticPeople,dispose(){if(disposed)return;disposed=true;scene.remove(root);root.traverse(o=>{if(o.isMesh)o.geometry.dispose();});sign.material.dispose();signTexture.dispose();}};
}
