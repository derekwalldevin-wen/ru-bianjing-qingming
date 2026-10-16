import {MathUtils} from 'three';

// Fixed shader-light budget. New locations replace dark slots, never fly a lit
// point light through the city. Existing assignments get a small stay bias.
export function createLocalLightPool(sources,lights){
 const byId=new Map(sources.map(s=>[s.id,s]));
 if(byId.size!==sources.length)throw Error('Duplicate local light source');
 const slots=lights.map((light,i)=>({light,id:sources[i]?.id??null,pending:null,level:1}));
 function update(focus,dt,{reduced=false,capacity=lights.length}={}){
  const count=Math.min(lights.length,Math.max(0,Math.floor(capacity))),held=new Set(slots.slice(0,count).map(s=>s.id));
  const wanted=sources.map(s=>({id:s.id,score:s.position.distanceToSquared(focus)*(held.has(s.id) ? .82 : 1)})).sort((a,b)=>a.score-b.score||a.id.localeCompare(b.id)).slice(0,count).map(s=>s.id);
  const requests=new Array(count).fill(null),used=new Set();
  for(let i=0;i<count;i++)if(wanted.includes(slots[i].id)){requests[i]=slots[i].id;used.add(requests[i]);}
  for(let i=0;i<count;i++)if(!requests[i]&&wanted.includes(slots[i].pending)&&!used.has(slots[i].pending)){requests[i]=slots[i].pending;used.add(requests[i]);}
  for(let i=0;i<count;i++)if(!requests[i]){requests[i]=wanted.find(id=>!used.has(id))??null;used.add(requests[i]);}
  const step=Math.max(0,Math.min(dt,.1));
  for(let i=0;i<slots.length;i++){
   const slot=slots[i],next=requests[i]??null;
   slot.light.visible=i<count&&next!==null;
   if(!slot.light.visible){slot.level=0;slot.id=null;slot.pending=null;slot.light.intensity=0;continue;}
   if(reduced||slot.id===null){slot.id=next;slot.pending=null;slot.level=reduced?1:0;}
   else if(slot.id!==next){slot.pending=next;slot.level=MathUtils.damp(slot.level,0,10,step);if(slot.level<.004){slot.id=next;slot.pending=null;slot.level=0;}}
   else{slot.pending=null;slot.level=MathUtils.damp(slot.level,1,10,step);}
   const source=byId.get(slot.id);if(source){slot.light.position.copy(source.position);slot.light.distance=source.range;}
  }
 }
 return {update,slots,source:id=>byId.get(id),get assignments(){return slots.map(s=>({id:s.id,pending:s.pending,level:s.level,visible:s.light.visible}));}};
}
