import * as T from 'three';

// Only owned work meshes. Keep the shared scholar and ordinary walker intact.
// A wrist can pass through the empty cuff, rather than a linen end-cap disk.
export function hollowWorkCloth(g,name,material,rest){
 if(!name.includes('__arm_')||material==='weathered skin')return g;
 const side=name.includes('_left')?'left':'right',wrist=rest['Cuff_'+side]??rest['Hand_'+side],up=rest['Forearm_'+side].clone().sub(wrist).normalize();
 const positions=[],uv=[],indices=[],point=new T.Vector3(),a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),face=new T.Vector3();
 function tri(i,j,k,normal){a.fromArray(positions,i*3);b.fromArray(positions,j*3);c.fromArray(positions,k*3);face.subVectors(b,a).cross(c.sub(a));indices.push(i,...(face.dot(normal)>=0?[j,k]:[k,j]));}
 function join(rowA,rowB,radial,normalAt){for(let j=0;j<radial;j++){const normal=normalAt(j);tri(rowA+j,rowA+j+1,rowB+j,normal);tri(rowA+j+1,rowB+j+1,rowB+j,normal);}}
 if(material==='pale linen'){
  const radial=32,u=new T.Vector3().crossVectors(up,new T.Vector3(0,1,0)).normalize(),v=new T.Vector3().crossVectors(up,u).normalize(),radius=.100,inner=radius-.008;
  for(const [r,along]of [[radius,0],[radius,.025],[inner,0],[inner,.025]])for(let j=0;j<=radial;j++){
   const t=j/radial*Math.PI*2;point.copy(wrist).addScaledVector(up,along).addScaledVector(u,Math.cos(t)*r).addScaledVector(v,Math.sin(t)*r);positions.push(...point.toArray());uv.push(j/radial*2,along*20+(r===inner?.5:0));
  }
  const row=radial+1,radialNormal=j=>u.clone().multiplyScalar(Math.cos((j+.5)/radial*Math.PI*2)).addScaledVector(v,Math.sin((j+.5)/radial*Math.PI*2));
  join(0,row,radial,radialNormal);join(row*2,row*3,radial,j=>radialNormal(j).negate());join(0,row*2,radial,()=>up.clone().negate());join(row,row*3,radial,()=>up);
  const out=new T.BufferGeometry();out.setAttribute('position',new T.Float32BufferAttribute(positions,3));out.setAttribute('uv',new T.Float32BufferAttribute(uv,2));out.setIndex(indices);out.userData.workSeams=[0,row,row*2,row*3].map(start=>[start,start+radial]);out.userData.hollowCuff={innerRadius:inner,wall:.008,depth:.025};out.computeVertexNormals();averageWorkSeams(out);g.dispose();return out;
 }
 const m=g.userData.tailoring;if(material!=='washed indigo'||!m)return g;
 const keptVertices=m.rows*(m.radial+1)+m.radial+2;positions.push(...g.attributes.position.array.slice(0,keptVertices*3));uv.push(...g.attributes.uv.array.slice(0,keptVertices*2));
 // Retain the hidden shoulder cap; replace the wrist disk with a short lining.
 indices.push(...Array.from(g.index.array).slice(0,m.sideIndexCount+m.radial*3));
 const outerEnd=(m.rows-1)*(m.radial+1),outerBack=(m.rows-6)*(m.radial+1),centres=[outerEnd,outerBack].map(start=>{const centre=new T.Vector3();for(let j=0;j<m.radial;j++)centre.add(point.fromArray(positions,(start+j)*3));return centre.divideScalar(m.radial);});
 const innerStarts=[];for(let ring=0;ring<2;ring++){
  const source=ring?outerBack:outerEnd,start=positions.length/3;innerStarts.push(start);
  for(let j=0;j<=m.radial;j++){point.fromArray(positions,(source+j)*3).lerp(centres[ring],.06);positions.push(...point.toArray());uv.push(j/m.radial*2,1+ring*.2);}
 }
 const axis=centres[0].clone().sub(centres[1]).normalize();
 join(outerEnd,innerStarts[0],m.radial,()=>axis);
 join(innerStarts[0],innerStarts[1],m.radial,j=>point.fromArray(positions,(innerStarts[0]+j)*3).sub(centres[0]).negate().normalize().clone());
 const cap=positions.length/3;positions.push(...centres[1].toArray());uv.push(.5,.5);for(let j=0;j<m.radial;j++)tri(cap,innerStarts[1]+j,innerStarts[1]+j+1,axis);
 g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.userData.workSeams=innerStarts.map(start=>[start,start+m.radial]);g.userData.hollowSleeve={liningDepth:centres[0].distanceTo(centres[1]),innerScale:.94};g.deleteAttribute('normal');g.computeVertexNormals();averageWorkSeams(g);return g;
}

export function averageWorkSeams(g){
 const m=g.userData.tailoring,seams=[...(g.userData.workSeams??[]),...(m?Array.from({length:m.rows},(_,i)=>[i*(m.radial+1),i*(m.radial+1)+m.radial]):[])],n=g.attributes.normal,a=new T.Vector3(),b=new T.Vector3();
 for(const [i,j]of seams){a.fromBufferAttribute(n,i).add(b.fromBufferAttribute(n,j)).normalize();n.setXYZ(i,a.x,a.y,a.z);n.setXYZ(j,a.x,a.y,a.z);}
}
