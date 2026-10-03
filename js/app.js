'use strict';
/* ===== Shared engine: storage, language, navigation, GPS, camera, form engine. ===== */
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const S={g:(k,d)=>{try{const v=JSON.parse(localStorage.getItem('sv.'+k));return v==null?d:v}catch(e){return d}},s:(k,v)=>localStorage.setItem('sv.'+k,JSON.stringify(v))};
const now=()=>new Date().toISOString(),wait=ms=>new Promise(r=>setTimeout(r,ms));
const LANG=S.g('lang','en'),TR=(typeof TEX!=='undefined')?TEX:{},miss=new Set();window.__miss=miss;
/* t(): translate an English string; {0},{1} are filled with extra arguments. Data is always stored in English. */
const t=(s,...a)=>{let r=s;if(LANG==='te'&&s){if(TR[s])r=TR[s];else miss.add(s)}a.forEach((v,i)=>{r=String(r).replace('{'+i+'}',v)});return r};
const fmt=x=>x?new Date(x).toLocaleString(LANG==='te'?'te-IN':undefined):'-';
const user=()=>S.g('user',null),areas=()=>S.g('areas',[]),curArea=()=>areas().find(a=>a.id===S.g('area')),recs=()=>S.g('recs',[]);
const roleName=m=>m==='area'?'Area DC':m==='people'?'People DC':'';
function saveRec(r){const a=recs(),i=a.findIndex(x=>x.id===r.id);i<0?a.push(r):a[i]=r;S.s('recs',a)}
function toast(m,bad){const e=document.createElement('div');e.className='toast'+(bad?' bad':'');e.textContent=m;e.setAttribute('role','status');document.body.appendChild(e);setTimeout(()=>e.remove(),3400)}
function nav(active){
  if(!user()){location.replace('login.html');return false}
  document.documentElement.lang=LANG==='te'?'te':'en';
  const A=curArea(),m=S.g('mode',null),L=[['index.html',t('Home'),'home']].concat(m==='area'?[1,2,3,4,5,6,7].map(n=>['form'+n+'.html',t('Form {0}',n),'form'+n]):m==='people'?[['form8.html',t('Form {0}',8),'form8']]:[]);
  $('#nav').innerHTML=`<header class=top><div class=brand>${t('Demography Survey')}<small>${m?esc(t(roleName(m))):''}${A?(m?', ':'')+esc(A.name)+', '+esc(A.district):''}</small></div><nav aria-label="Main">${L.map(l=>`<a href="${l[0]}" class="${l[2]===active?'on':''}">${esc(l[1])}</a>`).join('')}</nav><div class=right><button type=button class=lg id=lang>${LANG==='te'?'English':'తెలుగు'}</button><span id=net class=pill></span><a href="#" id=out>${t('Sign out')}</a></div></header><div id=offline class=banner hidden>${t('You are offline. Entries are saved on this device and can be synced later.')}</div>`;
  const u=()=>{const o=navigator.onLine;$('#net').textContent=t(o?'Online':'Offline');$('#net').className='pill'+(o?'':' off');$('#offline').hidden=o};u();addEventListener('online',u);addEventListener('offline',u);
  $('#lang').onclick=()=>{S.s('lang',LANG==='te'?'en':'te');location.reload()};
  $('#out').onclick=e=>{e.preventDefault();if(confirm(t('Sign out? Saved drafts stay on this device.'))){localStorage.removeItem('sv.user');location.href='login.html'}};
  return true}
function getGPS(){return new Promise((ok,no)=>{if(!navigator.geolocation)return no(t('Location is not supported here. Use "Enter manually".'));
  navigator.geolocation.getCurrentPosition(p=>ok({lat:+p.coords.latitude.toFixed(6),lng:+p.coords.longitude.toFixed(6),acc:Math.round(p.coords.accuracy),ts:now()}),
  e=>no(e.code===1?t('Location permission denied. Allow location in browser settings, then retry.'):e.code===3?t('Location timed out. Move outdoors and retry.'):t('Location unavailable. Retry or enter manually.')),{enableHighAccuracy:true,timeout:15000,maximumAge:0})})}
