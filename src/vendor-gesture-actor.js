import {PERSONAL_GAP} from './crowd-motion.js';
import {VENDOR_GESTURE_RADIUS} from './vendor-gesture.js';

export function chooseVendorGestureActor(agents,clear){
 return agents.filter(a=>a.person.role==='vendor'&&a.person.activity==='stand'&&!a.person.bridge&&a.z<0&&Math.cos(a.yaw)>.8)
  .filter(a=>{const radius=VENDOR_GESTURE_RADIUS*a.person.scale;return clear(a.x,a.z,radius,a.person)&&agents.every(b=>b===a||Math.hypot(a.x-b.x,a.z-b.z)>=radius+b.radius+PERSONAL_GAP);})
  .sort((a,b)=>Math.hypot(a.x+29,a.z+21)-Math.hypot(b.x+29,b.z+21))[0]||null;
}
