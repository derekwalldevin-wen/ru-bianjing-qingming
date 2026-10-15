import * as T from 'three';

// The long thin water plane has a very loose bounding sphere. This additional
// conservative test includes the shader's entire +/-0.035m wave displacement.
// Visible reflections still update every frame; no cadence or quality change.
export function createReflectionVisibility(surface,margin=.04){
 surface.geometry.computeBoundingBox();
 const local=surface.geometry.boundingBox.clone().expandByScalar(margin),world=new T.Box3(),projection=new T.Matrix4(),frustum=new T.Frustum();
 let enabled=true;const stats={tested:0,skipped:0};
 function required(camera,force=false){
  if(!enabled||force)return true;
  projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
  if(!projection.elements.every(Number.isFinite)||!surface.matrixWorld.elements.every(Number.isFinite))return true;
  frustum.setFromProjectionMatrix(projection,camera.coordinateSystem);world.copy(local).applyMatrix4(surface.matrixWorld);
  stats.tested++;const visible=frustum.intersectsBox(world);if(!visible)stats.skipped++;return visible;
 }
 return{required,stats,setEnabled(value){enabled=Boolean(value);},get enabled(){return enabled;}};
}