function shrink(file){return new Promise(r=>{const i=new Image();i.onload=()=>{const s=Math.min(1,640/Math.max(i.width,i.height)),c=document.createElement('canvas');c.width=i.width*s;c.height=i.height*s;c.getContext('2d').drawImage(i,0,0,c.width,c.height);r(c.toDataURL('image/jpeg',.6))};i.src=URL.createObjectURL(file)})}
/* ---- Schema shortcuts used in the form pages ---- */
const C=(k,l,ty,o)=>({k,l,t:ty,o}),N=(k,l)=>({k,l,t:'number'}),R=(k,l)=>({k,l,t:'number',ro:true});
const num=v=>parseFloat(v)||0,blank=v=>v===''||v==null;
/* calc(): auto-calculation for tables. sum:[cols] -> last row = total of rows above; add:[a,b,c] -> c=a+b per row; pct:[totalCol,pctCol] -> % of last row's total */
const calc=o=>{const fn=rows=>{const n=rows.length-1;
  if(o.sum)o.sum.forEach(c=>{rows[n][c]=rows.slice(0,n).reduce((s,r)=>s+num(r[c]),0)});
  if(o.add){const[a,b,c]=o.add;rows.forEach(r=>{r[c]=blank(r[a])&&blank(r[b])?'':num(r[a])+num(r[b])})}
  if(o.pct){const[tc,pc]=o.pct,T=num(rows[n][tc]);rows.forEach(r=>{r[pc]=T>0&&!blank(r[tc])?+(num(r[tc])/T*100).toFixed(2):''})}};fn.o=o;return fn};
const F={tx:(k,l,x)=>({t:'text',k,l,...x}),nm:(k,l,x)=>({t:'number',k,l,...x}),dt:(k,l,x)=>({t:'date',k,l,...x}),ta:(k,l,x)=>({t:'ta',k,l,...x}),
 sel:(k,l,o,x)=>({t:'sel',k,l,o,...x}),rad:(k,l,o,x)=>({t:'rad',k,l,o,...x}),chk:(k,l,o,x)=>({t:'chk',k,l,o,...x}),head:l=>({t:'head',k:'h_'+l,l}),
 gps:(k,l,x)=>({t:'gps',k,l,...x}),ph:(k,l,x)=>({t:'photo',k,l,...x}),tbl:(k,l,cols,x)=>({t:'tbl',k,l,cols,...x}),auto:(k,l,fn)=>({t:'auto',k,l,fn})};
const DEF={today:()=>now().slice(0,10),user:()=>user().name,state:a=>a.state||'',district:a=>a.district,taluka:a=>a.taluka||'',village:a=>a.name};
const lack=(f,v)=>f.t==='tbl'?!(v||[]).some(r=>Object.values(r).some(x=>x!==''&&x!=null)):Array.isArray(v)?!v.length:v==null||v==='';
const stLabel=s=>t(s==='submitted'?'Submitted':'In progress');

