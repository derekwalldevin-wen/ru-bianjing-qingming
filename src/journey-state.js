export function readJourney(hash,places){
 const params=new URLSearchParams(hash.replace(/^#/,''));
 const index=places.findIndex(p=>p.id===params.get('place'));
 return {index:Math.max(0,index),night:params.get('light')==='dusk'};
}
export function journeyLink(href,place,night){
 const url=new URL(href);url.search='';
 url.hash=new URLSearchParams({place,light:night?'dusk':'day'}).toString();
 return url.href;
}
