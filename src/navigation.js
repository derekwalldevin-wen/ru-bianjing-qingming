import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createDirectionController} from '../vendor/cheoma-heading.js';
import {reframe} from './painting-layout.js?v=original-scroll-v1';
import {places,tour} from './content.js?v=original-scroll-v1';
import {createWalkMotion} from './walk-motion.js';
import {createSceneTransition} from './scene-transition.js';
import {observations} from './observations.js?v=original-scroll-v1';
import {createFollowCamera} from './follow-camera.js?v=shore-action-v1';
export {observations} from './observations.js?v=original-scroll-v1';

export const bridgeMarketPath=[[46,21,56],[87,40,33],[156,40,41],[223,35,49],reframe([-48,11,1],'market')];

export function createNavigation(camera,canvas,world,onChange=()=>{},onTour=()=>{},onTransition=()=>{},onError=()=>{},{walkView='first',clipCamera}={}){
 const controls=new OrbitControls(camera,canvas);
 Object.assign(controls,{enableDamping:true,dampingFactor:.065,minDistance:8,maxDistance:430,maxPolarAngle:Math.PI*.475,minPolarAngle:.12,panSpeed:.6,zoomSpeed:.7});controls.target.set(0,2,0);
 const motion=createWalkMotion(),keys=new Set(),facing=new T.Vector3(),look=new T.Vector3();
 const lookController=createDirectionController({maxYawSpeed:Math.PI*2,maxYawAcceleration:Math.PI*10});
 const visitorPosition=new T.Vector3(),visitorForward=new T.Vector3(),follow=createFollowCamera(camera,clipCamera);
 Object.defineProperty(visitorPosition,'radius',{get:()=>world.visitorRadius??.32});
 let view=walkView==='follow'?'follow':'first',bodyYaw=0,speed=0;
 let mode='overview',yaw=0,pitch=0,drag=null,reduced=false,index=0,tourIndex=0,tourTime=0,paused=false,enabled=true,detailReturn=null;
 const clear=()=>{keys.clear();drag=null;motion.reset();speed=0;};
 const syncControls=()=>{controls.enabled=enabled&&mode==='overview'&&!transition.active;controls.enableDamping=!reduced;controls.minDistance=detailReturn? .65:8;};
 const emitTour=()=>onTour(tourIndex,Math.min(1,tourTime/tour[tourIndex].duration),paused);
 function renderWalk(dt=0,snap=false){if(view==='follow')follow.update(visitorPosition,yaw,pitch,dt,{snap,reduced});else{camera.position.copy(visitorPosition);camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0);}}
 function apply(pose){
  camera.position.fromArray(pose.position);controls.target.fromArray(pose.look);
  if(pose.mode==='walk'){
   view=pose.walkView??view;visitorPosition.fromArray(pose.visitorPosition??pose.position);yaw=pose.yaw;pitch=pose.pitch;bodyYaw=pose.bodyYaw??yaw+Math.PI;
   if(pose.visitorPosition){camera.lookAt(controls.target);}else renderWalk(0,true);
  }else camera.lookAt(controls.target);
 }
 function commit(destination){
  clear();index=destination.index;mode=destination.mode;
  if(mode==='walk'){yaw=destination.yaw;pitch=destination.pitch;}
  if(mode==='tour'){tourIndex=destination.tourIndex;tourTime=destination.tourTime??0;paused=destination.paused??false;lookController.reset(camera.getWorldDirection(facing));emitTour();}
  syncControls();onChange(mode,index);
 }
 function resolveDestination(dest){if(dest.mode!=='walk')return dest;const [x,,z]=dest.visitorPosition??dest.position,spawn=world.walkSpawn?.(x,z)??(world.walkSpawn?null:[x,z]);if(!spawn){onError('这里暂时没有安全落点，已保留原位置。');return null;}
  const position=[spawn[0],world.floor(...spawn)+1.65,spawn[1]];
  // Exact inspection return is retained when the physical landing is still
  // clear. If people now occupy it, reposition both player and camera safely.
  if(dest.visitorPosition&&Math.hypot(spawn[0]-x,spawn[1]-z)<1e-7)return dest;
  const {visitorPosition:discard,...rest}=dest;return {...rest,position};
 }
 const transition=createSceneTransition({apply,commit,resolve:resolveDestination,onState:state=>{syncControls();onTransition(state);}});
 function snapshot(){return {position:camera.position.toArray(),look:camera.getWorldDirection(facing).multiplyScalar(15).add(camera.position).toArray(),index,mode,yaw,pitch,tourIndex,tourTime,paused,...(mode==='walk'?{visitorPosition:visitorPosition.toArray(),walkView:view,bodyYaw}:{})};}
 function destination(i,nextMode){
  if(!places[i])return null;const p=places[i];
  if(nextMode==='walk'){
   const spawn=world.walkSpawn?.(p.walk[0],p.walk[2])??(world.walkSpawn?null:[p.walk[0],p.walk[2]]);
   if(!spawn||!(world.canWalk||world.valid)(...spawn)){onError('此处暂时拥挤，请稍后再试或选择俯瞰。');return null;}
   const y=world.floor(...spawn)+1.65;
   return {index:i,mode:'walk',position:[spawn[0],y,spawn[1]],look:[spawn[0]-Math.sin(p.heading)*10,y,spawn[1]-Math.cos(p.heading)*10],yaw:p.heading,pitch:i===3?-.16:.03};
  }
  return {index:i,mode:'overview',position:p.view,look:p.target};
 }
 function request(dest,immediate=false,allowPath=true){
  if(!dest)return false;clear();if(mode==='overview'&&!transition.active){controls.enableDamping=false;controls.update();controls.enableDamping=!reduced;}let options={immediate,duration:dest.index!==index?1.25:.62};
  // Only authored elevated overview routes use continuous travel. Arbitrary
  // orbit poses and all walking transfers use the opaque safe-spawn handoff.
  if(allowPath&&mode==='overview'&&dest.mode==='overview'&&((index===0&&dest.index===3)||(index===3&&dest.index===0))&&camera.position.distanceTo(new T.Vector3(...places[index].view))<4){
   const points=(index===0?bridgeMarketPath:[...bridgeMarketPath].reverse()).map(p=>new T.Vector3(...p));points[0]=camera.position.clone();points[points.length-1]=new T.Vector3(...dest.position);
   const curve=new T.CatmullRomCurve3(points,false,'centripetal');const from=controls.target.clone(),to=new T.Vector3(...dest.look);
   options={immediate,kind:'flight',duration:2.1,path:t=>{const eased=t*t*(3-2*t);return {...dest,position:curve.getPointAt(eased).toArray(),look:new T.Vector3().lerpVectors(from,to,eased).toArray()};}};
  }
  return transition.request(dest,options);
 }
 function go(i,immediate=false){detailReturn=null;return request(destination(i,mode==='walk'?'walk':'overview'),immediate);}
 function overview(){detailReturn=null;return request(destination(transition.pending?.index??index,'overview'));}
 function walk(i=transition.pending?.index??index){detailReturn=null;return request(destination(i,'walk'));}
 function locate(i){if(!enabled||mode!=='walk'||transition.active||detailReturn||!places[i])return false;if(index!==i){index=i;onChange(mode,index);}return true;}
 function startTour(i=0){if(!tour[i])return false;detailReturn=null;const t=tour[i];return request({index:t.place,mode:'tour',position:t.from,look:t.look,tourIndex:i,tourTime:0,paused:false},false,false);}
 function inspect(observation){if(!observations.includes(observation))return false;if(!detailReturn)detailReturn=snapshot();const compact=canvas.clientWidth<=650;return request({index:observation.place,mode:'overview',position:compact&&observation.mobileView?observation.mobileView:observation.view,look:compact&&observation.mobileLook?observation.mobileLook:observation.look},false,false);}
 function closeInspection(){if(!detailReturn)return;const returnTo=detailReturn;detailReturn=null;request(returnTo,false,false);}
 function cancel(){const was=transition.cancel();clear();syncControls();return was;}
 function skip(){clear();transition.finish();syncControls();}
 function escape(){if(transition.active){skip();return;}if(detailReturn){closeInspection();return;}if(mode!=='overview')overview();}
 canvas.addEventListener('pointerdown',e=>{if(!enabled)return;if(transition.active){cancel();return;}if(mode==='tour'){overview();return;}if(mode==='walk'){drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);}});
 controls.addEventListener('start',()=>{if(transition.active)cancel();});
 canvas.addEventListener('pointermove',e=>{if(!enabled||!drag||drag.id!==e.pointerId||mode!=='walk'||transition.active)return;yaw-=(e.clientX-drag.x)*.004;pitch=T.MathUtils.clamp(pitch-(e.clientY-drag.y)*.003,-1.05,1.05);drag.x=e.clientX;drag.y=e.clientY;});
 canvas.addEventListener('pointerup',()=>drag=null);canvas.addEventListener('pointercancel',()=>drag=null);
 canvas.addEventListener('wheel',()=>{if(!enabled)return;if(transition.active)cancel();else if(mode==='tour')overview();},{passive:true});
 window.addEventListener('keydown',e=>{if(!enabled||/INPUT|SELECT|TEXTAREA/.test(e.target?.tagName??''))return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft'].includes(e.code)&&mode==='walk'&&!transition.active){keys.add(e.code);e.preventDefault();}});
 window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
 function update(dt){
  if(!enabled||document.hidden)return;
  if(transition.active){transition.update(dt);return;}
  if(mode==='overview'){controls.update();controls.target.x=T.MathUtils.clamp(controls.target.x,-338,338);controls.target.z=T.MathUtils.clamp(controls.target.z,-146,146);controls.target.y=T.MathUtils.clamp(controls.target.y,0,12);return;}
  if(mode==='walk'){
   const forward=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0),side=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);
   const oldX=visitorPosition.x,oldZ=visitorPosition.z;
   const {x,z}=motion.step({x:oldX,z:oldZ,forward,side,yaw,fast:keys.has('ShiftLeft'),dt,allowed:world.canWalk||world.valid});visitorPosition.set(x,world.floor(x,z)+1.65,z);
   const distance=Math.hypot(x-oldX,z-oldZ);speed=dt>0?distance/Math.min(.1,dt):0;
   if(distance>1e-6){const desired=Math.atan2(x-oldX,z-oldZ),turn=Math.atan2(Math.sin(desired-bodyYaw),Math.cos(desired-bodyYaw));bodyYaw+=T.MathUtils.clamp(turn,-Math.max(0,dt)*9,Math.max(0,dt)*9);}
   renderWalk(dt);return;
  }
  if(paused){emitTour();return;}
  const chapter=tour[tourIndex];tourTime+=dt;const progress=Math.min(1,tourTime/chapter.duration);
  camera.position.lerpVectors(new T.Vector3(...chapter.from),new T.Vector3(...chapter.to),reduced?0:progress*progress*(3-2*progress));
  look.fromArray(chapter.look).sub(camera.position).normalize();const direction=reduced?look:lookController.step(look,dt);camera.lookAt(camera.position.x+direction.x,camera.position.y+direction.y,camera.position.z+direction.z);emitTour();
  if(progress>=1&&!paused){if(tourIndex<tour.length-1)startTour(tourIndex+1);else{paused=true;emitTour();}}
 }
 function setWalkView(value){if(!['first','follow'].includes(value)||transition.active||detailReturn)return false;view=value;clear();if(mode==='walk')renderWalk(0,true);return true;}
 return {stop:clear,go,walk,locate,overview,startTour,inspect,closeInspection,snapshot,escape,cancel,skip,update,controls,keys,setWalkView,get walkView(){return view;},get visitorPosition(){return visitorPosition;},get visitorForward(){return visitorForward.set(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch));},get visitorState(){return {position:visitorPosition,yaw:bodyYaw,speed,visible:mode==='walk'&&view==='follow'&&!transition.active&&!detailReturn};},get mode(){return mode;},get index(){return index;},get transitioning(){return transition.active;},get pending(){return transition.pending;},get inspecting(){return !!detailReturn;},setReduced(value){reduced=value;transition.setReduced(value);syncControls();},setEnabled(value){enabled=value;clear();syncControls();},togglePause(){if(transition.active&&transition.pending?.mode==='tour'){const target={...transition.pending,paused:!transition.pending.paused};transition.request(target,{immediate:reduced});return;}paused=!paused;emitTour();},nextTour(){startTour(((transition.pending?.tourIndex??tourIndex)+1)%tour.length);}};
}
