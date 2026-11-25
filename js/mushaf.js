/* ---------- mushaf text (offline after first load) ---------- */
let QT=null, qtP=null;
const QURAN_CDN='https://cdn.jsdelivr.net/npm/quran-json@3.1.2/dist/quran.json';
function loadQuran(){
  if(QT) return Promise.resolve(QT); if(qtP) return qtP;
  qtP=(async()=>{
    try{ const r=await fetch('quran.json'); if(r.ok){ const d=await r.json(); if(Array.isArray(d)&&d.length===NA){ QT=d; return QT; } } }catch(e){}
    const r=await fetch(QURAN_CDN); if(!r.ok) throw new Error('net'); const d=await r.json();
    QT=d.flatMap(s=>s.verses.map(v=>v.text));
    try{ const c=await caches.open('rafiq-quran'); await c.put(new URL('quran.json',location.href).href, new Response(JSON.stringify(QT),{headers:{'Content-Type':'application/json'}})); }catch(e){}
    return QT;
  })();
  qtP.catch(()=>{ qtP=null; });
  return qtP;
}
/* ---------- printed-page layout: the 15-line Madani muṣḥaf, line for line ----------
   Text and line breaks: KFGQPC Uthmanic Hafs v3 via the quran-text dataset (quran.ws, CC BY 4.0),
   drawn with the King Fahd Complex font. Loaded once, then cached for offline use. */
let MS=null, msP=null;
const MS_CDN='https://cdn.jsdelivr.net/npm/@quran.ws/text@0.1.0/data/';
async function cachedFetch(name,cdn,onBytes){
  const key=new URL(name,location.href).href; let c=null;
  try{ c=await caches.open('rafiq-quran'); const hit=await c.match(key); if(hit) return hit; }catch(e){}
  let r=null; try{ r=await fetch(name); if(!r.ok) r=null; }catch(e){}
  if(!r){ r=await fetch(cdn); if(!r.ok) throw new Error('net'); }
  if(onBytes && r.body){ const rd=r.body.getReader(), parts=[]; for(;;){ const {done,value}=await rd.read(); if(done) break; parts.push(value); onBytes(value.length); }
    r=new Response(new Blob(parts),{headers:{'Content-Type':r.headers.get('Content-Type')||'application/octet-stream'}}); }
  try{ c&&await c.put(key,r.clone()); }catch(e){}
  return r;
}
/* first open: offer a one-time download of the printed-page muṣḥaf, or skip to read right away */
const MS_SIZE=2.85e6;
async function msHave(){ try{ const c=await caches.open('rafiq-quran'); return !!(await c.match(new URL('hafs.json',location.href).href)); }catch(e){ return false; } }
function msDlCard(){ const d=ui.msDl;
  if(d && d.err) return `<div class="card msdl"><div class="orn" aria-hidden="true">۞</div><h3>ما اكتمل التحميل</h3><p class="muted">تأكد من اتصال الإنترنت وحاول مرة ثانية.</p><button class="btn block" data-act="msDl">حاول مرة ثانية</button></div>`;
  if(d) return `<div class="card msdl"><div class="orn" aria-hidden="true">۞</div><h3>جارٍ تحميل المصحف…</h3><div class="bar"><i id="msbar" style="width:${d.pct}%"></i></div><p class="small muted" id="mspct">${f(d.pct)}٪</p><p class="mstime1">الحجم ١ ميجا فقط، والتحميل أقل من دقيقة.</p><p class="small muted" style="margin:0">يتحمّل مرة وحدة، وبعدها يفتح على طول ويشتغل بدون إنترنت.</p></div>`;
  return `<div class="card msdl"><div class="orn" aria-hidden="true">۞</div><h3>حمّل المصحف مرة وحدة</h3>
    <p class="muted">صفحات مصحف المدينة كاملة بخط مجمع الملك فهد، وبعدها يفتح على طول ويشتغل بدون إنترنت.</p>
    <p class="mstime1">الحجم ١ ميجا فقط، والتحميل أقل من دقيقة.</p>
    <button class="btn block" data-act="msDl">تحميل المصحف</button></div>`;
}
function msDownload(){
  if(ui.msDl && !ui.msDl.err) return; ui.msDl={pct:0}; if(route().startsWith('read-')) rerender(); let got=0;
  const tick=n=>{ got+=n; const pct=Math.min(99,Math.round(got/MS_SIZE*100)); if(pct!==ui.msDl.pct){ ui.msDl.pct=pct; const b=document.getElementById('msbar'), t=document.getElementById('mspct'); if(b) b.style.width=pct+'%'; if(t) t.textContent=f(pct)+'٪'; } };
  loadMushaf(tick).then(()=>{ ui.msDl=null; ui.msHave=true; if(/^(read|wird)-/.test(route())) rerender(); toast('تم تحميل المصحف، يشتغل الحين بدون إنترنت'); })
    .catch(()=>{ ui.msDl={err:1}; if(route().startsWith('read-')) rerender(); });
}
function loadMushaf(tick){
  if(MS) return Promise.resolve(MS); if(msP) return msP;
  msP=(async()=>{
    const d=await (await cachedFetch('hafs.json',MS_CDN+'hafs.json',tick)).json();
    try{ const fb=await (await cachedFetch('UthmanicHafs.ttf',MS_CDN+'UthmanicHafs-v-3.0.ttf',tick)).arrayBuffer();
      const ff=new FontFace('KFGQPC Hafs',fb); await ff.load(); document.fonts.add(ff); }catch(e){}
    const mk=new Map(); d.marks.forEach(([w,t])=>{ if(!mk.has(w)) mk.set(w,[]); mk.get(w).push(d.mark_types[t]); });
    MS={w:d.words, ls:d.line_starts, ps:d.page_starts, as:d.ayah_starts, ss:d.surah_starts, mk};
    return MS;
  })();
  msP.catch(()=>{ msP=null; });
  return msP;
}
const bsearch=(arr,x)=>{ let lo=0,hi=arr.length; while(lo<hi){ const m=(lo+hi)>>1; if(arr[m]<=x) lo=m+1; else hi=m; } return lo; }; // count of items <= x
const arDigits=n=>String(n).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);
function msTok(i){ let t=MS.w[i]; for(const m of MS.mk.get(i)||[]) t = m.side==='before' ? `${m.sign} ${t}` : t+m.sign; return t; }
function msWord(i){
  const runs=TJ&&tjMode()!=='0'?TJ.get(i):null; if(!runs) return esc(msTok(i));
  const cp=[...msTok(i)]; let h='', q=0;
  for(const [a,b,c] of runs){ if(a>q) h+=esc(cp.slice(q,a).join('')); h+=`<span class="tj${c}">${esc(cp.slice(a,b).join(''))}</span>`; q=b; }
  return h+esc(cp.slice(q).join(''));
}
/* tajweed colours: precomputed rule spans (Quranpedia's tajwid-annotations, CC BY 4.0), packed per word by tajweed.txt.
   1 madd of 2, 2 permitted madd, 3 obligatory madd, 4 necessary madd, 5 ghunnah/ikhfa, 6 merged or silent, 7 heavy letters, 8 qalqalah */
let TJ=null, tjP=null;
const tjMode=()=>{ let v=null; try{ v=localStorage.getItem('rafiq-tj'); }catch(e){} return ['0','s','d'].includes(v)?v:'0'; };
function loadTajweed(){
  if(TJ) return Promise.resolve(TJ); if(tjP) return tjP;
  tjP=cachedFetch('tajweed.txt','tajweed.txt').then(r=>r.text()).then(t=>{ const m=new Map(); let p=0;
    for(const rec of t.split(';')){ const k=rec.indexOf(':'); p+=+rec.slice(0,k); m.set(p,rec.slice(k+1).split(',').map(x=>x.split('.').map(Number))); }
    TJ=m; return m; }).catch(e=>{ tjP=null; throw e; });
  return tjP;
}
const TJKEY={s:[['r','المدود كلها'],['g','الغنة والإخفاء والإدغام'],['b','التفخيم والقلقلة']],
  d:[['1','مدّ حركتان'],['2','مدّ جائز ٢ أو ٤ أو ٦'],['3','مدّ واجب ٤ أو ٥'],['4','مدّ لازم ٦ حركات'],['5','غنة وإخفاء'],['6','إدغام، وما لا يُلفظ'],['7','تفخيم'],['8','قلقلة']]};
function tjSheet(){
  const m=tjMode();
  if(m!=='0' && MS && !TJ){ loadTajweed().then(()=>{ if(document.querySelector('.tjsmp')) tjSheet(); }).catch(()=>{}); }
  const smp=MS?[6222,6223,6224,6225].map(id=>Array.from({length:(id<NA?MS.as[id]:MS.w.length)-MS.as[id-1]},(_,j)=>msWord(MS.as[id-1]+j)).join(' ')+` <span class="an">${ayEnd(aNo[id])}</span>`).join(' '):'';
  openSheet(`${sheetHead('تلوين التجويد')}<div class="stack">
    ${smp?`<div class="tjsmp appv mpgv"><div class="msura"><span>${SN(112)}</span></div><div class="aptx">${smp}</div></div>`:''}
    <div class="tabs2">${[['0','بدون'],['s','مبسّط'],['d','مفصّل']].map(([k,l])=>`<button class="${m===k?'on':''}" data-act="tjSet" data-k="${k}">${l}</button>`).join('')}</div>
    ${m==='0'?`<p class="small muted" style="margin:0;text-align:center">شغّل التلوين وتتلوّن الحروف في المصحف حسب أحكام التجويد.</p>`
      :`<div class="tjkey tjm-${m}">${TJKEY[m].map(([c,l])=>`<span><i class="tjdot tjk${c}"></i>${l}</span>`).join('')}</div>
    <p class="small muted" style="margin:0">التلوين اجتهاد آلي من بيانات مفتوحة لأحكام التجويد، فاقرأ على شيخ متقن لتضبط الأحكام.</p>`}</div>`);
}

