import {reframe,heroFrames} from './painting-layout.js?v=original-scroll-v1';
export const places=[
 {id:'bridge',name:'虹桥烟火',small:'桥上往来',n:'壹',point:[0,7,0],view:[46,21,56],target:[0,3,0],walk:[0,0,13.1],heading:0,sub:'一桥飞架，两岸人家。',fact:'拱桥横跨河面，桥上摊贩与行人聚集，桥下船只穿行。细看桥头，便能发现水上交通与陆上市集在这里交会。',question:'先看桥上的人，再看桥下的船。你的目光会停在哪里？试着从桥侧观察木构与船身的高低关系。'},
 {id:'harbor',name:'汴河舟楫',small:'水上生计',n:'贰',point:[-38,3,7],view:[-76,11,40],target:[-37,1,0],walk:[-36,0,13],heading:0,sub:'一河舟楫，载来城中日常。',fact:'河上可见大小船只，岸边屋舍与船篷相接。舟船不仅是画中的景物，也让人看到货物、行旅与城市生活之间的联系。',question:'找到泊岸的船，再看看岸边空间。卸下一船货，需要留出怎样的一段岸线？'},
 {id:'tea',name:'桥畔茶铺',small:'歇脚片刻',n:'叁',point:[23,6,24],view:[49,11,-4],target:[23,3,25],walk:[23,0,16],heading:Math.PI,sub:'歇脚一盏，再赴前程。',fact:'临河屋舍的檐下有聚坐的人物，屋顶、门面与河岸紧密相连。局部图能帮助我们观察街边店铺如何向行人打开。',question:'走近屋檐，想象从街上转入铺面的一刻。这里“茶铺”的游览命名属于场景演绎，具体业态仍需结合题记与研究判断。'},
 {id:'market',name:'街市百业',small:'市声如织',n:'肆',point:[-29,8,-25],view:[-48,11,1],target:[-28,3,-27],walk:[-28,0,-16],heading:0,sub:'百样营生，一城烟火。',fact:'高低屋舍、开敞门面与街头人群相互交织，招幌和棚檐沿街铺开。画面把生意、出行与闲谈放在同一条街道里。',question:'人们是沿着哪条空隙走动的？不妨观察建筑之间的留白，那里往往就是市井生活发生的地方。'},
 {id:'grass',name:'草棚人家',small:'檐下日常',n:'伍',point:[-66,5,-24],view:[-91,11,6],target:[-66,2,-25],walk:[-65,0,-16],heading:0,sub:'低檐草舍，自有忙闲。',fact:'茅草屋顶、院落与人物构成另一种街巷尺度。与大屋铺面相比，这里的屋舍更低，活动更贴近门前与院边。',question:'比较瓦顶与草顶。材料的不同怎样改变了屋檐轮廓，又怎样影响你对这段街巷的感受？'},
 {id:'carts',name:'车马行旅',small:'往来皆客',n:'陆',point:[59,3,-16.3],view:[79,10,11],target:[59,1.5,-16.3],walk:[51,0,-15],heading:-1.4,sub:'车轮辘辘，行旅不息。',fact:'车马、人群与店面在同一片街景中相遇。运输工具和行人的相对位置，让这幅静止的画有了正在行进的感觉。',question:'为车马留一条路，再给行人找一处停脚的地方。画中的街道，远比一条笔直的线丰富。'}
];
export const tour=[
 {place:1,title:'一条河，养一座城',text:'循着船头望去，货物与行旅沿水而来。先从河岸开始，看看城市如何与船相接。',from:[-68,12,20],to:[-25,8,20],look:[-32,1,0],duration:16},
 {place:0,title:'桥上桥下，皆是故事',text:'镜头绕向虹桥。桥面的人流与桥下的船道，在这一刻相逢。留意桥拱为行船腾出的空间。',from:[22,12,25],to:[-12,9,19],look:[0,3,0],duration:18},
 {place:3,title:'转身，便是人间',text:'离开河面，沿着檐下走一段。摊棚、招幌与行人的间隙，组成街市的节奏。',from:[-7,10,-12],to:[-46,8,-12],look:[-29,3,-27],duration:17},
 {place:2,title:'在桥畔，歇一歇',text:'最后回到岸边的铺面。打开原画对照，找找刚才走过的桥、屋与船。你也可以结束导览，继续自由漫游。',from:[44,12,7],to:[15,9,11],look:[23,3,25],duration:16}
];

for(const p of places){if(heroFrames[p.id]){for(const key of ['point','view','target','walk'])p[key]=reframe(p[key],p.id);p.heading+=heroFrames[p.id].turn;}}
for(const t of tour){const key=places[t.place].id;if(heroFrames[key])for(const field of ['from','to','look'])t[field]=reframe(t[field],key);}
places.push({id:'gate',name:'城门楼阙',small:'城里城外',n:'柒',point:[200,14,40],view:[162,23,90],target:[200,9,40],walk:[180,0,40],heading:-Math.PI/2,sub:'穿一座城门，读两种烟火。',originalOnly:true,fact:'原画可见高台基、矩形门道、平座、阶梯与五开间木构楼身。这里据原图纠正了早期的石拱门；尺寸、背面与墙段长度为三维补全。',question:'门楼与屋舍并不并排重复。看道路怎样穿过门洞，再看楼身如何落在台基上。'});
places.push({id:'outskirts',name:'城外郊野',small:'草舍疏林',n:'捌',point:[-256,4,43],view:[-286,13,77],target:[-253,3,43],walk:[-268,0,31],heading:2.2,sub:'由疏入密，随长卷入城。',originalOnly:true,fact:'卷首草舍、枯树、乡路与水岸留有大片空隙。这里保留低檐与疏林的节奏，田畦及未画出的背面为场景补全。',question:'郊野不该填满房屋。比较村舍与城内铺面的距离，感受长卷由疏到密的展开。'});
