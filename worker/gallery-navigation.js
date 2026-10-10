function bindPhotoTracks(){
 document.querySelectorAll('.event-photo-track').forEach(track=>{
  if(track.dataset.bound)return;track.dataset.bound='true';
  const section=track.closest('.event-memories'),cards=[...track.children],previous=section.querySelector('[data-gallery-prev]'),next=section.querySelector('[data-gallery-next]'),position=section.querySelector('.gallery-position');
  section.querySelector('.gallery-navigation').hidden=cards.length<2;
  const current=()=>cards.reduce((best,card,i)=>Math.abs(card.offsetLeft-cards[0].offsetLeft-track.scrollLeft)<Math.abs(cards[best].offsetLeft-cards[0].offsetLeft-track.scrollLeft)?i:best,0);
  const update=()=>{const i=current();position.textContent=(i+1)+' / '+cards.length;previous.disabled=i===0;next.disabled=i===cards.length-1};
  const moveTo=i=>{const card=cards[Math.max(0,Math.min(cards.length-1,i))];track.scrollTo({left:card.offsetLeft-cards[0].offsetLeft,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})};
  previous.onclick=()=>moveTo(current()-1);next.onclick=()=>moveTo(current()+1);track.onscroll=update;
  track.onkeydown=e=>{if(e.target!==track||!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();moveTo(current()+(e.key==='ArrowRight'?1:-1))};
  let drag=null,suppressClick=false;
  track.ondragstart=e=>e.preventDefault();
  track.onpointerdown=e=>{if(e.pointerType==='mouse'&&e.button===0)drag={x:e.clientX,left:track.scrollLeft,moved:false,id:e.pointerId}};
  track.onpointermove=e=>{if(!drag)return;if(!(e.buttons&1)){finish();return}const distance=e.clientX-drag.x;if(!drag.moved&&Math.abs(distance)>8){drag.moved=true;track.setPointerCapture(drag.id);track.classList.add('is-dragging')}if(drag.moved){e.preventDefault();track.scrollLeft=drag.left-distance}};
  const finish=()=>{if(!drag)return;const moved=drag.moved,id=drag.id;drag=null;track.classList.remove('is-dragging');if(track.hasPointerCapture(id))track.releasePointerCapture(id);if(moved){suppressClick=true;moveTo(current());setTimeout(()=>suppressClick=false,0)}};
  track.onpointerup=finish;track.onpointercancel=finish;track.onlostpointercapture=finish;
  track.addEventListener('click',e=>{if(suppressClick){e.preventDefault();e.stopImmediatePropagation()}},true);
  update();
 });
}
