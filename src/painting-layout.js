// Original roof anchors manually inspected in the supplied Palace Museum scroll.
// Source coordinates refer to 4500px-wide inspection copies; native sizes and
// hashes are retained in research/original-layout/source-receipt.json.
// Y-depth, dimensions and invisible backs are a 3D interpretation of scattered
// perspective. No random street grid is allowed in this layout.
export const paintingSources={
 city:{image:'full-7.jpg',native:[50000,7595],inspection:[4500,684]},
 outside:{image:'full-8.jpg',native:[38778,7595],inspection:[4500,882]},
 approach:{image:'full-9.jpg',native:[50000,7595],inspection:[4500,684]},
 countryside:{image:'full-10.jpg',native:[43276,7595],inspection:[4500,790]}
};
// u,v,width,depth,type,yaw; anchors are visible buildings or cut roof fragments.
const roofs={
 city:[[820,200,170,105],[1010,195,160,115],[885,65,240,110],[1080,58,160,100],[1195,140,170,120],[1390,95,200,130],[1500,115,140,120],[1620,63,150,85],[1700,42,140,75],[1840,65,175,110],[2040,155,245,115,'hall'],[2310,67,265,120],[2610,193,240,130],[2780,52,195,115,'gate'],[980,545,180,110],[1200,560,280,140],[1490,610,190,100],[1870,575,245,110,'hall'],[2200,605,175,105],[2500,620,245,110],[2780,578,120,100],[3470,59,140,110],[3730,76,235,115],[4000,106,205,135],[4200,62,160,100],[4340,146,180,120],[4270,585,245,175]],
 outside:[[60,195,175,115],[190,145,200,135],[560,140,245,160],[820,45,175,120],[1060,145,260,150],[1260,143,175,125],[1400,62,190,95],[70,600,230,140],[395,672,270,160],[645,745,210,145],[1255,700,220,150],[1410,788,220,140],[1710,689,225,160],[1720,465,230,130,'hall'],[2120,679,230,140],[2340,655,160,100],[3080,104,200,130],[3350,94,240,120],[3770,623,315,190],[4080,681,300,160],[4400,752,180,125],[760,360,290,180,'thatch']],
 approach:[[85,80,230,130],[700,115,240,145],[975,86,160,100],[1150,131,165,110],[1400,59,175,100],[1580,121,230,145],[1670,59,170,100],[2180,153,250,130],[2420,203,245,145],[2680,104,155,120],[2910,140,150,125],[3220,64,145,110],[3490,42,150,95],[3210,368,230,110,'thatch'],[3535,421,200,120,'thatch'],[3070,165,175,120],[280,584,220,130]],
 countryside:[[695,344,200,135,'thatch'],[842,272,170,105,'thatch']]
};
export function projectPaintingPoint(segment,u,v){
 const start={city:0,outside:50000,approach:88778,countryside:138778}[segment],src=paintingSources[segment];
 const x=(83500-start-u/4500*src.native[0])*.004;
 let z=segment==='city'?28+(v/src.inspection[1]-.45)*88:segment==='outside'?12+(v/src.inspection[1]-.42)*105:segment==='approach'?-37+(v/src.inspection[1]-.20)*70:32+(v/src.inspection[1]-.4)*42;
 // The river and road need volume in 3D. Source anchors remain untouched;
 // the unprojection's bank depth is constrained, not sold as measured metres.
 if(Math.abs(x)<130)z=(z<0?-1:1)*Math.max(26,Math.abs(z));
 return[x,z];
}
export const heroFrames={
 tea:{from:[23,25],to:[61,49],turn:0,source:'outside-15'},
 grass:{from:[-66,-25],to:[109,48],turn:Math.PI,source:'outside-22'},
 market:{from:[-29,-26],to:[243,24],turn:0,source:'city-11'},
 carts:{from:[59,-16.3],to:[262,46],turn:0,source:'city-8'}
};
export function reframe(point,key){const f=heroFrames[key],c=Math.cos(f.turn),s=Math.sin(f.turn),dx=point[0]-f.from[0],dz=point[2]-f.from[1];return[f.to[0]+dx*c+dz*s,point[1],f.to[1]-dx*s+dz*c];}
const consumed=new Set(['outside-15','outside-22','city-11']);
export const visibleRoofPlan=Object.entries(roofs).flatMap(([segment,records])=>records.map((r,i)=>{
 const [u,v,rw,rd,type='shop',yaw=0]=r,[x,z]=projectPaintingPoint(segment,u,v),src=paintingSources[segment];
 return{id:`${segment}-${i+1}`,segment,reference:[u,v,rw,rd],nativeAnchor:[Math.round(u/4500*src.native[0]),Math.round(v/src.inspection[1]*src.native[1])],x,z,w:Math.max(4.2,Math.min(12,rw/4500*src.native[0]*.004)),d:Math.max(4.2,Math.min(8.5,rd/src.inspection[1]*8)),h:type==='hall'?5.6:type==='thatch'?2.65:3.1+(i%3)*.3,yaw,type,evidence:'original-visible',source:src.image,original:src.image,hero:consumed.has(`${segment}-${i+1}`)};
})).filter(p=>p.type!=='gate');
export const paintedGate={x:200,z:40,yaw:Math.PI/2,source:'full-7.jpg',reference:[2950,145,550,280],note:'矩形门道、收分台基、五开间楼身、平座、阶梯与相接城墙；尺寸与背面补全'};
export const streetRoute=[[42,17],[75,22],[107,32],[145,39],[180,40],[220,40],[256,46],[293,46],[332,41]];
export const ruralRoute=[[-320,17],[-290,21],[-266,31],[-246,42],[-221,35],[-191,27],[-160,18],[-116,16.7]];
export function distanceToRoute(x,z,route){let best=Infinity;for(let i=1;i<route.length;i++){const [ax,az]=route[i-1],[bx,bz]=route[i],dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)));best=Math.min(best,Math.hypot(x-ax-t*dx,z-az-t*dz));}return best;}
