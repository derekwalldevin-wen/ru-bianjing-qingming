// Only reuse a reflection when its owner explicitly declares a frozen scene.
// Exact comparisons keep even tiny camera/light changes live; no motion threshold.
export function createReflectionReuse(){
 let previous=null,revision=0,enabled=true;
 const stats={rendered:0,reused:0};
 function invalidate(){revision++;previous=null;}
 function renderRequired(camera,surface,state){
  if(!enabled||!state?.frozen){previous=null;stats.rendered++;return true;}
  const next=[revision,...camera.matrixWorld.elements,...camera.projectionMatrix.elements,...surface.matrixWorld.elements,...state.values];
  const same=previous&&previous.length===next.length&&next.every((value,i)=>Number.isFinite(value)&&value===previous[i]);
  previous=next;if(same){stats.reused++;return false;}stats.rendered++;return true;
 }
 return {renderRequired,invalidate,stats,setEnabled(value){enabled=Boolean(value);invalidate();}};
}
