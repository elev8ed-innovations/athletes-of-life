(function(){
  var video=document.getElementById('portal-video');
  var button=document.getElementById('portal-video-toggle');
  var portal=document.getElementById('portal');
  var reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  var userPaused=false;
  function label(){
    var es=document.documentElement.lang==='es';
    button.textContent=video.paused?'▶':'Ⅱ';
    button.setAttribute('aria-label',video.paused?(es?'Reproducir video de entrada':'Play entrance video'):(es?'Pausar video de entrada':'Pause entrance video'));
  }
  function play(){
    if(!portal.isConnected||portal.classList.contains('leaving'))return;
    if(!video.getAttribute('src'))video.src='assets/entry-video.mp4';
    video.play().then(label).catch(label);
  }
  video.addEventListener('play',label);
  video.addEventListener('pause',label);
  video.addEventListener('error',function(){video.style.visibility='hidden';button.hidden=true;});
  button.addEventListener('click',function(){if(video.paused){userPaused=false;play();}else{userPaused=true;video.pause();}});
  document.addEventListener('visibilitychange',function(){if(document.hidden)video.pause();else if(!userPaused&&!reduced.matches)play();});
  reduced.addEventListener('change',function(){if(reduced.matches)video.pause();else if(!userPaused)play();});
  new MutationObserver(function(){label();if(portal.classList.contains('leaving'))video.pause();}).observe(portal,{attributes:true,attributeFilter:['class']});
  new MutationObserver(label).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  label();
  if(!reduced.matches)play();
})();
