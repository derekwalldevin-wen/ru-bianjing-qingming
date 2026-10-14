// Navigation owns movement and commits. This presentation never moves a camera.
export function createChapterPresentation({curtain,arrival,places,current,visible,motionReduced,schedule=setTimeout,unschedule=clearTimeout}){
 const find=(root,key)=>root.querySelector('[data-chapter-'+key+']');
 let candidate=null,timer;
 function dismiss(){if(timer!==undefined)unschedule(timer);timer=undefined;arrival.hidden=true;}
 function write(root,p){
  find(root,'number').textContent=`第${p.n}景 · ${p.small}`;
  find(root,'title').textContent=p.name;find(root,'line').textContent=p.sub;
 }
 function update(state){
  if(state.active){
   dismiss();
   if(candidate?.destination!==state.pending){
    const p=places[state.pending?.index];
    candidate=p?{destination:state.pending,changed:state.pending.index!==current()}:null;
    curtain.dataset.chapter=String(Boolean(candidate?.changed));
    if(candidate?.changed){write(curtain,p);find(curtain,'art').src=`assets/${p.id}-original.webp`;}
    else{find(curtain,'number').textContent='循河寻迹';find(curtain,'title').textContent='移步换景';find(curtain,'line').textContent='';}
   }
   return;
  }
  const completed=candidate;candidate=null;
  if(completed?.changed&&completed.destination.index===current()&&visible()&&!motionReduced()&&completed.destination.mode!=='tour'){
   write(arrival,places[current()]);arrival.hidden=false;
   timer=schedule(dismiss,3200);
  }
 }
 return {update,dismiss};
}
