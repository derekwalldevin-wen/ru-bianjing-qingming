import * as T from 'three';
import {GLTFLoader} from '../vendor/GLTFLoader.js';
import {MeshoptDecoder} from '../vendor/meshopt_decoder.module.js';

export const assetFiles={architecture:'period-architecture.glb',people:'period-people.glb',life:'period-life.glb',bridge:'hongqiao-refined.glb',closeup:'closeup-kit.glb',vendor:'vendor-closeup.glb'};
export const requiredTemplates=['building_shop','building_tea','building_workshop','building_thatch','building_gate','person_porter','person_vendor','person_scholar','person_woman','person_boatman','person_child','boat_cargo','boat_skiff','cart_ox','cart_hand','stall_produce','stall_cloth','tree_willow','tree_bare'];

export function prepareAssetKit(scenes){
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
 return {templates,materials,textures,setQuality(value,maxAnisotropy=4){
  const level=Math.min(maxAnisotropy,value==='high'?8:value==='low'?1:4);
  for(const t of textures)if(t.anisotropy!==level){t.anisotropy=level;t.needsUpdate=true;}
 }};
}

export async function loadPeriodAssets(onProgress=()=>{}){
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),scenes={};let done=0;
 const manifest=await fetch(new URL('../assets/models/manifest.json',import.meta.url),{cache:'no-cache',signal:AbortSignal.timeout(30000)}).then(r=>{if(!r.ok)throw new Error('模型清单读取失败');return r.json();});
 const sizes=Object.fromEntries(manifest.assets.map(a=>[a.file,a.bytes])),received={};
 const revisions=Object.fromEntries(manifest.assets.map(a=>[a.file,a.sha256.slice(0,16)]));
 const totalBytes=Object.values(assetFiles).reduce((sum,file)=>sum+sizes[file],0);
 const progress=()=>onProgress(done,Object.keys(assetFiles).length,Object.values(received).reduce((a,b)=>a+b,0),totalBytes);
 await Promise.all(Object.entries(assetFiles).map(async([kind,file])=>{
  let timer;const timedOut=new Promise((_,reject)=>timer=setTimeout(()=>reject(new Error('模型载入超时：'+file)),45000));
  // A bounded QA-only missing asset exercises the actual HTTP/GLTF failure
  // and archive fallback without removing or corrupting any public model.
  const qa=typeof location==='undefined'?null:new URLSearchParams(location.search);
  const suffix=qa?.has('qa')&&qa.get('fail-model')==='1'&&kind==='closeup'?'.qa-missing':'';
  const gltf=await Promise.race([loader.loadAsync(new URL(`../assets/models/${file}${suffix}?v=${revisions[file]}`,import.meta.url).href,event=>{received[file]=Math.min(sizes[file],event.loaded);progress();}),timedOut]).finally(()=>clearTimeout(timer));
  scenes[kind]=gltf.scene;received[file]=sizes[file];done++;progress();
 }));
 return prepareAssetKit(scenes);
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
