export const observations=[
 {place:0,title:'桥头木作',label:'细看桥头木作',requiredEnhancements:['bridge','closeup'],point:[3.08,1.9,14.0],view:[5.6,2.8,17.1],look:[3.02,1.52,14.3],text:'沿原画木构轮廓，看接缝、木销和斜撑。具体拼接为近景演绎。'},
 {place:3,title:'街市铺面',label:'细看街市铺面',requiredEnhancements:['closeup'],point:[-29,2,-21],view:[-30.2,2.8,-15.5],look:[-29.2,1.25,-21.0],text:'看檐下木作与碗篮，低头辨认车辙和脚印。材质、器物摆放和商贩面貌为演绎。'},
 {place:1,title:'船篷与缆绳',label:'细看船篷与缆绳',openLabel:'近看舟楫 ◎',enhancement:'boatdetail',point:[-38,1.7,4.8],view:[-42.5,4.2,17.4],look:[-34.6,1.15,4.8],mobileView:[-24.2,6.0,13.4],mobileLook:[-35.5,1.0,4.8],mobileText:'船板、篾编与绳圈；细节为演绎。',text:'顺着船舷看木板接缝，再辨篷口的篾编与绳圈。泊岸货船轮廓参考原画，绳结、踏板、货袋和船员站位为近景演绎。'}
];
observations.push({id:'tea-frontage',kind:'frontage',place:2,title:'檐下桌凳',label:'细看檐下桌凳',openLabel:'近看檐下 ◎',enhancement:'teadetail',point:[24.4,1.8,21.5],view:[27.8,3.6,16.4],look:[24.5,1.65,21.5],mobileView:[28.8,4.2,13.2],mobileLook:[24.5,1.0,21.5],mobileText:'浅檐、桌凳与器皿；细节为演绎。',text:'沿浅檐看瓦片接缝，走近桌凳再辨碗的内壁与木作。器皿、桌凳布置和具体业态为场景演绎，原画对照保留在档案中。'});
export function registerVendorObservation(actor,floor){
 if(!actor)return null;
 const x=actor.x,z=actor.z,y=floor(x,z),data={id:'merchant',kind:'person',place:3,title:'檐下商贩',label:'细看商贩招呼',openLabel:'近看商贩 ◎',requiredEnhancements:[],point:[x,y+1.28,z],view:[x+1.3,y+1.9,z+3.9],look:[x,y+1.03,z],mobileView:[x+.7,y+2.1,z+6.1],mobileLook:[x,y+.45,z],mobileText:'回望与轻招呼；面貌和动作为演绎。',text:'看看回望与轻招呼，再辨认衣袖和脚底的接触。面貌、动作与站位为场景演绎。流畅画质或减少动态时，人物静候。'};
 const existing=observations.find(o=>o.id==='merchant');if(existing){Object.assign(existing,data);return existing;}observations.push(data);return data;
}
