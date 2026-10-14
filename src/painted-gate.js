import * as T from 'three';
// Original-visible structure: rectangular passage, battered masonry platform,
// five-bay timber hall, side terraces and stairs. No invented stone arch.
export function buildPaintedGate({add,cube,colliders,gate}){
 const {x,z,yaw}=gate,ground=.62,c=Math.cos(yaw),s=Math.sin(yaw),category='gate';
 const point=(u,y,v)=>[x+u*c+v*s,ground+y,z-u*s+v*c];
 function block(key,u,y,v,w,h,d,color='#8c8875',rotation=0){cube(key,point(u,y,v),[w,h,d],yaw+rotation,color,category);}
 function meshGeometry(vertices,indices,key,color){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();add(g,key,[x,ground,z],[1,1,1],yaw,color,category);g.dispose();}
 function obstruction(u,v,w,d){colliders.push({x:x+u*c+v*s,z:z-u*s+v*c,w:Math.abs(c)*w+Math.abs(s)*d,d:Math.abs(s)*w+Math.abs(c)*d});}
 for(const side of [-1,1]){
  const vertices=[];for(const [y,outer,depth]of [[0,14,9],[9.1,11.7,7.4]])for(const v of [-depth,depth])for(const u of [3.15,outer])vertices.push(side*u,y,v);
  const faces=[0,1,3,0,3,2,4,6,7,4,7,5,0,4,5,0,5,1,2,3,7,2,7,6,0,2,6,0,6,4,1,5,7,1,7,3];
  // Mirror changes winding; outward normals are required for shadows.
  if(side<0)for(let i=0;i<faces.length;i+=3)[faces[i+1],faces[i+2]]=[faces[i+2],faces[i+1]];
  meshGeometry(vertices,faces,'wall','#989481');obstruction(side*8.6,0,5.5,9);
  block('wood',side*3.12,3.4,-.4,.18,6.7,5.2,'#544938');
  for(const h of [1.2,3.1,5.1])block('wood',side*2.98,h,-.4,.18,.19,5.1,'#766345');
 }
 block('wall',0,8.0,0,6.3,2.2,14.8,'#a09a83');
 block('wood',0,6.75,-7.49,6.6,.44,.35,'#66553b');
 block('ground',0,.035,0,6,.07,22,'#b1a27e');
 block('wall',0,9.24,0,24.4,.28,15.8,'#a59e87');
 // Lower terrace wraps the timber hall, with airy continuous railings.
 function railing(v,y,width){
  for(const h of [.26,.95])block('wood',0,y+h,v,width,.10,.10,'#8f8166');
  for(let i=0;i<=Math.floor(width/.7);i++){const u=-width/2+i*width/Math.floor(width/.7);block('wood',u,y+.57,v,.11,.94,.11,'#a49372');}
 }
 railing(-7.6,9.4,24);railing(7.6,9.4,24);
 for(const side of [-1,1]){
  for(const h of [.25,.95])block('wood',side*11.8,9.4+h,0,.10,.10,15.2,'#8f8166');
  for(let i=0;i<=20;i++)block('wood',side*11.8,9.95,-7.2+i*.72,.11,.94,.11,'#a49372');
 }
 // The hall sits above the terrace; the stair has a real landing.
 block('wall',0,10.0,0,21.1,1.4,11.1,'#a59e87');
 // Five front bays, three depth bays. Masonry shoes, beam ends and brackets.
 for(const u of [-10,-6,-2,2,6,10])for(const v of [-5.3,0,5.3]){
  block('wall',u,10.92,v,.65,.26,.65,'#b0a88c');block('wood',u,13.28,v,.26,4.6,.26,'#68503b');
  block('wood',u,15.3,v,.63,.21,.71,'#9e8964');block('wood',u,15.52,v,.93,.17,.98,'#846b4c');
  block('wood',u,15.67,v,1.2,.16,.32,'#a89371');
 }
 for(const v of [-5.45,5.45]){
  block('wood',0,15.45,v,21.1,.27,.29,'#65513b');block('wood',0,11.55,v,21,.27,.20,'#7a6648');
  for(const u of [-8,-4,4,8]){
   block('wall',u,11.55,v,3.55,1.05,.13,'#b8b098');block('wood',u,13.44,v,3.42,2.6,.13,'#594c3c');
   for(let k=-6;k<=6;k++)block('wood',u+k*.23,13.44,v-.08,.045,2.45,.045,'#b19c76');
   for(const h of [12.7,14.1])block('wood',u,h,v-.10,3.44,.055,.045,'#a89574');
  }
 }
 // Original stair profile on the terrace. Decorative access is a blocked
 // model footprint; the visitor walks through the ground-level gate.
 for(let i=0;i<13;i++)block('wall',0,9.42+i*.10,-7.5+i*.16,2.4,.20,.18,'#a49a7d');
 for(const side of [-1,1])for(let i=0;i<7;i++)block('wood',side*1.25,9.95+i*.18,-7.55+i*.32,.10,.75,.10,'#ae9871');
 for(let i=0;i<31;i++){
  const height=(i+1)*.3,v=-26+i*.6;
  block('wall',-10.5,height/2,v,2.5,height,.61,'#a39c83');
  for(const side of [-1,1])block('wood',-10.5+side*1.25,height+.48,v,.09,.9,.09,'#a18d69');
 }
 obstruction(-10.5,-17,1.35,9.6);
 // Curved hipped roof with shortened ridge; all four hips are actual faces.
 const verts=[],inds=[],rings=[[15.95,13.5,9.1],[16.12,11.9,7.7],[18.1,6.8,3.8],[19.5,6.3,.02]];
 for(const [h,w,d]of rings)for(const [u,v]of [[-w,-d],[w,-d],[w,d],[-w,d]])verts.push(u,h,v);
 for(let j=0;j<3;j++)for(let k=0;k<4;k++){const a=j*4+k,b=j*4+(k+1)%4;inds.push(a,b,a+4,b,b+4,a+4);}inds.push(12,13,14,12,14,15);
 for(let i=0;i<inds.length;i+=3)[inds[i+1],inds[i+2]]=[inds[i+2],inds[i+1]];
 meshGeometry(verts,inds,'roof','#5e6d66');
 block('roof',0,19.59,0,13.1,.22,.35,'#7b8271');
 for(const v of [-8.9,8.9])block('wood',0,15.82,v,26.7,.18,.17,'#8e7654');
 function roofHeight(u,v){
  for(let i=0;i<rings.length-1;i++){const a=rings[i],b=rings[i+1];if(Math.abs(u)<=b[1]&&Math.abs(v)<=b[2])continue;const t=T.MathUtils.clamp(Math.min((a[1]-Math.abs(u))/(a[1]-b[1]),(a[2]-Math.abs(v))/(a[2]-b[2])),0,1);return a[0]+(b[0]-a[0])*t;}return rings.at(-1)[0];
 }
 const tile=new T.CylinderGeometry(.115,.115,.58,6,1,true,Math.PI/2,Math.PI),orientation=new T.Object3D();
 for(let u=-12.8;u<=12.8;u+=.42)for(let v=-8.72;v<=8.72;v+=.60){
  const slope=(roofHeight(u,v+.03)-roofHeight(u,v-.03))/.06;
  orientation.quaternion.setFromAxisAngle(new T.Vector3(0,1,0),yaw);orientation.rotateX(Math.PI/2-Math.atan(slope));
  add(tile,'roof',point(u,roofHeight(u,v)+.04,v),[1,1,1],orientation.rotation.toArray().slice(0,3),'#737e72',category);
 }
 tile.dispose();
 for(let i=-34;i<=34;i++){
  // Slender tile bands at the eave, rather than a smooth plastic edge.
  for(const v of [-8.97,8.97])block('roof',i*.38,15.98,v,.14,.12,.44,'#788477');
 }
 // A large drum is visible in the gate hall; location/scale are interpreted.
 const drum=new T.CylinderGeometry(.95,.95,1.0,16);add(drum,'wood',point(3,12.5,1.6),[1,1,1],[Math.PI/2,yaw,0],'#8a5c3a',category);drum.dispose();
 for(const u of [2.25,3.75])block('wood',u,11.85,1.6,.16,1.7,.17,'#5d4934');
 // Connected walls are restrained and broken by the landscape, not a castle.
 for(const side of [-1,1]){
  block('wall',side*26,3.95,0,24,7.9,4.5,'#97927d');obstruction(side*26,0,12,2.25);
  block('wall',side*26,8.0,0,24.5,.22,4.8,'#aaa086');
  for(let i=0;i<16;i++)block('wall',side*(14.6+i*1.5),8.4,-2.05,.83,.8,.48,'#a69d85');
 }
 return{type:'rectangular-passage',bays:5,opening:[6.3,6.7],height:19.7,wallLength:76,source:gate.source};
}
