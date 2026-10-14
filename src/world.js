import * as T from 'three';
import {mergeGeometries} from '../vendor/BufferGeometryUtils.js';
import {createLighting} from './lighting.js';
import {createRiver} from './river.js';
import {applySurfaceTextures,projectSurfaceUV} from './surface-textures.js';
import {createDetailBuilder} from './details.js';
import {createAssetInstances,createAssetObject,prepareAssetKit,disposeAssetScene,replaceObjectVisual} from './period-assets.js';
import {createPeriodCrowd} from './period-crowd.js';
import {circleHitsBox} from './crowd-motion.js';
import {createCloseupDetails,closeupFloor} from './closeup-details.js';
import {createFeaturedFrontage} from './featured-frontage.js';
import {fitCartToGround} from './cart-grounding.js';
import {createTerrainSupport} from './terrain-support.js';
import {createLandscape} from './landscape.js';
import {expandedWalkBounds} from './landscape-layout.js';

export const bridgeHeight=z=>.68+4.7*Math.max(0,1-(z/13.5)**2);
export function createWorld(scene,kit){
 if(!kit)throw new Error('Blender asset kit must load before constructing the street.');
 let seed=927;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const mat=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.92,...extra});
 const m={wood:mat('#705039'),dark:mat('#48382c'),pale:mat('#a88c61'),wall:mat('#bcb095'),wall2:mat('#b5a388'),roof:mat('#585c59'),tile:mat('#767a70'),stone:mat('#918676'),ground:mat('#9d906e'),road:mat('#b9a57f'),grass:mat('#727853'),leaf:mat('#6d7c51'),leaf2:mat('#7c8959'),cloth:mat('#c2b696',{side:T.DoubleSide}),red:mat('#824b37'),straw:mat('#a08a54'),waterline:mat('#747957'),jar:mat('#81604a'),window:mat('#c5a971',{emissive:'#b57a32',emissiveIntensity:.08}),paving:mat('#978e7e'),rut:mat('#5f503e',{transparent:true,opacity:.23,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}),metal:mat('#504b41',{metalness:.4,roughness:.8}),ceramic:mat('#789086',{roughness:.4}),lantern:mat('#d7bd89',{emissive:'#ffb452',emissiveIntensity:.15})};
 const surfaces=applySurfaceTextures(m),batches=new Map(),placements=new Map(),colliders=[],boats=[],flags=[],persons=[];
 const box=new T.BoxGeometry(1,1,1),cylinder=new T.CylinderGeometry(1,1,1,8),orb=new T.IcosahedronGeometry(1,1),dummy=new T.Object3D();
 function add(geometry,material,pos,scale=[1,1,1],rotation=[0,0,0]){
  dummy.position.set(...pos);dummy.scale.set(...scale);dummy.rotation.set(...rotation);dummy.updateMatrix();
  if(!batches.has(material))batches.set(material,[]);
  const part=geometry.index?geometry.toNonIndexed():geometry.clone();
  for(const key of Object.keys(part.attributes))if(!['position','normal'].includes(key))part.deleteAttribute(key);
  part.applyMatrix4(dummy.matrix);projectSurfaceUV(part,material);batches.get(material).push(part);
 }
 const cube=(ma,p,s,r)=>add(box,ma,p,s,r),post=(ma,p,r,h)=>add(cylinder,ma,p,[r,h,r]);
 function beam(a,b,w,ma=m.wood){const av=new T.Vector3(...a),bv=new T.Vector3(...b);dummy.position.copy(av).add(bv).multiplyScalar(.5);dummy.scale.set(w,av.distanceTo(bv),w);dummy.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),bv.sub(av).normalize());cube(ma,dummy.position.toArray(),dummy.scale.toArray(),[dummy.rotation.x,dummy.rotation.y,dummy.rotation.z]);}
 function place(name,x,z,{y=.62,yaw=0,scale=1,...data}={}){if(!placements.has(name))placements.set(name,[]);const p={x,y,z,yaw,scale,...data};placements.get(name).push(p);return p;}
 function collision(x,z,w,d){colliders.push({x,z,w,d});}
 // Dirt streets, worn local landings and earth revetments, not a paved boulevard.
 for(const side of [-1,1]){
  cube(m.ground,[0,.03,side*47],[255,1.08,73]);
  const g=new T.PlaneGeometry(228,9.6,114,12);g.rotateX(-Math.PI/2);
  const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,.605+Math.sin(x*.14+z*.7)*.012+Math.sin(x*1.3+z*2)*.008);}g.computeVertexNormals();add(g,m.road,[0,0,side*16.7]);
  for(let x=-122;x<=122;x+=2.1){
   const quay=(x>-55&&x<-23)||(x>29&&x<51)||Math.abs(x)<5,edge=10.75+Math.sin(x*.21)*.13;
   if(quay){cube(m.stone,[x,.27,side*edge],[1.97,.66,.75],[0,(rnd()-.5)*.045,0]);cube(m.paving,[x,.62,side*11.25],[1.94,.12,.68]);}
   else {cube(m.ground,[x,.15,side*10.86],[2.13,.68,.85],[side*.22,0,0]);if(Math.round(x)%3===0)post(m.dark,[x,.42,side*10.45],.09,.82);}
   if(Math.abs(x)>7&&rnd()>.54)for(let n=0;n<3;n++){const bx=x+rnd()*.9,bz=side*(10.8+rnd()*.6);beam([bx,.5,bz],[bx+.15,.9+rnd()*.48,bz+side*.1],.018,m.grass);}
  }
  cube(m.paving,[0,.627,side*14.55],[6.3,.03,2.1]);
  for(const track of [-.67,.67]){
   const pos=[],idx=[];for(let i=0;i<=220;i++){const x=-110+i,z=side*16.5+track+Math.sin(x*.085)*.15,w=.06+.02*Math.sin(x*.47);pos.push(x,.634,z-w,x,.634,z+w);if(i<220){const j=i*2;idx.push(j,j+1,j+2,j+1,j+3,j+2);}}
   const rut=new T.BufferGeometry();rut.setAttribute('position',new T.Float32BufferAttribute(pos,3));rut.setIndex(idx);rut.computeVertexNormals();add(rut,m.rut,[0,0,0]);
  }
  for(let i=0;i<170;i++)add(orb,m.stone,[-108+rnd()*216,.61,side*(20+rnd()*1.5)],[.035+rnd()*.075,.025+rnd()*.02,.04+rnd()*.065]);
 }
 const dimensions={building_shop:[8,6],building_workshop:[9,7],building_thatch:[9,7],building_tea:[12,9]};let buildingCount=0;
 function houseGround(x,z,w,d){
  // The existing bank is 0.57m, while exported foundations and the stable
  // navigation datum start at 0.62m. A visible earth shoulder supports the
  // building instead of leaving a 5cm air gap below its frontage. Its taper
  // stays within the already blocked 0.28m visitor margin.
  const edge=.18,xs=[-w-edge,-w,0,w,w+edge],zs=[-d-edge,-d,0,d,d+edge],positions=[],indices=[];
  for(let j=0;j<5;j++)for(let i=0;i<5;i++)positions.push(x+xs[i],i===0||i===4||j===0||j===4?.57:.62,z+zs[j]);
  for(let j=0;j<4;j++)for(let i=0;i<4;i++){const a=j*5+i;indices.push(a,a+5,a+6,a,a+6,a+1);}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();add(geometry,m.road,[0,0,0]);geometry.dispose();
 }
 function house(name,x,z,scale=1){place(name,x,z,{yaw:z>0?Math.PI:0,scale});const [w,d]=dimensions[name],halfWidth=w*scale/2+.15,halfDepth=d*scale/2+.15;collision(x,z,halfWidth,halfDepth);houseGround(x,z,halfWidth,halfDepth);buildingCount++;}
 // Reference-based frontages, staggered side lanes and courtyards.
 house('building_workshop',23,25,1.17);house('building_tea',-29,-26,1);house('building_thatch',-66,-25,1.04);
 for(const side of [-1,1]){
  const front=[-98,-84,-52,-39,-12,11,40,54,68,82,98];
  for(let i=0;i<front.length;i++){const x=front[i]+(rnd()-.5)*1.6;if((side===1&&Math.abs(x-23)<13)||(side===-1&&(Math.abs(x+29)<12||Math.abs(x+66)<13)))continue;house(x<-58?'building_thatch':i%4===1?'building_workshop':'building_shop',x,side*(24.8+rnd()*1.8),.87+rnd()*.22);}
  for(let row=0;row<2;row++)for(let i=0;i<13;i++){
   if((i+row)%7===3)continue;const x=-100+i*16+(row%2)*4+(rnd()-.5)*4;if(x>75&&side<0)continue;
   house(x<-60?'building_thatch':(i+row)%6===0?'building_tea':i%3===0?'building_workshop':'building_shop',x,side*(37+row*14+rnd()*2),.9+rnd()*.2);
   if(i%3===0){const z=side*(33+row*14);cube(m.wall,[x+6,1.28,z],[.3,1.3,6]);cube(m.dark,[x+6,1.98,z],[.4,.11,6.2]);collision(x+6,z,.2,3.1);}
  }
 }
 place('building_gate',88,-43,{yaw:Math.PI/2});collision(88,-48,4,2);collision(88,-38,4,2);houseGround(88,-48,4,2);houseGround(88,-38,4,2);buildingCount++;
 const bridgeObject=createAssetObject(kit,'bridge');scene.add(bridgeObject);
 // Bridge-end bird standards are visible in the painting; function is debated.
 for(const side of [-1,1])for(const x of [-4.35,4.35]){const z=side*12.6;post(m.pale,[x,4.65,z],.095,8.1);beam([x-1,7.4,z],[x+1,7.4,z],.08);beam([x,7.7,z-.5],[x,7.7,z+.5],.065);add(orb,m.pale,[x,8.83,z],[.24,.11,.10]);beam([x+.15,8.85,z],[x+.2,9.1,z],.045,m.pale);beam([x+.18,9.1,z],[x+.38,9.08,z],.035,m.dark);}
 const details=createDetailBuilder({add,cube,post,beam,m}),lanternLocations=details.lanterns();
 for(const [x,y,z] of lanternLocations)collision(x-.55,z,.10,.10);
 const stallLocations=[];
 for(let i=0;i<23;i++){const x=-89+i*8.1;if(Math.abs(x)<8)continue;const z=(i%2?1:-1)*(19.6+(i%3)*.24);place(i%4===0?'stall_cloth':'stall_produce',x,z,{yaw:z>0?Math.PI:0,scale:.82+(i%3)*.08});collision(x,z,1.5,1);stallLocations.push({x,z});}
 for(const side of [-1,1]){
  const x=side*2.2,z=side*5.4,y=bridgeHeight(z)+.11;
  cube(m.wood,[x,y+.72,z],[1.1,.09,1.25]);for(const dx of [-.43,.43])for(const dz of [-.48,.48])cube(m.dark,[x+dx,y+.34,z+dz],[.065,.68,.065]);
  cube(m.cloth,[x,y+.78,z],[1.05,.025,1.21]);for(let j=0;j<6;j++)add(orb,m.straw,[x+(j%2-.5)*.34,y+.88,z+(Math.floor(j/2)-1)*.33],[.15,.1,.13]);collision(x,z,.70,.74);
 }
 // Paper/cloth parasols are a conspicuous original-painting market detail.
 for(let i=1;i<stallLocations.length;i+=4){
  const {x,z}=stallLocations[i],px=x+1.9,pz=z+Math.sign(z)*.45,r=1.35;
  post(m.wood,[px,1.91,pz],.045,2.58);
  collision(px,pz,.07,.07);
  const pos=[0,.57,0],idx=[];
  for(let j=0;j<=24;j++){const a=j/24*Math.PI*2;pos.push(Math.cos(a)*r,Math.cos(a*12)*.045,Math.sin(a)*r);if(j<24)idx.push(0,j+2,j+1);}
  const umbrella=new T.BufferGeometry();umbrella.setAttribute('position',new T.Float32BufferAttribute(pos,3));umbrella.setIndex(idx);umbrella.computeVertexNormals();add(umbrella,m.cloth,[px,3.08,pz]);
  for(let j=0;j<12;j++){const a=j*Math.PI/6;beam([px,3.6,pz],[px+Math.cos(a)*r,3.08,pz+Math.sin(a)*r],.018,m.pale);}
 }
 // Boarded landing stages with visible supports, worn crates and mooring posts.
 for(const x of [-40,42]){
  for(let k=0;k<9;k++)cube(m.pale,[x,.59,6.8+k*.44],[8,.15,.40]);
  for(const dx of [-3.65,3.65])for(const z of [7,10.35]){post(m.dark,[x+dx,.24,z],.14,1.5);post(m.wood,[x+dx,.99,z],.13,.6);}
  for(const dx of [-3.3,3.3])beam([x+dx,-.15,7],[x+dx,.5,10],.12);
  for(let j=0;j<3;j++){cube(m.wood,[x-2+j*1.2,.98,10],[1,.65,.75]);for(const dy of [-.20,.20])cube(m.dark,[x-2+j*1.2,.98+dy,9.61],[1.02,.04,.03]);}
 }
 function sign(x,z,text){
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=256;const ctx=canvas.getContext('2d');ctx.fillStyle='#bca783';ctx.fillRect(0,0,128,256);ctx.strokeStyle='#5e4733';ctx.lineWidth=5;ctx.strokeRect(7,7,114,242);ctx.fillStyle='#322c24';ctx.font='44px SimSun';ctx.textAlign='center';[...text].forEach((c,i)=>ctx.fillText(c,64,73+i*63));const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const mesh=new T.Mesh(new T.PlaneGeometry(.7,1.4),new T.MeshStandardMaterial({map:texture,roughness:1,side:T.DoubleSide}));mesh.position.set(x,3.2,z);scene.add(mesh);flags.push({mesh,x});post(m.dark,[x-.48,2.7,z],.055,4.4);beam([x-.48,4.12,z],[x+.4,4.12,z],.06);
 }
 sign(25,20.5,'茶');sign(-26,-20,'酒');sign(55,-20.5,'布帛');sign(-64,-20.5,'食');
 for(const [x,z] of [[25,20.5],[-26,-20],[55,-20.5],[-64,-20.5]])collision(x-.48,z,.08,.08);
 [[-51,12.3],[-12,-12.8],[39,12.4],[74,-12.5],[-84,12.7],[13,35],[-49,-36],[5,54],[-70,37],[50,-37]].forEach(([x,z],i)=>place(i%3===0?'tree_bare':'tree_willow',x,z,{scale:.82+rnd()*.27,yaw:rnd()*6.28}));
 for(const side of [-1,1])for(let i=0;i<24;i++)place(i%3===0?'tree_bare':'tree_willow',-118+i*10+rnd()*3,side*(66+rnd()*9),{scale:.78+rnd()*.35,yaw:rnd()*6.28});
 place('cart_ox',59,-16.3,{yaw:Math.PI/2});collision(59,-16.3,3.2,1.12);place('cart_hand',-57,18.3,{yaw:-Math.PI/2});collision(-57,18.3,1.8,.85);place('cart_hand',-35,-18.4,{yaw:Math.PI/2,scale:.9});collision(-35,-18.4,1.6,.8);place('cart_ox',77,18.4,{yaw:-Math.PI/2,scale:.92});collision(77,18.4,3,1.1);
 const river=createRiver(scene);
 function boat(name,x,z,size,moving=false){const g=createAssetObject(kit,name);g.position.set(x,.17,z);g.scale.setScalar(size);scene.add(g);const worker=createAssetObject(kit,'person_boatman');worker.position.set(name==='boat_cargo'?3.6:2.1,.75,.15);worker.rotation.y=Math.PI/2;g.add(worker);boats.push({g,worker,name,x,z,moving,phase:rnd()*6});}
 boat('boat_cargo',-38,4.8,1);boat('boat_cargo',42,4.8,.92);boat('boat_cargo',-23,-5.8,1.06);boat('boat_cargo',8,-1.8,.96,true);boat('boat_skiff',72,1.9,1,true);
 const roles=['vendor','porter','vendor','scholar','porter','vendor','woman','vendor','boatman','child','vendor','scholar'];
 function person(role,x,z,data={}){persons.push({role,x,z,scale:.95+rnd()*.1,phase:rnd()*6.28,activity:'stand',yaw:0,...data});}
 for(let i=0;i<36;i++){const z=-11+rnd()*22,walking=i<22,x=walking?(i%2?-.75:.75):(i%2?-2.7:2.7);if(!walking&&Math.abs(z-(x>0?5.4:-5.4))<2)continue;person(['vendor','scholar','woman','vendor','child'][i%5],x,z,{bridge:true,activity:walking?'walk':'observe',start:-11.5,end:11.5,offset:z+11.5,speed:.18+rnd()*.15,yaw:walking?0:x>0?Math.PI/2:-Math.PI/2});}
 for(const side of [-1,1])for(let i=0;i<68;i++){const x=-96+rnd()*192,walking=i<46,z=side*(i%2?13.6:14.9);person(roles[(i+side+12)%roles.length],x,walking?z:side*(18+rnd()*.7),{activity:walking?'walk':'stand',start:-96,end:96,offset:x+96,speed:.2+rnd()*.22,yaw:walking?Math.PI/2:(rnd()>.5?0:Math.PI)});}
 for(const {x,z} of stallLocations){person('vendor',x,z+Math.sign(z)*.85,{yaw:z>0?Math.PI:0});person('porter',x-1.1,z-Math.sign(z)*1.7,{yaw:z>0?0:Math.PI});}
 for(const [x,z] of [[53,-18.5],[54.2,-18.7],[24,19.1],[21.7,18.9],[-28,-18.2],[-29.2,-18]])person('scholar',x,z,{yaw:rnd()*6.28});
 // Actual lower model geometry, including cart shafts, stall legs and trunks,
 // defines the footprint. Roofs/canopies above head height are not roadblocks.
 for(const [name,items] of placements){
  if(name.startsWith('building_'))continue;
  const root=kit.templates.get(name),bounds=new T.Box3(),vertex=new T.Vector3();root.updateWorldMatrix(true,true);
  for(const item of items){
   bounds.makeEmpty();dummy.position.set(item.x,item.y,item.z);dummy.rotation.set(0,item.yaw,0);dummy.scale.setScalar(item.scale);dummy.updateMatrix();
   const proxy=kit.collisionBounds?.[name];
   if(proxy){
    // High-detail canonical low-height bounds, available before any download.
    // An enhanced hull, cart shaft or trunk cannot grow into a free walkway.
    for(const x of [proxy[0][0],proxy[1][0]])for(const z of [proxy[0][1],proxy[1][1]])bounds.expandByPoint(vertex.set(x,0,z).applyMatrix4(dummy.matrix));
   }else root.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){vertex.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);if(vertex.y>2.1)continue;vertex.applyMatrix4(dummy.matrix);bounds.expandByPoint(vertex);}});
   if(!bounds.isEmpty())collision((bounds.min.x+bounds.max.x)/2,(bounds.min.z+bounds.max.z)/2,(bounds.max.x-bounds.min.x)/2+.03,(bounds.max.z-bounds.min.z)/2+.03);
  }
 }
 function clearPerson(x,z,r,p){
  if(p.bridge){if(Math.abs(x)+r>2.91||Math.abs(z)>11.5)return false;}
  else{const bank=z*Math.sign(p.z);if(Math.abs(x)+r>103||bank<11.9+r||bank>21.4-r)return false;}
  return !colliders.some(c=>circleHitsBox(x,z,r+.035,c));
 }
 const closeups=createCloseupDetails(scene,kit,colliders);
 const landscape=createLandscape(scene,{materials:m,colliders});
 const supportMaterials=new Set([m.ground,m.road,m.stone,m.paving]),terrainSupport=createTerrainSupport([...batches].filter(([material])=>supportMaterials.has(material)).flatMap(([,geometries])=>geometries));
 function contactFloor(x,z){const stable=floor(x,z);if(Math.abs(x)<3.2&&Math.abs(z)<13.5||closeupFloor(x,z,.62)>.62)return stable;return terrainSupport.height(x,z)??stable;}
 const crowd=createPeriodCrowd(scene,kit,persons,bridgeHeight,clearPerson,floor,contactFloor,(surface,matrix)=>terrainSupport.clearanceMesh(surface,matrix)),assetBatches=createAssetInstances(scene,kit,placements);
 const teaFrontage=createFeaturedFrontage(scene,placements);
 const grassFrontage=createFeaturedFrontage(scene,placements,{template:'building_thatch',anchor:[-66,-25],detail:'detail_grass_frontage'});
 const cartObservation=createFeaturedFrontage(scene,placements,{template:'cart_ox',anchor:[59,-16.3],detail:'detail_ox_cart',verticalOffset:-.007,prepare:group=>fitCartToGround(group,scene)});
 for(const [material,geometries] of batches){const mesh=new T.Mesh(mergeGeometries(geometries),material);mesh.name='街巷/岸坡与细部';mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);geometries.forEach(g=>g.dispose());}batches.clear();
 const lighting=createLighting(scene,m,river.material,lanternLocations);
 const enhancedKinds=new Set();let assetQuality='standard',anisotropy=4,boatDetailVisible=false;
 function setBoatDetailVisible(refined){
  if(!enhancedKinds.has('boatdetail'))return false;
  const visual=createAssetObject(kit,refined?'detail_cargo_boat':'boat_cargo');
  replaceObjectVisual(boats[0].g,visual,[boats[0].worker]);
  boats[0].worker.position.set(...(refined?[3.98,.665,.17]:[3.6,.75,.15]));boatDetailVisible=refined;return true;
 }
 function upgradeAsset(kind,nextScene){
  if(!['architecture','bridge','life','closeup','boatdetail','teadetail','grassdetail','cartdetail'].includes(kind))throw new Error('Unsupported visual enhancement '+kind);
  if(enhancedKinds.has(kind)){disposeAssetScene(nextScene,[scene,...Object.values(kit.scenes)]);return;}
  const previous=kit.scenes[kind],candidate=prepareAssetKit({...kit.scenes,[kind]:nextScene},kit.collisionBounds);
  candidate.setQuality(assetQuality,anisotropy);
  if(kind==='architecture'||kind==='life'){
   const selected=new Map([...placements].filter(([name])=>name.startsWith('building_')===(kind==='architecture')));
   const staging=new T.Group(),nextBatches=createAssetInstances(staging,candidate,selected);
   const oldBatches=assetBatches.filter(mesh=>[...selected.keys()].some(name=>mesh.name.startsWith(`精修/${name}/`)));
   const nextBoats=kind==='life'?boats.map((b,i)=>i===0&&boatDetailVisible?null:createAssetObject(candidate,b.name)):[];
   if(kind==='architecture'){teaFrontage.replaceBatches(nextBatches,oldBatches);grassFrontage.replaceBatches(nextBatches,oldBatches);}
   else cartObservation.replaceBatches(nextBatches,oldBatches);
   // All construction and validation succeeded. Commit synchronously between
   // frames; crowd, collision proxies, clock and group transforms never reset.
   for(const mesh of oldBatches){scene.remove(mesh);mesh.dispose();assetBatches.splice(assetBatches.indexOf(mesh),1);}
   for(const mesh of nextBatches){scene.add(mesh);assetBatches.push(mesh);}
   nextBoats.forEach((g,i)=>{if(g)replaceObjectVisual(boats[i].g,g,[boats[i].worker]);});
  }else if(kind==='teadetail')teaFrontage.apply(candidate,assetBatches);
  else if(kind==='grassdetail')grassFrontage.apply(candidate,assetBatches);
  else if(kind==='cartdetail')cartObservation.apply(candidate,assetBatches);
  else if(kind==='bridge')replaceObjectVisual(bridgeObject,createAssetObject(candidate,'bridge'));
  else if(kind==='boatdetail'){
   const visual=createAssetObject(candidate,'detail_cargo_boat');
   replaceObjectVisual(boats[0].g,visual,[boats[0].worker]);
   // The refined working deck is a visible surface, rather than an invisible
   // height offset; its top is 0.660m in the boat's local coordinate system.
   boats[0].worker.position.set(3.98,.665,.17);boatDetailVisible=true;
  }
  else closeups.replaceVisuals(candidate);
  Object.assign(kit,candidate);enhancedKinds.add(kind);
  disposeAssetScene(previous,[scene,...Object.values(kit.scenes)]);
 }
 function update(time,dt,reduced,night,camera,visitor){closeups.update(camera);lighting.update(time,dt,night,reduced,camera);landscape.update(lighting.dusk);for(const b of boats){b.g.position.y=.17+(reduced?0:Math.sin(time*.6+b.phase)*.025);b.g.position.x=b.moving&&!reduced?((b.x+time*.36+108)%216)-108:b.x;}river.update(dt,reduced,boats,lighting);crowd.update(time,reduced,camera,visitor);for(const f of flags)f.mesh.rotation.y=reduced?0:Math.sin(time*.7+f.x)*.025;}
 function valid(x,z){if(Math.abs(x)>180||Math.abs(z)>104)return false;if(Math.abs(x)>104?!expandedWalkBounds(x,z):Math.abs(z)<11.8&&Math.abs(x)>2.65)return false;return !colliders.some(c=>Math.abs(x-c.x)<c.w+.28&&Math.abs(z-c.z)<c.d+.28);}
 function floor(x,z){return Math.abs(x)<3.2&&Math.abs(z)<13.5?bridgeHeight(z)+.12:closeupFloor(x,z,.62);}
 function canWalk(x,z){return valid(x,z)&&crowd.motion.validVisitor(x,z);}
 function walkSpawn(x,z){for(let ring=0;ring<16;ring++){const n=ring?ring*8:1;for(let i=0;i<n;i++){const xx=x+Math.cos(i/n*Math.PI*2)*ring*.2,zz=z+Math.sin(i/n*Math.PI*2)*ring*.2;if(canWalk(xx,zz))return [xx,zz];}}return null;}
 return {landscape,update,valid,canWalk,walkSpawn,clearPerson,floor,contactFloor,terrainSupport,closeups,teaFrontage,grassFrontage,cartObservation,sun:lighting.sun,lighting,river,surfaces,kit,crowd,placements,boats,colliders,assetBatches,bridgeObject,enhancedKinds,upgradeAsset,setBoatDetailVisible,setTeaDetailVisible:value=>teaFrontage.setVisible(value,assetBatches),setGrassDetailVisible:value=>grassFrontage.setVisible(value,assetBatches),setCartDetailVisible:value=>cartObservation.setVisible(value,assetBatches),setLighting:lighting.configure,setQuality(value,maxAnisotropy){assetQuality=value;anisotropy=maxAnisotropy;closeups.setQuality(value);crowd.setQuality(value);lighting.setQuality(value);river.setQuality(value);landscape.setQuality(value);surfaces.setQuality(value,maxAnisotropy);kit.setQuality(value,maxAnisotropy);},counts:{buildings:buildingCount+landscape.stats.buildings,coreBuildings:buildingCount,landscape:landscape.stats,people:persons.length+boats.length,boats:boats.length,stalls:stallLocations.length+2,vehicles:4,characterTypes:6,assetTemplates:kit.templates.size,style:'原画依据 · Blender精修'}};
}
