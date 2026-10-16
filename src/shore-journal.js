// Only a completed action survives a new visit. Never save a half-held strand.
const key='bianjing-shore-rope-v1';
export function createShoreJournal(storage){
 let completed=false;
 try{const entry=JSON.parse(storage?.getItem(key)||'null');completed=entry?.version===1&&entry.completed===true;}catch{}
 return {
  get completed(){return completed;},
  remember(){
   if(completed)return;completed=true;
   try{storage?.setItem(key,JSON.stringify({version:1,completed:true}));}catch{}
  }
 };
}
