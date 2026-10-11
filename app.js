import {people, lenses} from './data.js';

const select = selector => document.querySelector(selector);
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const stage = select('#stage');
const cards = select('#cards');
const lensCards = select('#lenses');
const detail = select('#detail');
const history = [];
let current = {type:'gallery',mode:'people'};
let currentAnimation = null;
const photo = person => `assets/people/${person.file}`;
const escape = value => String(value).replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const portrait = (person,className='') => `<img class="${className}" src="${photo(person)}" style="object-position:${person.position}" alt="${escape(person.name)}">`;
const getPerson = id => people.find(person=>person.id===id);
const getLens = id => lenses.find(lens=>lens.id===id);
const participants = lensId => people.filter(person=>person.views.some(view=>view.lens===lensId));
const compareLenses = (leftId,rightId) => participants(rightId).length-participants(leftId).length || getLens(leftId).name.localeCompare(getLens(rightId).name,'ru');
const orderedViews = person => [...person.views].sort((left,right)=>compareLenses(left.lens,right.lens));
const countLabel = count => count===1?'1 взгляд':count<5?`${count} взгляда`:`${count} взглядов`;
const viewLabel = count => count===1?'1 линза':count<5?`${count} линзы`:`${count} линз`;
const personLabel = count => count===1?'1 человек':count<5?`${count} человека`:`${count} человек`;
const chips = person => orderedViews(person).map(view=>`<span>${escape(getLens(view.lens).name)}</span>`).join('');