function msPage(p,cur){
  const M=MS, a=M.ps[p-1], b=p<604?M.ps[p]:M.w.length; let h='';
  for(let li=bsearch(M.ls,a-1); li<M.ls.length && M.ls[li]<b; li++){
    const s=M.ls[li], e=li+1<M.ls.length?Math.min(M.ls[li+1],b):b, sk=M.ss.indexOf(s);
    if(sk>=0){ h+=`<div class="ml msh"><span>${SN(sk+1)}</span></div>`; if(sk!==0&&sk!==8) h+=`<div class="ml mbs"><span>${[0,1,2,3].map(msWord).join(' ')}</span></div>`; }
    let k=bsearch(M.as,s), line='';
    for(let i=s;i<e;i++){
      while(k<M.as.length && M.as[k]<=i) k++;
      const mk=MKS()[k], mc=mk?` mk mk-${mkC(mk)}`:'';
      line+=`<span class="ay${mc}" data-act="ayTap" data-id="${k}" data-w="${i}">${msWord(i)}</span>`;
      const end = k<M.as.length ? M.as[k]===i+1 : i===M.w.length-1;
      if(end) line+=`<span class="ay ae${mc}" data-act="ayTap" data-id="${k}">${ayEnd(aNo[k])}</span>`;
    }
    h+=`<div class="ml">${line}</div>`;
  }
  return `<div class="mp15 ${p<=2?'mp-open':''}"${cur?' id="mpage"':''}>${h}</div>`;
}
const BASMALA='بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ';
const lastPage=()=>{ try{ return +localStorage.getItem('rafiq-lastpage')||0; }catch(e){ return 0; } };
const juzStartPage=j=>pOf[JZ[j]];
const surahStartPage=s=>pOf[S[s][0]];
const normName=s=>s.replace(/^ال/,'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي');
/* surahs revealed in Madinah (Tanzil metadata); all others are Makki */
const MADANI=new Set([2,3,4,5,8,9,13,22,24,33,47,48,49,55,57,58,59,60,61,62,63,64,65,66,76,98,99,110]);
/* search the ayat: letters only, so it finds a word whatever its diacritics */
const arNorm=t=>String(t).replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g,'').replace(/[ٱأإآٲٳ]/g,'ا').replace(/ى/g,'ي').replace(/ؤ/g,'و').replace(/ئ/g,'ي').replace(/ة/g,'ه').replace(/\s+/g,' ').trim();
let QN=null;
const aqHist=()=>{ try{ return JSON.parse(localStorage.getItem('rafiq-aqh')||'[]'); }catch(e){ return []; } };
const aqKeep=q=>{ q=String(q||'').trim(); if(q.length<2) return; try{ localStorage.setItem('rafiq-aqh',JSON.stringify([q,...aqHist().filter(x=>x!==q)].slice(0,6))); }catch(e){} };
function aqResults(){
  const q=arNorm(ui.aq||''); if(q.length<2){ const hs=aqHist(); return hs.length?`<div class="small muted" style="margin:0 0 6px">آخر بحث</div><div class="aqhs">${hs.map(x=>`<button data-act="aqHs" data-q="${esc(x)}">${esc(x)}</button>`).join('')}</div>`:`<p class="small muted" style="text-align:center">اكتب كلمة أو أكثر، ويطلع لك كل آية فيها الكلمة.</p>`; }
  if(!QT){ loadQuran().then(()=>{ const el=document.getElementById('aqr'); if(el) el.innerHTML=aqResults(); }).catch(()=>{}); return `<p class="small muted" style="text-align:center">جارٍ تجهيز البحث…</p>`; }
  if(!QN) QN=QT.map(arNorm);
  const ex=!!ui.aqx, rx=ex?new RegExp('(^| )'+q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'( |$)'):null;
  const hits=[]; for(let i=0;i<QN.length;i++) if(ex?rx.test(QN[i]):QN[i].includes(q)) hits.push(i+1);
  if(!hits.length) return `<p class="small muted" style="text-align:center">ما لقينا آية فيها «${esc(ui.aq)}». جرّب تكتب الكلمة بدون «ال» أو بحروف أقل.</p>`;
  const toks=q.split(' '), ns=new Set(hits.map(id=>sOf[id]));
  const mark=id=>QT[id-1].split(' ').map(w=>{ const n=arNorm(w); return toks.some(t=>ex?n===t:n.includes(t))?`<b>${esc(w)}</b>`:esc(w); }).join(' ');
  let occ=0; for(const id of hits) for(const w of QT[id-1].split(' ')){ const n=arNorm(w); if(toks.some(t=>ex?n===t:n.includes(t))) occ++; }
  return `<div class="aqcnt"><span>السور <b>${f(ns.size)}</b></span><span>الآيات <b>${f(hits.length)}</b></span><span>تكرار الكلمة <b>${f(occ)}</b></span></div>${hits.length>100?'<p class="small muted" style="margin:0 0 8px">يظهر أول ١٠٠ آية</p>':''}
    <div class="mlist">${hits.slice(0,100).map(id=>`<a class="aqrow" href="#read-${pOf[id]}" data-act="aqGo" data-id="${id}"><span class="aqh">${NAMES[sOf[id]-1]} ${f(aNo[id])}<small>ص ${f(pOf[id])}</small></span><span class="aqt">${mark(id)}</span></a>`).join('')}</div>`;
}
/* the 240 quarters (أرباع الأحزاب), each with the start of its first ayah, as printed mushafs mark them with ۞ */
const RUBN=['','ربع الحزب','نصف الحزب','ثلاثة أرباع الحزب'];
function rubRows(){
  if(!QT) setTimeout(()=>loadQuran().then(()=>{ if(route()==='mindex'&&ui.mtab==='r') rerender(); }).catch(()=>{}),0);
  let h=''; for(let q=1;q<=240;q++){ const id=QD.hizbq[q], hz=Math.ceil(q/4), k=(q-1)%4;
    if(k===0 && hz%2===1) h+=`<div class="sec-l rubj">الجزء ${f((hz+1)/2)}</div>`;
    h+=rubRow(q); }
  return h;
}
/* the أجزاء tab: each juz opens to show its hizb quarters (¼ ½ ¾ of the first hizb, the second hizb, then its ¼ ½ ¾) */
function juzRows(){ const op=ui.mjOpen||(ui.mjOpen={});
  if(!QT && Object.keys(op).length) setTimeout(()=>loadQuran().then(()=>{ if(route()==='mindex') rerender(); }).catch(()=>{}),0);
  return Array.from({length:30},(_,i)=>i+1).map(j=>{ const id=JZ[j], o=!!op[j];
    let qs=''; if(o) for(let q=(j-1)*8+2;q<=j*8;q++) qs+=rubRow(q);
    return `<div class="mjz${o?' on':''}"><a class="mrow" href="#read-${juzStartPage(j)}"><span class="mno">${f(j)}</span><span class="mnm">الجزء ${f(j)}<small>يبدأ من ${NAMES[sOf[id]-1]} ${f(aNo[id])}</small></span><span class="mpg">ص ${f(juzStartPage(j))}</span></a><button class="mjx" data-act="mjTog" data-j="${j}" aria-expanded="${o}" aria-label="${o?'إخفاء الأرباع':'أرباع الجزء'}">${o?'إخفاء':'الأرباع'}</button>${o?`<div class="mjq">${qs}</div>`:''}</div>`; }).join(''); }
function rubRow(q){ const id=QD.hizbq[q], hz=Math.ceil(q/4), k=(q-1)%4;
    const w=QT?QT[id-1].split(' ').slice(0,5).join(' ')+'…':'';
    return `<a class="mrow" href="#read-${pOf[id]}" data-act="aqGo" data-id="${id}"><span class="mno${k?' rq':''}">${k?['','¼','½','¾'][k]:f(hz)}</span><span class="mnm">${k?RUBN[k]:'الحزب '+f(hz)}<small class="rubt">${w||`${NAMES[sOf[id]-1]} ${f(aNo[id])}`}</small></span><span class="mpg">${NAMES[sOf[id]-1]} ${f(aNo[id])}<br>ص ${f(pOf[id])}</span></a>`; }
/* one box finds surahs by name and ayahs by any word in them */
function msFind(rows){
  const qq=arNorm(ui.mq||'').trim(); ui.aq=ui.mq||'';
  if(!qq){ const hs=aqHist(); return (hs.length?`<div class="aqhs">${hs.map(x=>`<button data-act="aqHs" data-q="${esc(x)}">${esc(x)}</button>`).join('')}</div>`:'')+`<div class="mlist">${rows}</div>`; }
  const ay = qq.length>=2 && !/^[0-9٠-٩]+$/.test(qq) ? `<div class="sec-l">الآيات</div><button class="toggle sm" data-act="aqX"><span>بحث مطابق (الكلمة كاملة فقط)</span><span class="circle ${ui.aqx?'on':''}"></span></button><div id="aqr">${aqResults()}</div>` : '';
  return (rows?`<div class="sec-l">السور</div><div class="mlist">${rows}</div>`:'')+ay+(!rows&&!ay?'<p class="muted" style="text-align:center">ما لقينا سورة بهذا الاسم</p>':'');
}
function vMushaf(){
  const lp=lastPage(), tab=ui.mtab==='j'||ui.mtab==='r'?'j':'s', q=normName((ui.mq||'').trim());
  const cont = lp ? `<a class="card mcont" href="#read-${lp}"><span class="small muted">تابع من حيث وقفت</span><b>${NAMES[sOf[PG[lp]]-1]} · ص ${f(lp)}</b><span class="small muted">الجزء ${f(jOf[PG[lp]])}</span></a>` : '';
  const rows = tab==='s'
    ? Array.from({length:114},(_,i)=>i+1).filter(s=>!q||normName(NAMES[s-1]).includes(q)||String(s)===q).map(s=>`<a class="mrow" href="#read-${surahStartPage(s)}"><span class="mno">${f(s)}</span><span class="mnm">${NAMES[s-1]}<small>${MADANI.has(s)?'مدنية':'مكية'} · ${plural(S[s][1],'آية واحدة','آيتان','آيات','آية')}</small></span><span class="mpg">ص ${f(surahStartPage(s))}</span></a>`).join('')
    : juzRows();
  if(!QT) setTimeout(()=>loadQuran().then(()=>{ const el=document.getElementById('moff'); if(el) el.innerHTML=offBadge(); }).catch(()=>{}),0);
  const fw=LBS().map(x=>({x,ids:mkOf(x.id)})).filter(y=>y.ids.length), fws=fw.length?`<div class="card"><div class="tile-row" style="margin-bottom:8px"><span class="small muted">العلامات</span><button class="linkbtn" data-act="lbList">الكل</button></div><div class="mkls">${fw.map(({x,ids})=>ids.slice(-3).map(id=>`<a class="mkl mk-${x.c}" href="#read-${pOf[id]}"><i></i>${esc(x.n)} · ${NAMES[sOf[id]-1]} ${f(aNo[id])}</a>`).join('')).join('')}</div></div>`:'';
  const nts=Object.keys(NOTES()).length, ntc=nts?`<button class="listbtn" data-act="notesOpen"><span>الملاحظات<small>${plural(nts,'ملاحظة واحدة','ملاحظتان','ملاحظات','ملاحظة')} على الآيات</small></span><i class="chev">${IC.back}</i></button>`:'';
  return topbar('فهرس المصحف',{back:'#read-'+(lp||1)})+`<div class="stack">${fws}${ntc}
    <div class="tabs2">${[['s','السور'],['j','الأجزاء']].map(([k,l])=>`<button class="${tab===k?'on':''}" data-act="mtab" data-k="${k}">${l}</button>`).join('')}</div>
    ${tab==='s'?`<div class="msrch"><label class="field small"><input id="mq" type="search" placeholder="ابحث عن سورة أو كلمة من آية" value="${esc(ui.mq||'')}" autocomplete="off"></label>${RSUR().length?`<div class="rschips"><span class="small muted">آخر بحث</span>${RSUR().map(x=>`<a href="#read-${surahStartPage(x)}">${NAMES[x-1]}</a>`).join('')}</div>`:''}</div>`:''}
    ${tab==='s'?msFind(rows):`<div class="mlist">${rows}</div>`}
    <div class="card"><div class="small muted" style="margin-bottom:8px">تقليب الصفحات</div><div class="tabs2">${[['h','يمين ويسار'],['v','فوق وتحت']].map(([k,l])=>`<button class="${flipDir()===k?'on':''}" data-act="flipDir" data-k="${k}">${l}</button>`).join('')}</div></div>
    <button class="listbtn" data-act="apOpen"><span>المظهر<small>لون الصفحة، شكل رقم الآية، تلوين التجويد</small></span><i class="chev">${IC.back}</i></button>
    <p class="small muted" id="moff" style="text-align:center;margin:0">${offBadge()}</p></div>`;
}
/* page colour while reading: follow the app, or white, yellow (cream) or black like a printed mushaf */
const MTH=[['a','تلقائي'],['w','أبيض'],['y','كريمي'],['l','رمادي فاتح'],['k','أسود'],['d','رمادي غامق'],['c','فحمي'],['n','كحلي']];
/* the ornament round each ayah number: the mushaf font's own (f), a rose (r) or an octagon (o) */
const AMS=[['v','الوردة الفضية'],['m','الزخرفة'],['g','الحلقة الذهبية'],['l','اللوزة']];
const amStyle=()=>{ let v=null; try{ v=localStorage.getItem('rafiq-am'); }catch(e){} try{ if(!localStorage.getItem('rafiq-am2')){ localStorage.setItem('rafiq-am2','1'); if(v==='m'){ v='v'; localStorage.setItem('rafiq-am','v'); } } }catch(e){} return AMS.some(x=>x[0]===v)?v:'v'; };
const ayEnd=n=>amStyle()==='f'?`۝${arDigits(n)}`:`<i class="am am-${amStyle()}">${arDigits(n)}</i>`;
function apSheet(){
  const m=mth(), a=amStyle(), t=tjMode();
  openSheet(`${sheetHead('المظهر')}<div class="stack">
    <div class="sec-l">لون الصفحة</div><div class="apsw">${MTH.map(([k,l])=>`<button class="${m===k?'on':''}" data-act="mTheme" data-k="${k}" aria-label="${l}"><i class="mthdot t-${k}"></i><small>${l}</small></button>`).join('')}</div>
    <div class="sec-l">شكل رقم الآية</div><div class="tabs2">${AMS.map(([k,l])=>`<button class="${a===k?'on':''}" data-act="amSet" data-k="${k}">${k==='f'?'۝١':`<i class="am am-${k}">١</i>`} ${l}</button>`).join('')}</div>
    <div class="sec-l">تلوين التجويد</div><div class="tabs2">${[['0','بدون'],['s','مبسّط'],['d','مفصّل']].map(([k,l])=>`<button class="${t===k?'on':''}" data-act="tjSet" data-k="${k}" data-from="ap">${l}</button>`).join('')}</div>
    <div class="appv mpgv"><div class="msura"><span>${SN(112)}</span></div><div class="aptx">${MS?[0,1,2,3].map(j=>msWord(MS.as[6221]+j)).join(' '):'قُلۡ هُوَ ٱللَّهُ أَحَدٌ'} <span class="an">${ayEnd(1)}</span></div><div class="mfoot"><b>${f(604)}</b></div></div>
  </div>`);
}
/* whole-app colour: automatic, white, cream (yellow), grey or black */
const THS=[['a','تلقائي'],['w','أبيض'],['y','كريمي'],['g','رمادي'],['k','أسود']];
const appTh=()=>{ let v=null; try{ v=localStorage.getItem('rafiq-th'); }catch(e){} return THS.some(x=>x[0]===v)?v:'y'; }; // default: cream for everyone until they pick another
const noMus=()=>{ try{ return localStorage.getItem('rafiq-nomus')!=='0'; }catch(_){ return true; } };
const applyTh=()=>{ document.documentElement.dataset.th=appTh(); };
applyTh();
i18nStart();
const isNight=()=>{ const m=mth(); if(m!=='a') return 'kdcn'.includes(m); const t=appTh(); return t==='k'||t==='g'||(t==='a'&&matchMedia('(prefers-color-scheme:dark)').matches); };
const mth=()=>{ let v=null; try{ v=localStorage.getItem('rafiq-mth'); }catch(e){} return MTH.some(x=>x[0]===v)?v:'y'; };
const offBadge=()=>QT?'المصحف محفوظ على جهازك ويعمل بدون إنترنت':'يُحمَّل المصحف أول مرة ليعمل بعدها بدون إنترنت';
/* one full page (header, 15 lines, page number) and the pages beside it, so a finger can drag between them */
function msPanel(p,cur){
  if(p<1||p>604) return `<div class="mpanel mpanel-x"></div>`;
  const a=PG[p], b=PG[p+1]-1, names=[...new Set(Array.from({length:b-a+1},(_,i)=>NAMES[sOf[a+i]-1]))].join(' · ');
  return `<div class="mpanel${cur?' cur':''}" data-p="${p}"><div class="mpin"><div class="mhead"><span>الجزء ${f(jOf[a])}</span><span>${names}</span></div>${msPage(p,cur)}<div class="mfoot ${p%2?'po':'pe'}"><b>${f(p)}</b></div></div></div>`;
}
function msTrack(p){ const v=flipDir()==='v';
  const order = v ? [p-1,p,p+1] : [p+1,p,p-1]; // sideways: the next page waits on the left, like turning a mushaf
  return `<div class="mtrack ${v?'mv':'mh'}" id="mtrack" dir="ltr">${order.map(q=>msPanel(q,q===p)).join('')}</div>`; }
