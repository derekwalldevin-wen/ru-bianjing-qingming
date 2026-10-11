import * as T from 'three';
import {GLTFLoader} from '../vendor/GLTFLoader.js';
import {MeshoptDecoder} from '../vendor/meshopt_decoder.module.js';
import {fetchModelBytes} from './asset-stream.js';

export const assetFiles={architecture:'period-architecture.glb',people:'period-people.glb',life:'period-life.glb',bridge:'hongqiao-refined.glb',closeup:'closeup-kit.glb',vendor:'vendor-closeup.glb'};
export const requiredTemplates=['building_shop','building_tea','building_workshop','building_thatch','building_gate','person_porter','person_vendor','person_scholar','person_woman','person_boatman','person_child','boat_cargo','boat_skiff','cart_ox','cart_hand','stall_produce','stall_cloth','tree_willow','tree_bare'];

export function prepareAssetKit(scenes,collisionBounds){
 const templates=new Map(),materials=new Set(),textures=new Set();
 for(const [kind,scene] of Object.entries(scenes)){
  scene.updateMatrixWorld(true);
  if(kind==='bridge')templates.set('bridge',scene);
  scene.traverse(o=>{
   if(requiredTemplates.includes(o.name)||['detail_bridge','detail_market'].includes(o.name))templates.set(o.name,o);
   if(o.isMesh){
    o.castShadow=o.receiveShadow=true;
    const list=Array.isArray(o.material)?o.material:[o.material];
    for(const m of list){materials.add(m);for(const key of ['map','normalMap','roughnessMap','metalnessMap','aoMap'])if(m[key])textures.add(m[key]);}
   }
  });
 }
 // An independent refined export deliberately replaces the existing role,
 // keeping its semantic joints and the same per-role instance batches.
 if(scenes.vendor)templates.set('person_vendor',scenes.vendor.getObjectByName('person_vendor'));
 for(const name of [...requiredTemplates,'bridge','detail_bridge','detail_market'])if(!templates.get(name))throw new Error(`精修模型缺失：${name}`);
 return {templates,materials,textures,scenes,collisionBounds,setQuality(value,maxAnisotropy=4){
  const level=Math.min(maxAnisotropy,value==='high'?8:value==='low'?1:4);
  for(const t of textures)if(t.anisotropy!==level){t.anisotropy=level;t.needsUpdate=true;}
 }};
}

export async function loadPeriodAssets(onProgress=()=>{}){
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),scenes={},loadTimings=[];let done=0;
 const manifest=await fetch(new URL('../assets/models/manifest.json',import.meta.url),{cache:'no-cache',signal:AbortSignal.timeout(30000)}).then(r=>{if(!r.ok)throw new Error('模型清单读取失败');return r.json();});
 const entries=Object.fromEntries(Object.entries(assetFiles).map(([kind,file])=>[kind,manifest.assets.find(a=>a.file===file)])),received={};
 const qa=typeof location==='undefined'?null:new URLSearchParams(location.search),fullReference=qa?.has('qa')&&qa.get('full-models')==='1';
 for(const entry of Object.values(entries))if(!entry)throw new Error('模型清单不完整');
 const initial=Object.fromEntries(Object.entries(entries).map(([kind,entry])=>[kind,fullReference?entry:entry.base||entry]));
 const totalBytes=Object.values(initial).reduce((sum,entry)=>sum+entry.bytes,0);
 const progress=()=>onProgress(done,Object.keys(assetFiles).length,Object.values(received).reduce((a,b)=>a+b,0),totalBytes);
 async function load(entry,signal,onBytes,missing=false){
  const started=performance.now();
  const url=new URL(`../assets/models/${entry.file}${missing?'.qa-missing':''}?v=${entry.sha256.slice(0,16)}`,import.meta.url);
  const buffer=await fetchModelBytes(url.href,{signal,onProgress:onBytes,expectedBytes:entry.bytes});
  const downloaded=performance.now();
  const gltf=await loader.parseAsync(buffer,'');
  loadTimings.push({file:entry.file,bytes:buffer.byteLength,fetchMilliseconds:downloaded-started,parseMilliseconds:performance.now()-downloaded});
  if(signal?.aborted){disposeAssetScene(gltf.scene);signal.throwIfAborted();}
  return gltf.scene;
 }
 const controller=new AbortController();
 const jobs=Object.entries(initial).map(async([kind,entry])=>{
  const scene=await load(entry,controller.signal,bytes=>{received[kind]=Math.min(entry.bytes,bytes);progress();},qa?.has('qa')&&qa.get('fail-model')==='1'&&kind==='closeup');
  scenes[kind]=scene;received[kind]=entry.bytes;done++;progress();
 });
 try{await Promise.all(jobs);}catch(error){controller.abort(error);await Promise.allSettled(jobs);for(const scene of Object.values(scenes))disposeAssetScene(scene);throw error;}
 const kit=prepareAssetKit(scenes,manifest.collisionBounds);
 kit.initialBytes=totalBytes;
 kit.loadTimings=loadTimings;kit.fullReference=fullReference;
 kit.enhancementKinds=fullReference?[]:Object.keys(entries).filter(kind=>entries[kind].base);
 kit.loadEnhancement=(kind,signal,onBytes)=>load(entries[kind],signal,onBytes,qa?.has('qa')&&qa.get('fail-enhancement')===kind);
 kit.discardEnhancement=scene=>disposeAssetScene(scene);
 return kit;
}

