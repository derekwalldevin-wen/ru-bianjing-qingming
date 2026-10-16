import * as T from 'three';
import {createShoreRopePhysics} from './shore-rope-physics.js?v=traveller-work-v1';
import {shoreWorkPose} from './shore-work-pose.js?v=traveller-work-v1';
import {createShoreRopeVisual,shoreRopeAnchor} from './shore-rope-visual.js?v=traveller-work-v1';
import {createShoreRopeTask} from './shore-rope-task.js?v=traveller-work-v1';
import {canDiscover} from './walk-discovery.js?v=traveller-work-v1';

const copy={idle:'走近岸边，帮忙把松绳盘好。',loose:'沿岸向左走，到松绳末端归拢绳头。',gathering:'绳头正在收拢……',coil:'回到岸边绳圈旁，把余绳盘好。',coiling:'绳圈渐渐落稳……',done:'岸绳收好了。停一停，看看河上的往来。'};
export function createShoreAction({scene,world,nav,panel,sample,isVisible,archive,scenicObservation,focus=()=>{},onOpen=()=>{},onDisplay=()=>{}}){
 const visual=createShoreRopeVisual(scene,world),find=id=>panel.querySelector('#'+id),[x,z]=shoreRopeAnchor;
 let opened=false,scenic=false,version=0,disposed=false,lastDisplay,gatherAt=null,workAt=null,workYaw=0,doneTime=0,lastState=null;
 const physics=createShoreRopePhysics(visual,world),pickup=visual.getCentres('loose').at(-1).toArray();
 let work={active:false,crouch:0,weight:0,yaw:0};
 const target={id:'shore-rope',kind:'action',place:1,title:'岸边松绳',point:[x,world.contactFloor(x,z)+.65,z],interactionRadius:3.6,leaveRadius:4.1,activationLabel:'帮忙收好岸绳',interactionLabel:'帮忙收好 · 按 E 或点这里',interactionTouchLabel:'帮忙收好 · 点这里',enabled:true};
 const task=createShoreRopeTask({onChange:sync,onProgress:()=>{}});
 function sync(){
  const loose=task.phase==='loose'||task.phase==='gathering',dx=loose?-2.205:0,dz=loose?.05:0;
  target.point=[x+dx,world.contactFloor(x+dx,z+dz)+.65,z+dz];target.interactionRadius=task.phase==='idle'||task.phase==='done'?3.6:1.20;target.leaveRadius=target.interactionRadius+.2;refreshEnabled();
  target.title=task.phase==='loose'?'归拢绳头':task.phase==='coil'?'盘好绳圈':task.phase==='done'?'收好的岸绳':'岸边松绳';
  target.activationLabel=task.phase==='idle'?'帮忙收好岸绳':target.title;
  target.interactionLabel=task.phase==='idle'?'帮忙收好 · 按 E 或点这里':task.phase==='done'?'停一停 · 按 E 或点这里':'按 E 或点这里动手';
  target.interactionTouchLabel=task.phase==='idle'?'帮忙收好 · 点这里':task.phase==='done'?'停一停 · 点这里':'点这里动手';
  find('shore-goal').textContent=copy[task.phase];find('shore-scenic').hidden=task.phase!=='done'||scenic;find('shore-again').hidden=task.phase!=='done';find('shore-archive').hidden=task.phase!=='done';find('shore-close').textContent=task.phase==='done'?'继续漫游':'暂且放下';version++;
 }
 function refreshEnabled(){const p=sample().position,inReach=!['loose','coil'].includes(task.phase)||Math.hypot(p.x-target.point[0],p.y-target.point[1],p.z-target.point[2])<=target.interactionRadius,enabled=inReach&&!task.busy&&(task.phase!=='coil'||!gatherAt||Math.hypot(p.x-gatherAt[0],p.z-gatherAt[1])>=1);if(target.enabled!==enabled){target.enabled=enabled;version++;}}
 function close(){
  if(!opened)return false;opened=false;if(scenic){scenic=false;nav.closeInspection();}if(task.phase!=='done')reset();work={active:false,crouch:0,weight:0,yaw:workYaw};nav.setWorkFocus?.(0);display();focus();return true;
 }
 function display(){const state=sample(),visible=opened&&state.entered&&!state.hidden&&!state.modal&&!state.transitioning&&(state.mode==='walk'&&!state.inspecting||scenic&&state.inspecting);if(panel.hidden!==!visible)panel.hidden=!visible;if(lastDisplay!==visible){lastDisplay=visible;onDisplay(visible);}}
 function activate(){
  const state=sample();if(disposed||!target.enabled||!canDiscover(state))return false;
  const p=state.position;if(Math.hypot(p.x-target.point[0],p.y-target.point[1],p.z-target.point[2])>(['loose','coil'].includes(task.phase)?target.interactionRadius:target.leaveRadius)||!isVisible(target))return false;
  if(!opened){opened=true;onOpen();}nav.stop();if(task.phase==='loose'){gatherAt=[p.x,p.z];physics.begin();}if(task.phase==='loose'||task.phase==='coil'){workAt=[p.x,p.z];workYaw=Math.atan2(target.point[0]-p.x,target.point[2]-p.z);}if(task.phase!=='done')task.activate();sync();display();return true;
 }
 find('shore-close').onclick=close;
 find('shore-scenic').onclick=()=>{if(task.phase!=='done'||!opened||scenic)return;if(nav.inspect(scenicObservation)){scenic=true;sync();display();focus();}};
 find('shore-archive').onclick=()=>{if(opened&&task.phase==='done')archive(1);};
 find('shore-again').onclick=()=>{if(!opened||task.phase!=='done')return;if(scenic){scenic=false;nav.closeInspection();}reset();task.activate();sync();focus();};
 function reset(){physics.reset();visual.setProgress(0);task.reset();gatherAt=null;workAt=null;doneTime=0;}
 function update(dt){
  if(disposed)return;const state=sample();if(scenic&&!state.inspecting&&!state.transitioning)scenic=false;
  const suspended=state.hidden||state.modal||state.transitioning||state.inspecting||!state.entered;
  const near=Math.hypot(state.position.x-x,state.position.z-z)<14,eligible=state.mode==='walk';
  lastState={...state,suspended};
  if(!suspended&&task.busy&&workAt&&Math.hypot(state.position.x-workAt[0],state.position.z-workAt[1])>.06){reset();opened=false;}
  if(!suspended&&task.phase==='coil'&&Math.hypot(state.position.x-x,state.position.z-z)>3.8){reset();opened=false;}
  const before=task.phase;task.update(dt,{suspended,reduced:state.reduced,near,eligible});
  if(before!=='idle'&&task.phase==='idle'){physics.reset();visual.setProgress(0);}
  if(task.phase==='coil')workYaw=nav.visitorState?.yaw??workYaw;
  work=shoreWorkPose({phase:task.phase,fraction:task.fraction,position:state.position,yaw:workYaw,base:world.contactFloor(state.position.x,state.position.z),endpoint:pickup,anchor:[x,world.contactFloor(x,z),z],reduced:state.reduced});
  work.active&&=eligible&&!state.inspecting&&!state.transitioning;
  nav.setWorkFocus?.(work.active?work.crouch*.40:0);
  if(task.phase==='done'&&!suspended)doneTime+=Math.min(.1,Math.max(0,dt));
  refreshEnabled();
  if(!suspended&&(!near||!eligible)&&!scenic)opened=false;
  display();
 }
 function syncHands(contacts,dt){
  if(!lastState||disposed||!physics.active||task.phase==='done'&&doneTime>2)return;
  physics.update(dt,{phase:task.phase,progress:task.fraction,hand:contacts?.right??null,gripped:work.gripped,reduced:lastState.reduced,suspended:lastState.suspended});
 }
 function dispose(){if(disposed)return;close();disposed=true;visual.dispose();for(const id of ['shore-close','shore-scenic','shore-archive','shore-again'])find(id).onclick=null;}
 sync();return {target,activate,update,syncHands,close,dispose,visual,physics,get workPose(){return work;},get opened(){return opened;},get busy(){return task.busy;},get version(){return version;},get phase(){return task.phase;},get progress(){return task.progress;}};
}
