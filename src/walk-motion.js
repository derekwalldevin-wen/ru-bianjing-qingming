// Smooth start/stop, while every movement substep still checks the full body.
export function createWalkMotion(){
 let vx=0,vz=0;
 return {
  reset(){vx=vz=0;},
  step({x,z,forward,side,yaw,fast,dt,allowed}){
   const length=Math.max(1,Math.hypot(forward,side)),speed=fast?6:3.2;
   const tx=(-Math.sin(yaw)*forward+Math.cos(yaw)*side)*speed/length;
   const tz=(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*speed/length;
   let remaining=Math.min(.1,Math.max(0,dt));
   while(remaining>1e-7){
    const h=Math.min(1/60,remaining);remaining-=h;
    const blend=1-Math.exp(-h*(forward||side?12:20));
    vx+=(tx-vx)*blend;vz+=(tz-vz)*blend;
    if(allowed(x+vx*h,z))x+=vx*h;else vx=0;
    if(allowed(x,z+vz*h))z+=vz*h;else vz=0;
   }
   return {x,z};
  }
 };
}
