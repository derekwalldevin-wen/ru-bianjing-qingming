export function requiredEnhancementsForPlace(place,selected,quality){
 const ordinary=[['bridge','closeup','architecture'],['life','architecture'],['architecture','closeup'],['closeup','architecture','life'],['architecture','life'],['life','architecture']][place]||[];
 const focused=selected?.place===place?(selected.requiredEnhancements??(selected.enhancement?[selected.enhancement]:[])):[];
 // While inspecting an object, reserve the transfer slots for its own detail
 // package. Background city enhancements resume after the card closes.
 return [...new Set(selected?.place===place?focused:quality==='low'?[]:ordinary)];
}
// Stream embedded GLB bytes with a real fetch cancellation boundary. Geometry
// parsing is not cancellable, so a late result is disposed before it can apply.
export async function fetchModelBytes(url,{signal,onProgress=()=>{},expectedBytes,timeout=45000,fetcher=fetch}={}){
 const request=new AbortController();
 const cancel=()=>request.abort(signal.reason);
 if(signal?.aborted)cancel();else signal?.addEventListener('abort',cancel,{once:true});
 const timer=setTimeout(()=>request.abort(new Error('模型载入超时')),timeout);
 try{
  const response=await fetcher(url,{signal:request.signal});
  if(!response.ok)throw new Error(`模型读取失败（${response.status}）`);
  const reader=response.body?.getReader();let bytes;
  if(reader){
   const chunks=[];let received=0;
   try{while(true){const {value,done}=await reader.read();if(done)break;request.signal.throwIfAborted();chunks.push(value);received+=value.byteLength;onProgress(received);}}
   finally{if(request.signal.aborted)await reader.cancel().catch(()=>{});reader.releaseLock();}
   bytes=new Uint8Array(received);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  }else{bytes=new Uint8Array(await response.arrayBuffer());onProgress(bytes.length);}
  request.signal.throwIfAborted();
  if(expectedBytes!==undefined&&bytes.length!==expectedBytes)throw new Error('模型文件不完整，请重试');
  return bytes.buffer;
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
}

export function createEnhancementQueue({kinds,load,apply,dispose=()=>{},onState=()=>{},concurrency=2}){
 if(!Number.isInteger(concurrency)||concurrency<1)throw new Error('Invalid enhancement concurrency');
 const entries=new Map(kinds.map(kind=>[kind,{phase:'idle',job:null,error:null,received:0}]));
 let desired=[],closed=false;const waiters=[];
 const snapshot=()=>({desired:[...desired],states:Object.fromEntries([...entries].map(([k,v])=>[k,{phase:v.phase,error:v.error,received:v.received}]))});
 function notify(){onState(snapshot());}
 function idle(){return ![...entries.values()].some(e=>e.job)&&!desired.some(k=>entries.get(k).phase==='idle');}
 function settleWaiters(){if(idle())for(const resolve of waiters.splice(0))resolve(snapshot());}
 function pump(){
  if(closed){settleWaiters();return;}
  let active=[...entries.values()].filter(e=>e.job).length;
  for(const kind of desired){
   const entry=entries.get(kind);if(active>=concurrency)break;if(entry.phase!=='idle'||entry.job)continue;
   const controller=new AbortController(),job={controller};entry.job=job;entry.phase='loading';entry.error=null;entry.received=0;active++;
   Promise.resolve().then(()=>load(kind,controller.signal,bytes=>{if(entry.job===job&&!controller.signal.aborted){entry.received=bytes;notify();}}))
    .then(async result=>{
     if(controller.signal.aborted||closed){dispose(result);controller.signal.throwIfAborted();throw new Error('Enhancement queue closed');}
     try{await apply(kind,result);}catch(error){dispose(result);throw error;}
     entry.phase='ready';
    }).catch(error=>{entry.phase=controller.signal.aborted?'idle':'error';entry.error=controller.signal.aborted?null:String(error.message||error);})
    .finally(()=>{entry.job=null;if(entry.phase==='idle')entry.received=0;notify();pump();settleWaiters();});
  }
  notify();settleWaiters();
 }
 return {
  setDesired(next){
   if(closed)return;const unique=[...new Set(next)];for(const kind of unique)if(!entries.has(kind))throw new Error('Unknown enhancement '+kind);
   desired=unique;for(const [kind,entry] of entries)if(entry.job&&!desired.includes(kind))entry.job.controller.abort(new DOMException('已切换地点','AbortError'));pump();
  },
  retry(){for(const kind of desired){const e=entries.get(kind);if(e.phase==='error'){e.phase='idle';e.error=null;}}pump();},
  snapshot,
  whenIdle(){return idle()?Promise.resolve(snapshot()):new Promise(resolve=>waiters.push(resolve));},
  close(){closed=true;desired=[];for(const e of entries.values())e.job?.controller.abort(new DOMException('游览结束','AbortError'));settleWaiters();}
 };
}
