// The physical prop changes only after explicit action. Reading or travelling
// past it never completes a task; hidden/modal frames do not advance time.
export function createShoreRopeTask({onChange=()=>{},onProgress=()=>{}}={}){
 let phase='idle',elapsed=0,progress=0;
 const publish=()=>onChange(phase);
 function change(next){phase=next;elapsed=0;publish();}
 function setProgress(value){progress=value;onProgress(value);}
 function reset(){setProgress(0);change('idle');}
 function activate(){
  if(phase==='idle'){change('loose');return true;}
  if(phase==='loose'){change('gathering');return true;}
  if(phase==='coil'){change('coiling');return true;}return false;
 }
 function update(dt,{suspended=false,reduced=false,eligible=true,near=true}={}){
  if(suspended)return;
  if(!eligible||!near){if(phase!=='done'&&phase!=='idle')reset();return;}
  if(!['gathering','coiling'].includes(phase))return;
  elapsed+=Math.min(.1,Math.max(0,dt));const t=reduced?1:Math.min(1,elapsed/(phase==='gathering'?2.0:2.4)),eased=t*t*(3-2*t);
  setProgress(phase==='gathering'?.55*eased:.55+.45*eased);
  if(t===1)change(phase==='gathering'?'coil':'done');
 }
 return {activate,update,reset,restoreCompleted(){setProgress(1);change('done');},get phase(){return phase;},get progress(){return progress;},get fraction(){return ['gathering','coiling'].includes(phase)?Math.min(1,elapsed/(phase==='gathering'?2.0:2.4)):phase==='coil'||phase==='done'?1:0;},get busy(){return phase==='gathering'||phase==='coiling';}};
}
