import * as T from 'three';
import {createLocalLightPool} from './local-light-pool.js?v=harbor-light-v1';

// One shadowed sun; local lamps light surfaces without six additional shadow passes.
export function createLighting(scene,materials,water,lanterns,extraSources=[]){
 scene.background ??= new T.Color('#e8e6d4');
 const settings={sun:1,azimuth:0,lamps:1};let dusk=0,quality='standard';
 const sun=new T.DirectionalLight('#ffe3ae',3.8);sun.name='斜照日光';sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-68,right:68,top:68,bottom:-68,near:1,far:240});sun.shadow.normalBias=.025;sun.shadow.bias=-.00012;sun.shadow.radius=3;scene.add(sun,sun.target);
 const sky=new T.HemisphereLight('#e0eeef','#bea783',1.35);sky.name='天空与河岸反光';scene.add(sky);
 const bounce=new T.DirectionalLight('#bccccc',.36);bounce.position.set(40,22,-55);bounce.name='河面柔和补光';scene.add(bounce);
 const sources=[...lanterns.map(([x,y,z],i)=>({id:'street-'+i,position:new T.Vector3(x,y-.14,z),power:i<2?38:28,range:12,haloOffset:.14})),...extraSources];
 const lamps=Array.from({length:6},(_,i)=>{const light=new T.PointLight('#ffb95e',0,12,2);light.name='近处暖灯/'+i;scene.add(light);return light;});
 const localLights=createLocalLightPool(sources,lamps);
 const size=64,data=new Uint8Array(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const r=Math.hypot((x+.5-size/2)/(size/2),(y+.5-size/2)/(size/2)),i=(y*size+x)*4;data[i]=255;data[i+1]=213;data[i+2]=149;data[i+3]=Math.round(255*Math.pow(Math.max(0,1-r),3));}
 const texture=new T.DataTexture(data,size,size);texture.needsUpdate=true;texture.colorSpace=T.SRGBColorSpace;
 const haloMaterial=new T.SpriteMaterial({map:texture,color:'#ffbf68',transparent:true,depthWrite:false,blending:T.AdditiveBlending,opacity:0,toneMapped:false});
 const halos=sources.map(source=>{const sprite=new T.Sprite(haloMaterial);sprite.position.copy(source.position);sprite.position.y+=source.haloOffset??0;sprite.scale.setScalar(source.anchor?1.15:2.2);scene.add(sprite);return sprite;});
 const focus=new T.Vector3(),direction=new T.Vector3(),dayColor=new T.Color('#e8e6d4'),nightColor=new T.Color('#273c39'),dayBounce=new T.Color('#bccccc'),nightBounce=new T.Color('#b5cbd2');
 function update(time,dt,night,reduced,camera){
  dusk=reduced?(night?1:0):T.MathUtils.damp(dusk,night?1:0,3,dt);
  const angle=-.72+settings.azimuth*Math.PI/180,elevation=T.MathUtils.lerp(.86,.22,dusk);
  if(camera){camera.getWorldDirection(direction);focus.copy(camera.position).addScaledVector(direction,camera.position.y<10?13:22);focus.x=T.MathUtils.clamp(focus.x,-338,338);focus.z=T.MathUtils.clamp(focus.z,-146,146);focus.y=0;}else focus.set(0,0,0);
  sun.target.position.copy(focus);sun.position.copy(focus).add(new T.Vector3(Math.sin(angle)*Math.cos(elevation),Math.sin(elevation),Math.cos(angle)*Math.cos(elevation)).multiplyScalar(110));
  const extent=camera&&camera.position.y<10?27:68;if(sun.shadow.camera.right!==extent){Object.assign(sun.shadow.camera,{left:-extent,right:extent,top:extent,bottom:-extent});sun.shadow.camera.updateProjectionMatrix();}
  sun.intensity=T.MathUtils.lerp(3.8,.48,dusk)*settings.sun;sun.color.setRGB(1,T.MathUtils.lerp(.91,.61,dusk),T.MathUtils.lerp(.76,.32,dusk));sky.intensity=T.MathUtils.lerp(1.35,.86,dusk);bounce.intensity=T.MathUtils.lerp(.36,.30,dusk);bounce.color.copy(dayBounce).lerp(nightBounce,dusk);
  const warmth=(.045+dusk*.955)*settings.lamps;materials.window.emissiveIntensity=.06+warmth*.9;materials.lantern.emissiveIntensity=settings.lamps>0 ? .15+warmth*3.6 : 0;haloMaterial.opacity=warmth*.5;
  sources.forEach((source,i)=>{if(source.anchor)source.anchor.getWorldPosition(source.position);halos[i].position.copy(source.position);halos[i].position.y+=source.haloOffset??0;});
  localLights.update(focus,dt,{reduced,capacity:quality==='low'?2:6});
  localLights.slots.forEach((slot,i)=>{const source=localLights.source(slot.id);slot.light.intensity=slot.light.visible&&source?warmth*source.power*slot.level*(reduced?1:1+Math.sin(time*2.3+sources.indexOf(source))*.025):0;});
  water.uniforms.night.value=dusk;water.uniforms.sunGain.value=settings.sun;water.uniforms.lampGain.value=warmth;
  scene.background.copy(dayColor).lerp(nightColor,dusk);if(scene.fog)scene.fog.color.copy(scene.background);
 }
 function setQuality(value){quality=value;const n=value==='high'?4096:2048;if(sun.shadow.mapSize.x!==n){sun.shadow.mapSize.set(n,n);sun.shadow.map?.dispose();sun.shadow.map=null;}halos.forEach(s=>s.visible=value!=='low');lamps.forEach((lamp,i)=>lamp.visible=value!=='low'||i<2);}
 function configure(values){for(const key of ['sun','azimuth','lamps'])if(Number.isFinite(values[key]))settings[key]=T.MathUtils.clamp(values[key],key==='azimuth'?-90:0,key==='azimuth'?90:2);}
 return{sun,sky,bounce,lamps,sources,halos,localLights,update,configure,setQuality,get dusk(){return dusk;},get settings(){return{...settings};}};
}
