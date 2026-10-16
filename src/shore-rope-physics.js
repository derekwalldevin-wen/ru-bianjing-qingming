import * as T from 'three';

// One short strand, fixed material lengths, ground contact and a real palm pin.
// No world physics dependency, new render pass or background worker.
export function createShoreRopePhysics(visual,world){
 const loose=visual.getCentres('loose'),tidy=visual.getCentres('tidy'),nodes=loose.map(p=>p.clone()),previous=loose.map(p=>p.clone()),lengths=nodes.slice(1).map((p,i)=>p.distanceTo(nodes[i]));
 const spans=[4,12,36,120].flatMap(span=>nodes.slice(0,-span).map((_,i)=>({a:i,b:i+span,length:lengths.slice(i,i+span).reduce((a,b)=>a+b,0)})));
 const delta=new T.Vector3(),before=new T.Vector3(),goal=new T.Vector3(),last=nodes.length-1,stats={segments:last,materialLength:lengths.reduce((a,b)=>a+b,0),maxSegmentError:0,handGap:0,minGroundGap:Infinity};
 let active=false,revision=0;
 function reset(){for(let i=0;i<nodes.length;i++){nodes[i].copy(loose[i]);previous[i].copy(loose[i]);}active=false;}
 function begin(){reset();active=true;}
 function update(dt,{phase,progress=0,hand=null,gripped=false,reduced=false,suspended=false}){
  if(!active||suspended)return false;
  const held=gripped&&hand,blend=phase==='done'?1:phase==='coiling'?T.MathUtils.smoothstep(progress,.22,.85):0;
  const from=nodes[last].clone(),pin=from.clone(),iterations=reduced?96:48,steps=reduced?Math.max(1,Math.ceil((held?from.distanceTo(hand):0)/.035)):Math.max(1,Math.ceil(Math.min(.1,Math.max(0,dt))/(1/60))),h=reduced?1/60:Math.min(.1,Math.max(0,dt))/steps;
  if(h<=0)return false;
  for(let step=0;step<steps;step++){
   if(held)pin.lerpVectors(from,hand,(step+1)/steps);
   for(let i=1;i<nodes.length;i++){
    before.copy(nodes[i]);delta.subVectors(nodes[i],previous[i]).multiplyScalar(Math.pow(.96,h*60));nodes[i].add(delta);nodes[i].y-=5.0*h*h;previous[i].copy(before);
    if(blend>0){goal.lerpVectors(loose[i],tidy[i],blend);nodes[i].lerp(goal,1-Math.exp(-(phase==='done'?24:12)*h));}
   }
   for(let iteration=0;iteration<iterations;iteration++){
    nodes[0].copy(loose[0]);if(held)nodes[last].copy(pin);
    // Long upper bounds propagate palm tension without straightening slack coils.
    for(const span of spans){const a=nodes[span.a],b=nodes[span.b];delta.subVectors(b,a);const d=delta.length();if(d<=span.length)continue;delta.multiplyScalar((d-span.length)/d);const fa=span.a===0,fb=Boolean(held&&span.b===last);if(fa&&!fb)b.sub(delta);else if(!fa&&fb)a.add(delta);else if(!fa&&!fb){a.addScaledVector(delta,.5);b.addScaledVector(delta,-.5);}}
    for(let k=0;k<last;k++){
     const i=iteration%2?last-1-k:k,a=nodes[i],b=nodes[i+1];delta.subVectors(b,a);const distance=delta.length();if(distance<1e-9)continue;delta.multiplyScalar((distance-lengths[i])/distance);
     const fixedA=i===0,fixedB=Boolean(held&&i+1===last);
     if(fixedA&&!fixedB)b.sub(delta);else if(!fixedA&&fixedB)a.add(delta);else if(!fixedA&&!fixedB){a.addScaledVector(delta,.5);b.addScaledVector(delta,-.5);}
    }
    if(iteration%4===3||iteration===iterations-1)for(let i=1;i<nodes.length;i++){
     if(held&&i===last)continue;const floor=world.contactFloor(nodes[i].x,nodes[i].z)+.023;if(nodes[i].y<floor){nodes[i].y=floor;previous[i].y=floor;previous[i].x=T.MathUtils.lerp(previous[i].x,nodes[i].x,.18);previous[i].z=T.MathUtils.lerp(previous[i].z,nodes[i].z,.18);}
    }
   }
   nodes[0].copy(loose[0]);if(held)nodes[last].copy(pin);
  }
  stats.maxSegmentError=0;stats.minGroundGap=Infinity;for(let i=0;i<nodes.length;i++){stats.minGroundGap=Math.min(stats.minGroundGap,nodes[i].y-world.contactFloor(nodes[i].x,nodes[i].z));if(i)stats.maxSegmentError=Math.max(stats.maxSegmentError,Math.abs(nodes[i].distanceTo(nodes[i-1])-lengths[i-1]));}
  stats.handGap=held?nodes[last].distanceTo(hand):0;visual.applyNodes(nodes);revision++;return true;
 }
 return{begin,reset,update,nodes,stats,get revision(){return revision;},get active(){return active;},get endpoint(){return nodes[last];}};
}
