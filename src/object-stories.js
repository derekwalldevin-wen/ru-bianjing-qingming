export const objectStories={
 bridge:{title:'桥上的脚步',speaker:'木匠 · 想象片段',opening:'“桥上脚步不停，桥下船也不停。你看这木头，一根挨着一根，才托得住来往。”',choices:[
  {label:'看木构接缝',text:'先沿两块木料交接处看一圈，再看斜撑的方向。近景中的木销与拼接是对画中木构轮廓的演绎。',note:'回到原画，找一找桥身木构怎样围出船道。'},
  {label:'看桥下留白',text:'把视线移向桥下。桥拱围出的空隙把水路留给了舟船，桥上的人流与桥下的行船在这里相逢。',note:'回到原画，比较桥面人群与桥下船只的位置。'}]},
 boat:{title:'靠岸的一刻',speaker:'船家 · 想象片段',opening:'“先别松这根缆。船稳了，人才好走，岸上的一天也就开始了。”',choices:[
  {label:'看船篷',text:'沿篷口看篾编，再顺着船舷看木板接缝。我们把近景器物做成可以转着看的形体；具体编织和货袋摆放属于演绎。',note:'原画里有不同大小的舟船。找一艘有篷的，再找一艘开敞的小船。'},
  {label:'看缆绳',text:'看绳圈怎样落在船头，想象它绷紧时，船与岸之间会留下多少空隙。近景绳结是演绎，原画可以核对舟船与岸线的关系。',note:'回到原画，顺着船边寻找上下船的人和岸边留下的空隙。'}]},
 market:{title:'檐下的一尺',speaker:'街边人 · 想象片段',opening:'“把篮子收进一点，车还要从这儿过。檐下虽小，容得下许多人的一天。”',choices:[
  {label:'看铺面',text:'观察敞开的铺面与伸出的檐口。门前物件让街道有了停留的地方，具体器物与铺面内部是场景演绎。',note:'原画中门面、招幌和人群挨得很近，找一条行人可以穿过的空隙。'},
  {label:'看道路肌理',text:'把目光移到脚下，辨认土路的颗粒、车辙与深浅。微观纹理属于三维演绎，用来让行走有触感。',note:'回到原画，比较街道的留白与两侧建筑轮廓。'}]},
 'tea-frontage':{title:'歇脚一盏',speaker:'檐下人 · 想象片段',opening:'“路还长，先坐一会儿。碗放稳，等赶路的人把脚歇下来。”',choices:[
  {label:'看碗的内壁',text:'从碗沿往里看，器皿有真实的厚度和内壁。碗与桌凳的安排是近景演绎，不作为原画中这家店业态的证明。',note:'原画可核对檐下聚坐的人物；“茶铺”是游览命名。'},
  {label:'看浅檐与桌凳',text:'比较檐口、桌面与凳子的高低，想象一个行人怎样从街上走到座位旁。具体尺寸和布置属于补全。',note:'回到原画，先找屋檐，再找它下面停留的人。'}]},
 'grass-frontage':{title:'草檐下的日常',speaker:'门前人 · 想象片段',opening:'“篮子在门边，罐子在阴凉处。你若路过，就在檐下停一停。”',choices:[
  {label:'看草束',text:'看草檐的厚度、参差的边缘与成束的草茎。近景捆扎方式为演绎，草顶轮廓可以与原画比较。',note:'原画中的低檐草舍，怎样和旁边的瓦顶屋舍区分？'},
  {label:'看篮罐',text:'篮子有空隙，陶罐有内壁。把目光从大屋顶移到门前小物，能看到另一种生活尺度。器物摆放为演绎。',note:'回到原画，观察草舍前的空间与人物。'}]},
 'ox-cart':{title:'车轮辘辘',speaker:'赶车人 · 想象片段',opening:'“慢一点，过了这段路再走。轮子转得稳，车上的东西才安稳。”',choices:[
  {label:'看轮轴',text:'顺着木轮找到轮轴，再看它与车身连接的地方。牵引结构、尺寸与近景细节是补全，车辆轮廓参考原画。',note:'回到原画，找车马与行人怎样共享街道。'},
  {label:'看小牛与货袋',text:'看看小牛的眼睛，再辨车上货袋的织纹。动物面貌与具体货物属于场景演绎，没有据此认定原画中的货物品类。',note:'原画中车、畜力与赶车人的相对位置，是可以比较的线索。'}]},
 merchant:{title:'一声招呼',speaker:'商贩 · 想象片段',opening:'“来往的人这么多，总有一个愿意停下脚步。你且看看，今日又是热闹的一天。”',choices:[
  {label:'看回望与衣袖',text:'看人物怎样回望、轻抬手臂，再留意衣袖的轮廓。面貌和动作均为演绎；减少动态时人物会静候。',note:'回到原画，找一组面朝不同方向的人，猜猜他们正在关注什么。'},
  {label:'看脚边空间',text:'顺着脚底看街面，再看看身旁的人怎样绕行。三维里的站位与人群避让是空间补全，让街巷可以自由行走。',note:'原画中密集的人群与建筑之间，仍有供行走的空隙。'}]}
};
export const storyKey=o=>o?.id??({0:'bridge',1:'boat',3:'market'}[o?.place]);

