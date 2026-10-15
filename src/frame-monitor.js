// Opt-in QA. Render CPU time includes nested reflection submission time.
export function createFrameMonitor(host,enabled){
 if(!enabled)return{sample(){},reset(){},begin(){return null;},end(){},bindRenderer(){},beginGPU(){},endGPU(){},dispose(){}};
 const panel=document.createElement('aside');panel.id='frame-monitor';panel.style.cssText='position:fixed;right:12px;top:140px;z-index:90;background:#f4ecd8;color:#173c3e;padding:12px;border:1px solid #947a4e;font:12px monospace;max-width:250px';
 const start=document.createElement('button'),output=document.createElement('output');start.textContent='记录性能（240 帧）';start.style.cssText='min-height:44px;color:inherit';output.style.display='block';output.textContent='等待记录';panel.append(start,output);host.append(panel);
 let collecting=false,finishing=false,previous=null,frames=[],calls=[],triangles=[],spans={},spanSamples={},gl=null,extension=null,pending=[],active=null,gpuValues=[],disjoint=false,gpuSkipped=0,drain=0,timedOut=false;
 const percentile=(values,p)=>[...values].sort((a,b)=>a-b)[Math.ceil(values.length*p)-1];
 const stats=values=>({samples:values.length,median:percentile(values,.5),p95:percentile(values,.95)});
 function clearQueries(){if(active){gl.endQuery(extension.TIME_ELAPSED_EXT);gl.deleteQuery(active);active=null;}for(const query of pending)gl.deleteQuery(query);pending=[];}
 function bindRenderer(renderer){try{gl=renderer.getContext();extension=gl.getExtension('EXT_disjoint_timer_query_webgl2');}catch{extension=null;}panel.dataset.gpuTimerStatus=extension?'supported':'unavailable';}
 function pollGPU(){
  if(!extension||!pending.length)return;
  if(gl.getParameter(extension.GPU_DISJOINT_EXT)){disjoint=true;gpuValues=[];for(const query of pending)gl.deleteQuery(query);pending=[];return;}
  for(let i=0;i<pending.length;){const query=pending[i];if(!gl.getQueryParameter(query,gl.QUERY_RESULT_AVAILABLE)){i++;continue;}const milliseconds=gl.getQueryParameter(query,gl.QUERY_RESULT)/1e6;if(!disjoint&&Number.isFinite(milliseconds)&&milliseconds>=0)gpuValues.push(milliseconds);gl.deleteQuery(query);pending.splice(i,1);}
 }
 function beginGPU(){pollGPU();if(!collecting||previous===null||!extension)return;if(pending.length>=8){gpuSkipped++;return;}active=gl.createQuery();gl.beginQuery(extension.TIME_ELAPSED_EXT,active);}
 function endGPU(){if(!active)return;gl.endQuery(extension.TIME_ELAPSED_EXT);pending.push(active);active=null;}
 function publish(){
  const cpuMilliseconds=Object.fromEntries(Object.entries(spanSamples).map(([name,values])=>[name,stats(values)]));
  const gpu={supported:Boolean(extension),disjoint,timedOut,samples:gpuValues.length,skipped:gpuSkipped,...(!disjoint&&!timedOut&&gpuValues.length?{milliseconds:stats(gpuValues)}:{})};
  const result={...stats(frames),calls:percentile(calls,.5),triangles:percentile(triangles,.5),viewport:[innerWidth,innerHeight],cpuMilliseconds,gpu};
  panel.dataset.result=JSON.stringify(result);panel.dataset.status='complete';output.textContent=`${result.samples} 帧 · 中位 ${result.median.toFixed(1)} ms · P95 ${result.p95.toFixed(1)} ms · calls ${result.calls}`;finishing=false;
 }
 function reset(){previous=null;spans={};}
 start.onclick=()=>{clearQueries();frames=[];calls=[];triangles=[];spanSamples={};gpuValues=[];gpuSkipped=0;disjoint=false;drain=0;timedOut=false;reset();collecting=true;finishing=false;output.textContent='记录中';delete panel.dataset.result;panel.dataset.status='recording';};
 function begin(){return collecting?performance.now():null;}
 function end(name,started){if(collecting&&started!==null){spanSamples[name]??=Array(frames.length).fill(0);spans[name]=(spans[name]??0)+Math.max(0,performance.now()-started);}}
 function sample(now,info){
  pollGPU();if(finishing){if(pending.length&&++drain>120){timedOut=true;gpuSkipped+=pending.length;clearQueries();}if(!pending.length)publish();return;}if(!collecting)return;
  if(previous!==null){frames.push(now-previous);calls.push(info.calls);triangles.push(info.triangles);for(const name of Object.keys(spanSamples))spanSamples[name].push(spans[name]??0);}
  previous=now;spans={};if(frames.length===240){collecting=false;finishing=true;panel.dataset.status=pending.length?'gpu-pending':'recording';if(!pending.length)publish();}
 }
 function dispose(){collecting=finishing=false;clearQueries();start.onclick=null;panel.dataset.status='stopped';}
 return{sample,reset,begin,end,bindRenderer,beginGPU,endGPU,dispose};
}
