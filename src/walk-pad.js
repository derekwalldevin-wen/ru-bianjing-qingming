// Real pointer holds stay continuous; quick taps finish a short step.
// Native keyboard/assistive click activation gets the same short step.
export function bindWalkPad(buttons,{getNavigation,windowTarget=window}){
 const cleanups=[];
 for(const button of buttons){
  button.title='轻点微步，长按行走';
  let pointer=null,started=0;
  const release=(event,complete)=>{
   if(pointer===null||event.pointerId!==pointer)return;
   const key=button.dataset.key;getNavigation()?.keys.delete(key);button.classList.remove('held');pointer=null;
   if(complete)getNavigation()?.stepWalk(key,Math.max(0,(event.timeStamp-started)/1000));
  };
  const down=event=>{
   if(pointer!==null||event.button>0)return;
   event.preventDefault();pointer=event.pointerId;started=event.timeStamp;
   getNavigation()?.keys.add(button.dataset.key);button.classList.add('held');button.setPointerCapture(event.pointerId);
  };
  const up=event=>release(event,true),cancel=event=>release(event,false);
  const click=event=>{if(event.detail===0)getNavigation()?.stepWalk(button.dataset.key);};
  const reset=()=>{getNavigation()?.keys.delete(button.dataset.key);pointer=null;button.classList.remove('held');};
  for(const [name,handler] of [['pointerdown',down],['pointerup',up],['pointercancel',cancel],['lostpointercapture',cancel],['click',click]]){
   button.addEventListener(name,handler);cleanups.push(()=>button.removeEventListener(name,handler));
  }
  windowTarget.addEventListener('blur',reset);cleanups.push(()=>{windowTarget.removeEventListener('blur',reset);reset();});
 }
 return ()=>{for(const cleanup of cleanups)cleanup();};
}