/* second way to read: ayah by ayah in large script, each with its tafsir under it */
/* reading options for the ayah + tafsir view: script size and hiding the vowel marks */
const DIA=/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const noDia=()=>{ try{ return localStorage.getItem('rafiq-nodia')==='1'; }catch(e){ return false; } };
const tfSize=()=>{ let v=27; try{ v=+localStorage.getItem('rafiq-tfs')||27; }catch(e){} return Math.min(44,Math.max(18,v)); };
function vTafs(p){
  p=Math.min(604,Math.max(1,p||1)); try{ localStorage.setItem('rafiq-lastpage',String(p)); }catch(e){}
  if(!QT){ loadQuran().then(()=>{ if(route()==='tafs-'+p) rerender(); }).catch(()=>{}); return mTop(p,'t')+'<div class="mload">جارٍ تحميل الآيات…</div>'; }
  if(!MS) loadMushaf().then(()=>{ if(route()==='tafs-'+p) rerender(); }).catch(()=>{});
  if(MS && tjMode()!=='0' && !TJ) loadTajweed().then(()=>{ if(route()==='tafs-'+p) rerender(); }).catch(()=>{});
  const a=PG[p], b=p<604?PG[p+1]-1:NA, TL=tfList(); let h='';
  for(let id=a;id<=b;id++){ const s=sOf[id];
    if(aNo[id]===1){ h+=`<div class="msura"><span>${SN(s)}</span></div>`; if(s!==1&&s!==9) h+=`<div class="mbasm">${BASMALA}</div>`; }
    const words = noDia() ? esc(QT[id-1].replace(DIA,'')) : MS ? Array.from({length:(id<NA?MS.as[id]:MS.w.length)-MS.as[id-1]},(_,j)=>`<span class="tw" data-w="${MS.as[id-1]+j}">${msWord(MS.as[id-1]+j)}</span>`).join(' ') : esc(QT[id-1]);
    h+=`<div class="tav"><div class="tat">${words} <span class="an">${ayEnd(aNo[id])}</span></div>
      <div class="tabtn"><button class="icon-btn" data-act="plAyah" data-a="${id}" data-b="${id}" aria-label="استمع">${IC.play}</button><button class="icon-btn" data-act="ayTap" data-id="${id}" aria-label="المزيد">⋯</button></div>
      ${TL.map(k=>`<div class="tatf ${TFC().includes(k)?'shut':''}" data-id="${id}" data-k="${k}"><div class="tfh"><button class="tft" data-act="tfFold" data-k="${k}"><i class="chev">${IC.back}</i><b>${tfName(k)}</b></button><button class="tfsh" data-act="tfShare" data-id="${id}" data-k="${k}" aria-label="مشاركة">${IC2.shr}</button></div><div class="tfb"><p class="muted">جارٍ التحميل…</p></div></div>`).join('')}</div>`; }
  const names=[...new Set(Array.from({length:b-a+1},(_,i)=>NAMES[sOf[a+i]-1]))].join(' · ');
  return mTop(p,'t')+`<div class="stack tafsv ${lsOn('rafiq-tfh')?'noay':''}">
    <button class="tfsrc" data-act="tfSrc"><span>${TL.length?TL.map(k=>`<i>${tfName(k)}</i>`).join(''):'<i>بدون تفسير</i>'}</span><b>تعديل</b></button>

    <div style="--tfs:${tfSize()}px;display:contents">${h}</div>
    <div style="height:70px"></div></div>
    <div class="tfbar"><button class="tbb" data-act="fontOpen" aria-label="تخصيص الخط">${IC2.font}</button><a class="tbb" href="#mindex" aria-label="البحث">${IC.search||'🔍'}</a>
      <a class="tbb ${p>=604?'dis':''}" href="#tafs-${Math.min(604,p+1)}" aria-label="الصفحة التالية">‹</a><b class="tbp">ص ${f(p)}</b><a class="tbb ${p<=1?'dis':''}" href="#tafs-${Math.max(1,p-1)}" aria-label="الصفحة السابقة">›</a>
      <button class="tbb ${lsOn('rafiq-tfh')?'on':''}" data-act="tfEye" aria-label="إخفاء الآيات">👁</button><a class="tbb" href="#read-${p}" aria-label="رجوع للصفحة">${IC.x}</a></div>
    <div class="tffab"><button data-act="tfAll" data-v="1" aria-label="افتح الكل">⇕</button><button data-act="tfAll" data-v="0" aria-label="اطوِ الكل">≡</button></div>`;
}
const TFC=()=>lsJ('rafiq-tfc',[]);
function tafsFill(r){
  document.querySelectorAll('.tatf[data-k]').forEach(el=>{ const id=+el.dataset.id, k=el.dataset.k, body=el.querySelector('.tfb'), tt=el.querySelector('.tft b');
    (k==='g'?gharibOf(id):tafsirOf(id,k)).then(t=>{ if(route()!==r) return; const ps=String(t||'').replace(/<[^>]*>/g,'').split(/\n+/).filter(x=>x.trim());
      if(k!=='g'){ const A=TF[k+'/'+sOf[id]]||[], i=aNo[id]-1, T=j=>String(A[j]||'').trim(), cur=T(i); // one explanation can cover several ayat (empty or repeated text)
        let st=i; while(cur && st>0 && T(st-1)===cur) st--;
        if(cur && st<i){ body.innerHTML=`<p class="muted">فسّرها مع الآية ${f(st+1)}، شوف تفسيرها فوق.</p>`; return; }
        if(!cur){ let b=i; while(b>0 && !T(b)) b--; if(b<i && T(b)){ body.innerHTML=`<p class="muted">فسّرها مع الآية ${f(b+1)}، شوف تفسيرها فوق.</p>`; return; } }
        if(ps.length){ let e=i; while(e+1<A.length && (!T(e+1)||T(e+1)===cur)) e++; if(e>i) tt.innerHTML=`${tfName(k)} <small>محتوى الآيات (${f(i+1)}-${f(e+1)})</small>`; } }
      body.innerHTML=ps.length?ps.map(x=>`<p dir="auto">${tfFmt(x)}</p>`).join(''):`<p class="muted">${k==='g'?'ما فيه كلمات غريبة في هذي الآية.':'ما فيه تفسير لهذي الآية في هذا الكتاب.'}</p>`; })
    .catch(()=>{ body.innerHTML='<p class="muted">يحتاج إنترنت أول مرة لكل سورة، أو حمّل الكتاب من المكتبة.</p>'; }); });
}

