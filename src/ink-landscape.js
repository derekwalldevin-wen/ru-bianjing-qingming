// Original landscape-only coloured-ink shading. No game assets, bitmap
// downloads, screen filter, or additional render pass.
export function installLandscapeInk(material,{foliage=false}={}){
 material.userData.inkDetail=1;material.userData.inkKind=foliage?'point-leaf':'mountain';
 material.customProgramCacheKey=()=>`landscape-ink-v1/${foliage?1:0}`;
 material.onBeforeCompile=shader=>{
  shader.uniforms.landscapeNight={value:0};shader.uniforms.inkDetail={value:material.userData.inkDetail};material.userData.shader=shader;
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vLandscapeWorld;\nvarying vec3 vInkNormal;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvLandscapeWorld=(modelMatrix*vec4(transformed,1.0)).xyz;\nvInkNormal=normalize(mat3(modelMatrix)*normal);');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   varying vec3 vLandscapeWorld;
   varying vec3 vInkNormal;
   uniform float landscapeNight;
   uniform float inkDetail;
   float inkHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float inkNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(inkHash(i),inkHash(i+vec2(1.0,0.0)),f.x),mix(inkHash(i+vec2(0.0,1.0)),inkHash(i+vec2(1.0,1.0)),f.x),f.y);}
  `).replace('#include <opaque_fragment>',foliage?/* glsl */`
   vec3 inkN=normalize(vInkNormal),inkV=normalize(cameraPosition-vLandscapeWorld);
   float distanceToEye=length(cameraPosition-vLandscapeWorld);
   float wet=inkNoise(vLandscapeWorld.xz*.32+vLandscapeWorld.y*.19);
   float dots=0.0;if(inkDetail>.5){float seeds=inkNoise(vLandscapeWorld.xz*1.7+vLandscapeWorld.y*.84);dots=smoothstep(.55,.80,seeds)*(1.0-smoothstep(160.0,420.0,distanceToEye));}
   float edge=(1.0-smoothstep(.05,.23,abs(dot(inkN,inkV))))*.25;
   vec3 ink=mix(vec3(.019,.036,.027),vec3(.010,.022,.027),landscapeNight);
   vec3 wash=outgoingLight*.62+mix(vec3(.09,.12,.07),vec3(.018,.035,.032),landscapeNight);
   outgoingLight=mix(wash,ink,.12+wet*.22+dots*.28+edge);
   #include <opaque_fragment>
  `:/* glsl */`
   vec3 inkN=normalize(vInkNormal),inkV=normalize(cameraPosition-vLandscapeWorld);
   float distanceToEye=length(cameraPosition-vLandscapeWorld);
   vec2 brush=vec2(vLandscapeWorld.x*.047+vLandscapeWorld.z*.019,vLandscapeWorld.y*.066+vLandscapeWorld.z*.013);
   float wet=inkNoise(brush);
   float slope=1.0-clamp(inkN.y,0.0,1.0);
   float dry=0.0;
   if(inkDetail>.5){
    float fibre=inkNoise(vec2(brush.x*8.0,brush.y*2.3));
    float strokes=.5+.5*sin(brush.x*13.0+brush.y*2.4+wet*7.0);
    dry=smoothstep(.50,.86,strokes)*smoothstep(.18,.65,fibre)*(1.0-smoothstep(650.0,1250.0,distanceToEye));
   }
   float edge=(1.0-smoothstep(.025,.15,abs(dot(inkN,inkV))))*(.55+.45*wet);
   vec3 ink=mix(vec3(.022,.038,.034),vec3(.009,.022,.027),landscapeNight);
   vec3 paper=mix(vec3(.64,.68,.55),vec3(.065,.11,.125),landscapeNight);
   vec3 wash=outgoingLight*.68+paper*.11;
   outgoingLight=mix(wash,ink,clamp(.06+wet*.18+slope*.09+dry*.30+edge*.45,0.0,.74));
   // The foot and distant layers dissolve into warm paper, retaining the
   // real 3D silhouette and parallax. Detail is anchored to world positions.
   float distanceVeil=smoothstep(240.0,1300.0,distanceToEye);
   float footVeil=(1.0-smoothstep(1.0,45.0,vLandscapeWorld.y))*.65;
   vec3 veil=mix(vec3(.68,.73,.63),vec3(.075,.145,.17),landscapeNight);
   outgoingLight=mix(outgoingLight,veil,clamp(distanceVeil*.62+footVeil,0.0,.88));
   #include <opaque_fragment>
  `);
 };
 return material;
}
