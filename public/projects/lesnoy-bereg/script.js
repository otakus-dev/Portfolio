'use strict';
const HOUSES = [{"id":"sosna","name":"Сосна","guests":2,"price":7900,"area":32,"photo":"room-light.jpg","tag":"Для двоих","desc":"Светлая спальня, большое окно в лес и утренний кофе на собственной террасе.","pets":false,"sauna":false},{"id":"bereg","name":"Берег","guests":4,"price":11900,"area":54,"photo":"cabin-evening.jpg","tag":"У воды","desc":"Панорамная гостиная, отдельная спальня и терраса для длинных разговоров у воды.","pets":true,"sauna":false},{"id":"kedr","name":"Кедр","guests":6,"price":15900,"area":78,"photo":"room-pine.jpg","tag":"Для всей семьи","desc":"Две спальни, просторная кухня и собственная сауна — место для маленьких семейных традиций.","pets":true,"sauna":true}];
const assetPath = 'assets/';
const money = n => n.toLocaleString('ru-RU') + ' ₽';
const day = 86400000;
const iso = d => [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const today = iso(new Date());
const plusDays = (value,n) => { const d = new Date(value+'T12:00:00'); d.setDate(d.getDate()+n); return iso(d); };
const params = new URLSearchParams(location.search);
const defaultArrival = params.get('arrival') >= today && /^\d{4}-\d{2}-\d{2}$/.test(params.get('arrival')) ? params.get('arrival') : plusDays(today,1);
const defaultDeparture = params.get('departure') > defaultArrival && /^\d{4}-\d{2}-\d{2}$/.test(params.get('departure')) ? params.get('departure') : plusDays(defaultArrival,2);
const initialGuests = Math.min(6,Math.max(1,Number(params.get('guests')) || 2));
const menuButton = document.querySelector('.menu-button');
const navigation = document.querySelector('#navigation');
menuButton.addEventListener('click', () => { const open=navigation.classList.toggle('open'); menuButton.setAttribute('aria-expanded',open); menuButton.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню'); });
document.addEventListener('keydown',e=>{if(e.key==='Escape'){navigation.classList.remove('open');menuButton.setAttribute('aria-expanded','false');}});
function setupDates(form){
  const a=form.elements.arrival,b=form.elements.departure;
  a.min=today;a.value=defaultArrival;b.min=plusDays(a.value,1);b.value=defaultDeparture;
  a.addEventListener('change',()=>{if(a.value){b.min=plusDays(a.value,1);if(b.value<=a.value)b.value=b.min;}});
}
function dateError(form){
 const a=form.elements.arrival.value,b=form.elements.departure.value;
 if(!a||!b)return 'Выберите даты заезда и выезда';
 if(a<today)return 'Заезд не может быть в прошлом';
 const nights=(Date.parse(b)-Date.parse(a))/day;
 if(!Number.isFinite(nights)||nights<1)return 'Выезд должен быть позже заезда';
 if(nights>30)return 'В демонстрации можно выбрать до 30 ночей';
 return '';
}
const search=document.querySelector('.stay-search');
if(search){
 setupDates(search);search.elements.guests.value=initialGuests;
 search.addEventListener('submit',e=>{
  const error=dateError(search);search.querySelector('.search-error').textContent=error;
  if(error)e.preventDefault();
  else if(document.querySelector('#house-grid')){e.preventDefault();updateCatalog();}
 });
}
function queryFor(house){
 const source=document.querySelector('.stay-search');
 const q=new URLSearchParams();
 if(house)q.set('house',house);
 q.set('arrival',source?source.elements.arrival.value:defaultArrival);
 q.set('departure',source?source.elements.departure.value:defaultDeparture);
 q.set('guests',source?source.elements.guests.value:initialGuests);
 return q.toString();
}
function updateCatalog(){
 let count=0;const guests=Number(search.elements.guests.value);
 document.querySelectorAll('.house-card').forEach(card=>{
  const match=Number(card.dataset.guests)>=guests&&(!document.querySelector('#pets').checked||card.dataset.pets==='true')&&(!document.querySelector('#sauna').checked||card.dataset.sauna==='true');
  card.hidden=!match;if(match)count++;
  card.querySelectorAll('a').forEach(a=>a.href=a.getAttribute('href').split('?')[0]+'?'+queryFor());
 });
 document.querySelector('#catalog-status').textContent='Подходящих вариантов: '+count;
 document.querySelector('#empty').hidden=count>0;
}
if(document.querySelector('#house-grid')){
 ['#pets','#sauna'].forEach(id=>document.querySelector(id).addEventListener('change',updateCatalog));
 search.addEventListener('change',updateCatalog);
 document.querySelector('#reset-filters').addEventListener('click',()=>{document.querySelector('#pets').checked=false;document.querySelector('#sauna').checked=false;search.elements.guests.value=2;updateCatalog();});
 updateCatalog();
}
document.querySelectorAll('.book-house').forEach(a=>{const house=new URL(a.href).searchParams.get('house');a.href='booking.html?'+queryFor(house);});
const form=document.querySelector('#booking-form');
if(form){
 setupDates(form);
 form.elements.house.value=HOUSES.some(h=>h.id===params.get('house'))?params.get('house'):'sosna';
 form.elements.guests.value=initialGuests;
 const dialog=document.querySelector('#confirmation');
 let quote=null;
 function recalc(){
  const h=HOUSES.find(h=>h.id===form.elements.house.value);
  const guests=Number(form.elements.guests.value);
  const error=dateError(form)||(guests>h.guests?'Домик «'+h.name+'» рассчитан максимум на '+h.guests+' гостей. Выберите другой домик или уменьшите число гостей.':'');
  document.querySelector('#booking-error').textContent=error;
  const image=document.querySelector('#summary-image');image.src=assetPath+h.photo;image.alt='Домик '+h.name;
  document.querySelector('#summary-name').textContent=h.name;
  form.querySelector('[type=submit]').disabled=Boolean(error);
  if(error){quote=null;document.querySelector('#total').textContent='—';document.querySelector('#price-details').replaceChildren();return;}
  const nights=(Date.parse(form.elements.departure.value)-Date.parse(form.elements.arrival.value))/day;
  const stay=nights*h.price,breakfast=form.elements.breakfast.checked?nights*guests*650:0,boat=form.elements.boat.checked?1500:0;
  quote={house:h.name,nights,guests,total:stay+breakfast+boat,arrival:form.elements.arrival.value,departure:form.elements.departure.value};
  document.querySelector('#price-details').innerHTML='<div><dt>'+nights+' ноч. × '+money(h.price)+'</dt><dd>'+money(stay)+'</dd></div>'+(breakfast?'<div><dt>Завтраки</dt><dd>'+money(breakfast)+'</dd></div>':'')+(boat?'<div><dt>Лодка</dt><dd>'+money(boat)+'</dd></div>':'');
  document.querySelector('#total').textContent=money(quote.total);
 }
 form.addEventListener('change',recalc);
 form.addEventListener('submit',e=>{e.preventDefault();recalc();if(!quote||!form.reportValidity())return;document.querySelector('#confirmation-text').textContent='Домик «'+quote.house+'» · '+quote.arrival+' — '+quote.departure+' · '+quote.guests+' гостей · '+money(quote.total);dialog.showModal();});
 document.querySelectorAll('.close-dialog,.close-confirmation').forEach(b=>b.addEventListener('click',()=>dialog.close()));
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
 recalc();
}
