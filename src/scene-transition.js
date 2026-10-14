// A single owner advances the camera. Requests are resolved before starting;
// committing place/UI state is separate from beginning a visual transition.
export function createSceneTransition({apply,commit,onState=()=>{},resolve=d=>d}){
 let job=null,serial=0,reduced=false;
 const notify=()=>onState(job?{active:true,kind:job.kind,opacity:job.opacity,pending:job.destination}: {active:false,opacity:0,pending:null});
 function cancel(){if(!job)return false;serial++;job=null;notify();return true;}
 function finish(){if(!job)return false;const current=job;if(!current.committed){const destination=resolve(current.destination);if(!destination){cancel();return false;}apply(destination);commit(destination);}if(job===current){job=null;notify();}return true;}
 function request(destination,{kind='mask',duration=.62,path,immediate=false}={}){
  if(!destination)return false;
  cancel();const id=++serial;
  if(immediate||reduced){const resolved=resolve(destination);if(!resolved){notify();return false;}apply(resolved);commit(resolved);notify();return true;}
  job={id,destination,kind,duration,time:0,path,committed:false,opacity:0};notify();return true;
 }
 function update(dt){
  const current=job;if(!current)return;current.time+=Math.max(0,dt);
  const t=Math.min(1,current.time/current.duration);
  if(current.kind==='flight'){
   apply(current.path(t));
   if(t===1){commit(current.destination);if(job===current){job=null;notify();}}return;
  }
  current.opacity=t<.36?t/.36:t<.60?1:(1-t)/.40;
  // A full opaque hold separates the old scene from its new safe destination.
  if(t>=.36&&!current.committed){current.opacity=1;notify();if(job!==current)return;const resolved=resolve(current.destination);if(!resolved){cancel();return;}apply(resolved);commit(resolved);current.committed=true;}
  if(job!==current)return;
  if(t===1)job=null;notify();
 }
 return {request,update,cancel,finish,get active(){return !!job;},get pending(){return job?.destination??null;},get kind(){return job?.kind;},setReduced(value){reduced=value;if(value)finish();}};
}