// Dispose retired source resources only after visual replacement has removed
// references from the world AND the remaining template kit.
export function disposeAssetScene(retired,liveRoots=[]){
 const geometry=new Set(),materials=new Set(),textures=new Set();
 const visit=(root,g,m,t)=>root?.traverse(o=>{if(!o.isMesh)return;g.add(o.geometry);for(const mat of Array.isArray(o.material)?o.material:[o.material]){m.add(mat);for(const value of Object.values(mat))if(value?.isTexture)t.add(value);}});
 for(const root of liveRoots)visit(root,geometry,materials,textures);
 const oldGeometry=new Set(),oldMaterials=new Set(),oldTextures=new Set();visit(retired,oldGeometry,oldMaterials,oldTextures);
 for(const g of oldGeometry)if(!geometry.has(g))g.dispose();
 for(const m of oldMaterials)if(!materials.has(m))m.dispose();
 for(const t of oldTextures)if(!textures.has(t))t.dispose();
}

export function replaceObjectVisual(group,replacement,preserved=[]){
 for(const child of [...group.children])if(!preserved.includes(child))group.remove(child);
 for(const child of [...replacement.children])group.add(child);
}

// All Blender templates are exported at the origin. Capture full glTF transforms
// (including axis conversion), then reuse their geometry in instance batches.
export function templateParts(root){
 root.updateWorldMatrix(true,true);const parts=[];
 root.traverse(o=>{if(o.isMesh){
  // GLTFLoader splits multi-material limbs into children named after the source
  // mesh (e.g. Cone049). Preserve the semantic joint name on their parent.
  let joint=o;while(joint!==root&&joint.parent&&!/^person_.*__/.test(joint.name))joint=joint.parent;
  const name=/^person_.*__/.test(joint.name)&&joint!==o?`${joint.name}/${o.name}`:o.name;
  parts.push({geometry:o.geometry,material:o.material,matrix:o.matrixWorld.clone(),name});
 }});
 return parts;
}

export function createAssetInstances(scene,kit,placements){
 const batches=[];const transform=new T.Object3D(),matrix=new T.Matrix4();
 for(const [name,items] of placements){
  const root=kit.templates.get(name);if(!root)throw new Error(`Unknown template ${name}`);
  // Small spatial batches let both the camera and reflected camera cull distant
  // streets. One city-wide batch would draw every roof even inside a shop.
  const cells=new Map();
  for(const item of items){const key=`${Math.floor(item.x/40)},${Math.floor(item.z/40)}`;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(item);}
  for(const cellItems of cells.values()){
  for(const part of templateParts(root)){
   const mesh=new T.InstancedMesh(part.geometry,part.material,cellItems.length);mesh.name=`精修/${name}/${part.name}`;
   mesh.castShadow=mesh.receiveShadow=true;
   cellItems.forEach((item,i)=>{
    transform.position.set(item.x,item.y??.62,item.z);transform.rotation.set(0,item.yaw||0,0);
    const scale=item.scale??1;transform.scale.set(...(Array.isArray(scale)?scale:[scale,scale,scale]));transform.updateMatrix();
    matrix.multiplyMatrices(transform.matrix,part.matrix);mesh.setMatrixAt(i,matrix);
   });
   mesh.computeBoundingSphere();scene.add(mesh);batches.push(mesh);
  }
  }
 }
 return batches;
}

export function createAssetObject(kit,name){
 const group=new T.Group();group.name=`精修/${name}`;
 for(const part of templateParts(kit.templates.get(name))){
  const mesh=new T.Mesh(part.geometry,part.material);mesh.matrix.copy(part.matrix);mesh.matrixAutoUpdate=false;mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
 }
 return group;
}
