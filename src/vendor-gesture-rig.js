import * as T from 'three';

export const vendorJoint=part=>/^person_vendor__(\w+)/.exec(part.name)?.[1];
export function createVendorGestureRig(parts){
 const head=parts.find(p=>vendorJoint(p)==='head'),arm=parts.find(p=>vendorJoint(p)==='arm_right');
 if(!head||!arm)throw new Error('Missing vendor shoulder/head semantics');
 const isHandPart=p=>vendorJoint(p)==='arm_right'&&/skin/i.test(p.material.name);
 const handParts=parts.filter(isHandPart);
 if(!handParts.length)throw new Error('Missing free vendor hand geometry');
 const handBox=new T.Box3(),v=new T.Vector3();
 for(const part of handParts){const a=part.geometry.attributes.position;for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i).applyMatrix4(part.matrix);handBox.expandByPoint(v);}}
 const headPivot=new T.Vector3().setFromMatrixPosition(head.matrix),armPivot=new T.Vector3().setFromMatrixPosition(arm.matrix);
 const wristPivot=handBox.getCenter(new T.Vector3());wristPivot.y=handBox.max.y-.003;
 const around=(pivot,rotation)=>new T.Matrix4().makeTranslation(...pivot.toArray()).multiply(rotation).multiply(new T.Matrix4().makeTranslation(-pivot.x,-pivot.y,-pivot.z));
 const headMatrix=new T.Matrix4(),armMatrix=new T.Matrix4(),handMatrix=new T.Matrix4();
 return {headPivot,armPivot,wristPivot,handParts,
  setPose(pose){
   headMatrix.copy(around(headPivot,new T.Matrix4().makeRotationY(pose.headYaw).multiply(new T.Matrix4().makeRotationX(pose.headNod))));
   armMatrix.copy(around(armPivot,new T.Matrix4().makeRotationZ(pose.shoulderOut).multiply(new T.Matrix4().makeRotationX(pose.shoulderPitch))));
   handMatrix.copy(armMatrix).multiply(around(wristPivot,new T.Matrix4().makeRotationY(pose.wristYaw)));
  },
  adjustment(part,out=new T.Matrix4()){
   const joint=vendorJoint(part);
   return out.copy(joint==='head'?headMatrix:joint==='arm_right'?(isHandPart(part)?handMatrix:armMatrix):new T.Matrix4());
  }
 };
}
