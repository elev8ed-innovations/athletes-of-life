(async function(){
 const keys=['athletes','trades','everyday','golden-age','coaches','sports-parents'];
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const hover=matchMedia('(hover: hover) and (pointer: fine) and (min-width: 761px)');
 let sources={};try{const r=await fetch('/category-videos.json');if(r.ok)sources=await r.json()}catch{}
 let active=null,playVersion=0;
 function pause(item){item.video.pause();item.card.classList.remove('preview-playing');item.button.setAttribute('aria-pressed','false');item.button.textContent=item.label();if(active===item)active=null}
 const items=[];
 document.querySelectorAll('.lane-card, .coaches-card').forEach((card,i)=>{
  const key=keys[i],title=card.querySelector('.lane-name, h3');
 let wrap=card.querySelector('.lane-img-wrap');
 if(!wrap&&sources[key]){wrap=document.createElement('div');wrap.className='lane-img-wrap partner-video-wrap';const poster=document.createElement('img');poster.className='lane-img';poster.alt=title.textContent;poster.loading='lazy';wrap.appendChild(poster);card.prepend(wrap)}
 const image=wrap&&wrap.querySelector('img');
  if(!wrap||!sources[key])return;
 const source=typeof sources[key]==='string'?{url:sources[key]}:sources[key];if(source.poster)image.src=source.poster;
  const video=document.createElement('video');video.className='category-video';video.muted=true;video.playsInline=true;video.preload='none';video.poster=image.src;video.setAttribute('aria-hidden','true');video.dataset.src=source.url;wrap.appendChild(video);
  const button=document.createElement('button');button.type='button';button.className='category-preview-toggle';button.setAttribute('aria-pressed','false');
  const label=()=>document.documentElement.lang==='es'?'▶ Vista previa':'▶ Preview';button.textContent=label();button.setAttribute('aria-label','Preview '+title.textContent+' video');wrap.appendChild(button);
  const item={card,video,button,label};items.push(item);
  async function play(explicit=false){if((reduce.matches||document.querySelector('#aol-motion-toggle')?.getAttribute('aria-pressed')==='true')&&!explicit)return;const version=++playVersion;if(active&&active!==item)pause(active);active=item;if(!video.src)video.src=video.dataset.src;try{video.currentTime=0;await video.play();if(version!==playVersion||active!==item){video.pause();return}card.classList.add('preview-playing');button.setAttribute('aria-pressed','true');button.textContent=document.documentElement.lang==='es'?'Ⅱ Pausar':'Ⅱ Pause'}catch{pause(item)}}
  card.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'&&hover.matches)play()});card.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'&&hover.matches)pause(item)});
  button.onclick=e=>{e.stopPropagation();video.paused?play(true):pause(item)};
  video.onended=()=>pause(item);video.onerror=()=>pause(item);
 });
 document.querySelector('#aol-motion-toggle')?.addEventListener('click',()=>{if(active&&document.querySelector('#aol-motion-toggle').getAttribute('aria-pressed')==='true')pause(active)});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&active)pause(active)});
 reduce.addEventListener('change',()=>{if(reduce.matches&&active)pause(active)});
 new MutationObserver(()=>items.forEach(item=>{if(item.video.paused)item.button.textContent=item.label();else item.button.textContent=document.documentElement.lang==='es'?'Ⅱ Pausar':'Ⅱ Pause';item.button.setAttribute('aria-label',(document.documentElement.lang==='es'?'Vista previa de ':'Preview ')+item.card.querySelector('.lane-name, h3').textContent+' video')})).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(!e.isIntersecting){const item=items.find(x=>x.card===e.target);if(item)pause(item)}}));items.forEach(x=>observer.observe(x.card));
})();
