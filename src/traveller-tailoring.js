import * as T from 'three';

// Refine only three known cloth control cages from the project's original kit.
// No shared geometry or texture is modified; unknown future assets pass through.
function cubic(a,b,c,d,t){return .5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);}
export function tailorTravellerPart(part){
 const robe=part.name==='person_scholar__body/folded_robe';
 const sleeve=/^person_scholar__arm_(left|right)\/continuous_folded_sleeve\d+$/.test(part.name);
 if((!robe&&!sleeve)||part.material.name!=='washed indigo')return null;
 const source=part.geometry.attributes.position,columns=robe?32:20,rows=robe?8:7;
 if(source.count!==columns*rows)return null;
 const worldPoint=new T.Vector3(),inverse=part.matrix.clone().invert();let radiusLimit=0;
 for(let i=0;i<source.count;i++){worldPoint.fromBufferAttribute(source,i).applyMatrix4(part.matrix);radiusLimit=Math.max(radiusLimit,Math.hypot(worldPoint.x,worldPoint.z));}
 const radial=robe?64:48,steps=robe?8:5,ringCount=(rows-1)*steps+1;
 const positions=[],uvs=[],indices=[],centres=[];
 function value(row,column,axis){return source.array[(Math.max(0,Math.min(rows-1,row))*columns+(column%columns+columns)%columns)*3+axis];}
 function around(row,u,axis){const n=u*columns,i=Math.floor(n),t=n-i;return cubic(value(row,i-1,axis),value(row,i,axis),value(row,i+1,axis),value(row,i+2,axis),t);}
 function at(r,u,axis){const n=r*(rows-1),i=Math.min(rows-2,Math.floor(n)),t=n-i;return cubic(around(i-1,u,axis),around(i,u,axis),around(i+1,u,axis),around(i+2,u,axis),t);}
 for(let row=0;row<ringCount;row++){
  const t=row/(ringCount-1),centre=new T.Vector3();
  for(let col=0;col<radial;col++)centre.add(new T.Vector3(at(t,col/radial,0),at(t,col/radial,1),at(t,col/radial,2)));
  centre.multiplyScalar(1/radial);centres.push(centre);
  for(let col=0;col<=radial;col++){
   const u=col/radial,theta=u*Math.PI*2,p=new T.Vector3(at(t,u,0),at(t,u,1),at(t,u,2));
   if(robe){
    // Long pressed folds gather below the sash; only indent the cloth. Fade at
    // the original hem and waist to retain the cap, lapels and sash junctions.
    const gather=T.MathUtils.smoothstep(p.y,.15,.27)*(1-T.MathUtils.smoothstep(p.y,.83,1.0));
    const crease=Math.pow(.5+.5*Math.cos(theta*9+Math.sin(p.y*3)*.32),10)*.014*gather;
    const r=Math.hypot(p.x-centre.x,p.z-centre.z),scale=Math.max(0,1-crease/Math.max(.01,r));
    p.x=centre.x+(p.x-centre.x)*scale;p.z=centre.z+(p.z-centre.z)*scale;
   }else{
    const inward=Math.pow(Math.sin(Math.PI*t),2)*(.0025+.0025*Math.sin(t*Math.PI*10+theta*2));
    p.addScaledVector(p.clone().sub(centre).normalize(),-inward);
   }
   worldPoint.copy(p).applyMatrix4(part.matrix);const radius=Math.hypot(worldPoint.x,worldPoint.z);
   if(radius>radiusLimit){worldPoint.x*=radiusLimit/radius;worldPoint.z*=radiusLimit/radius;p.copy(worldPoint).applyMatrix4(inverse);}
   positions.push(...p.toArray());uvs.push(u*2,t*(robe?4.5:1.9));
   if(row<ringCount-1&&col<radial){const a=row*(radial+1)+col,b=a+1,d=a+radial+1,c=d+1;indices.push(a,b,d,b,c,d);}
  }
 }
 const sideIndexCount=indices.length;
 // Closed end caps keep the original solid garment. Separate cap vertices
 // preserve a soft side normal without bending it into the horizontal cap.
 for(const row of [0,ringCount-1]){
  const start=positions.length/3,centre=centres[row];positions.push(...centre.toArray());uvs.push(.5,.5);
  for(let col=0;col<=radial;col++){const a=(row*(radial+1)+col)*3;positions.push(...positions.slice(a,a+3));uvs.push(.5+.5*Math.cos(col/radial*Math.PI*2),.5+.5*Math.sin(col/radial*Math.PI*2));if(col<radial)indices.push(...(row===0?[start,start+col+2,start+col+1]:[start,start+col+1,start+col+2]));}
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();
 // Orient using the actual control cage, including sleeves' distinct frames.
 let facing=0;const p=new T.Vector3(),n=new T.Vector3();
 for(let row=1;row<ringCount-1;row++)for(let col=0;col<radial;col++){const i=row*(radial+1)+col;p.fromBufferAttribute(geometry.attributes.position,i).sub(centres[row]);n.fromBufferAttribute(geometry.attributes.normal,i);facing+=p.dot(n);}
 if(facing<0){for(let i=0;i<indices.length;i+=3){const a=geometry.index.getX(i+1);geometry.index.setX(i+1,geometry.index.getX(i+2));geometry.index.setX(i+2,a);}geometry.computeVertexNormals();}
 // The duplicate UV seam must have one lighting normal on both sides.
 const normals=geometry.attributes.normal;
 for(let row=0;row<ringCount;row++){const a=row*(radial+1),b=a+radial;n.fromBufferAttribute(normals,a).add(p.fromBufferAttribute(normals,b)).normalize();normals.setXYZ(a,n.x,n.y,n.z);normals.setXYZ(b,n.x,n.y,n.z);}
 geometry.computeBoundingBox();geometry.computeBoundingSphere();geometry.name='旅人衣料/'+(robe?'连贯袍褶':'连贯袖褶');
 geometry.userData.tailoring={source:part.name,rows:ringCount,radial,sideIndexCount};return geometry;
}
