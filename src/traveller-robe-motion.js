import * as T from 'three';

// Built-in Three.js morph targets also deform shadow/depth passes. The lower
// robe stays put while the cloth above the sash follows the held upper body.
export function prepareTravellerRobeMotion(geometry){
 const source=geometry.attributes.position,normal=geometry.attributes.normal;
 const p=new T.Vector3(),q=new T.Vector3(),a=new T.Vector3(),b=new T.Vector3();
 geometry.morphTargetsRelative=true;geometry.morphAttributes.position=[];geometry.morphAttributes.normal=[];
 for(const [kind,amount]of [['lean',.025],['sway',.018],['bob',.01]]){
  const shape=geometry.clone();shape.morphAttributes={};const out=shape.attributes.position;
  const matrix=new T.Matrix4().makeTranslation(0,.96+(kind==='bob'?amount:0),0);
  if(kind==='lean')matrix.multiply(new T.Matrix4().makeRotationX(amount));
  if(kind==='sway')matrix.multiply(new T.Matrix4().makeRotationZ(amount));
  matrix.multiply(new T.Matrix4().makeTranslation(0,-.96,0));
  for(let i=0;i<source.count;i++){p.fromBufferAttribute(source,i);const weight=T.MathUtils.smoothstep(p.y,.86,1.18);q.copy(p).applyMatrix4(matrix);p.lerp(q,weight);out.setXYZ(i,p.x,p.y,p.z);}
  shape.computeVertexNormals();const n=shape.attributes.normal,meta=geometry.userData.tailoring;
  for(let row=0;row<meta.rows;row++){const i=row*(meta.radial+1),j=i+meta.radial;a.fromBufferAttribute(n,i).add(b.fromBufferAttribute(n,j)).normalize();n.setXYZ(i,a.x,a.y,a.z);n.setXYZ(j,a.x,a.y,a.z);}
  const positions=new Float32Array(source.count*3),normals=new Float32Array(source.count*3);
  for(let i=0;i<positions.length;i++){positions[i]=out.array[i]-source.array[i];normals[i]=n.array[i]-normal.array[i];}
  geometry.morphAttributes.position.push(new T.BufferAttribute(positions,3));geometry.morphAttributes.normal.push(new T.BufferAttribute(normals,3));shape.dispose();
 }
 // Conservative bounds cover all authored weights, including negative sway/bob.
 geometry.boundingSphere.radius+=.05;geometry.boundingBox.expandByScalar(.05);
}
