const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const wrap=v=>Math.atan2(Math.sin(v),Math.cos(v));
const damp=(a,b,lambda,dt)=>a+(b-a)*(1-Math.exp(-lambda*dt));

// Small authored joint motion for the original scholar, not a skeletal clip.
// Navigation owns translation; this controller never moves the visitor or feet.
export function createTravellerMotion(){
 let phase=0,clock=0,weight=0,headYaw=0,headPitch=0,turn=0,previousYaw=null;
 const pose={stride:0,lean:0,sway:0,bob:0,headYaw:0,headPitch:0};
 function neutral(){for(const key of Object.keys(pose))pose[key]=0;return pose;}
 function reset(){phase=clock=weight=headYaw=headPitch=turn=0;previousYaw=null;neutral();}
 function update(state,dt,{reduced=false,enabled=true}={}){
  if(!state.visible){reset();return pose;}
  if(state.suspended)return pose;
  const step=clamp(Number.isFinite(dt)?dt:0,0,.1),speed=clamp(state.speed||0,0,6);
  if(reduced||!enabled){reset();previousYaw=state.yaw;return pose;}
  clock+=step;weight=damp(weight,Math.min(1,speed/2),14,step);phase+=speed*step*3.3;
  const velocity=previousYaw!==null&&step>0?clamp(wrap(state.yaw-previousYaw)/step,-5,5):0;previousYaw=state.yaw;
  turn=damp(turn,velocity,9,step);
  const look=Number.isFinite(state.lookYaw)?clamp(wrap(state.lookYaw-state.yaw),-.35,.35):0;
  headYaw=damp(headYaw,look,8,step);headPitch=damp(headPitch,clamp(-(state.lookPitch||0)*.25,-.12,.12),8,step);
  pose.stride=Math.sin(phase)*weight;
  pose.lean=weight*.025;
  pose.sway=clamp(Math.sin(phase)*weight*.009-turn*.003,-.018,.018);
  pose.bob=(1-Math.cos(phase*2))*weight*.003+Math.sin(clock*1.9)*.0025*(1-weight*.5);
  pose.headYaw=headYaw;pose.headPitch=headPitch+Math.sin(clock*1.3)*.006*(1-weight)+Math.sin(phase+.5)*weight*.009;
  return pose;
 }
 return {update,reset,pose};
}
