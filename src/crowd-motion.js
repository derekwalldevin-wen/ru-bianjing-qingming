// Collision-safe pedestrian motion, independent of rendering and camera culling.
export const PERSONAL_GAP=.12;
export function circleHitsBox(x,z,r,box){
 const dx=Math.max(Math.abs(x-box.x)-box.w,0),dz=Math.max(Math.abs(z-box.z)-box.d,0);
 return dx*dx+dz*dz<r*r;
}
export function segmentDistanceSquared(px,pz,ax,az,bx,bz){
 const dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((px-ax)*dx+(pz-az)*dz)/(dx*dx+dz*dz||1)));
 return (px-ax-dx*t)**2+(pz-az-dz*t)**2;
}
export function createCrowdMotion(people,{radiusFor,clear,floor}){
 const agents=[];
 function separated(x,z,r,except=null,visitor=null){
  if(visitor&&Math.hypot(x-visitor.x,z-visitor.z)<r+.32+PERSONAL_GAP)return false;
  return agents.every(a=>a===except||Math.hypot(x-a.x,z-a.z)>=r+a.radius+PERSONAL_GAP);
 }
 // Deterministic nearest-free placement. Body, sleeves and carried baskets are
 // included in the radius; unsafe candidates are never silently rendered.
 for(const person of people){
  const radius=radiusFor(person);let spot=null;
  for(let ring=0;ring<=32&&!spot;ring++){
   const distance=ring*.24,n=ring?Math.ceil(ring*7):1;
   for(let j=0;j<n;j++){
    const angle=j/n*Math.PI*2,x=person.x+Math.cos(angle)*distance,z=person.z+Math.sin(angle)*distance;
    if(clear(x,z,radius,person)&&separated(x,z,radius)){spot={x,z};break;}
   }
  }
  if(!spot)throw new Error(`无法安全安置人物 ${person.role} (${person.x}, ${person.z})`);
  Object.assign(person,spot);
  agents.push({person,...spot,radius,yaw:person.yaw||0,direction:agents.length%2?1:-1,wait:0,stride:0,moving:false});
 }
 function canStep(a,x,z,visitor){
  if(!clear(x,z,a.radius,a.person))return false;
  if(visitor&&segmentDistanceSquared(visitor.x,visitor.z,a.x,a.z,x,z)<(a.radius+.32+PERSONAL_GAP)**2)return false;
  return agents.every(b=>b===a||segmentDistanceSquared(b.x,b.z,a.x,a.z,x,z)>=(a.radius+b.radius+PERSONAL_GAP)**2);
 }
 function update(dt,time,visitor){
  // Fixed bounded substeps prevent tunnelling when the tab stalls or resumes.
  let remaining=Math.min(.2,Math.max(0,dt));
  while(remaining>1e-7){
   const step=Math.min(1/30,remaining);remaining-=step;
   for(const a of agents){
    const p=a.person;if(p.activity!=='walk')continue;
    const along=p.bridge?a.z:a.x;
    if((a.direction>0&&along>p.end-.4)||(a.direction<0&&along<p.start+.4))a.direction*=-1;
    const cross=p.bridge?p.x-a.x:p.z-a.z,steer=Math.max(-.7,Math.min(.7,cross*.6));
    let dx=p.bridge?steer:a.direction,dz=p.bridge?a.direction:steer;
    const length=Math.hypot(dx,dz);dx/=length;dz/=length;
    const angles=[0,.4,-.4,.8,-.8,1.25,-1.25];let moved=false;
    for(const turn of angles){
     const vx=dx*Math.cos(turn)-dz*Math.sin(turn),vz=dx*Math.sin(turn)+dz*Math.cos(turn),distance=p.speed*step;
     const x=a.x+vx*distance,z=a.z+vz*distance;
     if(!canStep(a,x,z,visitor))continue;
     a.x=x;a.z=z;
     const goal=Math.atan2(vx,vz),delta=Math.atan2(Math.sin(goal-a.yaw),Math.cos(goal-a.yaw));
     a.yaw+=Math.max(-step*2,Math.min(step*2,delta));moved=true;break;
    }
    a.moving=moved;a.wait=moved?0:a.wait+step;
    if(a.wait>2){a.direction*=-1;a.wait=0;}
    const target=moved?Math.sin(time*4.2+p.phase):0;
    a.stride+=(target-a.stride)*Math.min(1,step*12);
   }
  }
 }
 function validVisitor(x,z,r=.32){return agents.every(a=>Math.hypot(a.x-x,a.z-z)>=a.radius+r+PERSONAL_GAP);}
 return {agents,update,validVisitor,separated,floor};
}
