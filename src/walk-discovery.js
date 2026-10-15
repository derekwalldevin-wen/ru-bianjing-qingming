export function chooseWalkObservation({position,forward,observations,previous=null,isVisible=()=>true,onlyObservationId=null}){
 const forwardLength=Math.hypot(forward.x,forward.y,forward.z);
 if(![position.x,position.y,position.z,forwardLength].every(Number.isFinite)||forwardLength<.001)return null;
 const candidates=[];
 for(const object of observations){
  if(object.enabled===false)continue;
  if(onlyObservationId&&object.id!==onlyObservationId)continue;
  if(!Array.isArray(object.point)||object.point.length!==3||!object.point.every(Number.isFinite))continue;
  const dx=object.point[0]-position.x,dy=object.point[1]-position.y,dz=object.point[2]-position.z,distance=Math.hypot(dx,dy,dz);
  if(distance<.05)continue;
  const facing=(dx*forward.x+dy*forward.y+dz*forward.z)/(distance*forwardLength),held=object===previous;
  const enter=Number.isFinite(object.interactionRadius)?Math.min(12,Math.max(.1,object.interactionRadius)):12,leave=Number.isFinite(object.leaveRadius)?Math.max(enter,Math.min(14,object.leaveRadius)):enter+2;
  if(distance>(held?leave:enter)||facing<(held ? .18 : .35))continue;
  candidates.push({object,score:distance-2*facing,held});
 }
 candidates.sort((a,b)=>a.score-b.score);
 const held=candidates.find(c=>c.held);
 if(held&&held.score<=candidates[0].score+1.5)candidates.splice(0,0,...candidates.splice(candidates.indexOf(held),1));
 return candidates.find(c=>isVisible(c.object))?.object??null;
}

export function canDiscover(state){return Boolean(state.entered&&state.mode==='walk'&&!state.transitioning&&!state.inspecting&&!state.modal&&!state.objectOpen&&!state.hidden);}
export function isInteractionKey(event){
 const target=event.target,tag=target?.tagName?.toUpperCase();
 return event.code==='KeyE'&&!event.repeat&&!event.isComposing&&!event.ctrlKey&&!event.altKey&&!event.metaKey&&!['INPUT','SELECT','TEXTAREA'].includes(tag)&&!target?.isContentEditable;
}

export function createWalkDiscovery({button,title,observations,sample,isVisible,activate}){
 let selected=null,elapsed=1,lastPose=null;
 const hide=()=>{selected=null;lastPose=null;button.hidden=true;};
 function resolve(state=sample()){
  if(!canDiscover(state)){hide();return null;}
  return chooseWalkObservation({...state,observations,previous:selected,isVisible});
 }
 function update(dt){
  const state=sample();if(!canDiscover(state)){hide();return;}
  elapsed+=dt;if(elapsed<.14)return;elapsed=0;
  const p=state.position,f=state.forward,c=state.cameraPosition??p,version=state.occlusionVersion??0;
  if(lastPose&&Math.hypot(p.x-lastPose[0],p.y-lastPose[1],p.z-lastPose[2])<.015&&Math.hypot(f.x-lastPose[3],f.y-lastPose[4],f.z-lastPose[5])<.003&&version===lastPose[6]&&Math.hypot(c.x-lastPose[7],c.y-lastPose[8],c.z-lastPose[9])<.015)return;
  const next=resolve(state);lastPose=[p.x,p.y,p.z,f.x,f.y,f.z,version,c.x,c.y,c.z];
  if(next!==selected||title.textContent!==(next?.title??'')){
   selected=next;title.textContent=next?.title??'';button.setAttribute('aria-label',next?.activationLabel??(next?`停步细看${next.title}`:'停步细看'));
   const keyboard=button.querySelector?.('.interaction-keyboard'),touch=button.querySelector?.('.interaction-touch');
   if(keyboard)keyboard.textContent=next?.interactionLabel??'停步细看 · 按 E 或点这里';if(touch)touch.textContent=next?.interactionTouchLabel??'停步细看 · 点这里';
  }
  button.hidden=!selected;
 }
 function interact(){const next=resolve();if(!next)return false;hide();return activate(next)!==false;}
 button.onclick=interact;
 return {update,interact,hide,get selected(){return selected;}};
}