objectStories['outer-gabled-compound']={title:'屋檐下的一段路',speaker:'行路人 · 想象片段',opening:'“抬头看屋脊，低头看门前。房子挨着路，路也把来往的人带到檐下。”',choices:[
 {label:'沿山面看木构',text:'从屋顶的三角山面看向横梁，再顺瓦垄找到低侧檐。原画能核对高低屋面的关系；具体木构接法、门窗分格与背面是三维演绎。',note:'回到原画，找出城外前景的大屋面和它旁边较低的一片屋檐。'},
 {label:'看门前留白',text:'从门槛看向道路，观察房屋、树木与行人之间留下的空隙。三维中为漫游留出的距离不是对宋代街宽的测绘。',note:'比较城内铺面和城外屋舍：建筑之间的空隙有什么不同？'}]};

export function createObjectStoryReader({root,archive,exit,storage}){
 const find=id=>root.querySelector('#'+id),done=new Set();let key=null,observation=null;
 try{const saved=JSON.parse(storage.getItem('bianjing-story-notes')||'[]');if(Array.isArray(saved))for(const id of saved)if(typeof id==='string'&&Object.hasOwn(objectStories,id))done.add(id);}catch{}
 function count(){find('story-count').textContent=`随手游记 ${done.size} / ${Object.keys(objectStories).length}`;}
 function remember(){if(!key)return;done.add(key);try{storage.setItem('bianjing-story-notes',JSON.stringify([...done]));}catch{}count();find('story-remember').textContent='已记在游记里';find('story-remember').disabled=true;}
 find('story-close').onclick=exit;find('story-archive').onclick=()=>observation&&archive(observation.place,observation);find('story-remember').onclick=remember;
 function open(o){
  const id=storyKey(o),story=objectStories[id];if(!story)return false;key=id;observation=o;
  find('story-title').textContent=story.title;find('story-speaker').textContent=story.speaker;find('story-text').textContent=story.opening;find('story-note').textContent='选一个线索，带着问题细看画中物件。';
  find('story-remember').hidden=true;find('story-remember').disabled=false;find('story-remember').textContent=done.has(id)?'再记一遍这一景':'记下这一景';
  const choices=find('story-choices');choices.replaceChildren();
  for(const choice of story.choices){const button=document.createElement('button');button.type='button';button.textContent=choice.label;button.setAttribute('aria-pressed','false');button.onclick=()=>{find('story-text').textContent=choice.text;find('story-note').textContent=choice.note;for(const b of choices.children)b.setAttribute('aria-pressed',String(b===button));find('story-remember').hidden=false;find('story-remember').textContent=done.has(id)?'已记在游记里':'记下这一景';find('story-remember').disabled=done.has(id);};choices.append(button);}
  count();root.classList.remove('hidden');root.dataset.story=id;return true;
 }
 return {open,close(){root.classList.add('hidden');delete root.dataset.story;observation=null;key=null;}};
}

objectStories['source-village']={title:'草檐下的一扇门',speaker:'乡路行人 · 想象片段',opening:'“门前留一条路，檐下留一点阴凉。行人走近，才看见草束与木纹的细处。”',choices:[{label:'看草檐与木构',text:'看草顶的厚度、参差边缘和山面横梁，再比较前后屋顶怎样相叠。具体捆扎和接法属于三维演绎。',note:'回到原画，沿屋脊找到较低的草檐，比较它与树群的遮挡。'},{label:'看门前的一线空隙',text:'门框、门扉与门槛各有厚度。近看时可以开合门扉，观察枢轴与檐下阴影；这项动作是场景演绎。',note:'原画能核对村舍轮廓与门前留白，不能据此认定开门时刻或室内用途。'}]};
