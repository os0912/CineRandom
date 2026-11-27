const $=id=>document.getElementById(id), API='https://api.themoviedb.org/3', IMG='https://image.tmdb.org/t/p/w500';
let movie=null,genres=[],providerCatalog=[],saved=JSON.parse(localStorage.cr_saved||'[]'),seen=JSON.parse(localStorage.cr_seen||'[]'),watched=JSON.parse(localStorage.cr_watched||'[]');
let selectedProviders=JSON.parse(localStorage.cr_provider_ids||'[]');
const cfg=()=>({tmdb:localStorage.cr_tmdb||'',omdb:localStorage.cr_omdb||'',country:localStorage.cr_country||'AR'});
const headers=()=>({Authorization:'Bearer '+cfg().tmdb,'Content-Type':'application/json;charset=utf-8'});
const providerMode=()=> $('provider-mode')?.value||'any';
function toast(t){$('toast').textContent=t;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),2500)}
function ready(){if(!cfg().tmdb){openSettings();toast('Conectá primero tu token gratuito de TMDB');return false}return true}
async function api(path){let r=await fetch(API+path,{headers:headers()});if(!r.ok)throw Error('Error TMDB '+r.status+'. Revisá el token en Configuración.');return r.json()}
function openSettings(){$('tmdb').value=cfg().tmdb;$('omdb').value=cfg().omdb;$('country').value=cfg().country;$('modal').classList.remove('hidden')}
async function loadGenres(){try{let d=await api('/genre/movie/list?language=es-AR');genres=d.genres||[];$('genre').innerHTML='<option value="">Cualquiera</option>'+genres.map(g=>`<option value="${g.id}">${esc(g.name)}</option>`).join('')}catch(e){if(cfg().tmdb)toast(e.message)}}
async function loadProviderCatalog(){
  try{
    const d=await api(`/watch/providers/movie?watch_region=${cfg().country}&language=es-AR`);
    providerCatalog=(d.results||[]).filter(p=>p.provider_id&&p.provider_name).sort((a,b)=>a.provider_name.localeCompare(b.provider_name,'es'));
    renderProviderOptions();
  }catch(e){$('provider-options').innerHTML='<span class="muted">No se pudieron cargar las plataformas. Revisá tu conexión o token.</span>'}
}
function renderProviderOptions(){
  if(!providerCatalog.length){$('provider-options').innerHTML='<span class="muted">TMDB no informó plataformas de suscripción para este país.</span>';return}
  $('provider-options').innerHTML=providerCatalog.map(p=>`<label class="provider-option"><input type="checkbox" value="${p.provider_id}" ${selectedProviders.includes(p.provider_id)?'checked':''}><img src="${p.logo_path?'https://image.tmdb.org/t/p/w92'+p.logo_path:''}" alt=""><span>${esc(p.provider_name)}</span></label>`).join('');
  $('provider-options').querySelectorAll('input').forEach(input=>input.addEventListener('change',()=>{
    selectedProviders=[...$('provider-options').querySelectorAll('input:checked')].map(x=>Number(x.value));
    localStorage.cr_provider_ids=JSON.stringify(selectedProviders);
    if(selectedProviders.length)$('provider-mode').value='selected';localStorage.cr_provider_mode='selected';
  }));
}
function updateProviderMode(){
  $('provider-picker').classList.toggle('hidden',providerMode()!=='selected');
}
async function getScore(m){if(cfg().omdb&&m.imdb_id){try{let r=await fetch(`https://www.omdbapi.com/?i=${m.imdb_id}&apikey=${encodeURIComponent(cfg().omdb)}`),d=await r.json();if(d.Response==='True'&&d.imdbRating!=='N/A')return{score:+d.imdbRating,votes:d.imdbVotes+' votos IMDb'}}catch(e){}}return{score:+(m.vote_average||0),votes:(m.vote_count||0).toLocaleString('es-AR')+' votos TMDB'}}
async function getSubscriptionProviders(id){
  const d=await api(`/movie/${id}/watch/providers`);
  const c=d.results?.[cfg().country];
  return {country:c||null,flatrate:c?.flatrate||[]};
}
async function random(){
  if(!ready())return;
  $('random').disabled=true;$('random').textContent='BUSCANDO…';
  try{
    let decade=$('decade').value,mode=providerMode(),p=new URLSearchParams({language:'es-AR',region:cfg().country,sort_by:'popularity.desc',include_adult:'false',vote_count_gte:'100',page:String(1+Math.floor(Math.random()*5))});
    if($('genre').value)p.set('with_genres',$('genre').value);
    if(decade){p.set('primary_release_date.gte',decade+'-01-01');if(decade!=='2020')p.set('primary_release_date.lte',(Number(decade)+9)+'-12-31')}
    if(mode!=='all'){p.set('watch_region',cfg().country);p.set('with_watch_monetization_types','flatrate')}
    if(mode==='selected'){
      if(!selectedProviders.length){toast('Elegí al menos una plataforma o seleccioná “Cualquier suscripción”.');return}
      p.set('with_watch_providers',selectedProviders.join(','));
    }
    let d=await api('/discover/movie?'+p),list=(d.results||[]).filter(x=>x.poster_path&&x.overview&&(!$('hide-seen').checked||!seen.includes(x.id)));
    for(let i=list.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[list[i],list[j]]=[list[j],list[i]]}
    let chosen=null,providerData=null;
    for(let x of list.slice(0,25)){
      let m=await api(`/movie/${x.id}?language=es-AR`),rating=await getScore(m);
      if(rating.score<+$('rating').value)continue;
      if(mode!=='all'){
        let availability=await getSubscriptionProviders(x.id),flat=availability.flatrate;
        if(!flat.length)continue;
        if(mode==='selected'&&!flat.some(pr=>selectedProviders.includes(pr.provider_id)))continue;
        providerData=availability;
      }else{providerData=await getSubscriptionProviders(x.id)}
      m._score=rating;m._providers=providerData;chosen=m;break;
    }
    if(!chosen){toast(mode==='all'?'No encontramos películas con esos filtros. Probá ampliar la búsqueda.':'No encontramos películas incluidas en esas suscripciones con los filtros elegidos. Probá otra plataforma o ampliá los filtros.');return}
    movie=chosen;seen=[...new Set([...seen,movie.id])].slice(-500);localStorage.cr_seen=JSON.stringify(seen);
    render();$('result').classList.remove('hidden');$('trailer-area').classList.add('hidden');$('frame').src='';$('result').scrollIntoView({behavior:'smooth'});providers();
  }catch(e){toast(e.message)}finally{$('random').disabled=false;$('random').textContent='✦  SORPRÉNDEME  ⚄'}
}
function render(){
  let m=movie;$('poster').src=m.poster_path?IMG+m.poster_path:'';$('poster').classList.toggle('hidden',!m.poster_path);$('poster-fallback').classList.toggle('hidden',!!m.poster_path);
  $('title').textContent=m.title||m.original_title;$('facts').textContent=[(m.release_date||'').slice(0,4),m.runtime?m.runtime+' min':'',m.vote_average?'TMDB '+m.vote_average.toFixed(1):''].filter(Boolean).join(' · ');
  $('genres').textContent=(m.genres||[]).map(g=>g.name).join(' · ');$('score').textContent=m._score?.score.toFixed(1)||'—';$('votes').textContent=m._score?.votes||'';
  $('overview').textContent=m.overview||'Sinopsis no disponible.';$('save').textContent=saved.some(x=>x.id===m.id)?'✓ GUARDADA':'＋ MI LISTA';
  $('country-label').textContent=({AR:'ARGENTINA',US:'ESTADOS UNIDOS',ES:'ESPAÑA',MX:'MÉXICO',BR:'BRASIL'})[cfg().country]||cfg().country;
  const personal=watched.find(x=>x.id===m.id);$('my-rating').value=String(personal?.rating||8);
  $('personal-rating-status').textContent=personal?`Ya la viste. Tu calificación: ${personal.rating}/10. Podés actualizarla.`:'Todavía no la marcaste como vista.';
  $('mark-watched').textContent=personal?'✓ ACTUALIZAR MI CALIFICACIÓN':'✓ GUARDAR COMO VISTA';
}
function providers(){
  $('providers').textContent='Consultando plataformas…';
  Promise.resolve(movie?._providers||getSubscriptionProviders(movie.id)).then(data=>{
    const c=data.country,flat=data.flatrate||[];
    if(!flat.length){$('providers').textContent='No hay suscripciones informadas para esta película en esta región.';return}
    $('providers').innerHTML=flat.map(p=>`<a class="provider" href="${c?.link||'https://www.themoviedb.org/'}" target="_blank" rel="noopener" title="Ver opciones de ${esc(p.provider_name)}"><img src="https://image.tmdb.org/t/p/w92${p.logo_path}" alt=""><span>${esc(p.provider_name)}</span></a>`).join('');
  }).catch(()=>{$('providers').textContent='No se pudo consultar la disponibilidad.'});
}
async function trailer(){if(!movie)return;try{let d=await api(`/movie/${movie.id}/videos?language=es-AR`),v=d.results.find(x=>x.site==='YouTube'&&x.type==='Trailer'&&x.official)||d.results.find(x=>x.site==='YouTube'&&x.type==='Trailer');if(!v){d=await api(`/movie/${movie.id}/videos?language=en-US`);v=d.results.find(x=>x.site==='YouTube'&&x.type==='Trailer')}if(!v){toast('No encontramos tráiler para esta película.');return}$('frame').src='https://www.youtube-nocookie.com/embed/'+v.key;$('trailer-area').classList.remove('hidden');$('trailer-area').scrollIntoView({behavior:'smooth'})}catch(e){toast('No se pudo cargar el tráiler.')}}
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function drawSaved(){
  $('count').textContent=saved.length;
  $('saved-grid').innerHTML=saved.length?saved.map(m=>`<div class="saveditem" data-id="${m.id}"><img src="${m.poster?IMG+m.poster:''}" alt=""><strong>${esc(m.title)}</strong><small>${m.year||''} · ★ ${Number(m.score||0).toFixed(1)}</small></div>`).join(''):'<p class="muted">Todavía no guardaste películas.</p>';
}
function drawWatched(){
  $('watched-count').textContent=`${watched.length} ${watched.length===1?'película':'películas'}`;
  $('watched-grid').innerHTML=watched.length?watched.slice().sort((a,b)=>b.rating-a.rating).map(m=>`<div class="saveditem watcheditem" data-id="${m.id}"><img src="${m.poster?IMG+m.poster:''}" alt=""><strong>${esc(m.title)}</strong><small>${m.year||''} · ★ Tu nota: ${m.rating}/10</small></div>`).join(''):'<p class="muted">Todavía no calificaste películas.</p>';
}
$('random').onclick=random;$('again').onclick=random;$('trailer').onclick=trailer;
$('save').onclick=()=>{if(!movie)return;let exists=saved.some(x=>x.id===movie.id);saved=exists?saved.filter(x=>x.id!==movie.id):[...saved,{id:movie.id,title:movie.title,year:(movie.release_date||'').slice(0,4),poster:movie.poster_path,score:movie._score?.score||movie.vote_average}];localStorage.cr_saved=JSON.stringify(saved);drawSaved();render();toast(exists?'Quitada de tu lista':'Guardada en tu lista')};
$('mark-watched').onclick=()=>{
  if(!movie)return;const rating=Number($('my-rating').value),entry={id:movie.id,title:movie.title||movie.original_title,year:(movie.release_date||'').slice(0,4),poster:movie.poster_path,rating};
  watched=[...watched.filter(x=>x.id!==movie.id),entry];localStorage.cr_watched=JSON.stringify(watched);drawWatched();render();toast('Película guardada en tu historial');
};
$('settings-open').onclick=openSettings;$('close').onclick=()=>$('modal').classList.add('hidden');$('modal').onclick=e=>{if(e.target===$('modal'))$('modal').classList.add('hidden')};
$('save-settings').onclick=async()=>{localStorage.cr_tmdb=$('tmdb').value.trim();localStorage.cr_omdb=$('omdb').value.trim();localStorage.cr_country=$('country').value;$('modal').classList.add('hidden');await loadGenres();await loadProviderCatalog();toast('Configuración guardada')};
$('provider-mode').value=localStorage.cr_provider_mode||'any';
$('provider-mode').onchange=()=>{localStorage.cr_provider_mode=providerMode();updateProviderMode()};
$('provider-any').onclick=()=>{selectedProviders=[];localStorage.cr_provider_ids='[]';$('provider-mode').value='any';localStorage.cr_provider_mode='any';renderProviderOptions();updateProviderMode()};
$('clear').onclick=()=>{$('genre').value='';$('decade').value='';$('rating').value='0';$('hide-seen').checked=true;selectedProviders=[];localStorage.cr_provider_ids='[]';$('provider-mode').value='any';localStorage.cr_provider_mode='any';renderProviderOptions();updateProviderMode()};
$('clear-saved').onclick=()=>{if(confirm('¿Vaciar toda tu lista?')){saved=[];localStorage.cr_saved='[]';drawSaved();if(movie)render()}};
$('saved-grid').onclick=async e=>{let el=e.target.closest('.saveditem');if(!el||!ready())return;try{movie=await api(`/movie/${el.dataset.id}?language=es-AR`);movie._score=await getScore(movie);movie._providers=await getSubscriptionProviders(movie.id);render();$('result').classList.remove('hidden');providers();$('result').scrollIntoView({behavior:'smooth'})}catch(err){toast(err.message)}};
$('watched-grid').onclick=async e=>{let el=e.target.closest('.saveditem');if(!el||!ready())return;try{movie=await api(`/movie/${el.dataset.id}?language=es-AR`);movie._score=await getScore(movie);movie._providers=await getSubscriptionProviders(movie.id);render();$('result').classList.remove('hidden');providers();$('result').scrollIntoView({behavior:'smooth'})}catch(err){toast(err.message)}};
$('provider-mode').value=localStorage.cr_provider_mode||'any';updateProviderMode();drawSaved();drawWatched();
if(cfg().tmdb){loadGenres();loadProviderCatalog()}
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
