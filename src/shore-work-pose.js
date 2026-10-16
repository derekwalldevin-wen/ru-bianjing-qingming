import * as T from 'three';

// The task owns its timeline; the rig owns its actual palm. Never drive the
// strand with this desired IK point: a clamped arm may not reach it.
export function shoreWorkPose({phase,fraction=0,position,yaw,base,endpoint,anchor,reduced=false}){
 const s=T.MathUtils.smoothstep,p=fraction;
 const work={active:['gathering','coil','coiling'].includes(phase),phase,fraction:p,yaw,crouch:0,weight:1,rightTarget:null,rightOrientation:0,gripped:phase==='coil',released:false};
 const carry=new T.Vector3(.18,1.04,.32).applyAxisAngle(new T.Vector3(0,1,0),yaw).add(new T.Vector3(position.x,base,position.z));
 if(phase==='gathering'){
  work.crouch=s(p,0,.38)*(1-s(p,.55,.97));work.weight=s(p,0,.20);
  work.rightTarget=new T.Vector3(...endpoint).lerp(carry,s(p,.55,.97)).toArray();work.rightOrientation=Math.PI*.5*work.crouch;work.gripped=p>=.43;
 }else if(phase==='coiling'){
  work.crouch=.82*s(p,0,.25)*(1-s(p,.85,1));work.weight=1-s(p,.90,1);
  const a=p*Math.PI*4,r=.12*s(p,0,.25),target=new T.Vector3(anchor[0]-.06+Math.cos(a)*r,anchor[1]+.35,anchor[2]+Math.sin(a)*r);
  target.lerp(carry,1-s(p,0,.25));target.lerp(carry,s(p,.86,1));work.rightTarget=target.toArray();work.rightOrientation=Math.PI*.5*work.crouch;work.gripped=p<.86;work.released=p>=.86;
 }
 if(reduced&&phase==='coil')work.crouch=0;
 return work;
}