const Form={
run(cfg){
 if(!nav(cfg.id))return;
 const app=$('#app'),A=curArea(),mode=S.g('mode',null),need=cfg.id==='form8'?'people':'area';
 const msg=(h,p)=>{app.innerHTML=`<div class=card><h2>${t(h)}</h2><p>${t(p,t(roleName(need)))}</p><a class=btn href="index.html">${t('Go to Home')}</a></div>`};
 if(!mode)return msg('Choose your role first','Open Home and select Area DC or People DC.');
 if(mode!==need)return msg('This form is for another role','This form belongs to {0}. Change your role on Home.');
 if(!A)return msg('Select an area first','Open Home and select or register a village or town.');
 const q=new URLSearchParams(location.search).get('rec');
 if(cfg.policy&&q==='policy')cfg=Object.assign({},cfg.policy,{id:'form8policy',back:'form8.html'});
 else if(cfg.repeat&&!q)return Form.list(cfg,A);
 let rec;
 if(cfg.repeat){
  if(q==='new'){let n=recs().filter(r=>r.area===A.id&&r.form===cfg.id).length+1,id;do{id=cfg.id.toUpperCase()+'-'+A.id+'-'+String(n++).padStart(3,'0')}while(recs().some(r=>r.id===id));
   rec={id,area:A.id,form:cfg.id,status:'draft',sync:'none',data:{},collector:user().id,created:now(),updated:now()};saveRec(rec);history.replaceState(null,'','?rec='+id)}
  else rec=recs().find(r=>r.id===q);
  if(!rec){app.innerHTML=`<div class=card><h2>${t('Record not found')}</h2><a class=btn href="${cfg.id}.html">${t('Back to list')}</a></div>`;return}
 }else rec=recs().find(r=>r.id===A.id+'_'+cfg.id)||{id:A.id+'_'+cfg.id,area:A.id,form:cfg.id,status:'draft',sync:'none',data:{},collector:user().id,created:now(),updated:now()};
 const secs=cfg.sections.slice();
 if(cfg.id==='form8'){const cq=S.g('cq.'+A.id,[]);if(cq.length)secs.push({title:'Additional questions',fields:cq.map(c=>c.t==='yn'?F.rad(c.k,c.l,['Yes','No']):c.t==='dd'?F.sel(c.k,c.l,c.o):F.ta(c.k,c.l))})}
 const data=rec.data,fmap={};let idx=0,timer,dirty=false,openK=null,msScroll=0;
 secs.forEach(s=>s.fields.forEach(f=>{fmap[f.k]=f;if(f.def&&data[f.k]==null)data[f.k]=DEF[f.def](A)}));
 const autos=()=>secs.forEach(s=>s.fields.forEach(f=>{if(f.t==='auto')data[f.k]=f.fn(data,rec)}));
 const vis=f=>!f.show||f.show(data),errs=s=>s.fields.filter(f=>f.req&&vis(f)&&lack(f,data[f.k])).map(f=>f.l);
 const bad=()=>{const e=[];secs.forEach(s=>errs(s).forEach(l=>e.push(t(l)+' ('+t(s.title)+')')));if(cfg.consent&&data[cfg.consent]==='No')e.push(t('Respondent consent is required'));return e};
 const title=()=>cfg.repeat?(data[cfg.titleKey]||t('Unnamed')):t(cfg.title);
 const persist=st=>{autos();rec.data=data;rec.updated=now();dirty=false;if(st){rec.status=st;if(st==='submitted')rec.sync='pending'}
  try{saveRec(rec)}catch(e){toast(t('Device storage is full. Export data from Home first.'),true);return false}
  const s=$('#saved');if(s)s.textContent=t('Saved on this device at {0}',new Date().toLocaleTimeString());return true};
 const touch=()=>{dirty=true;if(rec.status==='submitted'){rec.status='draft';rec.sync='none'}clearTimeout(timer);timer=setTimeout(()=>persist(),500)};
 const OP=f=>typeof f.o==='function'?f.o(data):f.o;
 const oth=(f,v)=>{const o=OP(f).filter(x=>/^other/i.test(x));return(Array.isArray(v)?o.some(x=>v.includes(x)):o.includes(v))?`<input class=oth data-k="${f.k}_o" placeholder="${esc(t('Please specify'))}" aria-label="${esc(t('Please specify'))}" value="${esc(data[f.k+'_o'])}">`:''};
 const cell=(f,c,r,i,ro)=>c.t==='sel'?`<select data-t="${f.k}" data-r="${i}" data-c="${c.k}" aria-label="${esc(t(c.l))}"><option value="">-</option>${c.o.map(o=>`<option value="${esc(o)}"${o===r[c.k]?' selected':''}>${esc(t(o))}</option>`).join('')}</select>`:`<input type="${c.t||'text'}" ${c.t==='number'?'step=any inputmode=decimal':''} ${ro?'readonly tabindex=-1':''} data-t="${f.k}" data-r="${i}" data-c="${c.k}" value="${esc(r[c.k])}" aria-label="${esc(t(c.l))}">`;
 const fld=f=>{if(!vis(f))return'';const v=data[f.k],rq=f.req?'<b class=rq> *</b>':'',L=`<label for="f_${f.k}">${esc(t(f.l))}${rq}</label>`,Lg=`<legend>${esc(t(f.l))}${rq}</legend>`;
  switch(f.t){
  case'head':return`<h3>${esc(t(f.l))}</h3>`;
  case'ta':return`<div class=fld>${L}<textarea id="f_${f.k}" data-k="${f.k}" rows=3>${esc(v)}</textarea></div>`;
  case'rad':
  case'sel':return`<div class=fld>${L}<select id="f_${f.k}" data-k="${f.k}"><option value="">${t('Select...')}</option>${OP(f).map(o=>`<option value="${esc(o)}"${o===v?' selected':''}>${esc(t(o))}</option>`).join('')}</select>${oth(f,v)}</div>`;
  case'chk':{const sv=v||[],op=openK===f.k;return`<div class=fld><b class=fl>${esc(t(f.l))}${rq}</b><div class="ms${op?' open':''}"><button type=button class=msb data-ms="${f.k}" aria-expanded="${op}"><span>${esc(sv.length?sv.map(x=>t(x)).join(', '):t('Select...'))}</span></button><div class=msp>${f.o.map(o=>`<label class=opt><input type=checkbox data-k="${f.k}" data-ck=1 value="${esc(o)}"${sv.includes(o)?' checked':''}>${esc(t(o))}</label>`).join('')}</div></div>${oth(f,v)}</div>`}
  case'auto':{const val=data[f.k]||'';return`<div class=fld><label>${esc(t(f.l))}</label><input readonly value="${esc(val)}" placeholder="${esc(t('Fills automatically after GPS capture'))}">${/^https?:/.test(val)?`<a target=_blank rel=noopener href="${esc(val)}">${t('View map')}</a>`:''}</div>`}
  case'gps':return`<div class=fld><b>${esc(t(f.l))}${rq}</b><div class=ev><span>${v?`${t('Latitude')} ${v.lat}, ${t('Longitude')} ${v.lng}<br>${t('Accuracy')} ${v.manual?t('entered manually'):'±'+v.acc+' m'}, ${fmt(v.ts)}`:t('GPS not captured yet')}</span><div class=row><button type=button data-gps="${f.k}">${t(v?'Refresh location':'Capture GPS')}</button><button type=button data-gpsm="${f.k}">${t('Enter manually')}</button>${v?`<a class=btn2 target=_blank rel=noopener href="https://www.google.com/maps?q=${v.lat},${v.lng}">${t('View map')}</a>`:''}</div></div></div>`;
  case'photo':return`<div class=fld><b>${esc(t(f.l))}${rq}</b><div class=ev>${v?`<img class=shot src="${v.img}" alt=""><small>${t('Taken')} ${fmt(v.ts)}${v.lat!=null?', GPS '+v.lat+', '+v.lng:', '+t('no GPS attached')}</small>`:`<small>${t('Hold the phone steady and keep the subject in frame. Avoid backlight.')}</small>`}<input type=file accept="image/*" capture=environment hidden id="ph_${f.k}" data-ph="${f.k}"><button type=button data-cam="${f.k}">${t(v?'Retake photo':'Take photo')}</button></div></div>`;
  case'tbl':{const fixed=!!f.rows,rows=data[f.k]||(data[f.k]=fixed?[]:[{}]);if(fixed)while(rows.length<f.rows.length)rows.push({});if(f.calc)f.calc(rows);const last=fixed?f.rows.length-1:-1;
   const ro=(c,i)=>c.ro||(f.calc&&f.calc.o.sum&&f.calc.o.sum.includes(c.k)&&i===last);
   return`<div class=fld><b>${esc(t(f.l))}</b>${f.h?`<br><small>${esc(t(f.h))}</small>`:''}<div class=tw style="margin-top:6px"><table><thead><tr><th>${fixed?esc(t(f.lh||'Item')):'#'}</th>${f.cols.map(c=>`<th>${esc(t(c.l))}</th>`).join('')}${fixed?'':'<th></th>'}</tr></thead><tbody>${rows.map((r,i)=>`<tr><th>${fixed?esc(t(f.rows[i])):i+1}</th>${f.cols.map(c=>`<td>${cell(f,c,r,i,ro(c,i))}</td>`).join('')}${fixed?'':`<td><button type=button class=x data-del="${f.k}:${i}">${t('Delete')}</button></td>`}</tr>`).join('')}</tbody></table></div>${fixed?'':`<button type=button class=btn2 style="margin-top:8px" data-add="${f.k}">${t('Add row')}</button>`}</div>`}
  default:return`<div class=fld>${L}<input id="f_${f.k}" data-k="${f.k}" type="${f.t==='text'?'text':f.t}" ${f.t==='number'?'step=any inputmode=decimal':''} value="${esc(v)}"></div>`}};
 const render=keep=>{autos();const y=scrollY,rv=idx>=secs.length,b=rv?bad():[],pct=Math.round(secs.filter(s=>!errs(s).length).length/secs.length*100);
  app.innerHTML=`<div class=ctx><div><h1>${esc(title())}</h1><p>${esc(A.name)}, ${esc(A.district)}${cfg.repeat?'. ID '+esc(rec.id):''}. ${t('Collector')} ${esc(user().name)}</p></div><span class="badge ${rec.status}">${stLabel(rec.status)}</span></div>
  <div class=prog title="${pct}%"><i style="width:${pct}%"></i></div>
  <ol class=steps>${secs.map((s,i)=>`<li><button type=button data-go="${i}" class="${i===idx?'on ':''}${errs(s).length?'':'ok'}">${esc(t(s.title))}</button></li>`).join('')}<li><button type=button data-go="${secs.length}" class="${rv?'on':''}">${t('Review')}</button></li></ol>
  <div id=errs></div>
  ${rv?`<div class=card><h2>${t('Review')}</h2>${secs.map((s,i)=>{const e=errs(s);return`<div class=rv><div><b>${esc(t(s.title))}</b><br><small>${e.length?t('Missing')+': '+esc(e.map(x=>t(x)).join(', ')):t('Complete')}</small></div><button type=button class=btn2 data-go="${i}">${t('Edit')}</button></div>`}).join('')}${b.length?`<div class=errbox><b>${t('Cannot submit yet.')}</b> ${t('Still required')}: ${esc(b.join('; '))}</div>`:`<p>${t('All required items are complete.')}</p>`}</div>`
  :`<form class=card onsubmit="return false"><h2>${esc(t(secs[idx].title))}</h2>${secs[idx].fields.map(fld).join('')}</form>`}
  <div class=bar><span id=saved>${rec.updated?t('Last saved')+' '+fmt(rec.updated):''}</span>${idx>0?`<button type=button data-a=prev>${t('Previous')}</button>`:''}<button type=button data-a=draft>${t('Save draft')}</button>${rv?`<button type=button class=pri data-a=submit ${b.length?'disabled':''}>${t(cfg.repeat?'Submit survey':'Submit form')}</button>`:`<button type=button class=pri data-a=next>${t('Next')}</button>`}</div>`;
  const mp=app.querySelector('.ms.open .msp');if(mp)mp.scrollTop=msScroll;
  scrollTo(0,keep?y:0)};
 const success=()=>{app.innerHTML=`<div class=card><h1>${t(cfg.repeat?'Survey submitted successfully':'Form submitted')}</h1><p><b>${esc(title())}</b><br>ID: ${esc(rec.id)}<br>${t('Area')}: ${esc(A.name)}<br>${t('Submitted')}: ${fmt(rec.updated)}<br>${t('Status: Submitted. Sync: pending (open Home and press Sync now).')}</p><div class=row>${cfg.repeat?`<a class=btn href="${cfg.id}.html?rec=new">${t(cfg.add||'Start next person')}</a><a class=btn2 href="${cfg.id}.html?rec=${rec.id}">${t('View survey')}</a><a class=btn2 href="${cfg.id}.html">${t('Back to list')}</a>${cfg.next?`<a class=btn2 href="${cfg.next}.html">${t('Next form')}</a>`:''}`:`<a class=btn href="${cfg.back||'index.html'}">${t(cfg.back?'Back to Form 8':'Back to Home')}</a>${cfg.next?`<a class=btn2 href="${cfg.next}.html">${t('Next form')}</a>`:''}`}</div></div>`;scrollTo(0,0)};
 app.onclick=async e=>{const b=e.target.closest('button'),d=b?b.dataset:{};if(!b)return;
  if(d.go!=null){idx=+d.go;render()}
  else if(d.a==='prev'){idx--;render()}
  else if(d.a==='next'){const er=errs(secs[idx]);if(er.length){$('#errs').innerHTML=`<div class=errbox role=alert><b>${t('Fill these first')}:</b> ${esc(er.map(x=>t(x)).join(', '))}</div>`;toast(t('Required fields missing'),true);return}idx++;if(dirty)persist();render()}
  else if(d.a==='draft'){if(persist())toast(t('Draft saved on this device'))}
  else if(d.a==='submit'){if(bad().length||!confirm(t('Submit {0} ({1})?',title(),rec.id)+'\n'+t('You can still edit it later, but it must be submitted again.')))return;
   b.disabled=true;b.textContent=t('Submitting...');await wait(700);if(persist('submitted'))success();else render(true)}
  else if(d.gps){b.disabled=true;b.textContent=t('Acquiring location...');try{data[d.gps]=await getGPS();touch();toast(t('Location captured, accuracy ±{0} m',data[d.gps].acc))}catch(m){toast(m,true)}render(true)}
  else if(d.gpsm){const s=prompt(t('Enter latitude, longitude (example: 17.4399, 78.4983)'));if(s==null)return;const p=s.split(',').map(Number);if(p.length===2&&p.every(isFinite)&&s.trim()){data[d.gpsm]={lat:p[0],lng:p[1],acc:0,ts:now(),manual:true};touch();render(true);toast(t('Location saved'))}else toast(t('Enter two numbers separated by a comma'),true)}
  else if(d.ms){const p=b.parentElement;p.classList.toggle('open');openK=p.classList.contains('open')?d.ms:null;b.setAttribute('aria-expanded',!!openK)}
  else if(d.cam)$('#ph_'+d.cam).click();
  else if(d.add){data[d.add].push({});touch();render(true)}
  else if(d.del){const[k,i]=d.del.split(':');if(confirm(t('Delete row {0}?',+i+1))){data[k].splice(+i,1);touch();render(true);toast(t('Row deleted'))}}};
 app.oninput=e=>{const el=e.target,d=el.dataset;
  if(d.t){data[d.t][+d.r][d.c]=el.value;touch();const f=fmap[d.t];if(f&&f.calc){f.calc(data[d.t]);app.querySelectorAll('input[data-t="'+d.t+'"][readonly]').forEach(i=>{i.value=data[d.t][+i.dataset.r][i.dataset.c]??''})}}
  else if(d.k&&!d.ck&&el.type!=='radio'&&el.tagName!=='SELECT'){data[d.k]=el.value;touch()}};
 app.onchange=async e=>{const el=e.target,d=el.dataset;
  if(d.ph){const f=el.files[0];if(!f)return;const img=await shrink(f),g=Object.values(data).find(v=>v&&v.lat!=null&&!v.img);data[d.ph]={img,ts:now(),lat:g?.lat,lng:g?.lng,acc:g?.acc,collector:user().id,rec:rec.id};touch();render(true);toast(t(g?'Photo captured with GPS':'Photo captured. Capture GPS too.'))}
  else if(d.t&&el.tagName==='SELECT'){data[d.t][+d.r][d.c]=el.value;touch()}
  else if(d.ck){openK=d.k;msScroll=el.closest('.msp').scrollTop;data[d.k]=[...app.querySelectorAll('[data-k="'+d.k+'"]:checked')].map(x=>x.value);touch();render(true)}
  else if(d.k&&(el.type==='radio'||el.tagName==='SELECT')){data[d.k]=el.value;const f=fmap[d.k];if(f&&f.rs)data[f.rs]='';touch();render(true)}};
 document.addEventListener('click',e=>{if(openK&&!e.target.closest('.ms')){openK=null;app.querySelectorAll('.ms.open').forEach(x=>x.classList.remove('open'))}});
 addEventListener('beforeunload',()=>{if(dirty)persist()});
 render()},

list(cfg,A){
 const app=$('#app'),mine=()=>recs().filter(r=>r.area===A.id&&r.form===cfg.id),sub=()=>mine().filter(r=>r.status==='submitted').length,f8=cfg.id==='form8';
 const pol=()=>recs().find(r=>r.id===A.id+'_form8policy');
 app.innerHTML=`<div class=ctx><div><h1>${t(cfg.title)}</h1><p>${esc(A.name)}, ${esc(A.district)}</p></div><a class=btn href="${cfg.id}.html?rec=new">${t(cfg.newLabel)}</a></div>
 ${f8?`<div class=card id=pol></div><div class=card id=sum></div>`:''}<div class=card><div class=row><input id=q type=search placeholder="${esc(t('Search by name or ID'))}" aria-label="${esc(t('Search'))}"><select id=st aria-label="${esc(t('Filter by status'))}"><option value="">${t('All statuses')}</option><option value=draft>${t('In progress')}</option><option value=submitted>${t('Submitted')}</option></select></div><div id=lst></div></div>`;
 const draw=()=>{const qq=$('#q').value.toLowerCase(),st=$('#st').value,all=mine(),rows=all.filter(r=>(!st||r.status===st)&&(r.id+' '+(r.data[cfg.titleKey]||'')+' '+(r.data.mobile||'')).toLowerCase().includes(qq));
  if(f8){const p=pol(),cq=S.g('cq.'+A.id,[]);
   $('#pol').innerHTML=`<h2>${t('Forward-looking / policy input')}</h2><p class=note>${t('Filled once for the whole area, not for each person.')}</p><span class="badge ${p?p.status:''}">${p?stLabel(p.status):t('Not started')}</span> <a class=btn2 href="form8.html?rec=policy">${t(p?'Edit policy input':'Fill policy input')}</a>`;
   $('#sum').innerHTML=`<b>${t('{0} people surveyed',sub())}</b>. ${t('{0} in progress',all.length-sub())}, ${t('{0} waiting to sync',all.filter(r=>r.status==='submitted'&&r.sync!=='done').length)}.<br><button class=btn2 id=addq style="margin-top:8px">${t('Add a question to Form 8')}</button>${cq.map((c,i)=>`<div class=item><div>${esc(c.l)} <small>(${t(c.t==='yn'?'Yes/No':c.t==='dd'?'Dropdown':'Text')})</small></div><button class="btn2 danger" data-rq="${i}">${t('Remove')}</button></div>`).join('')}`}
  $('#lst').innerHTML=rows.length?rows.sort((a,b)=>b.updated.localeCompare(a.updated)).map(r=>`<div class=item><div><b>${esc(r.data[cfg.titleKey]||t('Unnamed'))}</b><br><small>${esc(r.id)}, ${fmt(r.updated)}</small></div><span class="badge ${r.status}">${stLabel(r.status)}</span>${r.status==='submitted'?`<span class="badge ${r.sync}">${t('Sync')} ${t(r.sync)}</span>`:''}<a class=btn2 href="${cfg.id}.html?rec=${r.id}">${t(r.status==='draft'?'Continue draft':'View / edit')}</a>${r.status==='draft'?`<button class="btn2 danger" data-dl="${r.id}">${t('Delete')}</button>`:''}</div>`).join(''):`<p class=note>${t(all.length?'No records match your search or filter.':'Nothing here yet. Use the button above to start.')}</p>`};
 app.onclick=e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.dl&&confirm(t('Delete this unsubmitted draft? This cannot be undone.'))){S.s('recs',recs().filter(r=>r.id!==b.dataset.dl));draw();toast(t('Draft deleted'))}
  if(b.id==='addq'){const l=prompt(t('Enter the new question'));if(!l)return;const ty=(prompt(t('Answer type: text, yn (Yes/No) or dd (dropdown)'),'text')||'text').trim();const c={k:'cq_'+Date.now().toString(36),l,t:['yn','dd'].includes(ty)?ty:'text'};if(c.t==='dd'){c.o=(prompt(t('Dropdown options, separated by commas'))||'').split(',').map(s=>s.trim()).filter(Boolean);if(c.o.length<2){toast(t('Add at least two options'),true);return}}
   S.s('cq.'+A.id,S.g('cq.'+A.id,[]).concat(c));draw();toast(t('Question added. It appears under "Additional questions" in every Form 8.'))}
  if(b.dataset.rq!=null&&confirm(t('Remove this question? Saved answers are kept.'))){const c=S.g('cq.'+A.id,[]);c.splice(+b.dataset.rq,1);S.s('cq.'+A.id,c);draw();toast(t('Question removed'))}};
 $('#q').oninput=draw;$('#st').onchange=draw;draw()}};
