// Opt-in, visible QA instrument. Measures raw rendered-frame intervals;
// hidden documents and modal pauses are excluded rather than clamped.
export function createFrameMonitor(host, enabled) {
 if (!enabled) return {sample(){},reset(){}};
 const panel=document.createElement('aside');panel.id='frame-monitor';panel.style.cssText='position:fixed;right:12px;top:140px;z-index:90;background:#f4ecd8;color:#173c3e;padding:12px;border:1px solid #947a4e;font:12px monospace;max-width:250px';
 const start=document.createElement('button'),output=document.createElement('output');start.textContent='记录性能（240 帧）';start.style.cssText='min-height:44px;color:inherit';output.style.display='block';output.textContent='等待记录';panel.append(start,output);host.append(panel);
 let recording=false,previous=null,frames=[],calls=[],triangles=[];
 const percentile=(values,p)=>[...values].sort((a,b)=>a-b)[Math.ceil(values.length*p)-1];
 function reset(){previous=null;}
 start.onclick=()=>{frames=[];calls=[];triangles=[];previous=null;recording=true;output.textContent='记录中';panel.dataset.status='recording';};
 function sample(now,info){if(!recording)return;if(previous!==null){frames.push(now-previous);calls.push(info.calls);triangles.push(info.triangles);}previous=now;if(frames.length===240){recording=false;const result={samples:frames.length,median:percentile(frames,.5),p95:percentile(frames,.95),calls:percentile(calls,.5),triangles:percentile(triangles,.5),viewport:[innerWidth,innerHeight]};panel.dataset.result=JSON.stringify(result);panel.dataset.status='complete';output.textContent=`${result.samples} 帧 · 中位 ${result.median.toFixed(1)} ms · P95 ${result.p95.toFixed(1)} ms · calls ${result.calls}`;}}
 return {sample,reset};
}