/* ---------- mushaf top bar: bookmarks, tajweed colours, night, page/tafsir view on the right; the ⋮ menu on the left ---------- */
const IC2={
  bm:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M6.5 3.5h11v17l-5.5-4-5.5 4z"/></svg>',
  tj:'<svg viewBox="0 0 24 24"><circle cx="7.2" cy="8" r="3.3" fill="#E0262B"/><circle cx="16.8" cy="8" r="3.3" fill="#1E9B3C"/><circle cx="12" cy="16.4" r="3.3" fill="#1B8FE0"/></svg>',
  tf:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8 8h8M8 11.5h8"/><path d="M8 15.5h5" stroke-width="1.4"/><path d="M8 18h7" stroke-width="1.4"/></svg>',
  pg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M12 6.5C10 5 7 4.5 3.5 5v13.5C7 18 10 18.5 12 20c2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5zM12 6.5V20"/></svg>',
  dots:'<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5.5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="18.5" r="2"/></svg>',
  say:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" stroke-linejoin="round"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>',
  tr:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 5.5h9M8 3.5v2M5.5 5.5c.8 3 3 5.4 6 6.5M10.5 5.5c-.8 3.4-3 6-6.5 7.5"/><path d="M12.5 20.5l4-9 4 9M14 17.5h5"/></svg>',
  font:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6V4.5h10V6M9 4.5v15M7 19.5h4M14 11v-1h7v1M17.5 10v9.5M16 19.5h3"/></svg>',
  books:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="7" y="3" width="13" height="15" rx="2"/><path d="M4 7v12a2 2 0 0 0 2 2h11M10.5 8h6M10.5 11.5h6"/></svg>',
  bell:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15zM10 20.5a2.2 2.2 0 0 0 4 0"/></svg>',
  gear:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/></svg>',
  dl:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/></svg>',
  list:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M9 6.5h11M9 12h11M9 17.5h11"/><circle cx="4.8" cy="6.5" r="1.2" fill="currentColor"/><circle cx="4.8" cy="12" r="1.2" fill="currentColor"/><circle cx="4.8" cy="17.5" r="1.2" fill="currentColor"/></svg>',
  star:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z"/></svg>',
  chat:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 5.5h16v10.5H10l-4.5 3.5V16H4z"/><path d="M8 9.5h8M8 12.5h5" stroke-linecap="round"/></svg>',
  lang:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.5 5.4 3.5 8.5s-1 5.9-3.5 8.5c-2.5-2.6-3.5-5.4-3.5-8.5s1-5.9 3.5-8.5z"/></svg>',
  info:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><circle cx="12" cy="7.8" r=".6" fill="currentColor"/></svg>',
  inst:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="6.5" y="2.8" width="11" height="18.4" rx="2.5"/><path d="M12 7.5v6.5M9.5 11.5 12 14l2.5-2.5" stroke-linecap="round"/></svg>',
  shr:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="17.5" cy="5.5" r="2.5"/><circle cx="6.5" cy="12" r="2.5"/><circle cx="17.5" cy="18.5" r="2.5"/><path d="m8.7 10.8 6.6-4M8.7 13.2l6.6 4"/></svg>',
};
const pgNames=(a,b)=>[...new Set(Array.from({length:b-a+1},(_,i)=>NAMES[sOf[a+i]-1]))].join(' · ');
function mTop(p,view){
  const a=PG[p], b=p<604?PG[p+1]-1:NA, t=view==='t';
  return `<header class="topbar mtop"><div class="mtl">
    <button class="mtb" data-act="lbList" aria-label="العلامات">${IC2.bm}</button>
    <button class="mtb" data-act="tjOpen" aria-label="ألوان التجويد">${IC2.tj}</button>
    <button class="mtb mnight" data-act="mThPop" aria-label="لون الصفحة">${isNight()?IC.sun:IC.moon}</button>
    <a class="mtb" href="#${t?'read':'tafs'}-${p}" aria-label="${t?'عرض الصفحة':'الآيات مع التفسير'}">${t?IC2.pg:IC2.tf}</a></div>
    <a class="mtt" href="#mindex" aria-label="الفهرس"><b>${pgNames(a,b)}</b><small>ص ${f(p)} · الجزء ${f(jOf[a])}</small></a>
    <button class="mtb" data-act="mMenu" aria-label="المزيد">${IC2.dots}</button></header>`;
}
/* the ⋮ menu of the mushaf */
const mBold=()=>{ try{ return localStorage.getItem('rafiq-bold')!=='0'; }catch(e){ return true; } }; // bold mushaf text is the default
const lsOn=k=>{ try{ return localStorage.getItem(k)==='1'; }catch(e){ return false; } };
const wbL=()=>lsOn('rafiq-wl'), wbT=()=>lsOn('rafiq-wt');
const mmB=(act,t,sub,ic,extra='')=>`<button class="listbtn mmi" data-act="${act}"${extra}>${ic}<span>${t}${sub?`<small>${sub}</small>`:''}</span><i class="chev">${IC.back}</i></button>`;
const mmT=(act,t,sub,ic,on)=>`<button class="listbtn mmi" data-act="${act}">${ic}<span>${t}${sub?`<small>${sub}</small>`:''}</span><i class="circle ${on?'on':''}"></i></button>`;
function mMenu(){
  const m=mth();
  openSheet(`${sheetHead('خيارات المصحف')}<div class="stack mmenu">
    <div class="mmsw" role="group" aria-label="لون الصفحة">${MTH.filter(x=>x[0]!=='a').map(([k,l])=>`<button class="${m===k?'on':''}" data-act="mTheme" data-k="${k}" data-from="mm" aria-label="${l}" title="${l}"><i class="mthdot t-${k}"></i></button>`).join('')}</div>
    <div class="me-list">
      ${mmT('wbL','لفظ الكلمة','اضغط على أي كلمة وتسمع نطقها',IC2.say,wbL())}
      ${mmT('wbT','ترجمة الكلمة','اضغط على أي كلمة وتطلع ترجمتها بالإنجليزي',IC2.tr,wbT())}
      ${mmB('fontOpen','تخصيص الخط','حجم الخط، التشكيل، شكل رقم الآية',IC2.font)}
      ${mmB('mushafsOpen','المصاحف','مصحف المدينة برواية حفص',IC2.books)}
      ${mmB('remOpen','التنبيهات والورد','تذكير يومي بالورد في التقويم',IC2.bell)}
      ${mmB('apOpen','إعدادات وتخصيص','لون الصفحة، تلوين التجويد، تقليب الصفحات',IC2.gear)}
    </div>
    <div class="sec-l">تحميل</div>
    <div class="me-list">${mmB('dlOpen','تحميل التلاوات','تسمعها بدون إنترنت',IC2.dl)}${mmB('libOpen','مكتبة التفاسير','حمّل التفاسير وتقرأها بدون إنترنت',IC2.books)}</div>
    <div class="me-list">${mmB('rngOpen','تكرار مقطع','من آية إلى آية، بعدد مرات تختاره',IC2.say)}${mmB('notesOpen','الملاحظات','ملاحظاتك على الآيات',IC2.chat)}</div>
    <div class="me-list">${mmB('goIdx','الفهرس والبحث','السور والأجزاء والأرباع والبحث في الآيات',IC2.list)}</div>
  </div>`);
}
function fontSheet(){
  const a=amStyle(), id=6222, smp=MS?Array.from({length:MS.as[id]-MS.as[id-1]},(_,j)=>msWord(MS.as[id-1]+j)).join(' '):(QT?esc(QT[id-1]):'قُلۡ هُوَ ٱللَّهُ أَحَدٌ');
  openSheet(`${sheetHead('تخصيص الخط')}<div class="stack">
    <div class="sec-l">حجم الخط في عرض الآيات مع التفسير</div>
    <div class="tfopt fsz"><button class="icon-btn" data-act="tfSz" data-d="-3" data-from="font" aria-label="أصغر">−</button><b>${f(tfSize())}</b><button class="icon-btn" data-act="tfSz" data-d="3" data-from="font" aria-label="أكبر">+</button></div>
    <div class="fsmp"><div class="tat" style="--tfs:${tfSize()}px">${noDia()&&QT?esc(QT[id-1].replace(DIA,'')):smp} <span class="an">${ayEnd(1)}</span></div></div>
    <div class="sec-l">التشكيل</div>
    <div class="tabs2">${[['0','مع التشكيل'],['1','بدون تشكيل']].map(([k,l])=>`<button class="${(noDia()?'1':'0')===k?'on':''}" data-act="tfDiaK" data-k="${k}">${l}</button>`).join('')}</div>
    <div class="sec-l">خط المصحف</div>
    <div class="tabs2">${[['0','عادي'],['1','عريض B']].map(([k,l])=>`<button class="${(mBold()?'1':'0')===k?'on':''}" data-act="boldSet" data-k="${k}"${k==='1'?' style="font-weight:800"':''}>${l}</button>`).join('')}</div>
    <div class="sec-l">شكل رقم الآية</div>
    <div class="tabs2">${AMS.map(([k,l])=>`<button class="${a===k?'on':''}" data-act="amSet" data-k="${k}" data-from="font">${k==='f'?'۝١':`<i class="am am-${k}">١</i>`} ${l}</button>`).join('')}</div>
    <p class="small muted" style="margin:0">صفحة المصحف تضبط حجم الخط تلقائياً لتملأ الشاشة مثل المصحف المطبوع.</p></div>`);
}
function mushafsSheet(){
  openSheet(`${sheetHead('المصاحف')}<div class="stack">
    <div class="mshc"><span class="mshi">${IC2.books}</span><span><b>مصحف المدينة النبوية</b><small>رواية حفص عن عاصم · ٦٠٤ صفحات · ١٥ سطراً في الصفحة</small><small class="ok">${MS?'محفوظ على الجهاز ويعمل بدون إنترنت':'يُحمَّل مرة واحدة ثم يعمل بدون إنترنت'}</small></span><i class="circle on"></i></div>
    <p class="small muted" style="margin:0">برسم مجمع الملك فهد لطباعة المصحف الشريف (الإصدار ٣ من خط حفص).</p></div>`);
}
function remSheet(){
  const ps=Object.values(state.plans||{}).filter(p=>status(p)==='active');
  openSheet(`${sheetHead('التنبيهات والورد')}<div class="stack">
    <a class="listbtn mmi" href="#today" data-act="closeSheet">${IC2.bm}<span>ورد اليوم<small>مهام اليوم من كل الخطط</small></span><i class="chev">${IC.back}</i></a>
    <div class="sec-l">تذكير يومي</div>
    ${ps.length?`<div class="me-list">${ps.map(p=>mmB('remPlan',esc(p.name||'خطة'),'موعد يومي في التقويم، ونسخ ورد اليوم لتطبيق المهام',IC2.bell,` data-plan="${p.id}"`)).join('')}</div>`
      :`<p class="small muted" style="margin:0">أنشئ خطة وتقدر تضبط لها تذكيراً يومياً بموعد الورد.</p><a class="btn block" href="#new" data-act="closeSheet">+ خطة جديدة</a>`}
  </div>`);
}
/* the ayah + tafsir view: the reader picks which tafsirs and meanings show under each ayah, and their order */
const TSRC=()=>[...TAFSIRS,...(TAFSIRS.some(x=>x[0]==='aq:en.sahih')?[]:[['aq:en.sahih','ترجمة المعاني بالإنجليزية (Saheeh International)']]),['g','معاني الكلمات (السراج)']];
const tfName=k=>(TSRC().find(x=>x[0]===k)||[k,k])[1];
const tfList=()=>{ let l=null; try{ l=JSON.parse(localStorage.getItem('rafiq-tfl')||'null'); }catch(e){} const ok=TSRC().map(x=>x[0]);
  return Array.isArray(l)?l.filter((k,i)=>ok.includes(k)&&l.indexOf(k)===i):[tfKey(),'g']; };
const tfSave=l=>{ try{ localStorage.setItem('rafiq-tfl',JSON.stringify(l)); }catch(e){} };
function tfSrcSheet(){
  const L=tfList(), rest=TSRC().filter(x=>!L.includes(x[0])).map(x=>x[0]);
  const row=(k,on)=>`<div class="tfli ${on?'':'off'}" data-k="${k}">${on?`<span class="tfdrag" aria-label="اسحب للترتيب">≡</span>`:'<span class="tfdrag"></span>'}<span>${tfName(k)}</span><button class="circle ${on?'on':''}" data-act="tfTog" data-k="${k}" aria-label="${on?'إيقاف':'تشغيل'}"></button></div>`;
  openSheet(`${sheetHead('التفاسير والمعاني')}<div class="stack">
    <p class="small muted" style="margin:0">اسحب ≡ لترتيبها تحت الآيات، و✓ تشغّل الكتاب أو توقفه.</p>
    <div class="tfls" id="tfls">${L.map(k=>row(k,1)).join('')}</div>
    ${rest.length?`<div class="sec-l">متوقفة</div><div class="tfls">${rest.map(k=>row(k,0)).join('')}</div>`:''}
    <button class="btn ghost block" data-act="libOpen">📚 مكتبة التفاسير (تحميل وحول الكتاب)</button></div>`);
}
let tdg=null;
document.addEventListener('pointerdown',e=>{ const h=e.target.closest('#tfls .tfdrag'); if(!h) return; const it=h.closest('.tfli'); tdg={it,y:e.clientY}; it.classList.add('drag'); e.preventDefault(); try{ h.setPointerCapture(e.pointerId); }catch(_){} });
document.addEventListener('pointermove',e=>{ if(!tdg) return; const box=document.getElementById('tfls'); if(!box) return; const it=tdg.it;
  for(const o of box.children){ if(o===it) continue; const r=o.getBoundingClientRect(); if(e.clientY>r.top && e.clientY<r.bottom){ if(e.clientY<r.top+r.height/2) box.insertBefore(it,o); else box.insertBefore(it,o.nextSibling); break; } } });
