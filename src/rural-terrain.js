import * as T from 'three';
import {ruralRoute,distanceToRoute} from './painting-layout.js?v=original-scroll-v1';

// Low earthen contours inspired by the visible opening of the supplied scroll.
// Heights and unpainted depth are interpretation, not surveyed farmland.
const ribbons=[
 {points:[[-310,57],[-287,62],[-263,62],[-240,57],[-215,49],[-187,44]],width:8,height:.80},
 {points:[[-310,80],[-282,79],[-256,77],[-230,73],[-205,68],[-187,65]],width:11,height:1.02},
 {points:[[-309,13],[-286,16],[-263,20],[-238,22],[-211,24],[-187,24]],width:7,height:.65}
];
export function createRuralTerrain(scene,baseMaterial,colliders){
 const contours=ribbons.map(r=>({...r,path:new T.CatmullRomCurve3(r.points.map(([x,z])=>new T.Vector3(x,0,z)),false,'centripetal').getSpacedPoints(72).map(p=>[p.x,p.z])}));
 const bounds={minX:-316,maxX:-184,minZ:4,maxZ:92},relevant=colliders.filter(c=>c.x+c.w>bounds.minX-5&&c.x-c.w<bounds.maxX+5&&c.z+c.d>bounds.minZ-5&&c.z-c.d<bounds.maxZ+5);
 // Existing decorative reed rails have no collision proxy. Their original
 // garden floor must also stay level; otherwise a new berm buries the rails.
 relevant.push({x:-256,z:62.5,w:9.2,d:.3},{x:-246,z:66,w:6.2,d:.3});
 const fade=(v,lo,hi)=>T.MathUtils.smoothstep(v,lo,hi);
 function height(x,z){
  if(x<bounds.minX||x>bounds.maxX||z<bounds.minZ||z>bounds.maxZ)return .619;
  let lift=0;
  for(const r of contours){const distance=distanceToRoute(x,z,r.path);if(distance<r.width)lift+=r.height*Math.pow(1-(distance/r.width)**2,2);}
  lift=Math.min(1.05,lift)*fade(distanceToRoute(x,z,ruralRoute),8.0,12.5);
  const edge=Math.min(x-bounds.minX,bounds.maxX-x,z-bounds.minZ,bounds.maxZ-z);lift*=fade(edge,0,6);
  // Source foundations and roots stay on their original ground, including
  // clearance to keep the new surface out of low branches and door thresholds.
  let clearance=Infinity;for(const c of relevant)clearance=Math.min(clearance,Math.hypot(Math.max(0,Math.abs(x-c.x)-c.w),Math.max(0,Math.abs(z-c.z)-c.d)));
  lift*=fade(clearance,.8,6.0);
  return .619+lift;
 }
 const nx=88,nz=58,positions=[],colors=[],indices=[],base=new T.Color('#9c9871'),dry=new T.Color('#a39772'),earth=new T.Color('#928365'),sage=new T.Color('#858765'),color=new T.Color();
 for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
  const x=T.MathUtils.lerp(bounds.minX,bounds.maxX,i/nx),z=T.MathUtils.lerp(bounds.minZ,bounds.maxZ,j/nz),y=height(x,z),h=y-.619;
  positions.push(x,y,z);
  const bands=.5+.5*Math.sin(x*.095+z*.27+1.8*Math.sin(x*.037)),variation=.5+.5*Math.sin(x*.19-z*.15);
  color.copy(base).lerp(dry,fade(h,.015,.22)*.62).lerp(earth,fade(h,.18,.53)*bands*.38).lerp(sage,fade(h,.06,.25)*(1-bands)*variation*.36);colors.push(color.r,color.g,color.b);
  if(j<nz&&i<nx){const a=j*(nx+1)+i,b=a+nx+1;indices.push(a,b,a+1,a+1,b,b+1);}
 }
 // The old plane already supports all flat areas. Omit triangles wholly below
 // it, and compact their unused vertices instead of indexing invisible soil.
 const visible=[],compactPositions=[],compactColors=[],remap=new Map();
 for(let i=0;i<indices.length;i+=3){const face=indices.slice(i,i+3);if(!face.some(v=>positions[v*3+1]>.62001))continue;for(const v of face){if(!remap.has(v)){remap.set(v,remap.size);compactPositions.push(...positions.slice(v*3,v*3+3));compactColors.push(...colors.slice(v*3,v*3+3));}visible.push(remap.get(v));}}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(compactPositions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(compactColors,3));geometry.setIndex(visible);geometry.computeVertexNormals();
 // Broad, restrained earth washes follow the real slope. They make a low bank
 // readable at walking height without outlining every triangle or adding decals.
 const normals=geometry.attributes.normal,tints=geometry.attributes.color,points=geometry.attributes.position,uv=new Float32Array(points.count*2),bankInk=new T.Color('#776d57'),crest=new T.Color('#b2a17b');
 for(let i=0;i<points.count;i++){
  const x=points.getX(i),z=points.getZ(i),h=points.getY(i)-.619,slope=Math.hypot(normals.getX(i),normals.getZ(i))/Math.max(.5,normals.getY(i));
  const wash=fade(slope,.035,.18)*fade(h,.02,.18)*(.48+.12*Math.sin(x*.12+z*.09));
  color.fromBufferAttribute(tints,i).lerp(bankInk,wash*.48).lerp(crest,fade(h,.35,.90)*.24);tints.setXYZ(i,color.r,color.g,color.b);
  uv[i*2]=x/baseMaterial.userData.textureMeters;uv[i*2+1]=z/baseMaterial.userData.textureMeters;
 }
 geometry.setAttribute('uv',new T.BufferAttribute(uv,2));
 const material=baseMaterial.clone();material.color.set('#ffffff');material.vertexColors=true;material.onBeforeCompile=baseMaterial.onBeforeCompile;material.customProgramCacheKey=baseMaterial.customProgramCacheKey;
 const mesh=new T.Mesh(geometry,material);mesh.name='乡野土岸/连续低缓地表';mesh.receiveShadow=true;mesh.castShadow=false;scene.add(mesh);
 let disposed=false,sharedMaterialDisposed=false;const sharedDisposed=()=>{sharedMaterialDisposed=true;};baseMaterial.addEventListener('dispose',sharedDisposed);
 function dispose(){if(disposed)return;disposed=true;scene.remove(mesh);geometry.dispose();material.dispose();baseMaterial.removeEventListener('dispose',sharedDisposed);}
 return{mesh,height,bounds,dispose,get sharedMaterialDisposed(){return sharedMaterialDisposed;},stats:{ribbons:ribbons.length,triangles:visible.length/3,omittedBuriedTriangles:(indices.length-visible.length)/3,drawables:1,modelBytesAdded:0,maxHeight:Math.max(...compactPositions.filter((_,i)=>i%3===1))-.62}};
}