for(const person of people){
  const button=document.createElement('button');
  button.dataset.person=person.id;
  button.innerHTML=`${portrait(person)}<span class="card-story">Через ${viewLabel(person.views.length)}<br>${person.views.map(view=>escape(view.label)).join(' · ')}</span><span class="card-caption"><span class="card-name">${person.name}</span><small>${viewLabel(person.views.length)} ↗</small></span>`;
  button.onclick=()=>navigate({type:'person',personId:person.id});
  cards.append(button);
}
for(const lens of [...lenses].sort((left,right)=>compareLenses(left.id,right.id))){
  const members=participants(lens.id);
  const button=document.createElement('button');
  button.dataset.lens=lens.id;
  button.innerHTML=`<span class="lens-orbit" aria-hidden="true"></span><span class="lens-name">${escape(lens.name)}</span><span class="lens-subtitle">${personLabel(members.length)} ↗</span><span class="lens-faces">${members.map(person=>portrait(person)).join('')}</span>`;
  button.onclick=()=>navigate({type:'lens',lensId:lens.id},button);
  lensCards.append(button);
}
function setGallery(mode){
  cancelTransition();
  history.length=0;
  current={type:'gallery',mode};
  render();
  select('.toolbar').scrollIntoView({behavior:'instant',block:'start'});
  select(mode==='people'?'#all-people':'#all-lenses').focus({preventScroll:true});
}
select('#all-people').onclick=()=>setGallery('people');
select('#all-lenses').onclick=()=>setGallery('lenses');
select('.brand').onclick=event=>{event.preventDefault();setGallery('people');};
function personScreen(person,selectedLens){
  const ordered=orderedViews(person);
  if(selectedLens)ordered.sort((left,right)=>Number(right.lens===selectedLens)-Number(left.lens===selectedLens));
  const menu=orderedViews(person).map(view=>`<button data-jump="${view.lens}" data-shared="${view.lens}" aria-pressed="${view.lens===selectedLens}">${escape(view.label)}</button>`).join('');
  return `
    <div class="detail-top"><button data-back>← Назад</button><span id="context-label">${person.name} · ${viewLabel(person.views.length)}</span></div>
    <div class="detail-layout"><aside class="portrait-column">
      <div class="detail-portrait">${portrait(person,'detail-image')}<span id="detail-name">${person.name}</span></div>
      <h2 id="detail-title">Одна жизнь.<br>${viewLabel(person.views.length)}.</h2>
      <p class="portrait-note">Эти фрагменты вместе складываются в рассказ о человеке. Каждый открывает свою сторону.</p>
      <div class="lens-menu" id="personal-lenses" aria-label="Линзы этого человека">${menu}</div>
    </aside><section class="story-fragments" aria-label="Рассказ через линзы">
      <div class="section-heading"><span class="eyebrow">ВСЕ ФРАГМЕНТЫ РАССКАЗА</span><span>${countLabel(person.views.length)}</span></div>
      ${ordered.map(view=>{
        const lens=getLens(view.lens);
        const members=participants(view.lens);
        const others=members.filter(member=>member.id!==person.id);
        return `<article class="fragment ${selectedLens===view.lens?'is-selected':''}" id="fragment-${view.lens}" data-fragment="${view.lens}" tabindex="-1">
          <div class="fragment-heading"><span class="mini-lens" aria-hidden="true"></span><h3>${escape(view.label)}</h3></div>
          <p class="fragment-text">${escape(view.text)}</p>
          <div class="fragment-connection"><span class="connection-avatars">${others.map(member=>portrait(member)).join('')}</span>
          <button class="text-button" data-open-lens="${view.lens}">${others.length?'Эта же линза у других':'Рассмотреть эту линзу'} ↗</button></div>
          <p class="connection-note">${others.length?others.map(member=>member.name).join(' · '):'В этих текстах эта линза пока встречается только здесь.'}</p>
        </article>`;
      }).join('')}
    </section></div>`;
}
function lensScreen(lens,fromPerson){
  const members=participants(lens.id);
  const labels=[...new Set(members.map(person=>person.views.find(view=>view.lens===lens.id).label))];
  return `
    <div class="detail-top"><button data-back>← Назад</button><span id="context-label">${personLabel(members.length)} · одна линза</span></div>
    <div class="hub-heading"><span class="hub-orb" aria-hidden="true"></span><span class="eyebrow">САДИК СМОТРИТ ЧЕРЕЗ РАЗНЫЕ ЛИНЗЫ</span><h2 data-shared="${lens.id}" tabindex="-1">${escape(lens.name)}</h2><p>${escape(lens.question)}</p>
      <span class="source-labels">${labels.length>1?'В текстах: '+labels.map(label=>'«'+escape(label)+'»').join(', '):''}</span>
    </div>
    <div class="hub-intro"><span>${members.length>1?'Одна линза — разные ситуации. Читайте рядом.':'Один взгляд в предоставленных текстах. Другие смогут появиться позже.'}</span><span>${countLabel(members.length)}</span></div>
    <div class="perspective-grid">${members.map(person=>{
      const view=person.views.find(entry=>entry.lens===lens.id);
      return `<article class="person-perspective ${person.id===fromPerson?'from-person':''}" data-member="${person.id}">
        <button class="perspective-person" data-open-person="${person.id}">${portrait(person)}<span><strong>${person.name}</strong><small>${escape(view.label)}</small></span><span class="person-arrow">↗</span></button>
        <p class="fragment-text">${escape(view.text)}</p>
        <button class="text-button" data-open-person="${person.id}">Все линзы: ${person.name} ↗</button>
        <div class="related-chips">${chips(person)}</div>
      </article>`;
    }).join('')}</div>`;
}
function render(){
  const isGallery=current.type==='gallery';
  for(const [selector,mode] of [['#all-people','people'],['#all-lenses','lenses']]){
    const button=select(selector);
    if(isGallery&&current.mode===mode)button.setAttribute('aria-current','page');
    else button.removeAttribute('aria-current');
  }
  select('.toolbar').hidden=!isGallery;
  cards.hidden=!isGallery||current.mode!=='people';
  lensCards.hidden=!isGallery||current.mode!=='lenses';
  cards.inert=cards.hidden;
  lensCards.inert=lensCards.hidden;
  detail.hidden=isGallery;
  stage.classList.toggle('is-detail',!isGallery);
  if(isGallery){
    detail.innerHTML='';
    select('#gallery-title').textContent=current.mode==='people'?'Люди Садика':'Линзы Садика';
    select('#hint').textContent=current.mode==='people'?`${personLabel(people.length)}. У каждого — свой набор линз.`:'Лица под линзой — люди, у которых она есть в тексте.';
    return;
  }
  detail.innerHTML=current.type==='person'?personScreen(getPerson(current.personId),current.lensId):lensScreen(getLens(current.lensId),current.fromPerson);
  detail.querySelector('[data-back]').onclick=back;
  detail.querySelectorAll('[data-jump]').forEach(button=>button.onclick=()=>{
    current.lensId=button.dataset.jump;
    detail.querySelectorAll('[data-jump]').forEach(chip=>chip.setAttribute('aria-pressed',chip===button));
    detail.querySelectorAll('[data-fragment]').forEach(fragment=>fragment.classList.toggle('is-selected',fragment.dataset.fragment===current.lensId));
    const target=select('#fragment-'+current.lensId);
    target.scrollIntoView({behavior:motion.matches?'instant':'smooth',block:'start'});
    target.focus({preventScroll:true});
  });
  detail.querySelectorAll('[data-open-lens]').forEach(button=>button.onclick=()=>{
    const lensId=button.dataset.openLens;
    current.lensId=lensId;
    navigate({type:'lens',lensId,fromPerson:current.personId},button);
  });
  detail.querySelectorAll('[data-open-person]').forEach(button=>button.onclick=()=>navigate({type:'person',personId:button.dataset.openPerson,lensId:current.lensId},detail.querySelector('[data-shared]')));
}
function cancelTransition(){
  currentAnimation?.cancel();
  currentAnimation=null;
  document.querySelectorAll('.travelling-lens').forEach(element=>element.remove());
}
async function navigate(next,source){
  cancelTransition();
  const from=source?.getBoundingClientRect();
  history.push({...current,scroll:scrollY});
  current=next;
  render();
  detail.scrollIntoView({behavior:'instant',block:'start'});
  const target=detail.querySelector('[data-shared="'+(next.lensId||'')+'"]');
  const heading=target||detail.querySelector('#detail-title');
  heading?.setAttribute('tabindex','-1');
  heading?.focus({preventScroll:true});
  if(!motion.matches){
    detail.animate([{opacity:.4},{opacity:1}],{duration:300});
    if(from&&target)await moveLens(next.lensId,from,target.getBoundingClientRect());
  }
}
async function moveLens(lensId,from,to){
  if(!from.width||!to.width)return;
  const marker=document.createElement('div');
  marker.className='travelling-lens';
  marker.setAttribute('aria-hidden','true');
  marker.textContent=getLens(lensId).name;
  document.body.append(marker);
  const size=Math.min(240,to.width);
  marker.style.cssText=`left:${to.left}px;top:${to.top}px;width:${size}px;`;
  const movement=marker.animate([
    {transform:`translate(${from.left-to.left}px,${from.top-to.top}px) scale(.8)`,opacity:.9},
    {transform:'translate(0,0) scale(1)',opacity:.95,offset:.78},
    {transform:'translate(0,0) scale(1)',opacity:0}
  ],{duration:650,easing:'cubic-bezier(.22,.7,.25,1)'});
  currentAnimation=movement;
  try{await movement.finished;}catch{}finally{marker.remove();if(currentAnimation===movement)currentAnimation=null;}
}
function back(){
  if(!history.length)return;
  cancelTransition();
  current=history.pop();
  render();
  scrollTo({top:current.scroll||0,behavior:'instant'});
  const target=current.type==='gallery'
    ? (current.mode==='people'?cards:lensCards).querySelector('button')
    : detail.querySelector('[data-shared="'+(current.lensId||'')+'"]')||detail.querySelector('[data-back]');
  target?.focus({preventScroll:true});
}
document.addEventListener('keydown',event=>{if(event.key==='Escape')back();});
motion.addEventListener('change',()=>{if(motion.matches)cancelTransition();});
select('#site-counts').textContent=`${personLabel(people.length)} · ${people.reduce((sum,person)=>sum+person.views.length,0)} фрагментов · Тексты предоставлены участником проекта.`;
render();
