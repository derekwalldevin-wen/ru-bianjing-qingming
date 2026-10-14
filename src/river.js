import * as T from 'three';
import {Reflector} from '../vendor/Reflector.js';
import {canalCenter,canalHalfWidth} from './landscape-layout.js?v=original-scroll-v1';

const canalFunctions=/* glsl */`
 float canalOffset(float x){float t=max(0.0,abs(x)-135.0);return sign(x)*(t*t/(t+180.0)*.39+sin(t/130.0)*t/(t+90.0)*26.0);}
 float bankDistance(vec2 p){return 10.25+max(0.0,abs(p.x)-145.0)*.027-abs(p.y-canalOffset(p.x));}
`;

// The official r180 Reflector supplies the reflected camera and clipping plane.
// River shading is authored here: quiet ripples, bank tint and boat-local wakes.
const shader={
 name:'BianjingRiver',
 uniforms:{
  color:{value:new T.Color('#81bba9')},tDiffuse:{value:null},textureMatrix:{value:new T.Matrix4()},
  time:{value:0},night:{value:0},sunGain:{value:1},lampGain:{value:0},
  sunDirection:{value:new T.Vector3(-.5,.75,.5)},sunColor:{value:new T.Color('#fff0ce')},
  reflectionEnabled:{value:1},reflectionTexel:{value:1/512},
  boats:{value:Array.from({length:5},()=>new T.Vector4())},
  fogColor:{value:new T.Color('#e8e6d4')},fogNear:{value:75},fogFar:{value:230}
 },
 vertexShader:/* glsl */`
  uniform float time;
  uniform mat4 textureMatrix;
  varying vec3 vWorld;
  varying vec4 vMirror;
  ${canalFunctions}
  #include <fog_pars_vertex>
  void main(){
   vec4 baseWorld=modelMatrix*vec4(position,1.0);
   float bankFade=smoothstep(0.0,1.3,bankDistance(baseWorld.xz));
   float height=(sin(baseWorld.x*.62+baseWorld.z*.91-time*.65)*.023
               +sin(baseWorld.x*1.27-baseWorld.z*.65-time*.91)*.012)*bankFade;
   vec3 displaced=position;displaced.z+=height;
   vWorld=(modelMatrix*vec4(displaced,1.0)).xyz;
   vMirror=textureMatrix*vec4(position,1.0);
   vec4 mvPosition=modelViewMatrix*vec4(displaced,1.0);
   gl_Position=projectionMatrix*mvPosition;
   #include <fog_vertex>
  }
 `,
 fragmentShader:/* glsl */`
  uniform sampler2D tDiffuse;
  uniform float time,night,sunGain,lampGain,reflectionEnabled,reflectionTexel;
  uniform vec3 sunDirection,sunColor;
  uniform vec4 boats[5];
  varying vec3 vWorld;
  varying vec4 vMirror;
  ${canalFunctions}
  #include <common>
  #include <fog_pars_fragment>

  void main(){
   vec2 p=vWorld.xz;
   float a=p.x*.62+p.y*.91-time*.65;
   float b=p.x*1.27-p.y*.65-time*.91;
   float c=p.x*3.7+p.y*2.2-time*1.2+sin(a)*.8;
   vec2 slope=vec2(cos(a)*.043+cos(b)*.045+cos(c)*.020,
                   cos(a)*.060-cos(b)*.023+cos(c)*.012);
   vec3 n=normalize(vec3(-slope.x,1.0,-slope.y));
   vec3 view=normalize(cameraPosition-vWorld);
   float fresnel=pow(1.0-max(dot(view,n),0.0),4.0);
   float shore=1.0-smoothstep(.15,2.5,bankDistance(p));
   float broad=.5+.5*sin(a*.36+sin(b*.3));
   vec3 deep=mix(vec3(.14,.23,.19),vec3(.23,.32,.23),broad);
   vec3 shallow=vec3(.34,.39,.26);
   vec3 body=mix(deep,shallow,shore*.72);
   body=mix(body,body*vec3(.28,.40,.48),night);
   vec3 sky=mix(vec3(.61,.72,.65),vec3(.08,.16,.18),night);
   vec3 reflection=sky;
   if(reflectionEnabled>.5 && vMirror.w>0.0){
    vec2 uv=vMirror.xy/vMirror.w;
    uv+=slope*.022*(.6+fresnel);
    uv=clamp(uv,vec2(.002),vec2(.998));
    vec2 blur=vec2(reflectionTexel*1.4,0.0);
    reflection=texture2D(tDiffuse,uv).rgb*.4;
    reflection+=(texture2D(tDiffuse,clamp(uv+blur,vec2(.001),vec2(.999))).rgb
                +texture2D(tDiffuse,clamp(uv-blur,vec2(.001),vec2(.999))).rgb
                +texture2D(tDiffuse,clamp(uv+blur.yx,vec2(.001),vec2(.999))).rgb
                +texture2D(tDiffuse,clamp(uv-blur.yx,vec2(.001),vec2(.999))).rgb)*.15;
   }
   vec3 result=mix(body,reflection,clamp(.24+fresnel*.48-shore*.09,.14,.72));
   vec3 halfVector=normalize(sunDirection+view);
   float sparkle=pow(max(dot(n,halfVector),0.0),160.0);
   float sheen=pow(max(dot(n,halfVector),0.0),18.0)*.035;
   result+=sunColor*(sparkle*.66+sheen)*sunGain*mix(1.0,.24,night);

   // Narrow, broken lines along the stone quay; restrained at this river's scale.
   float edgeDistance=bankDistance(p);
   float line=exp(-pow((edgeDistance-.24-.06*sin(p.x*1.7-time*.8))/.085,2.0));
   float foam=line*smoothstep(-.35,.55,sin(p.x*.95-time*.45)+sin(p.x*2.3)*.35)*.22;
   float wake=0.0;
   for(int i=0;i<5;i++){
    vec4 boat=boats[i];float size=max(boat.z,.1);
    vec2 q=(p-boat.xy)/size;
    // Hull-contact rings surround moored boats as well as passing boats.
    float hull=length(q/vec2(4.55,1.28));
    float contact=exp(-pow((hull-1.06)/.07,2.0));
    wake+=contact*(.10+.055*sin(hull*26.0-time*1.8));
    // Moving vessels point along +X: the V opens behind their stern.
    float behind=-q.x-3.8;
    float envelope=smoothstep(0.0,.9,behind)*(1.0-smoothstep(5.0,12.0,behind));
    float vline=exp(-pow((abs(q.y)-(.7+behind*.26))/.16,2.0));
    float ripple=.5+.5*sin(behind*4.0-time*2.0);
    wake+=boat.w*envelope*vline*(.14+ripple*.10);
   }
   result=mix(result,mix(vec3(.69,.80,.66),vec3(.19,.32,.30),night),clamp(foam+wake,0.0,.5));
   // Warm broken streaks from the two bridge-side lanterns.
   float lampStrip=exp(-pow((p.x-4.5-slope.x*2.0)/.85,2.0))
                  +exp(-pow((p.x+4.5-slope.x*2.0)/.85,2.0));
   float lampFalloff=exp(-pow((abs(p.y)-8.5)/5.0,2.0));
   result+=vec3(.30,.14,.035)*lampStrip*lampFalloff*pow(.5+.5*sin(b*2.6),5.0)*lampGain;
   gl_FragColor=vec4(result,1.0);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
   #include <fog_fragment>
  }
 `
};