document.addEventListener('pointerup',()=>{ if(!tdg) return; tdg.it.classList.remove('drag'); tdg=null; const box=document.getElementById('tfls'); if(!box) return;
  tfSave([...box.children].map(x=>x.dataset.k)); if(route().startsWith('tafs-')) rerender(); });
/* word by word: pronunciation (transliteration + the word's recitation) and English meaning, by tapping a word.
   Data: Quran.com word-by-word (via QUL), packed one line per word of hafs.json in wbw-en.txt */
let WB=null, wbP=null, wbA=null, wbR='';
function loadWbw(){ if(WB) return Promise.resolve(WB); if(wbP) return wbP;
  wbP=cachedFetch('wbw-en.txt','wbw-en.txt').then(r=>r.text()).then(t=>{ WB=t.split('\n'); return WB; }).catch(e=>{ wbP=null; throw e; }); return wbP; }
const wbClose=()=>{ document.getElementById('wbpop')?.remove(); document.querySelectorAll('.wbon').forEach(x=>x.classList.remove('wbon')); };
function wbPlay(u){ try{ if(wbA) wbA.pause(); wbA=new Audio(); if(self.crossOriginIsolated) wbA.crossOrigin='anonymous'; wbA.src=u; wbA.play().catch(()=>toast('تعذّر تشغيل الكلمة، تأكد من الإنترنت')); }catch(e){} }
function wbPop(el){
  wbClose(); if(!MS) return;
  if(!WB){ toast('جارٍ تجهيز الكلمات…'); const w0=el.dataset.w; loadWbw().then(()=>{ const e2=document.body.contains(el)?el:document.querySelector(`.mpanel.cur .ay[data-w="${w0}"], .tafsv .tw[data-w="${w0}"]`); if(e2) wbPop(e2); }).catch(e=>{ console.log('wbw',e); toast('تحتاج إنترنت أول مرة لتحميل الكلمات'); }); return; }
  const w=+el.dataset.w, [tr,tl,ps]=(WB[w]||'').split('\t'), k=bsearch(MS.as,w), pos=+ps||(w-MS.as[k-1]+1), p3=n=>String(n).padStart(3,'0');
  const url=`https://audio.qurancdn.com/wbw/${p3(sOf[k])}_${p3(aNo[k])}_${p3(pos)}.mp3`;
  const d=document.createElement('div'); d.id='wbpop'; d.className='wbpop noi18n';
  d.innerHTML=`<b class="wbwar">${esc(msTok(w))}</b>${wbT()&&tl?`<span class="wbtl" dir="ltr">${esc(tl)}</span>`:''}<button class="wbplay" data-act="wbPlay" data-u="${url}" aria-label="استمع للكلمة">${IC2.say}</button>`;
  document.body.appendChild(d); el.classList.add('wbon'); wbR=route();
  const r=el.getBoundingClientRect(), pr=d.getBoundingClientRect();
  const x=Math.max(8,Math.min(innerWidth-pr.width-8,r.left+r.width/2-pr.width/2)); let y=r.top-pr.height-10; if(y<74) y=r.bottom+10;
  d.style.left=x+'px'; d.style.top=y+'px';
  if(wbL()) wbPlay(url);
}
/* rating and feedback, in the app's main settings */
function rateSheet(){
  const n=ui.rate||0;
  openSheet(`${sheetHead('قيّم التطبيق')}<form class="stack" id="ratef">
    <p class="small muted" style="margin:0;text-align:center">كم تعطي ربيع القرآن؟</p>
    <div class="rstars">${[1,2,3,4,5].map(i=>`<button type="button" class="${i<=n?'on':''}" data-act="rateStar" data-n="${i}" aria-label="${f(i)} من ٥">★</button>`).join('')}</div>
    <label class="field"><span class="lbl">وش أعجبك، ووش نحسّن؟ (اختياري)</span><textarea id="r-msg" maxlength="1000" rows="3"></textarea></label>
    <div id="attbox" class="attbox">${attHtml()}</div>
    <div class="auth-err" id="rateErr" role="alert"></div>
    <button type="submit" class="btn block big" ${n?'':'disabled'}>إرسال التقييم</button></form>`);
}
async function submitRate(form){
  const n=ui.rate||0, err=form.querySelector('#rateErr'); if(!n) return;
  if(!(cloudOn()&&auth.s)){ err.textContent='سجّل دخولك عشان يوصلنا تقييمك.'; return; }
  if(attRec){ err.textContent='وقّف التسجيل أولاً.'; return; }
  const btn=form.querySelector('[type=submit]'); btn.disabled=true; btn.textContent='لحظة…';
  try{ await sendSupport(`تقييم التطبيق: ${'★'.repeat(n)}${'☆'.repeat(5-n)} (${n}/5)\n${form.querySelector('#r-msg').value.trim()}`, ui.att); ui.att=null; closeSheet(); ui.rate=0; toast('شكراً لتقييمك، جزاك الله خيراً'); }
  catch(e){ err.textContent='تعذّر الإرسال، تأكد من الإنترنت.'; btn.disabled=false; btn.textContent='إرسال التقييم'; }
}
function langSheet(){
  openSheet(`${sheetHead('اللغة')}<div class="stack"><div class="lgpick noi18n">${[['ar','العربية'],['en','English']].map(([k,l])=>`<button class="${LANG===k?'on':''}" data-act="setLang" data-k="${k}">${l}</button>`).join('')}</div>
    <p class="small muted" style="margin:0">نص القرآن والتفاسير العربية تبقى بالعربي في كل اللغات.</p></div>`);
}
function mslBubble(el){
  const v=+el.value, b=document.getElementById('mslb'); if(!b) return; const s=sOf[PG[v]];
  b.innerHTML=`<b>${f(s)}. سورة ${NAMES[s-1]}</b><span>${f(v)}</span>`; b.hidden=false;
  const r=el.getBoundingClientRect(), t=(v-1)/603, x=r.right-14-t*(r.width-28); // right end is page 1
  b.style.left=Math.max(8,Math.min(innerWidth-b.offsetWidth-8,x-b.offsetWidth/2))+'px';
}
document.addEventListener('input',e=>{ if(e.target.id==='mrange') mslBubble(e.target); });
document.addEventListener('change',e=>{ if(e.target.id!=='mrange') return; const v=+e.target.value; document.getElementById('mslb')?.setAttribute('hidden','');
  if('read-'+v!==route()) location.hash='#read-'+v; });
const MTHO=['w','y','l','d','c','n','k'];
const mthClose=()=>document.getElementById('mthpop')?.remove();
function mthPop(btn){
  if(document.getElementById('mthpop')){ mthClose(); return; }
  const m=mth(), d=document.createElement('div'); d.id='mthpop'; d.className='mthpop';
  d.innerHTML=MTHO.map(k=>{ const l=MTH.find(x=>x[0]===k)[1]; return `<button class="${m===k?'on':''}" data-act="mTheme" data-k="${k}" data-from="pop" aria-label="${l}"><i class="mthdot t-${k}"></i><small>${l}</small></button>`; }).join('');
  document.body.appendChild(d); const r=btn.getBoundingClientRect();
  d.style.top=(r.bottom+8)+'px'; d.style.left=Math.max(8,Math.min(innerWidth-d.offsetWidth-8,r.left+r.width/2-d.offsetWidth/2))+'px';
}

/* ===================== v2.11 ===================== */
const lsJ=(k,d)=>{ try{ const v=JSON.parse(localStorage.getItem(k)||'null'); return v==null?d:v; }catch(e){ return d; } };
const lsW=(k,v)=>{ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} };
/* 5: two ready marks from day one: «آخر قراءة» (one stop that moves) and «آيات تدبر وتأمل» (many ayat) */
setTimeout(function(){ if(lsJ('rafiq-lb2',0)) return; const L=LBS(); if(!L.some(x=>x.id==='lr')) L.unshift({id:'lr',n:'آخر قراءة',c:'t',m:1}); if(!L.some(x=>x.id==='td')) L.splice(1,0,{id:'td',n:'آيات تدبر وتأمل',c:'g',m:0}); lbSaveAll(); lsW('rafiq-lb2',1); if(route().startsWith('read-')) rerender(); },0);
setTimeout(function(){ if(lsJ('rafiq-lb3',0)) return; const D={a:'أحمر',b:'أخضر',c:'أزرق',d:'أصفر'}, L=LBS();
  for(let i=L.length-1;i>=0;i--){ const x=L[i]; if(D[x.id]===x.n && !mkOf(x.id).length && L.length>1) L.splice(i,1); }
  lbSaveAll(); lsW('rafiq-lb3',1); },0);
/* 3: a note on any ayah */
const NOTES=()=>lsJ('rafiq-notes',{});
function noteSheet(id){ const n=NOTES()[id];
  openSheet(`${sheetHead(`ملاحظة · ${NAMES[sOf[id]-1]} ${f(aNo[id])}`)}<div class="stack">
    <div class="verse qv" style="font-size:20px">${esc(QT?QT[id-1]:'')}</div>
    <label class="field"><span class="lbl">اكتب فائدة أو خاطرة على الآية</span><textarea id="ntx" rows="5" maxlength="3000">${esc(n?n.t:'')}</textarea></label>
    <button class="btn block" data-act="noteSave" data-id="${id}">حفظ</button>
    ${n?`<button class="linkbtn danger" data-act="noteDel" data-id="${id}">حذف الملاحظة</button>`:''}</div>`);
  setTimeout(()=>document.getElementById('ntx')?.focus(),50); }
function notesSheet(){ const N=NOTES(), ids=Object.keys(N).map(Number).sort((a,b)=>(N[b].ts||0)-(N[a].ts||0));
  openSheet(`${sheetHead('الملاحظات')}<div class="stack">${ids.length?ids.map(id=>`<a class="mkcard" href="#read-${pOf[id]}" data-act="aqGo" data-id="${id}"><span class="mkct">${esc(N[id].t)}</span><span class="mkcm"><b>${NAMES[sOf[id]-1]} ${f(aNo[id])}</b><span>ص ${f(pOf[id])}</span></span></a>`).join(''):'<p class="muted" style="text-align:center">ما كتبت ملاحظات للحين. افتح أي آية واضغط «ملاحظة».</p>'}</div>`); }
/* 6: facts about the ayah */
function ayInfoSheet(id){ const s=sOf[id]; let q=1; for(let i=1;i<=240;i++) if(QD.hizbq[i]<=id) q=i; const hz=Math.ceil(q/4), k=(q-1)%4;
  const words=MS?(id<NA?MS.as[id]:MS.w.length)-MS.as[id-1]:(QT?QT[id-1].split(' ').length:0);
  const row=(a,b)=>`<div class="inforow"><span>${a}</span><b>${b}</b></div>`;
  openSheet(`${sheetHead('معلومات الآية')}<div class="stack"><div class="infobox">
    ${row('السورة',`${f(s)}. ${NAMES[s-1]} (${MADANI.has(s)?'مدنية':'مكية'})`)}${row('رقم الآية في السورة',`${f(aNo[id])} من ${f(S[s][1])}`)}${row('رقمها في المصحف',`${f(id)} من ${f(NA)}`)}
    ${row('الصفحة',f(pOf[id]))}${row('الجزء',f(jOf[id]))}${row('الحزب',`${f(hz)}${k?' · '+RUBN[k]:''}`)}${row('عدد الكلمات',f(words))}</div></div>`); }
