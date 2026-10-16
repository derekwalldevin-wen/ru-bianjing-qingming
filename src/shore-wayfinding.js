// View-relative guidance for this short, already walkable stretch of shore.
// This is a straight-line distance, not a pathfinder or an off-screen world pin.
const directions=['前方','右前方','右侧','右后方','后方','左后方','左侧','左前方'];
export function shoreWayfinding({phase,position,forward,target,enabled}){
 if(!['loose','coil'].includes(phase))return null;
 const dx=target[0]-position.x,dz=target[2]-position.z,fx=forward?.x??0,fz=forward?.z??-1;
 if(![dx,dz,fx,fz].every(Number.isFinite)||Math.hypot(fx,fz)<1e-6)return null;
 const distance=Math.hypot(dx,dz),angle=Math.atan2(dx*-fz+dz*fx,dx*fx+dz*fz);
 const direction=directions[(Math.round(angle/(Math.PI/4))+8)%8],name=phase==='loose'?'绳头':'绳圈';
 return {angle,distance,text:enabled?`已到${name}旁`:`${name}在${direction} · 约${distance.toFixed(1)}米`};
}