export function createRiver(scene){
 const mesh=new Reflector(new T.PlaneGeometry(270,20.5,270,24),{
  textureWidth:512,textureHeight:512,clipBias:.003,multisample:0,shader
 });
 mesh.name='汴河 · 流波与倒影';mesh.rotation.x=-Math.PI/2;mesh.position.y=.04;
 mesh.material.fog=true;mesh.castShadow=false;scene.add(mesh);
 const uniforms=mesh.material.uniforms,reflect=mesh.onBeforeRender;
 const farGeometry=new T.BufferGeometry(),positions=[],indices=[];
 for(const direction of [-1,1]){
  const start=positions.length/3,steps=97;
  for(let i=0;i<=steps;i++){
   const x=direction*(135+i*(620-135)/steps),c=canalCenter(x),w=canalHalfWidth(x);
   positions.push(x,-c-w,0,x,-c+w,0);
   if(i<steps){const j=start+i*2;indices.push(...(direction>0?[j,j+2,j+1,j+1,j+2,j+3]:[j,j+1,j+2,j+1,j+3,j+2]));}
  }
 }
 farGeometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));farGeometry.setIndex(indices);farGeometry.computeVertexNormals();
 const farMaterial=new T.ShaderMaterial({vertexShader:mesh.material.vertexShader,fragmentShader:mesh.material.fragmentShader,fog:true});
 // Share time/daylight/wakes; the outer reaches never request a reflection
 // texture or an offscreen render, even when the main river is high quality.
 farMaterial.uniforms={...uniforms,reflectionEnabled:{value:0}};
 const farMesh=new T.Mesh(farGeometry,farMaterial);farMesh.name='汴河 · 延伸水道';farMesh.rotation.x=-Math.PI/2;farMesh.position.y=.04;farMesh.castShadow=false;scene.add(farMesh);
 let quality='standard',waveTime=0;
 mesh.onBeforeRender=function(renderer,world,camera){
  if(quality==='low')return;
  reflect.call(this,renderer,world,camera);
 };
 function update(dt,reduced,boats,lighting){
  if(!reduced)waveTime+=Math.max(0,Math.min(dt,.1));
  uniforms.time.value=waveTime;
  boats.forEach((b,i)=>{if(i<5)uniforms.boats.value[i].set(b.g.position.x,b.g.position.z,b.g.scale.x,b.moving?1:0);});
  uniforms.sunDirection.value.copy(lighting.sun.position).sub(lighting.sun.target.position).normalize();
  uniforms.sunColor.value.copy(lighting.sun.color);
 }
 function setQuality(value){
  quality=value;uniforms.reflectionEnabled.value=value==='low'?0:1;
  const resolution=value==='high'?1024:value==='low'?16:512;
  const target=mesh.getRenderTarget();if(target.width!==resolution)target.setSize(resolution,resolution);
  uniforms.reflectionTexel.value=1/resolution;
 }
 return{mesh,farMesh,material:mesh.material,update,setQuality,get time(){return waveTime;}};
}
