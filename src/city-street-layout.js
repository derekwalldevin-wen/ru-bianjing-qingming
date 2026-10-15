import {streetRoute} from './painting-layout.js?v=source-compound-v1';

export const cityStreetHalfWidth=5.3;
// Ground registration is separate from the retained roof-image coordinates.
// Exposed facade feet were checked in the source; hidden rear lots remain
// interpretations of overlap, not measured Kaifeng parcels.
export const cityStreetLots=new Map([
 ['city-1',{side:-1,row:'front',frontage:[820,350]}],
 ['city-2',{side:-1,row:'front',frontage:[1010,350]}],
 ['city-5',{side:-1,row:'front',frontage:[1195,330]}],
 ['city-7',{side:-1,row:'front',frontage:[1500,335]}],
 ['city-13',{side:-1,row:'front',frontage:[2610,345]}],
 ...['city-3','city-4','city-6','city-8','city-9'].map(id=>[id,{side:-1,row:'rear',frontage:null}]),
 ...['city-15','city-16','city-17','city-18','city-19','city-20'].map(id=>[id,{side:1,row:'foreground',frontage:null}])
]);

export function cityStreetZ(x){
 for(let i=1;i<streetRoute.length;i++){const a=streetRoute[i-1],b=streetRoute[i];if(x<=b[0]){const t=Math.max(0,Math.min(1,(x-a[0])/(b[0]-a[0])));return a[1]+(b[1]-a[1])*t;}}
 return streetRoute.at(-1)[1];
}

export function registerCityStreetLot(source,halfDepth){
 const lot=cityStreetLots.get(source.id);if(!lot)return null;
 const streetZ=cityStreetZ(source.x),setback=1.8,rearDepth=lot.row==='rear'?7.5:0;
 const requestedZ=streetZ+lot.side*(halfDepth+cityStreetHalfWidth+setback+rearDepth);
 return {...lot,streetZ,requestedZ,setback,rearDepth,sourceProjectedZ:source.z,
  evidence:lot.frontage?'source-visible facade foot;ground registration interpreted':'source overlap/foreground grouping;hidden ground registration interpreted'};
}

export function streetPlacementOrder(entries){
 return [...entries].sort((a,b)=>{
  const x=cityStreetLots.get(a[1].id),y=cityStreetLots.get(b[1].id);
  const rank=lot=>!lot?2:lot.row==='rear'?1:0;
  return rank(x)-rank(y)||(x?.row==='rear'&&y?.row==='rear'?b[1].reference[1]-a[1].reference[1]:a[0]-b[0]);
 });
}
