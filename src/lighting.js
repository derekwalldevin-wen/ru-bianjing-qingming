import * as T from 'three';

// One shadowed sun; local lamps light surfaces without six additional shadow passes.
export function createLighting(scene,materials,water,lanterns){
 scene.background ??= new T.Color('#e8e6d4');
 const settings={sun:1,azimuth:0,lamps:1};let dusk=0,quality='standard';
 const sun=new T.DirectionalLight('#ffe3ae',3.8);sun.name='斜照日光';sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-68,right:68,top:68,bottom:-68,near:1,far:240});sun.shadow.normalBias=.025;sun.shadow.bias=-.00012;sun.shadow.radius=3;scene.add(sun,sun.target);
 const sky=new T.HemisphereLight('#e0eeef','#bea783',1.35);sky.name='天空与河岸反光';scene.add(sky);
 const bounce=new T.DirectionalLight('#bccccc',.36);bounce.position.set(40,22,-55);bounce.name='河面柔和补光';scene.add(bounce);
 const lamps=lanterns.map(([x,y,z])=>{const light=new T.PointLight('#ffb95e',0,12,2);light.name='檐下暖灯';light.position.set(x,y-.14,z);scene.add(light);return light;});
 const size=64,data=new Uint8Array(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const r=Math.hypot((x+.5-size/2)/(size/2),(y+.5-size/2)/(size/2)),i=(y*size+x)*4;data[i]=255;data[i+1]=213;data[i+2]=149;data[i+3]=Math.round(255*Math.pow(Math.max(0,1-r),3));}
 const texture=new T.DataTexture(data,size,size);texture.needsUpdate=true;texture.colorSpace=T.SRGBColorSpace;
 const haloMaterial=new T.SpriteMaterial({map:texture,color:'#ffbf68',transparent:true,depthWrite:false,blending:T.AdditiveBlending,opacity:0,toneMapped:false});
 const halos=lanterns.map(p=>{const sprite=new T.Sprite(haloMaterial);sprite.position.set(...p);sprite.scale.set(2.2,2.2,1);scene.add(sprite);return sprite;});
 const focus=new T.Vector3(),direction=new T.Vector3(),dayColor=new T.Color('#e8e6d4'),nightColor=new T.Color('#273c39');
 function update(time,dt,night,reduced,camera){
  dusk=T.MathUtils.damp(dusk,night?1:0,3,dt);
  const angle=-.72+settings.azimuth*Math.PI/180,elevation=T.MathUtils.lerp(.86,.22,dusk);
  if(camera){camera.getWorldDirection(direction);focus.copy(camera.position).addScaledVector(direction,camera.position.y<10?13:22);focus.x=T.MathUtils.clamp(focus.x,-338,338);focus.z=T.MathUtils.clamp(focus.z,-146,146);focus.y=0;}else focus.set(0,0,0);
  sun.target.position.copy(focus);sun.position.copy(focus).add(new T.Vector3(Math.sin(angle)*Math.cos(elevation),Math.sin(elevation),Math.cos(angle)*Math.cos(elevation)).multiplyScalar(110));
  const extent=camera&&camera.position.y<10?27:68;if(sun.shadow.camera.right!==extent){Object.assign(sun.shadow.camera,{left:-extent,right:extent,top:extent,bottom:-extent});sun.shadow.camera.updateProjectionMatrix();}
  sun.intensity=T.MathUtils.lerp(3.8,.48,dusk)*settings.sun;sun.color.setRGB(1,T.MathUtils.lerp(.91,.61,dusk),T.MathUtils.lerp(.76,.32,dusk));sky.intensity=T.MathUtils.lerp(1.35,.68,dusk);bounce.intensity=T.MathUtils.lerp(.36,.16,dusk);
  const warmth=(.045+dusk*.955)*settings.lamps;materials.window.emissiveIntensity=.06+warmth*.9;materials.lantern.emissiveIntensity=.15+warmth*3.6;haloMaterial.opacity=warmth*.5;
  lamps.forEach((lamp,i)=>{lamp.intensity=warmth*(i<2?38:28)*(reduced?1:1+Math.sin(time*2.3+i)*.025);});
  water.uniforms.night.value=dusk;water.uniforms.sunGain.value=settings.sun;water.uniforms.lampGain.value=warmth;
  scene.background.copy(dayColor).lerp(nightColor,dusk);if(scene.fog)scene.fog.color.copy(scene.background);
 }
 function setQuality(value){quality=value;const n=value==='high'?4096:2048;if(sun.shadow.mapSize.x!==n){sun.shadow.mapSize.set(n,n);sun.shadow.map?.dispose();sun.shadow.map=null;}halos.forEach(s=>s.visible=value!=='low');lamps.forEach((lamp,i)=>lamp.visible=value!=='low'||i<2);}
 function configure(values){for(const key of ['sun','azimuth','lamps'])if(Number.isFinite(values[key]))settings[key]=T.MathUtils.clamp(values[key],key==='azimuth'?-90:0,key==='azimuth'?90:2);}
 return{sun,sky,lamps,update,configure,setQuality,get dusk(){return dusk;},get settings(){return{...settings};}};
}
