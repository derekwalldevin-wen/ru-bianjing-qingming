// Bounded, deterministic near-field greeting. No model or skeleton download.
export const VENDOR_GESTURE_PERIOD=9;
// Validated against the canonical vendor export, including blended influence.
export const VENDOR_GESTURE_RADIUS=.53;
export const VENDOR_GESTURE_SOURCE_SHA256='82cc816654458cf712fc5724f8f31b5eb34c69b645988f932711f0e7bad8c4fb';
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
const windowAt=(t,start,end,edge)=>smooth((t-start)/edge)*smooth((end-t)/edge);
export function sampleVendorGesture(time,phase=0,influence=1){
 if(![time,phase,influence].every(Number.isFinite))throw new Error('Invalid gesture time');
 const t=((time+phase)%VENDOR_GESTURE_PERIOD+VENDOR_GESTURE_PERIOD)%VENDOR_GESTURE_PERIOD,w=Math.max(0,Math.min(1,influence));
 const glance=windowAt(t,.7,2.6,.5),greet=windowAt(t,3.2,6.8,.7);
 return {cycleTime:t,phase:greet>.01?'greet':glance>.01?'glance':'wait',
  headYaw:w*(.20*glance+.08*greet),headNod:w*.035*greet*Math.sin((t-3.2)*Math.PI*1.4),
  shoulderPitch:-w*.43*greet,shoulderOut:w*.065*greet,
  wristYaw:w*.16*greet*Math.sin((t-3.2)*Math.PI*2)};
}
export function vendorGestureTarget(distance,quality,reduced,visible=true){
 if(reduced||quality==='low'||!visible||!Number.isFinite(distance)||distance<0)return 0;
 return smooth((18-distance)/10);
}
export function advanceVendorGestureWeight(weight,target,dt,disabled=false){
 if(disabled)return 0;
 const next=weight+(target-weight)*(1-Math.exp(-7*Math.min(.1,Math.max(0,dt))));
 return Math.abs(next)<1e-5?0:next;
}
