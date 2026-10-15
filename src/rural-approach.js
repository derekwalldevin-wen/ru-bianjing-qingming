import * as T from 'three';
import {projectSurfaceUV} from './surface-textures.js?v=shore-art-v1';
import {createShoreVegetation} from './shore-vegetation.js?v=shore-art-v1';

const hash=(n,s)=>{const q=Math.sin(n*127.1+s*311.7)*43758.5453;return q-Math.floor(q);};
function samples(route){
 const curve=new T.CatmullRomCurve3(route.map(([x,z])=>new T.Vector3(x,0,z)),false,'centripetal');
 const points=curve.getSpacedPoints(Math.ceil(curve.getLength()/1.4)).map(p=>[p.x,p.z]);
 return points.map(([x,z],i)=>{const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],length=Math.hypot(b[0]-a[0],b[1]-a[1]),extension=i===0?-.18:i===points.length-1?.18:0;return{x:x+(b[0]-a[0])/length*extension,z:z+(b[1]-a[1])/length*extension,nx:-(b[1]-a[1])/length,nz:(b[0]-a[0])/length};});
}

// A six-millimetre visual dressing over the existing rural route. Its softer
// margins cover the old hard strip without shifting the source cottages.
export function createRuralGround(scene,route,baseMaterial){
 const points=samples(route),across=[-1,-.89,-.70,-.28,.28,.70,.89,1],positions=[],colors=[],indices=[];
 const earth=new T.Color('#9c9871'),worn=new T.Color('#b2a080'),color=new T.Color();
 points.forEach((point,row)=>{
  const width=3.75+.10*Math.sin(point.x*.17);
  across.forEach((t,col)=>{
   const x=point.x+point.nx*t*width,z=point.z+point.nz*t*width;
   positions.push(x,.626,z);
   const edge=1-T.MathUtils.smoothstep(Math.abs(t),.68,1),patch=.88+.12*Math.sin(x*.13+Math.sin(z*.39));
   color.copy(earth).lerp(worn,edge*patch);colors.push(color.r,color.g,color.b);
   if(row<points.length-1&&col<across.length-1){const a=row*across.length+col,b=a+across.length;indices.push(a,a+1,b,a+1,b+1,b);}
  });
 });
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
 const material=baseMaterial.clone();material.color.set('#ffffff');material.vertexColors=true;material.onBeforeCompile=baseMaterial.onBeforeCompile;material.customProgramCacheKey=baseMaterial.customProgramCacheKey;
 const flat=geometry.toNonIndexed();projectSurfaceUV(flat,material);geometry.dispose();
 const ground=new T.Mesh(flat,material);ground.name='乡路/柔边/ground';ground.receiveShadow=true;ground.castShadow=false;scene.add(ground);
 return{ground,points};
}

export function createRuralApproach(scene,{path,colliders,ground,stoneMaterial}){
 const anchors=[],stones=[],clear=(x,z,margin)=>!colliders.some(c=>Math.abs(x-c.x)<c.w+margin&&Math.abs(z-c.z)<c.d+margin);
 const points=path.points.filter(p=>p.x>-304&&p.x<-228);
 points.forEach((point,i)=>{
  for(const side of [-1,1]){
   if(hash(i,side+8)>.18){const offset=3.25+hash(i,side+11)*2.5,x=point.x+point.nx*offset*side,z=point.z+point.nz*offset*side;if(clear(x,z,.48))anchors.push({x,z});}
   if(hash(i,side+17)>.52){const offset=3.0+hash(i,side+21)*1.25,x=point.x+point.nx*offset*side,z=point.z+point.nz*offset*side;if(clear(x,z,.28))stones.push({x,z,sx:.045+hash(i,side+24)*.07,sy:.013+hash(i,side+25)*.018,sz:.035+hash(i,side+26)*.06,yaw:hash(i,side+27)*Math.PI*2});}
  }
 });
 const vegetation=createShoreVegetation(scene,anchors,ground);for(const mesh of vegetation.meshes)mesh.name=mesh.name.replace('岸缘草簇/','乡路草簇/');
 const stoneGeometry=new T.IcosahedronGeometry(1,0);stoneGeometry.computeBoundingBox();
 const mesh=new T.InstancedMesh(stoneGeometry,stoneMaterial,stones.length),dummy=new T.Object3D();mesh.name='乡路/零散小石';mesh.receiveShadow=true;mesh.castShadow=false;
 stones.forEach((stone,i)=>{stone.bottom=ground(stone.x,stone.z)+.002;stone.y=stone.bottom-stoneGeometry.boundingBox.min.y*stone.sy;dummy.position.set(stone.x,stone.y,stone.z);dummy.rotation.set(0,stone.yaw,0);dummy.scale.set(stone.sx,stone.sy,stone.sz);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.computeBoundingBox();mesh.computeBoundingSphere();scene.add(mesh);
 let quality='standard',disposed=false;
 function update(t,reduced,camera){vegetation.update(t,reduced,camera);mesh.visible=!camera||camera.position.distanceTo(mesh.boundingSphere.center)<mesh.boundingSphere.radius+(quality==='low'?32:90);}
 function setQuality(value){quality=value;vegetation.setQuality(value);}
 function dispose(){if(disposed)return;disposed=true;vegetation.dispose();scene.remove(mesh,path.ground);mesh.dispose();stoneGeometry.dispose();path.ground.geometry.dispose();path.ground.material.dispose();}
 return{ground:path.ground,vegetation,stones,update,setQuality,dispose,stats:{tufts:vegetation.stats.tufts,stones:stones.length,groundTriangles:path.ground.geometry.attributes.position.count/3,decorationTriangles:vegetation.stats.triangles+stones.length*20,drawables:vegetation.meshes.length+2,modelBytesAdded:0}};
}
