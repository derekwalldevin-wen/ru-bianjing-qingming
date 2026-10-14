import {heroFrames} from './painting-layout.js?v=original-scroll-v1';
import {PERSONAL_GAP} from './crowd-motion.js';
import {VENDOR_GESTURE_RADIUS} from './vendor-gesture.js';

export function chooseVendorGestureActor(agents,clear){
 return agents.filter(a=>a.person.role==='vendor'&&a.person.activity==='stand'&&!a.person.bridge&&Math.abs(a.x-heroFrames.market.to[0])<18&&Math.cos(a.yaw-heroFrames.market.turn)>.8)
  .filter(a=>{const radius=VENDOR_GESTURE_RADIUS*a.person.scale;return clear(a.x,a.z,radius,a.person)&&agents.every(b=>b===a||Math.hypot(a.x-b.x,a.z-b.z)>=radius+b.radius+PERSONAL_GAP);})
  .sort((a,b)=>Math.hypot(a.x-heroFrames.market.to[0],a.z-heroFrames.market.to[1]-7)-Math.hypot(b.x-heroFrames.market.to[0],b.z-heroFrames.market.to[1]-7))[0]||null;
}
