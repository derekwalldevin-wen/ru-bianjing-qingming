// One small step through the normal locomotion/collision pipeline, never a teleport.
export const shortStepSeconds=.24;
const directions=new Set(['KeyW','KeyA','KeyS','KeyD']);
export function createWalkPulse(){
 let key=null,remaining=0;
 const clear=()=>{key=null;remaining=0;};
 return {clear,start(value,heldSeconds=0){
  if(!directions.has(value)||!Number.isFinite(heldSeconds))return false;
  const duration=Math.max(0,shortStepSeconds-Math.max(0,heldSeconds));
  if(!duration)return false;
  key=value;remaining=duration;return true;
 },sample(dt,manual=false){
  if(manual){clear();return null;}
  if(!key||!Number.isFinite(dt)||dt<=0)return null;
  const value=key;remaining-=Math.min(.1,dt);if(remaining<=1e-7)clear();return value;
 }};
}