/* 2: tap a word inside the ayah sheet: its meaning and how it is said */
function ayWordPanel(w){ const el=document.getElementById('aywp'); if(!el) return;
  if(!WB){ el.innerHTML='<p class="muted">جارٍ تجهيز الكلمات…</p>'; loadWbw().then(()=>ayWordPanel(w)).catch(()=>{ el.innerHTML='<p class="muted">تحتاج إنترنت أول مرة لتحميل الكلمات.</p>'; }); return; }
  const [tr,tl,ps]=(WB[w]||'').split('\t'), k=bsearch(MS.as,w), pos=+ps||(w-MS.as[k-1]+1), p3=n=>String(n).padStart(3,'0');
  const url=`https://audio.qurancdn.com/wbw/${p3(sOf[k])}_${p3(aNo[k])}_${p3(pos)}.mp3`;
  document.querySelectorAll('.ayw.on').forEach(x=>x.classList.remove('on')); document.querySelector(`.ayw[data-w="${w}"]`)?.classList.add('on');
  el.innerHTML=`<div class="aywh"><b class="wbwar">${esc(msTok(w))}</b><button class="wbplay" data-act="wbPlay" data-u="${url}" aria-label="استمع للكلمة">${IC2.say}</button></div>
    <div class="infobox">${tl?`<div class="inforow"><span>المعنى (إنجليزي)</span><b dir="ltr">${esc(tl)}</b></div>`:''}</div>
    <p class="small muted" style="margin:0">معنى الكلمة بالعربي في «معاني الكلمات» تحت.</p>`;
  } // no sound by itself: the word is heard only from its play button
/* 9: repeat a passage, from an ayah to an ayah */
function rngSheet(a,b){ const o=audOpts(); a=a||ui.rgA||PG[lastPage()||1]; b=b||ui.rgB||a; ui.rgA=a; ui.rgB=b;
  const sopt=sel=>NAMES.map((n,i)=>`<option value="${i+1}" ${sel===i+1?'selected':''}>${f(i+1)}. ${n}</option>`).join('');
  const aopt=(s,sel)=>Array.from({length:S[s][1]},(_,i)=>`<option value="${S[s][0]+i}" ${sel===S[s][0]+i?'selected':''}>${f(i+1)}</option>`).join('');
  const chips=(k,vals)=>`<div class="stepbtns">${vals.map(([v,l])=>`<button class="${String(o[k])===String(v)?'on':''}" data-act="audOpt" data-k="${k}" data-v="${v}" data-from="rng">${l}</button>`).join('')}</div>`;
  openSheet(`${sheetHead('تكرار مقطع')}<div class="stack">
    <div class="rgbox"><div class="sec-l">من</div><div class="row" style="gap:8px;flex-wrap:nowrap"><label class="field small" style="flex:2"><span class="lbl">السورة</span><select id="rgSA">${sopt(sOf[a])}</select></label><label class="field small" style="flex:1"><span class="lbl">الآية</span><select id="rgA">${aopt(sOf[a],a)}</select></label></div></div>
    <div class="rgbox"><div class="sec-l">إلى</div><div class="row" style="gap:8px;flex-wrap:nowrap"><label class="field small" style="flex:2"><span class="lbl">السورة</span><select id="rgSB">${sopt(sOf[b])}</select></label><label class="field small" style="flex:1"><span class="lbl">الآية</span><select id="rgB">${aopt(sOf[b],b)}</select></label></div></div>
    <label class="field small"><span class="lbl">القارئ</span><select id="audR">${RECITERS.map(([v,l])=>`<option value="${v}" ${o.r===v?'selected':''}>${l}</option>`).join('')}</select></label>
    <div class="sec-l">تكرار كل آية</div>${chips('rep',[[1,'مرة'],[3,'٣'],[5,'٥'],[10,'١٠'],[20,'٢٠']])}
    <div class="sec-l">تكرار المقطع كاملاً</div>${chips('loop',[[1,'مرة'],[2,'مرتين'],[3,'٣'],[5,'٥'],[0,'بلا توقف']])}
    <p class="small muted" style="margin:0" id="rgSum"></p>
    <button class="btn block" style="font-size:17px;padding:14px" data-act="rgGo"><span style="display:inline-flex;width:18px;height:18px;vertical-align:middle">${IC.play}</span> شغّل المقطع</button></div>`);
  rgSum(); }
function rgSum(){ const el=document.getElementById('rgSum'); if(!el) return; const a=Math.min(ui.rgA,ui.rgB), b=Math.max(ui.rgA,ui.rgB), o=audOpts();
  el.textContent=`${plural(b-a+1,'آية واحدة','آيتان','آيات','آية')}، كل آية ${o.rep>1?f(o.rep)+' مرات':'مرة'}، والمقطع ${o.loop===0?'بلا توقف':o.loop>1?f(o.loop)+' مرات':'مرة'}`; }
document.addEventListener('change',e=>{ const t=e.target; if(!/^rg(SA|SB|A|B)$/.test(t.id)) return;
  if(t.id==='rgSA'){ ui.rgA=S[+t.value][0]; if(ui.rgB<ui.rgA) ui.rgB=ui.rgA; rngSheet(); }
  else if(t.id==='rgSB'){ ui.rgB=S[+t.value][0]+S[+t.value][1]-1; rngSheet(); }
  else { ui[t.id==='rgA'?'rgA':'rgB']=+t.value; rgSum(); } });
/* 18–22: tafsir library: download whole books for offline reading, about each book */
const TBOOK={m:['التفسير الميسر','نخبة من العلماء، مجمع الملك فهد لطباعة المصحف الشريف','تفسير مختصر بعبارة سهلة، يذكر المعنى الإجمالي لكل آية.'],
 'ar-tafsir-al-mukhtasar':['المختصر في تفسير القرآن الكريم','مركز تفسير للدراسات القرآنية','تفسير مختصر معاصر، يبدأ كل سورة بمقاصدها ثم يفسر الآيات بإيجاز.'],
 'ar-tafseer-al-saddi':['تيسير الكريم الرحمن في تفسير كلام المنان','عبد الرحمن بن ناصر السعدي (ت ١٣٧٦هـ)','تفسير متوسط واضح العبارة، يعتني بالمعاني والفوائد والهدايات.'],
 'ar-tafsir-ibn-kathir':['تفسير القرآن العظيم','إسماعيل بن عمر بن كثير (ت ٧٧٤هـ)','من أشهر كتب التفسير بالمأثور، يفسر القرآن بالقرآن ثم بالسنة وأقوال السلف.'],
 'ar-tafseer-al-qurtubi':['الجامع لأحكام القرآن','محمد بن أحمد القرطبي (ت ٦٧١هـ)','تفسير واسع يعتني بالأحكام الفقهية واللغة والقراءات.'],
 'ar-tafsir-al-tabari':['جامع البيان عن تأويل آي القرآن','محمد بن جرير الطبري (ت ٣١٠هـ)','أصل كتب التفسير بالمأثور، يجمع أقوال الصحابة والتابعين بأسانيدها.'],
 'ar-tafsir-al-baghawi':['معالم التنزيل','الحسين بن مسعود البغوي (ت ٥١٦هـ)','تفسير متوسط بالمأثور، سهل العبارة ومختصر من تفسير الثعلبي.'],
 'ar-tafsir-al-wasit':['التفسير الوسيط للقرآن الكريم','محمد سيد طنطاوي (ت ١٤٣١هـ)','تفسير معاصر متوسط يعتني بالمعنى واللغة والهدايات.'],
 'aq:en.sahih':['Saheeh International','Saheeh International','ترجمة معاني القرآن إلى الإنجليزية بلغة واضحة.'],
 g:['السراج في بيان غريب القرآن','أ.د. محمد بن عبد العزيز الخضيري','يشرح الكلمات الغريبة في كل آية بعبارة مختصرة. منشور في موسوعة القرآن الكريم QuranEnc.']};
const TSZ={m:3,'ar-tafsir-al-mukhtasar':2.3,'ar-tafseer-al-saddi':6.3,'ar-tafsir-ibn-kathir':90,'ar-tafseer-al-qurtubi':78,'ar-tafsir-al-tabari':61,'ar-tafsir-al-baghawi':39,'ar-tafsir-al-wasit':18,'aq:en.sahih':1,g:2};
const tsz=k=>TSZ[k]?`${f(TSZ[k]>=10?Math.round(TSZ[k]):TSZ[k])} ميجا`:'';
const TFD=()=>lsJ('rafiq-tfd',{});
const tfUrl=(k,s)=>k==='g'?GHARIB_URL(s):TAFSIR_URL(s,k);
let TDL=null;
async function tfDownload(k){ if(TDL) return; TDL={k,n:0,fail:0}; libShow();
  let c=null; try{ c=await caches.open('rafiq-tafsir'); }catch(e){}
  for(let s=1;s<=114;s++){ const u=tfUrl(k,s); try{ const r=await fetch(u); if(r.ok){ c&&await c.put(u,r); } else TDL.fail++; }catch(e){ TDL.fail++; } TDL.n=s; libShow(); if(TDL.fail>3) break; }
  const ok=!TDL.fail; TDL=null; if(ok){ const d=TFD(); d[k]=Date.now(); lsW('rafiq-tfd',d); }
  toast(ok?`حُمّل «${tfName(k)}» ويشتغل بدون نت`:'انقطع التحميل، تأكد من الإنترنت وحاول مرة ثانية'); libSheet(ui.libTab); }
async function tfDel(k){ try{ const c=await caches.open('rafiq-tafsir'); for(let s=1;s<=114;s++) await c.delete(tfUrl(k,s)); }catch(e){} for(const x of Object.keys(TF)) if(x.startsWith(k+'/')) delete TF[x]; if(k==='g') for(const x of Object.keys(GH)) delete GH[x];
  const d=TFD(); delete d[k]; lsW('rafiq-tfd',d); }
function libSheet(tab){ tab=ui.libTab=tab||ui.libTab||'b'; const d=TFD(), L=tfList(), all=TSRC();
  const meta=k=>TBOOK[k]||[tfName(k),'',''];
  const card=k=>{ const m=meta(k), on=L.includes(k), dl=!!d[k];
    return `<div class="libc"><div class="libh"><span><b>${tfName(k)}</b><small>${esc(m[1])}</small>${tsz(k)?`<small class="muted">الحجم تقريباً ${tsz(k)}${TSZ[k]>30?' · يفضّل التحميل على واي فاي':''}</small>`:''}</span>
      <button class="icon-btn ${on?'on':''}" data-act="libEye" data-k="${k}" aria-label="${on?'إخفاء من تحت الآيات':'إظهار تحت الآيات'}">${on?'👁':'○'}</button></div>
      <div class="libf"><button class="btn ghost sm" data-act="libAbout" data-k="${k}">حول الكتاب</button>
      ${dl?`<span class="small ok">✓ محمّل</span><button class="linkbtn" data-act="libUpd" data-k="${k}">تحديث</button><button class="linkbtn danger" data-act="libDel" data-k="${k}">حذف التحميل</button>`
        :`<button class="btn sm" data-act="libDl" data-k="${k}">⬇ تحميل</button>`}</div>
      ${TDL&&TDL.k===k?`<div id="libp"></div>`:''}</div>`; };
  const have=all.filter(([k])=>d[k]).map(([k])=>k), rest=all.filter(([k])=>!d[k]).map(([k])=>k);
  openSheet(`${sheetHead('مكتبة التفاسير')}<div class="stack">
    <div class="tabs2"><button class="${tab==='b'?'on':''}" data-act="libTab" data-k="b">الكتب (${f(all.length)})</button><button class="${tab==='d'?'on':''}" data-act="libTab" data-k="d">المحمّلة (${f(have.length)})</button></div>
    <p class="small muted" style="margin:0">${tab==='b'?'حمّل الكتاب مرة وحدة ويشتغل بدون إنترنت. العين تظهره أو تخفيه تحت الآيات.':'الكتب المحفوظة على جهازك.'}</p>
    ${(tab==='b'?[...rest,...have]:have).map(card).join('')||'<p class="muted" style="text-align:center">ما حمّلت كتب للحين.</p>'}</div>`);
  libShow(); }
