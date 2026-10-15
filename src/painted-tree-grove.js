import * as T from 'three';
import {paintingSources,projectPaintingPoint,ruralRoute,distanceToRoute} from './painting-layout.js?v=original-scroll-v1';

// Manually identified, visible trunk bases in the opening of the supplied scroll.
// Coordinates belong to the unchanged 4500px inspection copy, not a generated image.
// Heights and back-to-front depth are interpretations of scattered perspective.
const trunks=[
 [134,397,8.7],[148,384,8.1],[167,375,8.9],[182,362,9.2],
 [222,365,8.5],[260,370,8.0],[294,364,8.2],[319,384,7.7],
 [373,366,8.4],[434,329,7.6],[493,390,8.4],[525,340,8.1],
 [600,330,7.8],[665,327,7.1],[747,371,7.4],[882,443,9.4],
 [945,432,8.8],[987,415,9.0],[1092,405,8.4],[1202,415,8.0],
 [1270,361,7.8],[1370,435,8.2],[1403,456,8.4],[1454,471,8.6],
 [1545,421,8.2]
];
export const paintedTreePlan=trunks.map(([u,v,height],i)=>{
 const source=paintingSources.countryside,[x,z]=projectPaintingPoint('countryside',u,v);
 return {id:`countryside-tree-${i+1}`,source:source.image,reference:[u,v],nativeAnchor:[Math.round(u/4500*source.native[0]),Math.round(v/source.inspection[1]*source.native[1])],x,z,height,evidence:'original-visible-trunk',template:'tree_bare'};
});

export function placePaintedTreeGrove({kit,colliders,place}){
 const root=kit.templates.get('tree_bare'),bounds=new T.Box3().setFromObject(root),vertex=new T.Vector3();
 const height=bounds.max.y-bounds.min.y;let radius=0;
 root.traverse(mesh=>{if(!mesh.isMesh)return;const points=mesh.geometry.attributes.position;for(let i=0;i<points.count;i++){vertex.fromBufferAttribute(points,i).applyMatrix4(mesh.matrixWorld);radius=Math.max(radius,Math.hypot(vertex.x,vertex.z));}});
 const footprint=kit.collisionBounds?.tree_bare;
 const rootRadius=footprint?Math.hypot(Math.max(Math.abs(footprint[0][0]),Math.abs(footprint[1][0])),Math.max(Math.abs(footprint[0][1]),Math.abs(footprint[1][1]))):1;
 const placed=[];
 for(const anchor of paintedTreePlan){
  const scale=anchor.height/height,canopy=radius*scale+.7,trunk=rootRadius*scale+.03;
  let z;
  // Keep the source's long-scroll x. Depth is the minimum adjustment needed
  // to keep the broad branch envelope out of houses and the trunk off the road.
  for(let step=0;step<=64;step++){
   const offsets=step?[step*.5,-step*.5]:[0];
   for(const delta of offsets){
    const candidate=anchor.z+delta;
    if(distanceToRoute(anchor.x,candidate,ruralRoute)<2.8+trunk)continue;
    if(colliders.some(c=>Math.abs(anchor.x-c.x)<c.w+canopy&&Math.abs(candidate-c.z)<c.d+canopy))continue;
    if(placed.some(p=>Math.hypot(anchor.x-p.x,candidate-p.z)<trunk+p.trunkRadius+.18))continue;
    z=candidate;break;
   }
   if(z!==undefined)break;
  }
  if(z===undefined)throw Error(`No clear branch envelope for ${anchor.id}`);
  const y=.62-bounds.min.y*scale,yaw=(placed.length*2.399963229728653)%(Math.PI*2);
  const record={...anchor,z,scale,y,yaw,depthAdjustment:z-anchor.z,trunkRadius:trunk,canopyRadius:canopy};
  place('tree_bare',anchor.x,z,record);
  // Existing canonical low-height proxy construction in world.js owns collision.
  placed.push(record);
 }
 return placed;
}
