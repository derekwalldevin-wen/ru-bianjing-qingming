import * as T from 'three';
import {cityStreetZ,cityStreetHalfWidth} from './city-street-layout.js?v=city-street-v1';

// Thin, flush earth transitions, merged into the existing PBR ground batch and
// terrain-support index. No raised pads, new collision boxes or random props.
export function buildCityStreetGround({add,materials,references,dimensions}){
 const patches=[];
 function patch(id,x,width,from,to){
  const strips=6,cross=4,pos=[],ix=[],colors=[],soil=materials.ground.color,street=new T.Color('#b5a17c'),road=materials.road.color;
  for(let i=0;i<=strips;i++)for(let j=0;j<=cross;j++){const t=i/strips,q=j/cross,w=width*(1+.08*t),z=from+(to-from)*t;pos.push(x+(q-.5)*w,.626,z);const fade=Math.min(1,Math.min(q,1-q)*w/.85,Math.min(t,1-t)*Math.abs(to-from)/.65),base=soil.clone().lerp(street,Math.pow(t,5));colors.push(...['r','g','b'].map(k=>base[k]/road[k]+(1-base[k]/road[k])*fade));}
  for(let i=0;i<strips;i++)for(let j=0;j<cross;j++){const a=i*(cross+1)+j,b=a+cross+1;ix.push(a,b,a+1,a+1,b,b+1);}
  if(to<from)for(let i=0;i<ix.length;i+=3)[ix[i+1],ix[i+2]]=[ix[i+2],ix[i+1]];
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(ix);g.computeVertexNormals();add(g,materials.road,[0,0,0]);g.dispose();patches.push({id,x,width,from,to,y:.626});
 }
 for(const p of references){
  const lot=p.streetRegistration;if(!lot||lot.row==='rear')continue;
  const [w,d]=dimensions[p.streetTemplate],halfDepth=d*p.scale/2;
  const front=p.z-lot.side*(halfDepth-.03),edge=cityStreetZ(p.x)+lot.side*(cityStreetHalfWidth-.25);
  patch(p.id,p.x,w*p.scale+.28,front,edge);
 }
 // This courtyard mouth fits between the two existing wings and preserves
 // the merchant's separate woven landing and its existing floor contact.
 patch('market-courtyard',244,12.4,32.65,cityStreetZ(244)-cityStreetHalfWidth+.25);
 return{patches,triangles:patches.length*48,modelBytesAdded:0};
}
