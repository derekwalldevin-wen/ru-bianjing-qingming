import * as T from 'three';

const fract=x=>x-Math.floor(x),mix=(a,b,t)=>a+(b-a)*t;
const hash=(x,y)=>fract(Math.sin(x*127.1+y*311.7+43.3)*43758.5453);
function noise(u,v,period){
 const x=u*period,y=v*period,ix=Math.floor(x),iy=Math.floor(y);
 const fx=fract(x),fy=fract(y),sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);
 const at=(a,b)=>hash((a%period+period)%period,(b%period+period)%period);
 return mix(mix(at(ix,iy),at(ix+1,iy),sx),mix(at(ix,iy+1),at(ix+1,iy+1),sx),sy);
}

// Original, periodically tiled PBR texture sets. No network/image dependency.
// Base color is sRGB; normal and roughness maps remain linear data.
export function makeSurfaceTextures(kind,size=512){
 const height=new Float32Array(size*size),color=new Uint8Array(size*size*4),rough=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size,v=y/size,n=noise(u,v,8),detail=noise(u,v,64),fine=hash(x,y);
  let h=.5,c=.9,r=.9;
  if(kind==='earth'){
   const cx=Math.floor(u*32),cy=Math.floor(v*32),seed=hash(cx,cy);
   const dx=fract(u*32)-(.25+hash(cx+70,cy)*.5),dy=fract(v*32)-(.25+hash(cx,cy+80)*.5);
   const radius=.13+seed*.07,pebble=seed>.91?1-T.MathUtils.smoothstep(Math.hypot(dx,dy),radius*.5,radius):0;
   const soil=noise(u,v,4)*.58+n*.29+noise(u,v,24)*.13;
   h=.39+soil*.065+detail*.018+pebble*.13;
   c=.845+(soil-.5)*.27+(detail-.5)*.056+(fine-.5)*.026+pebble*(seed>.965?.085:-.11);r=.89+detail*.07;
  }else if(kind==='paving'){
   const row=Math.floor(v*6),uu=u*4+(row%2)*.5,col=Math.floor(uu),a=fract(uu),b=fract(v*6);
   const edge=Math.min(a,1-a,b,1-b),bevel=T.MathUtils.smoothstep(edge,.025,.11);
   const variation=hash(col%4,row);
   h=.13+bevel*(.55+variation*.13)+(detail-.5)*.045;
   c=mix(.52,.81+variation*.16,bevel)+(n-.5)*.07+(detail-.5)*.06;r=.85+detail*.13;
  }else if(kind==='wood'){
   const grain=.5+.5*Math.sin(v*Math.PI*96+Math.sin(u*Math.PI*4)*4.0+Math.sin(u*Math.PI*12)*.8);
   const fiber=Math.pow(grain,7);h=.45+fiber*.16+detail*.035;
   c=.93-fiber*.13+(n-.5)*.075;r=.72+grain*.18;
  }else if(kind==='cloth'){
   const weave=Math.sin(u*Math.PI*128)*Math.sin(v*Math.PI*128);
   h=.5+weave*.10;c=.94+weave*.035+(n-.5)*.04;r=.97;
  }else if(kind==='tile'){
   h=.42+detail*.12+n*.04;c=.84+n*.12+(detail-.5)*.1;r=.75+detail*.17;
  }else{
   h=.4+detail*.12+(fine-.5)*.04;c=.90+(n-.5)*.11+(detail-.5)*.065;r=.93+detail*.06;
  }
  const i=y*size+x;height[i]=h;
  for(let k=0;k<3;k++){color[i*4+k]=Math.round(T.MathUtils.clamp(c,0,1)*255);rough[i*4+k]=Math.round(r*255);}
  color[i*4+3]=rough[i*4+3]=255;
 }
 const normal=new Uint8Array(size*size*4),strength=kind==='paving'?5:kind==='earth'?3.7:kind==='wood'?1.5:1.1;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const dx=(height[y*size+(x+1)%size]-height[y*size+(x+size-1)%size])*strength;
  const dy=(height[((y+1)%size)*size+x]-height[((y+size-1)%size)*size+x])*strength;
  const length=Math.hypot(dx,dy,1),i=(y*size+x)*4;
  normal[i]=Math.round((-dx/length*.5+.5)*255);normal[i+1]=Math.round((-dy/length*.5+.5)*255);normal[i+2]=Math.round((1/length*.5+.5)*255);normal[i+3]=255;
 }
 const texture=(data,srgb=false)=>{const t=new T.DataTexture(data,size,size);t.name=`${kind}-${srgb?'albedo':'data'}`;t.colorSpace=srgb?T.SRGBColorSpace:T.NoColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=4;t.needsUpdate=true;return t;};
 return{map:texture(color,true),normalMap:texture(normal),roughnessMap:texture(rough)};
}

