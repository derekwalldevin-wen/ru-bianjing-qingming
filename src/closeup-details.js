import {createAssetObject,replaceObjectVisual} from './period-assets.js';
// Coordinates and surface heights from the reproducible Blender export report.
export const closeupFloorPatches=[
 {x:-29,z:-16.8,w:3.4,d:2.2,height:.651,edgeHeight:.632,fade:.35},
 {x:0,z:14.3925,w:3.125,d:.934,height:.66}
];
export function closeupFloor(x,z,base){
 for(const p of closeupFloorPatches){const edge=Math.min(p.w-Math.abs(x-p.x),p.d-Math.abs(z-p.z));if(edge>=0){const height=p.fade?p.edgeHeight+(p.height-p.edgeHeight)*Math.min(1,edge/p.fade):p.height;return Math.max(base,height);}}
 return base;
}
export function createCloseupDetails(scene,kit,colliders){
 const market=createAssetObject(kit,'detail_market'),bridge=createAssetObject(kit,'detail_bridge');market.position.set(-29,.62,-26);scene.add(market,bridge);
 colliders.push(...[
 {x:-32.25,z:-20.28,w:.24,d:.24},{x:-25.75,z:-20.28,w:.24,d:.24},
 {x:-30.85,z:-20.35,w:1.05,d:.4},{x:-26.55,z:-20.14,w:.35,d:.35},
 {x:-26.98,z:-19.53,w:.27,d:.27},{x:-26.15,z:-19.58,w:.33,d:.33},
 {x:-3.4,z:13,w:.3,d:2.5},{x:3.4,z:13,w:.3,d:2.5}
 ]);
 let quality='standard';
 return {market,bridge,replaceVisuals(candidate){
  // Build both objects before changing either displayed group. The floor and
  // fixed collision boxes stay intact; no second registration of colliders.
  const nextMarket=createAssetObject(candidate,'detail_market'),nextBridge=createAssetObject(candidate,'detail_bridge');
  replaceObjectVisual(market,nextMarket);replaceObjectVisual(bridge,nextBridge);
 },update(camera){if(!camera)return;const far=quality==='low'?55:quality==='high'?110:85;market.visible=Math.hypot(camera.position.x+29,camera.position.z+21)<far;bridge.visible=Math.hypot(camera.position.x,camera.position.z-13)<far;},setQuality(value){quality=value;}};
}
