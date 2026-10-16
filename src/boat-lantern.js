import * as T from 'three';
import {mergeGeometries} from '../vendor/BufferGeometryUtils.js';

// A visible light source on an existing fore mooring post. Artistic completion;
// the daytime painting is not evidence for this particular hanging lamp.
export function createBoatLantern(boat,materials,id){
 const root=new T.Group();root.name='泊岸船/暮灯（场景演绎）';boat.add(root);
 const pieces=[],a=new T.Vector3(),b=new T.Vector3(),up=new T.Vector3(0,1,0);
 function beam(from,to,radius){a.fromArray(from);b.fromArray(to);const geometry=new T.CylinderGeometry(radius,radius,a.distanceTo(b),6);geometry.applyQuaternion(new T.Quaternion().setFromUnitVectors(up,b.clone().sub(a).normalize()));geometry.translate(...a.clone().add(b).multiplyScalar(.5).toArray());pieces.push(geometry);}
 beam([4.7,.94,0],[4.7,2.05,0],.023);beam([4.7,2.05,0],[4.7,2.05,-.28],.018);beam([4.7,2.05,-.25],[4.7,1.91,-.25],.009);
 for(const y of [1.545,1.915])pieces.push(new T.CylinderGeometry(.105,.105,.028,10).translate(4.7,y,-.25));
 for(let i=0;i<6;i++){
  const angle=i/6*Math.PI*2,points=[];
  for(let j=0;j<=8;j++){const t=.22+j/8*(Math.PI-.44);points.push(new T.Vector3(4.7+Math.cos(angle)*Math.sin(t)*.151,1.73+Math.cos(t)*.188,-.25+Math.sin(angle)*Math.sin(t)*.151));}
  pieces.push(new T.TubeGeometry(new T.CatmullRomCurve3(points),8,.005,3,false));
 }
 const frameGeometry=mergeGeometries(pieces);for(const geometry of pieces)geometry.dispose();
 const frame=new T.Mesh(frameGeometry,materials.dark);frame.name='暮灯/支架与细竹骨';frame.castShadow=frame.receiveShadow=true;root.add(frame);
 const shade=new T.Mesh(new T.SphereGeometry(.15,12,8).scale(1,1.25,1),materials.lantern);shade.position.set(4.7,1.73,-.25);shade.name='暮灯/纸罩';shade.castShadow=shade.receiveShadow=true;root.add(shade);
 const source={id,anchor:shade,position:new T.Vector3(),power:12,range:10};
 let disposed=false;function dispose(){if(disposed)return;disposed=true;frameGeometry.dispose();shade.geometry.dispose();root.removeFromParent();}
 return {root,source,shade,frame,dispose,stats:{drawables:2,triangles:(frameGeometry.index.count+shade.geometry.index.count)/3,modelBytesAdded:0}};
}
