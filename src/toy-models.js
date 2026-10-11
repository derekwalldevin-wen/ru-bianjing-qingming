import * as T from 'three';

// Project a subdivided box onto a rounded box with a world-space corner radius.
// The two interior grid lines sit at the bevel boundaries, preserving flat faces.
export function roundedBox(w,h,d,r=Math.min(w,h,d)*.12){
 r=Math.min(r,Math.min(w,h,d)*.49);
 const g=new T.BoxGeometry(1,1,1,5,5,5),p=g.attributes.position,n=g.attributes.normal;
 const half=[w/2,h/2,d/2],v=new T.Vector3(),core=new T.Vector3();
 for(let i=0;i<p.count;i++){
  const raw=[p.getX(i),p.getY(i),p.getZ(i)];
  const q=raw.map((a,k)=>Math.sign(a)*(half[k]-r*(Math.abs(a)>.49?0:Math.abs(a)>.2?.3:1)));
  v.set(...q);core.set(...q.map((a,k)=>T.MathUtils.clamp(a,-half[k]+r,half[k]-r)));
  const normal=v.clone().sub(core).normalize();v.copy(core).addScaledVector(normal,r);
  p.setXYZ(i,v.x,v.y,v.z);n.setXYZ(i,normal.x,normal.y,normal.z);
 }
 g.computeBoundingSphere();return g;
}

const orb=new T.SphereGeometry(1,16,12);
const hairCap=new T.SphereGeometry(1,16,8,0,Math.PI*2,0,Math.PI*.48);
const smile=new T.TorusGeometry(.045,.010,4,12,Math.PI);
smile.rotateZ(Math.PI);
const palettes=['#82aaa0','#d2a36e','#c5afcd','#819ab5','#ce8b78','#e1c48b'];

function parts(m,coat){return[
 {g:orb,ma:coat,y:.62,s:[.35,.46,.27],kind:'robe'},
 {g:orb,ma:m.skin,y:1.27,s:[.35,.34,.32]},
 {g:hairCap,ma:m.hair,y:1.30,s:[.362,.335,.33]},
 {g:orb,ma:m.hair,y:1.63,z:-.025,s:[.14,.12,.13]},
 {g:orb,ma:coat,y:.78,x:-.34,s:[.17,.25,.19],swing:-1,kind:'sleeve'},
 {g:orb,ma:coat,y:.78,x:.34,s:[.17,.25,.19],swing:1,kind:'sleeve'},
 {g:orb,ma:m.skin,y:.61,x:-.38,z:.06,s:[.095,.09,.09]},
 {g:orb,ma:m.skin,y:.61,x:.38,z:.06,s:[.095,.09,.09]},
 {g:orb,ma:m.hair,y:.13,x:-.14,z:.055,s:[.13,.13,.19],swing:1},
 {g:orb,ma:m.hair,y:.13,x:.14,z:.055,s:[.13,.13,.19],swing:-1},
 {g:orb,ma:m.eye,y:1.29,x:-.115,z:.300,s:[.027,.037,.024]},
 {g:orb,ma:m.eye,y:1.29,x:.115,z:.300,s:[.027,.037,.024]},
 {g:orb,ma:m.blush,y:1.205,x:-.19,z:.264,s:[.061,.033,.019]},
 {g:orb,ma:m.blush,y:1.205,x:.19,z:.264,s:[.061,.033,.019]},
 {g:smile,ma:m.eye,y:1.185,z:.313,s:[1,1,1]},
 {g:orb,ma:m.cream,y:.76,z:.252,s:[.27,.044,.036]},
 {g:orb,ma:m.cream,y:.87,z:.225,s:[.033,.14,.036],tilt:.47}
 ];}

export function createToyPeople(scene,persons,m,bridgeHeight){
 const coats=palettes.map(color=>new T.MeshStandardMaterial({color,roughness:.64}));
 const template=parts(m,coats[0]),groups=[],dummy=new T.Object3D();
 template.forEach(part=>{
  const variants=part.kind?coats.map((ma,color)=>({ma,list:persons.filter(p=>p.color===color)})):[{ma:part.ma,list:persons}];
  for(const {ma,list} of variants){const mesh=new T.InstancedMesh(part.g,ma,list.length);mesh.name=part.kind||'陶偶五官与配饰';mesh.castShadow=true;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);scene.add(mesh);groups.push({part,list,mesh});}
 });
 return function update(time,reduced){
  for(const {part,list,mesh} of groups){for(let i=0;i<list.length;i++){
   const p=list[i];let x=p.x,z=p.z;
   if(!reduced){if(p.bridge)z=((p.z+time*p.speed*p.dir+120)%24)-12;else x=((p.x+time*p.speed*p.dir+1000)%188)-94;}
   const yaw=p.bridge?(p.dir>0?0:Math.PI):(p.dir>0?Math.PI/2:-Math.PI/2);
   const swing=reduced?0:Math.sin(time*3+p.phase),ox=(part.x||0)*p.scale,oz=(part.z||0)*p.scale;
   const base=p.bridge?bridgeHeight(z)+.12:.62;
   dummy.position.set(x+ox*Math.cos(yaw)+oz*Math.sin(yaw),base+(part.y+(reduced?0:Math.abs(swing)*.025))*p.scale,z-ox*Math.sin(yaw)+oz*Math.cos(yaw));
   dummy.rotation.set(0,yaw,0);dummy.rotateX(swing*(part.swing||0)*.18);dummy.rotateZ(part.tilt||0);
   dummy.scale.set(...part.s).multiplyScalar(p.scale);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
  }mesh.instanceMatrix.needsUpdate=true;}
 };
}

export function addToyBoatman(group,m){
 for(const p of parts(m,m.roof)){const mesh=new T.Mesh(p.g,p.ma);mesh.position.set(2.7+(p.x||0),.68+p.y,.35+(p.z||0));mesh.scale.set(...p.s);mesh.rotation.z=p.tilt||0;group.add(mesh);}
}
