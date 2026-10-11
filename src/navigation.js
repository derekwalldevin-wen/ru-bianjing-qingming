import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createDirectionController} from '../vendor/cheoma-heading.js';
import {places,tour} from './content.js';
import {createWalkMotion} from './walk-motion.js';

export function createNavigation(camera,canvas,world,onChange,onTour){
 const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.065;controls.minDistance=8;controls.maxDistance=130;controls.maxPolarAngle=Math.PI*.475;controls.minPolarAngle=.12;controls.target.set(0,2,0);controls.panSpeed=.6;controls.zoomSpeed=.7;
 const motion=createWalkMotion();
 const keys=new Set(),lookController=createDirectionController({maxYawSpeed:Math.PI*2,maxYawAcceleration:Math.PI*10});const facing=new T.Vector3(),targetLook=new T.Vector3();
 let mode='overview',flight=null,yaw=0,pitch=0,drag=null,reduced=false,index=0,tourIndex=0,tourTime=0,paused=false,enabled=true;
 function clear(){keys.clear();drag=null;motion.reset();}
 function setMode(next){clear();mode=next;controls.enabled=enabled&&next==='overview';controls.enableDamping=!reduced;onChange(mode,index);}
 function go(i,immediate=false){index=i;const p=places[i];if(mode==='walk'){walk(i);return;}setMode('overview');const end=new T.Vector3(...p.view);if(immediate||reduced){camera.position.copy(end);controls.target.set(...p.target);camera.lookAt(controls.target);flight=null;controls.update();}else{flight={start:camera.position.clone(),end,lookStart:controls.target.clone(),lookEnd:new T.Vector3(...p.target),time:0,duration:2.1};controls.enabled=false;}}
 function overview(){flight=null;setMode('overview');controls.target.copy(camera.position).add(camera.getWorldDirection(new T.Vector3()).multiplyScalar(15));go(index);}
 function walk(i=index){const p=places[i],spawn=world.walkSpawn?.(p.walk[0],p.walk[2])??(world.walkSpawn?null:[p.walk[0],p.walk[2]]);if(!spawn)return;index=i;flight=null;setMode('walk');camera.position.set(spawn[0],world.floor(...spawn)+1.65,spawn[1]);yaw=p.heading;pitch=.03;camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0);lookController.reset(camera.getWorldDirection(facing));}
 function startTour(i=0){flight=null;index=tour[i].place;tourIndex=i;tourTime=0;paused=false;setMode('tour');camera.position.set(...tour[i].from);camera.lookAt(new T.Vector3(...tour[i].look));lookController.reset(camera.getWorldDirection(facing));onTour(tourIndex,0,false);}
 controls.addEventListener('start',()=>{if(flight)flight=null;});
 canvas.addEventListener('pointerdown',e=>{if(!enabled)return;if(mode==='tour'){overview();return;}if(mode==='overview'&&flight){flight=null;controls.enabled=true;}if(mode==='walk'){drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);}});
 canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId||mode!=='walk')return;yaw-=(e.clientX-drag.x)*.004;pitch=T.MathUtils.clamp(pitch-(e.clientY-drag.y)*.003,-1.05,1.05);drag.x=e.clientX;drag.y=e.clientY;});
 const release=()=>{drag=null;};canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
 canvas.addEventListener('wheel',()=>{if(mode==='tour'&&enabled)overview();},{passive:true});
 window.addEventListener('keydown',e=>{if(!enabled||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft'].includes(e.code)&&mode==='walk'){keys.add(e.code);e.preventDefault();}});window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
 function update(dt){if(!enabled)return;if(flight){flight.time+=dt;let t=Math.min(1,flight.time/flight.duration);t=t*t*(3-2*t);camera.position.lerpVectors(flight.start,flight.end,t);controls.target.lerpVectors(flight.lookStart,flight.lookEnd,t);camera.lookAt(controls.target);if(t===1){flight=null;controls.enabled=true;controls.update();}return;}
  if(mode==='overview'){controls.update();controls.target.x=T.MathUtils.clamp(controls.target.x,-100,100);controls.target.z=T.MathUtils.clamp(controls.target.z,-65,65);controls.target.y=T.MathUtils.clamp(controls.target.y,0,12);return;}
  if(mode==='walk'){let f=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0),s=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);const {x,z}=motion.step({x:camera.position.x,z:camera.position.z,forward:f,side:s,yaw,fast:keys.has('ShiftLeft'),dt,allowed:world.canWalk||world.valid});camera.position.set(x,world.floor(x,z)+1.65,z);camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0);return;}
  if(mode==='tour'){const t=tour[tourIndex];if(!paused)tourTime+=dt;const p=Math.min(1,tourTime/t.duration);camera.position.lerpVectors(new T.Vector3(...t.from),new T.Vector3(...t.to),reduced?0:p*p*(3-2*p));targetLook.set(...t.look).sub(camera.position).normalize();const look=reduced?targetLook:lookController.step(targetLook,dt);camera.lookAt(camera.position.x+look.x,camera.position.y+look.y,camera.position.z+look.z);onTour(tourIndex,p,paused);if(p>=1){if(tourIndex<tour.length-1)startTour(tourIndex+1);else{paused=true;onTour(tourIndex,1,true);}}}
 }
 return{go,walk,overview,startTour,update,controls,keys,get mode(){return mode;},get index(){return index;},setReduced(value){reduced=value;controls.enableDamping=!value;if(value&&flight)go(index,true);},setEnabled(value){enabled=value;clear();controls.enabled=value&&mode==='overview'&&!flight;},togglePause(){paused=!paused;onTour(tourIndex,Math.min(1,tourTime/tour[tourIndex].duration),paused);},nextTour(){startTour((tourIndex+1)%tour.length);}};
}