export function applySurfaceTextures(materials){
 const sets=new Map(),textured=[];
 function apply(key,kind,meters,strength){
  if(!sets.has(kind))sets.set(kind,makeSurfaceTextures(kind));const m=materials[key];
  Object.assign(m,sets.get(kind));m.normalScale.setScalar(strength);m.roughness=1;
  m.userData.textureMeters=meters;m.userData.surfaceKind=kind;m.userData.normalStrength=strength;textured.push(m);
 }
 apply('road','earth',3.4,.68);apply('ground','earth',4.5,.52);
 for(const key of ['road','ground']){
  const material=materials[key];material.userData.shoreEarth='painted-earth-distance-v1';material.customProgramCacheKey=()=> 'painted-earth-distance-v1';
  material.onBeforeCompile=shader=>{
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vEarthWorld;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvEarthWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vEarthWorld;').replace('#include <color_fragment>',`#include <color_fragment>
    // Keep close soil legible, then lose its repeating colour and normal grain
    // into a continuous earth wash. This does not blur geometry or road edges.
    float earthViewDistance=length(cameraPosition.xz-vEarthWorld.xz);
    float earthMicroDetail=1.0-smoothstep(38.0,160.0,earthViewDistance)*.94;
    vec3 earthMean=diffuse*vec3(.69);
    #if defined(USE_COLOR_ALPHA)
     earthMean*=vColor.rgb;
    #elif defined(USE_COLOR)
     earthMean*=vColor;
    #endif
    diffuseColor.rgb=mix(earthMean,diffuseColor.rgb,earthMicroDetail);
    vec2 earthPoint=vEarthWorld.xz;
    float earthWash=sin(earthPoint.x*.137+sin(earthPoint.y*.31))*sin(earthPoint.y*.193+sin(earthPoint.x*.071));
    float canalT=max(abs(earthPoint.x)-135.0,0.0);
    float canalLine=-(canalT*canalT/(canalT+180.0)*.39+sin(canalT/130.0)*canalT/(canalT+90.0)*26.0);
    float bankDistance=abs(earthPoint.y-canalLine)-(10.25+max(abs(earthPoint.x)-145.0,0.0)*.027);
    float dampBank=1.0-smoothstep(.6,3.8,bankDistance);
    diffuseColor.rgb*=vec3(.96+earthWash*.065,.97+earthWash*.04,.98-earthWash*.012)*mix(vec3(1.0),vec3(.83,.86,.81),dampBank*.48);`)
    .replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nnormal=normalize(mix(nonPerturbedNormal,normal,mix(.12,1.0,earthMicroDetail)));');
  };
 }
 apply('paving','paving',3.6,.8);apply('stone','plaster',1.8,.7);
 for(const key of ['wood','pale','dark'])apply(key,'wood',2,.55);
 for(const key of ['wall','wall2'])apply(key,'plaster',2.2,.5);
 for(const key of ['roof','tile'])apply(key,'tile',1.3,.5);
 apply('cloth','cloth',.9,.35);
 function setQuality(value,maxAnisotropy=4){
  const anisotropy=Math.min(maxAnisotropy,value==='low'?1:value==='high'?8:4);
  for(const set of sets.values())for(const t of Object.values(set))if(t.anisotropy!==anisotropy){t.anisotropy=anisotropy;t.needsUpdate=true;}
  for(const m of textured)m.normalScale.setScalar(m.userData.normalStrength*(value==='low'?.55:1));
 }
 return{sets,setQuality};
}

// Called after applying each object's transform, before merging. A shared world
// scale prevents stretched textures on long roads. Pick one plane per triangle
// so UV derivatives remain coherent on curved and bevelled geometry.
export function projectSurfaceUV(geometry,material){
 if(!material.userData.textureMeters)return;
 const p=geometry.attributes.position,n=geometry.attributes.normal,uv=new Float32Array(p.count*2),scale=material.userData.textureMeters;
 const wood=material.userData.surfaceKind==='wood';
 for(let start=0;start<p.count;start+=3){
  const nx=Math.abs(n.getX(start)+n.getX(start+1)+n.getX(start+2)),ny=Math.abs(n.getY(start)+n.getY(start+1)+n.getY(start+2)),nz=Math.abs(n.getZ(start)+n.getZ(start+1)+n.getZ(start+2));
  for(let i=start;i<start+3;i++){
   let u,v;if(ny>=nx&&ny>=nz){u=p.getX(i);v=p.getZ(i);}else if(nx>=nz){u=wood?p.getY(i):p.getZ(i);v=wood?p.getZ(i):p.getY(i);}else{u=wood?p.getY(i):p.getX(i);v=wood?p.getX(i):p.getY(i);}
   uv[i*2]=u/scale;uv[i*2+1]=v/scale;
  }
 }
 geometry.setAttribute('uv',new T.BufferAttribute(uv,2));
}