function libShow(){ const el=document.getElementById('libp'); if(!el||!TDL) return; const p=Math.round(TDL.n/114*100);
  el.innerHTML=`<div class="dlbar"><i style="width:${p}%"></i></div><p class="small muted" style="margin:6px 0 0">جارٍ التحميل… ${f(p)}٪ (سورة ${f(TDL.n)} من ١١٤)</p>`; }
function libAbout(k){ const m=TBOOK[k]||[tfName(k),'',''];
  openSheet(`${sheetHead('حول الكتاب')}<div class="stack"><div class="infobox"><div class="inforow"><span>الكتاب</span><b>${esc(m[0])}</b></div><div class="inforow"><span>المؤلف</span><b>${esc(m[1])}</b></div></div>
    <p style="margin:0;line-height:1.9">${esc(m[2])}</p><button class="btn ghost block" data-act="libOpen">رجوع للمكتبة</button></div>`); }
function confirmSheet(msg,act,k){ openSheet(`${sheetHead('تأكيد')}<div class="stack"><p style="margin:0;text-align:center">${msg}</p><div class="row" style="gap:8px"><button class="btn danger" style="flex:1" data-act="${act}" data-k="${k}">نعم، احذف</button><button class="btn ghost" style="flex:1" data-act="libOpen">لا</button></div></div>`); }
/* 25: surahs opened lately, as chips above the search */
const RSUR=()=>lsJ('rafiq-rs',[]);
const rsNote=s=>{ const l=RSUR(); if(l[0]===s) return; lsW('rafiq-rs',[s,...l.filter(x=>x!==s)].slice(0,8)); };
/* 17: colour quoted ayat and footnote numbers inside tafsir text */
const tfFmt=x=>esc(x).replace(/(﴿[^﴾]{1,600}﴾|\{[^}]{1,600}\})/g,'<span class="tq">$1</span>').replace(/\((\d{1,3})\)/g,'<sup class="tn">($1)</sup>');
function vRead(p){
  p=Math.max(1,Math.min(604,p|0||1)); rsNote(sOf[PG[p]]);
  try{ localStorage.setItem('rafiq-lastpage',String(p)); }catch(e){}
  const a=PG[p], b=PG[p+1]-1, names=[...new Set(Array.from({length:b-a+1},(_,i)=>NAMES[sOf[a+i]-1]))].join('، ');
  let body;
  if(!MS && ui.msHave===undefined){ msHave().then(h=>{ ui.msHave=h; if(route()==='read-'+p) rerender(); }); body=`<div class="mload">…</div>`; }
  else if(!MS && ui.msHave){ body=`<div class="mload">جارٍ فتح المصحف…</div>`; loadMushaf().then(()=>{ if(route()==='read-'+p) rerender(); }).catch(()=>{ ui.msHave=false; if(route()==='read-'+p) rerender(); }); }
  else if(!MS){ if(!ui.msDl) setTimeout(msDownload,0); body=msDlCard(); } // the mushaf must be downloaded once; it starts by itself
  else if(!QT && !MS){ body=`<div class="mload" id="mload">جارٍ تحميل المصحف…</div>`;
    loadQuran().then(()=>{ if(route()==='read-'+p) rerender(); }).catch(()=>{ const el=document.getElementById('mload'); if(el) el.innerHTML='تحتاج اتصال إنترنت أول مرة لتحميل المصحف، وبعدها يشتغل بدون نت.<br><button class="btn sm" data-act="mretry" style="margin-top:10px">حاول مرة ثانية</button>'; }); }
  else if(MS){ body=null; if(tjMode()!=='0' && !TJ) loadTajweed().then(()=>{ if(route()==='read-'+p) rerender(); }).catch(()=>{}); }
  else { let h='';
    for(let id=a;id<=b;id++){ const s=sOf[id];
      if(aNo[id]===1){ h+=`<div class="msura"><span>${SN(s)}</span></div>`; if(s!==1&&s!==9) h+=`<div class="mbasm">${BASMALA}</div>`; }
      h+=`<span class="ay" data-act="ayTap" data-id="${id}">${esc(QT[id-1])} <span class="an">${ayEnd(aNo[id])}</span></span> `; }
    body=`<div class="mpage" id="mpage">${h}</div>`; }
  const head=`<div class="mhead"><span>الجزء ${f(jOf[a])}</span><span>${names.replace('، ',' · ')}</span></div>`, foot=`<div class="mfoot ${p%2?'po':'pe'}"><b>${f(p)}</b></div>`;
  const main = body===null ? msTrack(p) : head+body+foot;
  return mTop(p,'p')+`<div class="stack mread">${main}
    <div class="mslide"><input type="range" id="mrange" min="1" max="604" step="1" value="${p}" dir="rtl" aria-label="انتقل إلى صفحة"><div class="mslb" id="mslb" hidden></div></div>
    <div class="mnav"><a class="btn ghost sm ${p>=604?'dis':''}" href="#read-${Math.min(604,p+1)}" aria-label="الصفحة التالية">التالية ‹</a>
      <button class="btn sm" data-act="plAyah" data-a="${a}" data-b="${b}">${IC.play} استمع</button>
      <a class="btn sm" href="#recite-${a}-${b}">${IC.mic} سمّع</a>
      <a class="btn ghost sm ${p<=1?'dis':''}" href="#read-${Math.max(1,p-1)}" aria-label="الصفحة السابقة">› السابقة</a></div>
    <p class="small muted mhint" style="text-align:center;margin:0">اضغط مطوّلا على أي كلمة لتفسير آيتها والاستماع لها</p></div>`;
}
/* grow the text so one mushaf page fills the screen, like a printed page */
function fitPage(){ const tr=document.getElementById('mtrack'); if(tr){ tr.querySelectorAll('.mp15').forEach(fit15); return; }
  const el=document.getElementById('mpage'); if(!el) return;
  if(el.classList.contains('mp15')) return fit15(el);
  const ft=document.querySelector('.mfoot'); window.scrollTo(0,0);
  const fits=()=>(ft||el).getBoundingClientRect().bottom<=window.innerHeight-6;
  let lo=12, hi=Math.min(44, window.innerWidth/11);
  for(let i=0;i<10;i++){ const m=(lo+hi)/2; el.style.fontSize=m+'px'; if(fits()) lo=m; else hi=m; }
  el.style.fontSize=lo+'px'; }
/* the 15 lines share the screen's height evenly. Every page gets the same font size for this screen (no jump in size from page to page):
   it fits the width of nine pages in ten; a longer line first closes the gaps between its words, and only if still too long gets a touch smaller */
const ML_EM=19.4; // a long mushaf line is about this many times the font size wide (measured over the 604 pages)
const mlW=l=>{ const r=document.createRange(); r.selectNodeContents(l); return r.getBoundingClientRect().width; };
function fit15(el){
  window.scrollTo(0,0);
  const lines=[...el.querySelectorAll('.ml')], H=el.clientHeight;
  lines.forEach(l=>{ l.style.fontSize=''; l.style.columnGap=''; l.classList.remove('mlc'); });
  const W=lines.length?lines[0].clientWidth:el.clientWidth;
  let fs=Math.max(10,Math.min(60, H/15/1.15, W<=600?20.5:W/ML_EM)); // 20.5px on phones, as the owner chose
  el.style.fontSize=fs+'px';
  if(el.scrollHeight>H+1){ fs=Math.max(10,fs*H/el.scrollHeight); el.style.fontSize=fs+'px'; }
  // the short last line of a surah sits in the middle, not spread across the page (and a very short line just above it too)
  let nx=false; for(let j=lines.length-1;j>=0;j--){ const l=lines[j]; if(l.classList.contains('msh')||l.classList.contains('mbs')){ nx=false; continue; }
    const e=l.lastElementChild, id=e&&e.classList.contains('ae')?+e.dataset.id:0, end=id&&aNo[id]===S[sOf[id]][1];
    let w=0; for(const c of l.children) w+=c.getBoundingClientRect().width; nx=(end||nx) && w+fs*.3*(l.children.length-1)<l.clientWidth*(end?.8:.6); if(nx) l.classList.add('mlc'); }
  for(const l of lines){ if(mlW(l)<=l.clientWidth+1) continue;
    l.style.columnGap='.06em'; const w=mlW(l); if(w>l.clientWidth+1) l.style.fontSize=(fs*(l.clientWidth-1)/w)+'px'; }
}
window.addEventListener('resize',()=>{ if(route().startsWith('recite-')) rcFit(); if(route().startsWith('read-')) fitPage(); if(route().startsWith('wird-')) wirdFit(); });
document.fonts&&document.fonts.addEventListener&&document.fonts.addEventListener('loadingdone',()=>{ if(route().startsWith('read-')) fitPage(); if(route().startsWith('wird-')) wirdFit(); });
const flipDir=()=>{ try{ return localStorage.getItem('rafiq-flip')==='v'?'v':'h'; }catch(e){ return 'h'; } };
/* long press on a word (or right-click) opens tafsir, listening and recitation for its ayah */
let lpT=null, lpX=0, lpY=0, lpDone=false;
const lpOpen=el=>{ lpDone=true; try{ navigator.vibrate&&navigator.vibrate(15); }catch(e){}
  const id=+el.dataset.id; mkClose(); ayahSheet(id);
  if(el.dataset.w!=null && MS) setTimeout(()=>{ const w=+el.dataset.w; ayWordPanel(w); },0); };
/* marks: hold a word and its whole ayah is coloured, the word itself a shade stronger.
   The reader makes their own marks (name + colour); a mark is either one stop that moves, or many ayat */
const MKPAL=['r','o','y','g','t','b','v','p'], MKCOL={r:'أحمر',o:'برتقالي',y:'أصفر',g:'أخضر',t:'فيروزي',b:'أزرق',v:'بنفسجي',p:'وردي'};
let mkCache=null, lbCache=null;
const LBS=()=>{ if(!lbCache){ try{ lbCache=JSON.parse(localStorage.getItem('rafiq-labels')||'null'); }catch(e){}
  if(!Array.isArray(lbCache)||!lbCache.length) lbCache=[{id:'lr',n:'آخر قراءة',c:'t',m:1},{id:'td',n:'آيات تدبر وتأمل',c:'g',m:0}]; } return lbCache; };
const lbSaveAll=()=>{ try{ localStorage.setItem('rafiq-labels',JSON.stringify(LBS())); }catch(e){} };
const lab=l=>LBS().find(x=>x.id===l);
const MKS=()=>{ if(!mkCache){ try{ mkCache=JSON.parse(localStorage.getItem('rafiq-marks')||'{}'); }catch(e){ mkCache={}; }
  for(const m of Object.values(mkCache)) if(!m.l){ m.l=(LBS().find(x=>x.c===m.c)||LBS()[0]).id; delete m.c; } } return mkCache; };
