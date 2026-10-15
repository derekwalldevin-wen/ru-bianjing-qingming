import * as T from 'three';

// Original scenic geometry, not a map of historic Kaifeng. Continuous ridges
// replace isolated domes; river-facing saddles leave a long-scroll opening.
export const ridgeLayers=[
 {radius:760,width:150,height:92,sectors:480,peaks:23,foot:'#a6ac83',body:'#527e67',top:'#40798a'},
 {radius:1060,width:205,height:158,sectors:480,peaks:29,foot:'#b4baa0',body:'#73968a',top:'#6a929f'},
 {radius:1400,width:245,height:228,sectors:480,peaks:31,foot:'#c3c8b5',body:'#93aba4',top:'#91aab2'}
];
const TAU=Math.PI*2;
const hash=(n,s)=>{const f=Math.sin(n*127.13+s*311.7)*43758.5453;return f-Math.floor(f);};
const delta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));

export function createHorizonRidge(layer){
 const spec=ridgeLayers[layer],{sectors}=spec,rows=11,p=[],colors=[],indices=[];
 const peaks=Array.from({length:spec.peaks},(_,i)=>({angle:(i+.12+hash(i,layer+4)*.76)/spec.peaks*TAU,width:(.42+hash(i,layer+8)*.62)/spec.peaks*TAU,height:.40+hash(i,layer+12)*.60,skew:.65+hash(i,layer+16)*.85}));
 const foot=new T.Color(spec.foot),body=new T.Color(spec.body),top=new T.Color(spec.top);
 for(let row=0;row<rows;row++)for(let k=0;k<=sectors;k++){
  // k=sectors deliberately uses exactly the first sample, not sin(2PI).
  const angle=(k%sectors)/sectors*TAU,cross=(row-5)/5;
  let ridge=0;
  for(const peak of peaks){const d=delta(angle,peak.angle),width=peak.width*(d<0?peak.skew:1);ridge=Math.max(ridge,peak.height*Math.exp(-Math.pow(Math.abs(d)/width,1.32)));}
  const riverPass=T.MathUtils.smoothstep(Math.abs(Math.sin(angle)),.18,.42);
  const crest=spec.height*(.12+.88*ridge)*(.18+.82*riverPass);
  const spine=spec.radius+Math.sin(angle*3+layer)*26+Math.sin(angle*7-layer*.9)*13;
  const width=spec.width*(.90+.10*Math.sin(angle*5+layer));
  const radius=spine+cross*width;
  // Fan-shaped buttresses meet a narrow broken crest, with a second shoulder
  // away from it. This is a swept relief, not revolved ellipsoids or cones.
  const shoulder=Math.pow(Math.max(0,1-Math.abs(cross)),.72);
  const fluting=1+Math.sin(angle*37+cross*2.4+layer)*.065*Math.sin(Math.abs(cross)*Math.PI);
  const y=-.18+crest*shoulder*fluting;
  p.push(Math.cos(angle)*radius,y,Math.sin(angle)*radius*.80);
  const height=y/spec.height;
  const pigment=foot.clone().lerp(body,T.MathUtils.smoothstep(height,.02,.36)).lerp(top,T.MathUtils.smoothstep(height,.40,.92));
  pigment.multiplyScalar(.94+.06*Math.sin(angle*31+cross*4+layer)**2);
  colors.push(pigment.r,pigment.g,pigment.b);
  if(row<rows-1&&k<sectors){const a=row*(sectors+1)+k,b=a+sectors+1;indices.push(a,a+1,b,a+1,b+1,b);}
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(p,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
 const normal=geometry.attributes.normal,a=new T.Vector3(),b=new T.Vector3();
 for(let row=0;row<rows;row++){const first=row*(sectors+1),last=first+sectors;a.fromBufferAttribute(normal,first);b.fromBufferAttribute(normal,last);a.add(b).normalize();normal.setXYZ(first,a.x,a.y,a.z);normal.setXYZ(last,a.x,a.y,a.z);}
 geometry.userData={sectors,rows,layer,scenic:true};geometry.computeBoundingSphere();
 return geometry;
}
