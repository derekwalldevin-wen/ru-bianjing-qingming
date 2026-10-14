import {reframe} from './painting-layout.js?v=original-scroll-v1';
import * as T from 'three';
import {projectSurfaceUV} from './surface-textures.js';

// World-space, restrained grain survives static geometry merging and varying UVs.
export function addPatina(material,kind){
 material.onBeforeCompile=shader=>{shader.vertexShader='varying vec3 vSurfacePosition;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSurfacePosition = (modelMatrix * vec4(position, 1.0)).xyz;');shader.fragmentShader='varying vec3 vSurfacePosition;\n'+shader.fragmentShader;
 const expression=kind==='wood'?'sin(p.x*41.0+sin(p.y*1.7+p.z*.7)*2.0)*sin(p.z*19.0+p.y*.6)':kind==='stone'?'sin(p.x*19.0+p.y*22.0)*sin(p.z*29.0-p.x*7.0)':'sin(p.x*39.0)*sin(p.z*37.0+p.y*23.0)';
 shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>\n{vec3 p=vSurfacePosition;float grain=${expression};diffuseColor.rgb*=.99+grain*.018;}`);};material.customProgramCacheKey=()=>`bianjing-patina-${kind}`;
}

export function createDetailBuilder({add,cube,post,beam,m}){
 const globe=new T.SphereGeometry(1,16,12);
 const cylinder=new T.CylinderGeometry(1,1,1,12),ring=new T.TorusGeometry(1,.08,5,12),bowl=new T.LatheGeometry([new T.Vector2(.03,0),new T.Vector2(.22,.03),new T.Vector2(.29,.18),new T.Vector2(.25,.19),new T.Vector2(.19,.07),new T.Vector2(.03,.05)],12);
 const jar=new T.LatheGeometry([new T.Vector2(0,0),new T.Vector2(.27,0),new T.Vector2(.40,.23),new T.Vector2(.38,.52),new T.Vector2(.20,.69),new T.Vector2(.19,.82),new T.Vector2(.25,.84),new T.Vector2(.25,.89),new T.Vector2(.15,.89),new T.Vector2(.14,.72)],14);
 const tile=new T.CylinderGeometry(.13,.13,.62,6,1,true,Math.PI/2,Math.PI);tile.rotateX(Math.PI/2);
 function roof(x,y,z,w,d,h,straw){if(straw||Math.abs(z)>35)return;
  const elevation=(xx,zz)=>h*Math.pow(Math.max(0,Math.min(1-Math.abs(zz)/(d/2),(w/2-Math.abs(xx))/(d*.47))),1.35)+.18*Math.pow(Math.abs(xx)/(w/2),8)+.12*Math.pow(Math.abs(zz)/(d/2),8);
  for(let zz=-d/2+.25;zz<d/2;zz+=.65)for(let xx=-w/2+.38;xx<w/2-.3;xx+=.49){const yy=elevation(xx,zz),slope=(elevation(xx,zz+.04)-elevation(xx,zz-.04))/.08;add(tile,m.tile,[x+xx,y+yy+.045,z+zz],[1,1,1],[-Math.atan(slope),0,0]);}
  // Ridge caps and eave-end discs create readable silhouettes when standing below.
  for(let xx=-w*.29;xx<w*.29;xx+=.43)cube(m.tile,[x+xx,y+h+.16,z],[.40,.16,.31]);
  for(const s of [-1,1])for(let xx=-w/2+.3;xx<w/2;xx+=.49)add(cylinder,m.tile,[x+xx,y+.10,z+s*d/2],[.11,.09,.11],[Math.PI/2,0,0]);
 }
 function house(x,z,w,d,h,levels,straw){if(Math.abs(z)>35)return;const face=z>0?-1:1,front=z+face*(d/2+.3),top=.9+h*levels;
  for(const side of [-1,1])for(let k=0;k<4;k++)cube(m.stone,[x+side*(w/2+.24),.78,z-d/2+.5+k*d/4],[.25,.23,d/4-.1]);
  // Timber corbels, double lintels and exposed rafters.
  for(let xx=-w/2+.3;xx<=w/2;xx+=1.15){cube(m.dark,[x+xx,top-.28,front],[.17,.24,.9]);cube(m.wood,[x+xx,top-.52,front-face*.18],[.36,.18,.37]);beam([x+xx,top-.85,front-face*.1],[x+xx,top-.24,front+face*.5],.11);}
  for(let xx=-w/2+.15;xx<w/2;xx+=.55){beam([x+xx,top-.12,z-d/2+.3],[x+xx,top+.05,z-d/2-.9],.075,m.pale);beam([x+xx,top-.12,z+d/2-.3],[x+xx,top+.05,z+d/2+.9],.075,m.pale);}
  const doorX=x-w*.23;for(const s of [-1,1]){cube(m.wood,[doorX+s*.50,2.0,front],[.9,2.25,.18]);for(let n=0;n<4;n++)cube(m.dark,[doorX+s*.5+(n-1.5)*.19,2.0,front+face*.11],[.025,2.18,.03]);add(ring,m.metal,[doorX+s*.17,2.05,front+face*.16],[.1,.1,.1]);}cube(m.dark,[doorX,3.23,front],[2.12,.16,.23]);
  for(let k=0;k<3;k++)cube(m.stone,[doorX,.66+k*.1,front+face*(.6-k*.17)],[2.2,.1,.45]);
  // Tea tables and stools are tucked against the shopfront, leaving the road free.
  const tx=x+w*.23,tz=front+face*.75;cube(m.pale,[tx,1.38,tz],[1.8,.14,.95]);for(const dx of [-.7,.7])for(const dz of [-.32,.32])cube(m.dark,[tx+dx,1.0,tz+dz],[.1,.7,.1]);for(const dx of [-.5,.1,.62])add(bowl,m.ceramic,[tx+dx,1.46,tz],[.55,.55,.55]);
  for(const dx of [-1.3,1.3]){cube(m.wood,[tx+dx,.95,tz],[.5,.13,.55]);for(const dz of [-.18,.18])cube(m.dark,[tx+dx,.76,tz+dz],[.12,.3,.12]);}
  add(jar,m.jar,[x+w*.4,.63,front+face*.4],[.8,.8,.8]);add(jar,m.ceramic,[x+w*.33,.63,front+face*.7],[.6,.6,.6]);
  if(levels>1){const yy=.9+h,balconyZ=front+face*.55;cube(m.dark,[x,yy+.06,balconyZ],[w+.1,.18,1.2]);for(let xx=-w/2;xx<=w/2;xx+=.55){post(m.wood,[x+xx,yy+.60,balconyZ+face*.5],.04,1);cube(m.pale,[x+xx,yy+1.13,balconyZ+face*.5],[.12,.09,.12]);}beam([x-w/2,yy+1.06,balconyZ+face*.5],[x+w/2,yy+1.06,balconyZ+face*.5],.10);}
 }
 function bridge(height){for(const x of [-3.25,3.25])for(let z=-12;z<12;z+=1.35){const y=height(z);for(const dy of [.20,.95])cube(m.metal,[x,y+dy,z],[.20,.075,.20]);beam([x,y+.38,z],[x,height(z+1.35)+1,z+1.35],.055,m.pale);beam([x,y+1,z],[x,height(z+1.35)+.38,z+1.35],.055,m.pale);}
  for(const x of [-2.8,2.8])for(let z=-13;z<13;z+=.8)add(cylinder,m.metal,[x,height(z)+.10,z],[.045,.025,.045]);
  for(const sign of [-1,1]){for(let x=-2.5;x<3;x+=1)post(m.stone,[x,.82,sign*14],.13,.35);for(let z=-11;z<11;z+=2.2)beam([-2.4,height(z)-.78,z],[2.4,height(z)-.78,z+1.6],.18,m.wood);}
 }
 function lanterns(){const locations=[[-4.5,3.3,13.5],[4.5,3.3,-13.5],reframe([20,3.2,19],'tea'),reframe([-66,3.2,-19],'grass'),reframe([-25,3.2,-19.6],'market'),reframe([55,3.2,-19.5],'carts')];
  for(const [x,y,z] of locations){post(m.dark,[x-.55,(y+1)/2+.3,z],.08,y+.6);beam([x-.55,y+.72,z],[x+.15,y+.72,z],.085);beam([x,y+.72,z],[x,y+.36,z],.025,m.metal);add(globe,m.lantern,[x,y,z],[.37,.35,.37]);for(const dy of [-.3,.3])add(cylinder,m.dark,[x,y+dy,z],[.21,.075,.21]);for(let i=0;i<8;i++){const a=i*Math.PI/4,pts=[];for(let j=0;j<=12;j++){const t=.40+j/12*(Math.PI-.80);pts.push(new T.Vector3(x+Math.cos(a)*Math.sin(t)*.375,y+Math.cos(t)*.35,z+Math.sin(a)*Math.sin(t)*.375));}add(new T.TubeGeometry(new T.CatmullRomCurve3(pts),12,.011,3,false),m.pale,[0,0,0]);}beam([x,y-.35,z],[x,y-.62,z],.025,m.red);}
  return locations;
 }
 return{roof,house,bridge,lanterns};
}

// Consolidate detailed moving boats per material; preserve the parent transform.
export function refineBoat(group,m,mergeGeometries){
 const box=new T.BoxGeometry(1,1,1);const part=(g,ma,p,s=[1,1,1],rot=[0,0,0])=>{const mesh=new T.Mesh(g,ma);mesh.position.set(...p);mesh.scale.set(...s);mesh.rotation.set(...rot);group.add(mesh);return mesh;};
 for(let x=-3.15;x<3.2;x+=.33)part(box,m.wood,[x,.67,0],[.022,.024,1.76]);
 for(const z of [-1.04,1.04])for(let x=-3;x<3.2;x+=.8){part(box,m.pale,[x,1.0,z],[.075,.58,.075]);part(box,m.dark,[x,.93,z],[.09,.065,.09]);}
 for(let x=-1.95;x<1.5;x+=.47){const pts=[];for(let i=0;i<=12;i++){const a=i*Math.PI/12;pts.push(new T.Vector3(x,.95+Math.sin(a)*1.14,Math.cos(a)*1.14));}part(new T.TubeGeometry(new T.CatmullRomCurve3(pts),12,.045,4,false),m.wood,[0,0,0]);}
 part(box,m.pale,[3.0,.83,-.3],[.8,.35,.8]);for(let j=0;j<3;j++)part(new T.TorusGeometry(.23+j*.06,.025,4,20),m.straw,[-2.8,.72,0],[1,1,1],[Math.PI/2,0,0]);
 const groups=new Map();for(const child of [...group.children]){if(!child.isMesh)continue;child.updateMatrix();const geo=child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone();for(const key of Object.keys(geo.attributes))if(!['position','normal'].includes(key))geo.deleteAttribute(key);geo.applyMatrix4(child.matrix);projectSurfaceUV(geo,child.material);if(!groups.has(child.material))groups.set(child.material,[]);groups.get(child.material).push(geo);group.remove(child);}
 for(const [ma,geos] of groups){const merged=new T.Mesh(mergeGeometries(geos),ma);merged.castShadow=merged.receiveShadow=true;group.add(merged);geos.forEach(g=>g.dispose());}
}
