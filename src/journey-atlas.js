// A chapter book, deliberately separate from geographic reconstruction.
export function createJourneyAtlas({dialog,places,go,archive,suspend,visited}){
 const find=id=>dialog.querySelector('#'+id);
 let selected=0;
 const cards=places.map((p,i)=>{
  const button=document.createElement('button');button.type='button';button.className='atlas-place';
  button.setAttribute('aria-label',`选择${p.name}`);button.dataset.place=p.id;
  const art=document.createElement('img');art.src=`assets/${p.id}-original.webp`;art.alt='';art.width=260;art.height=150;
  const number=document.createElement('span');number.className='atlas-number';number.textContent=p.n;
  const title=document.createElement('strong');title.textContent=p.name;
  const small=document.createElement('small');small.textContent=p.small;
  button.append(art,number,title,small);button.onclick=()=>select(i);find('atlas-places').append(button);return button;
 });
 function select(i){
  if(!places[i])return;selected=i;const p=places[i];
  cards.forEach((card,n)=>{card.classList.toggle('selected',n===i);card.setAttribute('aria-pressed',String(n===i));card.classList.toggle('visited',visited.has(places[n].id));});
  find('atlas-chapter').textContent=`第${p.n}景 · ${p.small}`;find('atlas-title').textContent=p.name;find('atlas-line').textContent=p.sub;
  find('atlas-visited').textContent=`已寻访 ${visited.size} / ${places.length}`;
 }
 find('atlas-go').onclick=()=>{const i=selected;dialog.close();go(i);};
 find('atlas-archive').onclick=()=>{const i=selected;dialog.close();archive(i);};
 return {select,open(i){select(i);suspend();dialog.showModal();}};
}
