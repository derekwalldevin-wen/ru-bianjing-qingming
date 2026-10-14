import * as T from 'three';
import {mergeGeometries} from '../vendor/BufferGeometryUtils.js';
import {projectSurfaceUV} from './surface-textures.js';
import {canalCenter,canalHalfWidth,bankHeight,landscapeBounds} from './landscape-layout.js?v=original-scroll-v1';
import {buildPaintedGate} from './painted-gate.js?v=original-scroll-v1';
import {paintedGate,streetRoute,ruralRoute} from './painting-layout.js?v=original-scroll-v1';
import {installLandscapeInk} from './ink-landscape.js?v=original-scroll-v1';

// Low-cost actual 3D city and mineral-colour mountains. No bitmap backdrop,
// no new GLB, and no second water reflection pass.
export function createLandscape(scene,{materials,colliders}){
 const root=new T.Group();root.name='青绿长卷 · 城郊与远山';scene.add(root);
 let seed=43107;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const buckets=new Map(),matrix=new T.Matrix4(),dummy=new T.Object3D();
 const mats={};for(const key of ['wall','roof','wood','ground','grass']){mats[key]=materials[key].clone();mats[key].vertexColors=true;mats[key].color.set('#ffffff');}
 const palettes={wall:['#c4b79a','#b6aa8e','#d0c3a7'],roof:['#526b63','#677367','#787563'],wood:['#725941','#544739'],ground:['#9d906e','#a39977'],grass:['#687f59','#809768','#4f7965']};
 const box=new T.BoxGeometry(1,1,1),leaf=new T.IcosahedronGeometry(1,0),twig=new T.CylinderGeometry(.45,1,1,5),inkMaterials=[];
 const dot=(i,j)=>{const n=Math.sin(i*137.7+j*79.3+39.7)*43758.5453;return n-Math.floor(n);};
 function add(geometry,key,pos,scale=[1,1,1],rotation=0,color=palettes[key][0],category='town'){
  dummy.position.set(...pos);dummy.scale.set(...scale);Array.isArray(rotation)?dummy.rotation.set(...rotation):dummy.rotation.set(0,rotation,0);dummy.updateMatrix();matrix.copy(dummy.matrix);
  const g=geometry.index?geometry.toNonIndexed():geometry.clone();for(const k of Object.keys(g.attributes))if(!['position','normal'].includes(k))g.deleteAttribute(k);
  g.applyMatrix4(matrix);projectSurfaceUV(g,mats[key]);
  const c=new T.Color(color),a=new Float32Array(g.attributes.position.count*3);for(let i=0;i<a.length;i+=3){a[i]=c.r;a[i+1]=c.g;a[i+2]=c.b;}g.setAttribute('color',new T.BufferAttribute(a,3));
  const cell=category==='town'?`${Math.floor(pos[0]/120)},${Math.floor(pos[2]/120)}`:category;
  const id=`${cell}/${key}`;if(!buckets.has(id))buckets.set(id,{key,category,parts:[]});buckets.get(id).parts.push(g);
 }
 function cube(key,pos,scale,yaw,color,category){add(box,key,pos,scale,yaw,color,category);}
 function strip(rows,key,color,category){
  const p=[],indices=[];for(const row of rows)p.push(...row[0],...row[1]);
  for(let i=0;i<rows.length-1;i++){const j=i*2;indices.push(j,j+1,j+2,j+1,j+3,j+2);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(indices);g.computeVertexNormals();add(g,key,[0,0,0],[1,1,1],0,color,category);g.dispose();
 }
 // Ground overlaps the original bank by only 2cm at the seam. Top of the
 // old core is retained, not covered by a new elevated rectangular slab.
 for(const side of [-1,1]){
  for(const [from,to,inside]of [[-620,-127.5,false],[-127.5,127.5,true],[127.5,620,false]]){
  const rows=[[],[],[]],steps=Math.ceil((to-from)/5);for(let i=0;i<=steps;i++){
   const x=from+(to-from)*i/steps,center=canalCenter(x),width=canalHalfWidth(x);
   const inner=inside?side*83.48:center+side*(width+.36),outer=center+side*(290+32*Math.sin(x*.009+side));
   const y=inside?.57:.62,join=inside?side*87:center+side*(width+4),plateau=center+side*220;
   const points=[[x,y,inner],[x,.62,join],[x,.62,plateau],[x,.2,outer]];
   for(let j=0;j<3;j++)rows[j].push(side>0?[points[j],points[j+1]]:[points[j+1],points[j]]);
  }for(const band of rows)strip(band,'ground','#9c9871',`bank/${side}`);
  }
  // Continuous sloping earth shoulder alongside the canal outside the core.
  for(const direction of [-1,1]){
   const edge=[];for(let n=0;n<=99;n++){const x=direction*(127.5+n*(620-127.5)/99),c=canalCenter(x),w=canalHalfWidth(x),y=.62;
    edge.push(side*direction>0?[[x,.025,c+side*w],[x,y,c+side*(w+.65)]]:[[x,y,c+side*(w+.65)],[x,.025,c+side*w]]);
   }strip(edge,'ground','#899778',`shore/${side}/${direction}`);
  }
  // A level walking street continues beyond the old x=114 road endpoint.
  for(const direction of [-1,1]){const road=[];for(let i=0;i<=35;i++){const x=direction*(114+i*2),c=canalCenter(x),z=c+side*16.7;road.push(direction>0?[[x,.62,z-4.7],[x,.62,z+4.7]]:[[x,.62,z+4.7],[x,.62,z-4.7]]);}strip(road,'ground','#b9a57f',`street/${side}/${direction}`);}
 }
 // A reusable swept eave and gable, small enough for hundreds of roofs.
 const roofPositions=[],roofIndices=[],profile=[[-.59,0],[-.46,.035],[0,.38],[.46,.035],[.59,0]];
 for(const x of [-.57,.57])for(const [z,y]of profile)roofPositions.push(x,y,z);
 for(let j=0;j<4;j++)roofIndices.push(j,j+1,j+5,j+1,j+6,j+5);
 roofIndices.push(0,1,2,0,2,3,0,3,4,5,7,6,5,8,7,5,9,8,0,5,4,4,5,9);
 const roof=new T.BufferGeometry();roof.setAttribute('position',new T.Float32BufferAttribute(roofPositions,3));roof.setIndex(roofIndices);roof.computeVertexNormals();
 const buildings=[],occupied=[...colliders];
 const gateReport=buildPaintedGate({add,cube,colliders,gate:paintedGate});
 // Streets follow the long scroll's narrative axis instead of parallel lots.
 for(const [id,route]of [['city',streetRoute],['rural',ruralRoute]]){
  const rows=[];
  for(let i=1;i<route.length;i++){
   const [ax,az]=route[i-1],[bx,bz]=route[i],length=Math.hypot(bx-ax,bz-az),nx=-(bz-az)/length,nz=(bx-ax)/length;
   const steps=Math.ceil(length/3),width=id==='city'?5.3:2.6;
   for(let k=i===1?0:1;k<=steps;k++){const t=k/steps,extra=i===1&&k===0?-.15:i===route.length-1&&k===steps?.15:0,x=ax+(bx-ax)*t+(bx-ax)/length*extra,z=az+(bz-az)*t+(bz-az)/length*extra;rows.push([[x-nx*width,.624,z-nz*width],[x+nx*width,.624,z+nz*width]]);}
  }
  strip(rows,'ground',id==='city'?'#b5a17c':'#a89c79',`street/${id}`);
 }
 // Rural reed fences and small gardens respect the open space around cottages.
 for(const [x,z,w,d]of [[-256,58,18,9],[-246,62,12,8]]){
  for(let i=0;i<=w;i++){cube('wood',[x-w/2+i,.99,z+d/2],[.07,.74,.07],0,'#796a47','rural-detail');}
  for(const y of [.78,1.12])cube('wood',[x,y,z+d/2],[w,.05,.07],0,'#958463','rural-detail');
 }
 // Broken copses and fields dissolve the city into countryside.
 for(let i=0;i<125;i++){
  const x=-390+rnd()*780,side=i%2?1:-1,z=canalCenter(x)+side*(100+rnd()*100),h=3+rnd()*5;
  if(occupied.some(c=>Math.abs(x-c.x)<c.w+2&&Math.abs(z-c.z)<c.d+2))continue;
  // Preserve the original two canopy RNG draws so mountain locations and
  // the entire existing city remain deterministic across the art revision.
  const ground=bankHeight(x,z),cx=2+rnd()*2.2,cz=2+rnd()*2;
  cube('wood',[x,ground+h*.40,z],[.17,h*.80,.17],0,'#414b3b','grove');
  for(let j=0;j<3;j++){
   const angle=j*2.1+dot(i,0),length=h*(.34+dot(i,j+4)*.13);
   const direction=new T.Vector3(Math.cos(angle)*.6,.8,Math.sin(angle)*.6).normalize(),transform=new T.Object3D();transform.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction);
   const start=new T.Vector3(x,ground+h*.56,z),mid=start.clone().addScaledVector(direction,length/2);
   add(twig,'wood',mid.toArray(),[.09,length,.09],transform.rotation.toArray().slice(0,3),'#414b3b','grove');
  }
  for(let j=0;j<7;j++){
   const a=j*2.4+dot(i,j+11)*.8,spread=j===0?.12:.70+dot(i,j+22)*.2;
   const px=x+Math.cos(a)*cx*spread,pz=z+Math.sin(a)*cz*spread,py=ground+h*(j===0?1.13:.82+dot(i,j+31)*.24);
   add(leaf,'grass',[px,py,pz],[cx*(.49+dot(i,j+44)*.18),h*(.15+dot(i,j+51)*.09),cz*(.48+dot(i,j+62)*.17)],a,['#536b52','#69775b','#3f5d50'][(i+j)%3],'grove');
  }
 }
 for(const side of [-1,1])for(let i=0;i<12;i++){const x=-360+i*62,z=canalCenter(x)+side*(135+(i%3)*18),rows=[];for(const dx of [-19,19])rows.push([-7,7].map(dz=>[x+dx,bankHeight(x+dx,z+dz)+.025,z+dz]));strip(rows,'grass',palettes.grass[i%3],'fields');}
 // Low rolling foothills and three rings of real, parallax-producing peaks.
 // Vertex pigment interpolates from ochre roots to malachite and azurite.
 const mountainMaterials=[];let mountainTriangles=0;
 for(let layer=0;layer<3;layer++){
  const material=installLandscapeInk(new T.MeshStandardMaterial({vertexColors:true,roughness:1,fog:false}),{layer});mountainMaterials.push(material);inkMaterials.push(material);
  const day=new T.Color(['#467d71','#53918e','#79a6a1'][layer]),foot=new T.Color(['#8d9b6c','#9fae88','#b4bfb0'][layer]);
  const radius=[560,850,1150][layer],count=[25,29,33][layer],geometries=[];
  for(let i=0;i<count;i++){
   const angle=i/count*Math.PI*2,alongRiver=Math.abs(Math.sin(angle))<.20;
   const r=radius+(rnd()-.5)*70,x=Math.cos(angle)*r,z=Math.sin(angle)*r*.77;
   const height=(layer===0?35:layer===1?78:110)+rnd()*(layer===0?40:90),sx=(layer===0?65:110)+rnd()*65,sz=sx*(.58+rnd()*.27);
   // River openings stay low so water can disappear naturally into haze.
   const peakHeight=alongRiver?height*.33:height;
   const rings=9,sectors=18,p=[],c=[],indices=[];
   for(let row=0;row<rings;row++)for(let k=0;k<=sectors;k++){
    const t=row/rings,a=k/sectors*Math.PI*2,rad=1-t;
    const ripple=1+.09*Math.sin(a*3+i)+.045*Math.sin(a*7+row*.7);
    const rise=Math.pow(t,.77)*(1+.045*Math.sin(a*4+row*.8));
    const vx=x+Math.cos(a)*sx*rad*ripple+t*sx*.12,vy=-.12+peakHeight*rise,vz=z+Math.sin(a)*sz*rad*ripple+t*sz*.08;
    p.push(vx,vy,vz);const col=foot.clone().lerp(day,T.MathUtils.smoothstep(t,.02,.70)).lerp(new T.Color(['#2f7188','#4f8898','#81a4ac'][layer]),T.MathUtils.smoothstep(t,.65,1)*.72);col.multiplyScalar(.89+.11*Math.sin(a*2.6+row*.5)**2);c.push(col.r,col.g,col.b);
    if(row<rings-1&&k<sectors){const b=row*(sectors+1)+k;indices.push(b,b+sectors+1,b+1,b+1,b+sectors+1,b+sectors+2);}
   }
   const apex=p.length/3;p.push(x+sx*.12,peakHeight-.12,z+sz*.08);c.push(day.r,day.g,day.b);for(let k=0;k<sectors;k++){const b=(rings-1)*(sectors+1)+k;indices.push(b,apex,b+1);}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('color',new T.Float32BufferAttribute(c,3));g.setIndex(indices);g.computeVertexNormals();geometries.push(g);
  }
  const merged=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());const mesh=new T.Mesh(merged,material);mesh.name=`青绿远山 / ${layer+1}`;mesh.castShadow=false;mesh.receiveShadow=false;root.add(mesh);mountainTriangles+=merged.index.count/3;
 }
 let drawables=3,triangles=mountainTriangles;
 for(const {key,category,parts}of buckets.values()){
  const geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());let material=mats[key];if(category==='grove'&&key==='grass'){material=installLandscapeInk(material.clone(),{foliage:true});inkMaterials.push(material);}const mesh=new T.Mesh(geometry,material);mesh.name=`长卷/${category}/${key}`;mesh.castShadow=category==='town'||category==='gate';mesh.receiveShadow=true;root.add(mesh);drawables++;triangles+=geometry.attributes.position.count/3;
 }
 box.dispose();leaf.dispose();twig.dispose();roof.dispose();buckets.clear();
 function setQuality(value){root.traverse(o=>{if(!o.isMesh)return;o.castShadow=value!=='low'&&(o.name.startsWith('长卷/town/')||o.name.startsWith('长卷/gate/'));});for(const m of inkMaterials){m.userData.inkDetail=value==='low'?0:1;if(m.userData.shader)m.userData.shader.uniforms.inkDetail.value=m.userData.inkDetail;}}
 function update(night){for(const material of inkMaterials)if(material.userData.shader)material.userData.shader.uniforms.landscapeNight.value=night;}
 return{root,buildings,gateReport,update,setQuality,inkMaterials,bounds:landscapeBounds,stats:{buildings:buildings.length,nearBuildings:buildings.filter(b=>!b.far).length,farBuildings:buildings.filter(b=>b.far).length,drawables,triangles,modelBytes:0,mountainLayers:3,canalLength:1240,artStyle:'淡青绿彩墨',inkMaterials:inkMaterials.length}};
}