const mkSave=()=>{ try{ localStorage.setItem('rafiq-marks',JSON.stringify(MKS())); }catch(e){} };
const mkLast=()=>{ let l=null; try{ l=localStorage.getItem('rafiq-mkl'); }catch(e){} return lab(l)?l:LBS()[0].id; };
const mkC=m=>{ const x=m&&lab(m.l); return x?x.c:'y'; };
function mkPaint(id){ const m=MKS()[id]; document.querySelectorAll(`.ay[data-id="${id}"]`).forEach(x=>{ x.className=x.className.replace(/\s*\bmk(w|-\w)?\b/g,'');
  if(m){ x.classList.add('mk','mk-'+mkC(m));  } }); }
function mkSet(id,w,l){ const M=MKS(), lb=lab(l);
  if(lb&&lb.m) for(const o of Object.keys(M)) if(+o!==id && M[o].l===l){ delete M[o]; mkPaint(+o); } // a single stop moves to the new ayah
  M[id]={w,l,t:Date.now()}; mkSave(); mkPaint(id); }
const mkOf=l=>Object.entries(MKS()).filter(([,m])=>m.l===l).map(([k])=>+k).sort((a,b)=>a-b);
function mkDel(id){ delete MKS()[id]; mkSave(); mkPaint(id); }
function mkBar(id){ let el=document.getElementById('mkbar'); if(!el){ el=document.createElement('div'); el.id='mkbar'; el.className='mkbar'; document.body.appendChild(el); }
  const m=MKS()[id]; el.dataset.id=id;
  el.innerHTML=`<div class="mkt"><b>${NAMES[sOf[id]-1]} · آية ${f(aNo[id])}</b><button class="icon-btn" data-act="mkX" aria-label="إغلاق">${IC.x}</button></div>
    <div class="mkls mkrow">${LBS().map(x=>`<button class="mkl mk-${x.c}${m&&m.l===x.id?' on':''}" data-act="mkC" data-l="${x.id}"><i></i>${esc(x.n)}</button>`).join('')}<button class="mkl mkadd" data-act="lbNew">+ علامة</button></div>
    <div class="mkc"><button class="btn sm" data-act="mkTf">التفسير والاستماع</button><button class="linkbtn" data-act="lbList">العلامات</button><button class="linkbtn" data-act="mkDel">إزالة</button></div>`; }
/* create / edit a mark: name, colour, one moving stop or many ayat */
function labSheet(l){ const x=l?lab(l):null; ui.lbEd=ui.lbEd&&ui.lbEd.id===(l||null)?ui.lbEd:{id:l||null,n:x?x.n:'',c:x?x.c:MKPAL.find(c=>!LBS().some(y=>y.c===c))||'r',m:x?x.m:0};
  const e=ui.lbEd;
  openSheet(`${sheetHead(l?'تعديل العلامة':'علامة جديدة')}<div class="stack">
    <label class="field"><span class="lbl">اسم العلامة</span><input id="lbn" type="text" maxlength="30" value="${esc(e.n)}" placeholder="اكتب اسم يذكّرك فيها"></label>
    <div><div class="lbl small muted" style="margin-bottom:6px">اللون</div><div class="mkc">${MKPAL.map(c=>`<button class="mkdot mk-${c}${e.c===c?' on':''}" data-act="lbC" data-c="${c}" aria-label="${MKCOL[c]}"></button>`).join('')}</div></div>
    <div class="tabs2"><button class="${e.m?'on':''}" data-act="lbM" data-m="1">وقفة وحدة تنتقل</button><button class="${e.m?'':'on'}" data-act="lbM" data-m="0">أكثر من آية</button></div>
    <p class="small muted" style="margin:0">${e.m?'كل ما حطيتها على آية جديدة تنتقل لها من مكانها القديم.':'تقدر تحطها على آيات كثيرة، وتبقى كلها.'}</p>
    <button class="btn block" data-act="lbSave">حفظ</button>
    ${l?`<button class="linkbtn danger" data-act="lbDel">حذف العلامة${mkOf(l).length?` (وتنشال من ${plural(mkOf(l).length,'آية واحدة','آيتين','آيات','آية')})`:''}</button>`:''}</div>`);
}
function labsSheet(){ ui.lbEd=null;
  const L=LBS(), cur=L.find(x=>x.id===ui.lbTab)||L.find(x=>mkOf(x.id).length)||L[0], srt=ui.lbSort||'s', M=MKS();
  let ids=cur?mkOf(cur.id):[]; if(srt==='t') ids=ids.sort((x,y)=>(M[y].t||0)-(M[x].t||0));
  const day=t=>t?`${fmtShort(iso(new Date(t)))} · ${fmtH(iso(new Date(t)))}`:'';
  const lp=lastPage(), cont=lp&&PG[lp]?`<a class="card mcont" href="#read-${lp}" data-act="closeSheet"><span class="small muted">تابع من حيث وقفت</span><b>${NAMES[sOf[PG[lp]]-1]} · ص ${f(lp)}</b><span class="small muted">الجزء ${f(jOf[PG[lp]])}</span></a>`:'';
  openSheet(`${sheetHead('العلامات')}<div class="stack">${cont}
    <div class="lbtabs">${L.map(x=>`<button class="${cur&&x.id===cur.id?'on':''}" data-act="lbTab" data-l="${x.id}"><span class="mkl mk-${x.c}"><i></i>${esc(x.n)}</span><small>${f(mkOf(x.id).length)}</small></button>`).join('')}</div>
    ${cur?`<div class="lbbar"><div class="tabs2 sm">${[['s','حسب السورة'],['t','الأحدث']].map(([k,l])=>`<button class="${srt===k?'on':''}" data-act="lbSort" data-k="${k}">${l}</button>`).join('')}</div><button class="btn ghost sm" data-act="lbEdit" data-l="${cur.id}">تعديل</button></div>
    ${ids.length?ids.map(id=>`<div class="mkcard mk-${cur.c}"><a href="#read-${pOf[id]}" data-act="aqGo" data-id="${id}"><span class="mkct">${QT?esc(QT[id-1]):''}</span><span class="mkcm"><b>${NAMES[sOf[id]-1]} ${f(aNo[id])}</b><span>ص ${f(pOf[id])}${M[id].t?' · '+day(M[id].t):''}</span></span></a><button class="mkrm" data-act="mkRm" data-id="${id}" aria-label="إزالة">✕</button></div>`).join('')
      :`<p class="muted" style="text-align:center;margin:8px 0">${cur.m?'هذي وقفة تنتقل: اضغط مطوّلاً على كلمة في المصحف وتنحفظ هنا.':'اضغط مطوّلاً على أي كلمة في المصحف واختر هذي العلامة.'}</p>`}`:''}
    <button class="btn ghost block" data-act="lbNew">+ علامة جديدة</button></div>`);
  if(!QT) loadQuran().then(()=>{ if(document.querySelector('.lbtabs')) labsSheet(); }).catch(()=>{});
}
const mkClose=()=>document.getElementById('mkbar')?.remove();
document.addEventListener('touchstart',e=>{ clearTimeout(lpT); lpDone=false; const ay=e.target.closest&&e.target.closest('.mread .ay, .wpg .ay'); if(!ay||e.touches.length!==1) return; // also the mushaf page of a task (wird)
  lpX=e.touches[0].clientX; lpY=e.touches[0].clientY; lpT=setTimeout(()=>lpOpen(ay),480); },{passive:true});
document.addEventListener('touchmove',e=>{ if(lpT && Math.hypot(e.touches[0].clientX-lpX,e.touches[0].clientY-lpY)>10){ clearTimeout(lpT); lpT=null; } },{passive:true});
document.addEventListener('touchend',()=>{ clearTimeout(lpT); lpT=null; },{passive:true});
document.addEventListener('contextmenu',e=>{ if(!document.body.classList.contains('mreading') && !route().startsWith('wird-')) return; e.preventDefault(); const ay=e.target.closest('.mread .ay, .wpg .ay'); if(ay){ lpOpen(ay); lpDone=false; } });
/* swipe to turn pages: finger moving right = next page, like a real mushaf */
let swX=null,swY=0;
/* drag to turn: the page follows the finger and the next one slides in beside it; let go past a quarter (or flick) to turn */
let dg=null, dgBusy=false;
const dgSet=(tr,v,px,anim)=>{ tr.style.transition=anim?'transform .26s cubic-bezier(.2,.7,.3,1)':'none'; tr.style.transform=v?`translate3d(0,${px-innerHeight}px,0)`:`translate3d(${px-innerWidth}px,0,0)`; };
document.addEventListener('touchstart',e=>{ dg=null; const tr=document.getElementById('mtrack');
  if(!tr||dgBusy||e.touches.length!==1||!route().startsWith('read-')||e.target.closest('.sheet,.scrim,.topbar,.mnav,.mslide,.nav,.plbar,.toast,.mkbar,.mrd')) return;
  dg={tr,x:e.touches[0].clientX,y:e.touches[0].clientY,t:Date.now(),ax:null,d:0,v:flipDir()==='v',p:+route().slice(5)}; },{passive:true});
document.addEventListener('touchmove',e=>{ if(!dg) return; const dx=e.touches[0].clientX-dg.x, dy=e.touches[0].clientY-dg.y;
  if(!dg.ax){ if(Math.hypot(dx,dy)<8) return; const along=dg.v?Math.abs(dy):Math.abs(dx), across=dg.v?Math.abs(dx):Math.abs(dy);
    if(along<across){ dg=null; return; } dg.ax=1; lpDone=true; clearTimeout(lpT); lpT=null; dg.x+=dg.v?0:Math.sign(dx)*8; dg.y+=dg.v?Math.sign(dy)*8:0; }
  let d=dg.v?e.touches[0].clientY-dg.y:e.touches[0].clientX-dg.x; const n=dg.v?(d<0?1:-1):(d>0?1:-1), to=dg.p+n;
  if(to<1||to>604) d*=.25; // nothing beyond the first or last page: it only gives a little
  dg.d=d; dgSet(dg.tr,dg.v,d,false); },{passive:true});
const dgEnd=()=>{ if(!dg) return; const g=dg; dg=null; if(!g.ax) return;
  const size=g.v?innerHeight:innerWidth, n=g.v?(g.d<0?1:-1):(g.d>0?1:-1), to=g.p+n, fast=Math.abs(g.d)/(Date.now()-g.t)>.45 && Math.abs(g.d)>40;
  if(to>=1 && to<=604 && (Math.abs(g.d)>size*.22 || fast)){ dgBusy=true; dgSet(g.tr,g.v,Math.sign(g.d)*size,true);
    setTimeout(()=>{ dgBusy=false; location.hash='#read-'+to; },270); }
  else { dgSet(g.tr,g.v,0,true); } };
document.addEventListener('touchend',dgEnd,{passive:true}); document.addEventListener('touchcancel',dgEnd,{passive:true});
document.addEventListener('touchstart',e=>{ if(document.getElementById('mtrack')||!route().startsWith('read-')||e.touches.length!==1){ swX=null; return; } swX=e.touches[0].clientX; swY=e.touches[0].clientY; },{passive:true});
document.addEventListener('touchend',e=>{ if(swX===null) return; const t=e.changedTouches[0], dx=t.clientX-swX, dy=t.clientY-swY; swX=null;
  if(e.target.closest('.sheet,.scrim')) return;
  const p=+route().slice(5), go=n=>{ location.hash='#read-'+Math.max(1,Math.min(604,p+n)); };
  if(flipDir()==='v'){ if(Math.abs(dy)>60 && Math.abs(dy)>Math.abs(dx)*1.5) go(dy<0?1:-1); }
  else if(Math.abs(dx)>70 && Math.abs(dx)>Math.abs(dy)*1.5) go(dx>0?1:-1); },{passive:true});

