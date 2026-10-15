import * as T from 'three';

export const shoreRopeAnchor=[-39.2,11.2];
export function createShoreRopeVisual(scene,world){
 const [x,z]=shoreRopeAnchor,geometries=[];
 for(const kind of ['loose','gathered','tidy']){
  const points=[];
  for(let i=0;i<=48;i++){
   const t=i/48;let dx,dz;
   if(kind==='tidy'||t<=.5){const u=kind==='tidy'?t:t*2,r=.045+.25*u,a=u*Math.PI*(kind==='tidy'?6:4);dx=Math.cos(a)*r;dz=Math.sin(a)*r;}
   else{const u=(t-.5)*2;dx=.295-(kind==='loose'?2.5:1.0)*u;dz=Math.sin(u*Math.PI*3)*.055+u*.05;}
   points.push(new T.Vector3(dx,world.contactFloor(x+dx,z+dz)+.032,dz));
  }
  const geometry=new T.TubeGeometry(new T.CatmullRomCurve3(points),120,.019,6,false),p=geometry.attributes.position;
  for(let i=0;i<p.count;i++)p.setY(i,Math.max(p.getY(i),world.contactFloor(x+p.getX(i),z+p.getZ(i))+.004));
  geometry.computeVertexNormals();geometries.push(geometry);
 }
 const shapes=geometries.map(g=>g.attributes.position.array.slice()),geometry=geometries[0];geometry.attributes.position.setUsage(T.DynamicDrawUsage);geometry.attributes.normal.setUsage(T.DynamicDrawUsage);
 const bounds=new T.Box3();for(const shape of shapes)for(let i=0;i<shape.length;i+=3)bounds.expandByPoint(new T.Vector3(shape[i],shape[i+1],shape[i+2]));geometry.boundingBox=bounds;geometry.boundingSphere=bounds.getBoundingSphere(new T.Sphere());
 const data=new Uint8Array(128*32*4);for(let j=0;j<32;j++)for(let i=0;i<128;i++){const offset=(j*128+i)*4,fibre=Math.sin(i*.8+j*1.5)*11+Math.sin(j*2.1)*8;data.set([174+fibre,145+fibre,103+fibre,255],offset);}
 const texture=new T.DataTexture(data,128,32);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(18,1);texture.generateMipmaps=true;texture.minFilter=T.LinearMipmapLinearFilter;texture.needsUpdate=true;
 const material=new T.MeshStandardMaterial({color:'#d5bd8c',roughness:.94,map:texture});
 const root=new T.Mesh(geometry,material);root.name='岸边小事/原创麻绳（场景演绎）';root.position.set(x,0,z);root.castShadow=root.receiveShadow=true;scene.add(root);
 const stats={triangles:geometry.index.count/3,vertices:geometry.attributes.position.count,shapes:3,textureBytes:data.length,modelDownloadBytes:0};
 let disposed=false,current=-1;
 function setProgress(value){
  const p=T.MathUtils.clamp(value,0,1);if(p===current||disposed)return;current=p;
  const a=p<=.55?shapes[0]:shapes[1],b=p<=.55?shapes[1]:shapes[2],t=p<=.55?p/.55:(p-.55)/.45,positions=geometry.attributes.position.array;
  for(let i=0;i<positions.length;i+=3){const dx=a[i]+(b[i]-a[i])*t,dz=a[i+2]+(b[i+2]-a[i+2])*t;positions[i]=dx;positions[i+1]=Math.max(a[i+1]+(b[i+1]-a[i+1])*t,world.contactFloor(x+dx,z+dz)+.004);positions[i+2]=dz;}
  geometry.attributes.position.needsUpdate=true;geometry.computeVertexNormals();geometry.attributes.normal.needsUpdate=true;geometry.computeBoundingBox();geometry.computeBoundingSphere();
 }
 function dispose(){if(disposed)return;disposed=true;scene.remove(root);for(const g of geometries)g.dispose();material.dispose();texture.dispose();}
 setProgress(0);return {root,stats,setProgress,dispose};
}
