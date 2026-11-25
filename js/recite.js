/* ---------- recitation check (speech recognition) ---------- */
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
const AR_MARKS=/[ؐ-ًؚ-ٟۖ-ۭـ]/g;
function qnorm(w){
  return w.replace(/وٰ/g,'ا').replace(/ٰ/g,'').replace(AR_MARKS,'').replace(/[ٱأإآ]/g,'ا').replace(/ؤ/g,'و').replace(/ئ/g,'ي').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[^ء-ي]/g,'');
}
const MUQ={'ا':'الف','ل':'لام','م':'ميم','ص':'صاد','ر':'را','ك':'كاف','ه':'ها','ي':'يا','ع':'عين','ط':'طا','س':'سين','ح':'حا','ق':'قاف','ن':'نون'};
const MUQ_SET=new Set(['الم','المص','الر','المر','كهيعص','طه','طسم','طس','يس','ص','حم','عسق','ق','ن']);
function lev(a,b){ const m=a.length,n=b.length; if(!m) return n; if(!n) return m; let p=Array.from({length:n+1},(_,j)=>j);
  for(let i=1;i<=m;i++){ const c=[i]; for(let j=1;j<=n;j++) c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1)); p=c; } return p[n]; }
const sim=(a,b)=>{ if(a===b) return 1; const L=Math.max(a.length,b.length); return L?1-lev(a,b)/L:0; };
function wordSim(e,r){ let s=Math.max(sim(e.n,r), e.alt?sim(e.alt,r):0);
  if(e.n.length>3 && r.startsWith('و')!==e.n.startsWith('و')) s=Math.max(s, sim(e.n.replace(/^و/,''), r.replace(/^و/,''))-0.15);
  return s; }
const OK_AT=e=>e.n.length<=3?0.7:0.76;
function buildWords(rs){
  const W=[]; for(const [a,b] of rs) for(let id=a;id<=b;id++){
    const ws=QT[id-1].split(/\s+/).filter(w=>qnorm(w)); const g0=qIdx().AW[id]; ws.forEach((w,k)=>{ const n=qnorm(w); const e={t:w,n,id,gw:g0+k,last:k===ws.length-1,st:'p',hint:W.length===0};
      if(k===0 && aNo[id]===1 && MUQ_SET.has(n)) e.alt=[...n].map(c=>MUQ[c]||c).join('');
      W.push(e); }); }
  return W;
}
/* align what was heard with the expected words, left to right */
function alignRec(W,text,final,start=0){
  const R=text.split(/\s+/).map(qnorm).filter(Boolean);
  W.forEach((w,k)=>{ if(k>=start){ w.st='p'; w.heard=null; } });
  let i=start;
  for(let j=0;j<R.length && i<W.length;j++){
    const cands=[[R[j],1]]; if(j+1<R.length) cands.push([R[j]+R[j+1],2]); if(j+2<R.length) cands.push([R[j]+R[j+1]+R[j+2],3]);
    let best=null;
    for(let k=i;k<Math.min(W.length,i+6);k++){
      for(const [r,used] of cands){
        let s=wordSim(W[k],r), span=1;
        if(k+1<W.length){ const s2=wordSim({n:W[k].n+W[k+1].n},r); if(s2>s+0.05){ s=s2; span=2; } }
        const need = k===i ? OK_AT(W[k]) : Math.max(0.86, OK_AT(W[k]));
        if(s>=need && (k===i || W[k].n.length>=3) && (!best || k<best.k || (k===best.k && s>best.s))){ best={k,s,used,span}; }
      }
      if(best && best.k===k) break;
    }
    if(best){ for(let x=i;x<best.k;x++) W[x].st='m';
      for(let x=best.k;x<best.k+best.span;x++) W[x].st='ok';
      i=best.k+best.span; j+=best.used-1; }
    else if(sim(W[i].n,R[j])>=0.34 || (R.length-j)<=1){ W[i].heard=R[j]; W[i].st=(!final && j===R.length-1)?'c':'e'; if(W[i].st!=='c') i++; }
  }
  return i;
}
/* ---- where is this being recited? a letter index of the whole mushaf, searched by letter triples ---- */
let QIX=null;
function qIdx(){ if(QIX) return QIX; const AW=new Int32Array(NA+2), keys=[], wid=[]; let g=0;
  for(let id=1;id<=NA;id++){ AW[id]=g; for(const w of QT[id-1].split(/\s+/)){ if(!qnorm(w)) continue; keys.push(ctLetters(w)); wid.push(id); g++; } } AW[NA+1]=g;
  let n=0; keys.forEach(k=>n+=k.length); const L=new Uint8Array(n), LW=new Int32Array(n), WS=new Int32Array(g+1); let q=0;
  keys.forEach((k,i)=>{ WS[i]=q; for(const c of k){ L[q]=c; LW[q]=i; q++; } }); WS[g]=q;
  return QIX={AW,wid,L,LW,WS,tri:null}; }
function qTri(){ const X=qIdx(); if(X.tri) return X.tri; const K=CT_K+1, cnt=new Map(), L=X.L;
  for(let i=0;i+2<L.length;i++){ const c=(L[i]*K+L[i+1])*K+L[i+2]; cnt.set(c,(cnt.get(c)||0)+1); }
  const pos=new Map(); for(const [c,m] of cnt) pos.set(c,{a:new Int32Array(m),n:0});
  for(let i=0;i+2<L.length;i++){ const o=pos.get((L[i]*K+L[i+1])*K+L[i+2]); o.a[o.n++]=i; }
  return X.tri=pos; }
/* seq: letter keys heard; ok(gw) limits the search to some words; near: the word we expected, to break ties between repeated phrases */
function qLocate(seq,ok,near){ if(!QT||seq.length<9) return null; const X=qIdx(), tri=qTri(), K=CT_K+1, votes=new Map();
  for(let i=0;i+2<seq.length;i++){ const o=tri.get((seq[i]*K+seq[i+1])*K+seq[i+2]); if(!o||o.n>4000) continue;
    for(let k=0;k<o.n;k++){ const d=o.a[k]-i; if(ok && !ok(X.LW[Math.max(0,d)])) continue; const b=d>>2; votes.set(b,(votes.get(b)||0)+1); } }
  const top=[...votes].filter(v=>v[1]>=3).sort((a,b)=>b[1]-a[1]).slice(0,8); let best=null;
  for(const [b] of top){ const d0=Math.max(0,b*4-4), end=Math.min(X.L.length,d0+seq.length+Math.ceil(seq.length*.35)+8), T=X.L.subarray(d0,end);
    let prev=new Int32Array(T.length+1); // free start and end in T
    for(let i=1;i<=seq.length;i++){ const cur=new Int32Array(T.length+1); cur[0]=i; for(let j=1;j<=T.length;j++) cur[j]=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+(seq[i-1]===T[j-1]?0:1)); prev=cur; }
    let bj=0; for(let j=1;j<=T.length;j++) if(prev[j]<prev[bj]) bj=j;
    const simv=1-prev[bj]/seq.length, e=d0+bj-1, st=Math.max(d0,e-seq.length+1), w0=X.LW[st], w1=X.LW[Math.max(st,e)];
    if(ok && !ok(w0)) continue;
    const c={sim:simv,w0,w1,dist:near==null?0:Math.abs(w0-near)};
    if(!best || c.sim>best.sim+0.04 || (Math.abs(c.sim-best.sim)<=0.04 && c.dist<best.dist)) best=c; }
  return best && best.sim>=0.62 ? best : null; }
const ctGreedy=(LP,a,b)=>{ const o=[]; let pv=-1; for(let t=a;t<b;t++){ const r=LP[t]; let m=0; for(let k=1;k<r.length;k++) if(r[k]>r[m]) m=k; if(m!==pv && m) o.push(m); pv=m; } return o; };
/* move the recitation to the word the person actually started from */
function rcJump(found,fromFrame){ const rc=ui.rc, ct=rc.ct, X=qIdx();
  let i=rc.W.findIndex(w=>w.gw===found.w0);
  if(i<0){ // free mushaf: follow the reciter to that ayah, to the end of its surah
    const id=X.wid[found.w0], s=sOf[id], to=S[s][0]+S[s][1]-1, key='recite-'+id+'-'+to;
    history.replaceState(null,'','#'+key); Object.assign(rc,{key,rs:[[id,to]],map:null,cp:null,autoP:null}); rc.W=buildWords(rc.rs); i=rc.W.findIndex(w=>w.gw===found.w0); if(i<0) return false; }
  rc.W.forEach((w,k)=>{ if(k>=i && w.st!=='p') w.st='p'; if(k<i && w.st==='e' && w.loc!==1) w.st='p'; });
  if(ct){ ct.wi=i; ct.f0=fromFrame; ct.eRun=0; ct.g0=fromFrame; ct.relo=1; for(let g=0;g<40;g++){ const w0=ct.wi; asrAlign(false); if(ct.wi===w0) break; } ct.relo=0; }
  rcStatus(`${NAMES[sOf[rc.W[i].id]-1]}، الآية ${f(aNo[rc.W[i].id])}… أكمل`); return true; }
/* the heard letters don't fit where we are: find them in the task (or the whole mushaf when reciting freely) */
function rcRelocate(seq,fromFrame){ const rc=ui.rc; if(!rc||!rc.W) return false; const cur=rc.W[Math.min(rc.W.length-1,(rc.ct?rc.ct.wi:0))], near=cur&&cur.gw;
  const inTask=new Set(rc.W.map(w=>w.gw)), free=!rc.from;
  let found=qLocate(seq,gw=>inTask.has(gw),near);
  if(found && Math.abs(found.w0-near)<=3) return false;
  /* after the start of a recording the place is fixed: never jump, keep waiting at the same word */
  if(rc.lock){ const any=found||qLocate(seq,null,near); if(!any) return false; const id=qIdx().wid[any.w0];
    rcStatus(`يبدو أن هذه ${NAMES[sOf[id]-1]} الآية ${f(aNo[id])}، وننتظرك من حيث توقفت. ولتغيير المكان يمكن إيقاف التسجيل والبدء من جديد.`); return 'out'; }
  if(found) return rcJump(found,fromFrame);
  const any=qLocate(seq,null,near); if(!any) return false;
  if(free) return rcJump(any,fromFrame);
  const id=qIdx().wid[any.w0]; rcStatus(`هذي ${NAMES[sOf[id]-1]} الآية ${f(aNo[id])}، وهي مو من آيات المهمة`); return 'out'; }
function recRoute(r){ return r.slice(7).split('_').map(x=>x.split('-').map(Number)).filter(x=>x.length===2&&x[0]>=1&&x[1]<=NA&&x[0]<=x[1]); }
function vRecite(r){
  const rs=recRoute(r); if(!rs.length) return topbar('التسميع',{back:'#mushaf'})+'<p class="muted">ما لقينا الآيات.</p>';
  const key=r; if(!ui.rc || ui.rc.key!==key){ stopRec(); ui.rc={key,rs,hide:true,on:false,segs:[],done:false,from:ui.rcFrom||null}; ui.rcFrom=null; }
  const rc=ui.rc, label=rs.map(runLabel).join('، ');
  if(!QT){ loadQuran().then(()=>{ if(route()===r) rerender(); }).catch(()=>{ const el=document.getElementById('mload'); if(el) el.textContent='تحتاج اتصال إنترنت أول مرة لتحميل المصحف.'; });
    return topbar('التسميع',{back:'#mushaf',sub:label})+'<div class="mload" id="mload">جارٍ تحميل الآيات…</div>'; }
  if(!rc.W) rc.W=buildWords(rs);
  if(ASRQ()) asrLoad();
  if(false && ASRQ() && !self.crossOriginIsolated && /Chrome\/|Firefox\//.test(navigator.userAgent)){ try{ if(!localStorage.getItem('rafiq-coi1')){ localStorage.setItem('rafiq-coi1','1'); coiSet(true); } }catch(e){} }
  if(!MS && ui.msHave===undefined) msHave().then(h=>{ ui.msHave=h; if(h) loadMushaf().then(()=>{ if(route()===r) rerender(); }).catch(()=>{}); });
  const back = rc.from ? '#today' : `#read-${pOf[rs[0][0]]}`;
  if(MS && rc.pg!==false) return `<div class="rcfs">
    <div class="rcw pgv ${rc.hide?'hid':''}" id="rcw">${rcWords()}</div>
    <div id="rcsum" class="rcsumf">${rc.done?rcSummary():''}</div>
    <div class="rcctl">
      ${ui.rcAsk?`<div class="rcopt card rcask">
        <b>اخترنا لك المصحّح المناسب لجوالك</b>
        <p class="small" style="margin:0"><b>المصحّح الذكي:</b> عالي الجودة، ويحتاج جوال بإمكانيات أعلى ليشتغل بسلاسة.<br><b>المصحّح القياسي:</b> متوسط الجودة، ويدعم جميع الأجهزة، وهو الأنسب لجوالك.</p>
        <div class="tile-row" style="gap:8px">
          <button class="btn sm" data-act="rcAsrNo" style="flex:1">متابعة بالمصحّح القياسي</button>
          <button class="btn sm ghost" data-act="rcAsrYes" style="flex:1">جرّب المصحّح الذكي</button></div>
        <p class="small muted" style="margin:0">تقدر تغيّر لاحقاً من زر الخيارات.</p></div>`:''}
      ${ui.rcOpt?`<div class="rcopt card">
        <div class="tile-row"><b>${esc(label)}</b><a class="linkbtn" href="${back}">خروج</a></div>
        <button class="toggle" data-act="rcHide"><span>إخفاء الآيات (اختبر حفظك)</span><span class="circle ${rc.hide?'on':''}"></span></button>
        
        ${asrCan()&&asrWeak()?`<div class="small muted">طريقة التصحيح</div><div class="tabs2">${[['q','المصحّح الذكي'],['g','المصحّح القياسي']].map(([k,l])=>`<button class="${(asrPref()||'g')===k?'on':''}" data-act="rcAsrSet" data-k="${k}">${l}</button>`).join('')}</div>`:''}
        ${ASRQ()?`<p class="small muted" id="asrst" style="margin:0">${ASR.err||(ASR.ready?'المصحّح الذكي جاهز.':ASR.loading?'نجهّز المصحّح الذكي…':'')}</p>`:''}
        ${SR||ASRQ()?'':`<p class="small" style="margin:0;color:var(--warn)">التسميع بالصوت غير مدعوم في هذا المتصفح. شغّل «المصحّح الذكي».</p>`}
      </div>`:''}
      <div class="rcbox"><p class="small muted" id="rcst">${rc.msg||(rc.on?(rc.mode==='q'?'أسمعك… اقرأ، وكل كلمة تتصحح أول ما تقولها':'أسمعك… اقرأ بصوت واضح'):'اضغط المايكروفون وابدأ القراءة')}</p>
      <div class="rcbar">
        <button class="rcib ${ui.rcOpt?'on':''}" data-act="rcOpt" aria-label="الخيارات">${IC.gear}</button>
        <button class="btn ghost sm" data-act="rcHint" ${rc.done?'disabled':''}>تلميح</button>
        <button class="mic ${rc.on?'on':''}" data-act="rcMic" aria-label="${rc.on?'إيقاف':'ابدأ التسميع'}" ${SR||ASRQ()?'':'disabled'}>${IC.mic}</button>
        <button class="btn ghost sm" data-act="rcReset">من جديد</button>
        <a class="rcib" href="${back}" aria-label="رجوع">${IC.back}</a>
      </div></div></div></div>`;
  return topbar('التسميع',{back,sub:label})+`<div class="stack rc">
    ${SR||ASRQ()?'':`<div class="card warnc">التسميع بالصوت غير مدعوم في هذا المتصفح. على الآيفون افتح الموقع من سفاري، وعلى أندرويد من كروم. أو شغّل «المصحّح الذكي» تحت.</div>`}
    
    ${ASRQ()?`<p class="small muted" id="asrst" style="margin:-6px 0 0">${ASR.err||(ASR.ready?'المصحّح الذكي جاهز.':ASR.loading?'نجهّز المصحّح الذكي…':'يصحح بعد كل وقفة قصيرة، فاقرأ آية أو آيتين ثم توقف لحظة.')}</p>`:''}
    <button class="toggle" data-act="rcHide"><span>إخفاء الآيات (اختبر حفظك)</span><span class="circle ${rc.hide?'on':''}"></span></button>
    <div class="rcw ${rc.hide?'hid':''} ${MS&&rc.pg!==false?'pgv':''}" id="rcw">${rcWords()}</div>
    <div id="rcsum">${rc.done?rcSummary():''}</div>
    <div class="rcbar">
      <button class="btn ghost sm" data-act="rcHint" ${rc.done?'disabled':''}>تلميح</button>
      <button class="mic ${rc.on?'on':''}" data-act="rcMic" aria-label="${rc.on?'إيقاف':'ابدأ التسميع'}" ${SR||ASRQ()?'':'disabled'}>${IC.mic}</button>
      <button class="btn ghost sm" data-act="rcReset">من جديد</button>
    </div>
    <p class="small muted" id="rcst" style="text-align:center;margin:0">${rc.msg||(rc.on?(rc.mode==='q'?'أسمعك… اقرأ، وكل كلمة تتصحح أول ما تقولها':'أسمعك… اقرأ بصوت واضح'):'اضغط المايكروفون وابدأ القراءة')}</p></div>`;
}
function rcWords(){
  if(MS && ui.rc.pg!==false) return rcPages();
  const W=ui.rc.W; let h='';
  W.forEach((w,i)=>{ const cls=w.st==='p'&&w.hint?'h':w.st; h+=`<span class="w ${cls}" ${w.st==='e'&&w.heard?`title="سمعت: ${esc(w.heard)}"`:''}>${esc(w.t)}</span> `; if(w.last) h+=`<span class="an">${ayEnd(aNo[w.id])}</span> `; });
  return h;
}
/* the recited ayat sit hidden in their real place on the mushaf page; the rest of the page stays visible, so the eye keeps where each ayah and line-end is */
function rcMap(){ const rc=ui.rc; if(rc.map) return rc.map; const map=new Map(); let wi=0;
  for(const [a,b] of rc.rs) for(let id=a;id<=b;id++){ const s0=MS.as[id-1], e0=id<NA?MS.as[id]:MS.w.length, m=e0-s0;
    let q=0; while(wi+q<rc.W.length && rc.W[wi+q].id===id) q++;
    for(let j=0;j<m;j++) map.set(s0+j, wi+Math.min(q-1,Math.floor(j*q/m)));
    wi+=q; }
  return rc.map=map; }
const rcCurW=()=>{ const rc=ui.rc, W=rc.W; let i=W.findIndex(w=>w.st==='c'); if(i<0) i=W.findIndex(w=>w.st==='p'||w.st==='h'); if(i<0) i=W.length-1; return W[i]; };
const rcRange=()=>{ const rc=ui.rc, ids=rc.rs.flatMap(([a,b])=>[a,b]); return rc.from?[pOf[Math.min(...ids)],pOf[Math.max(...ids)]]:[1,604]; };
function rcAutoPage(){ const rc=ui.rc, w=rcCurW(), p=w?pOf[w.id]:1; if(rc.autoP!==p){ rc.autoP=p; rc.cp=p; return true; } if(!rc.cp) rc.cp=p; return false; }
function rcPages(){ const rc=ui.rc, M=MS, map=rcMap(), W=rc.W; rcAutoPage(); let out='';
  for(let p=rc.cp;p<=rc.cp;p++){ const a=M.ps[p-1], b=p<604?M.ps[p]:M.w.length; let h='';
    for(let li=bsearch(M.ls,a-1); li<M.ls.length && M.ls[li]<b; li++){
      const s0=M.ls[li], e=li+1<M.ls.length?Math.min(M.ls[li+1],b):b, sk=M.ss.indexOf(s0);
      if(sk>=0){ h+=`<div class="ml msh"><span>${SN(sk+1)}</span></div>`; if(sk!==0&&sk!==8) h+=`<div class="ml mbs"><span>${[0,1,2,3].map(msWord).join(' ')}</span></div>`; }
      let k=bsearch(M.as,s0), line='';
      for(let i=s0;i<e;i++){ while(k<M.as.length && M.as[k]<=i) k++;
        const wi=map.get(i), end=k<M.as.length?M.as[k]===i+1:i===M.w.length-1;
        if(wi==null){ line+=`<span class="x">${msWord(i)}</span>`; if(end) line+=`<span class="x an">${ayEnd(aNo[k])}</span>`; continue; }
        const w=W[wi], st=w.st==='p'&&w.hint?'h':w.st, nxt=map.get(i+1);
        line+=`<span class="w ${st}"${nxt===wi?' data-j="1"':''}>${msWord(i)}</span>`;
        if(end) line+=`<span class="an">${ayEnd(aNo[k])}</span>`; }
      h+=`<div class="ml">${line}</div>`; }
    out+=`<div class="rcpg ${p<=2?'mp-open':''}">${h}<div class="rcpn">${f(p)}</div></div>`; }
  return out; }
function rcFit(){ const el=document.getElementById('rcw'); if(!el||!el.querySelector('.rcpg')) return;
  const pgs=[...el.querySelectorAll('.rcpg')], H=window.innerHeight; el.style.fontSize='10px';
  const bar=document.querySelector('.rcbox'), bh=bar?bar.offsetHeight+14:0; pgs.forEach((g,i)=>g.style.height=(i===pgs.length-1?H-bh:H)+'px'); if(pgs.length>1) pgs.forEach(g=>g.style.height=(H-bh)+'px');
  const ok=()=>pgs.every(g=>g.scrollHeight<=g.clientHeight+1 && [...g.querySelectorAll('.ml')].every(l=>l.scrollWidth<=l.clientWidth+1));
  let lo=10, hi=Math.min(60,H/15/1.25);
  for(let i=0;i<12;i++){ const m=(lo+hi)/2; el.style.fontSize=m+'px'; if(ok()) lo=m; else hi=m; }
  el.style.fontSize=lo+'px';
  window.scrollTo(0,0); }
function rcPaint(){ const el=document.getElementById('rcw'); if(!el) return; const pg=MS&&ui.rc.pg!==false, before=ui.rc.cp; el.innerHTML=rcWords(); if(pg){ if(ui.rc.cp!==before) rcFit(); return; } const c=el.querySelector('.w.c')||[...el.querySelectorAll('.w.ok,.w.e,.w.m')].pop(); c?.scrollIntoView({block:'nearest',behavior:'smooth'}); }
/* swipe like a printed mushaf: to the right for the next page, to the left for the previous */
let rcsX=null, rcsY=0;
document.addEventListener('touchstart',e=>{ rcsX=null; if(!route().startsWith('recite-')||e.touches.length!==1||!e.target.closest('#rcw')) return; rcsX=e.touches[0].clientX; rcsY=e.touches[0].clientY; },{passive:true});
document.addEventListener('touchend',e=>{ if(rcsX===null||!ui.rc) return; const t=e.changedTouches[0], dx=t.clientX-rcsX, dy=t.clientY-rcsY; rcsX=null;
  if(Math.abs(dx)<70||Math.abs(dx)<Math.abs(dy)*1.5) return; const [a,b]=rcRange(), rc=ui.rc, n=Math.max(a,Math.min(b,(rc.cp||a)+(dx>0?1:-1)));
  if(n!==rc.cp){ rc.cp=n; const el=document.getElementById('rcw'); if(el){ el.innerHTML=rcWords(); rcFit(); } } },{passive:true});
function rcStatus(m){ ui.rc.msg=m; const el=document.getElementById('rcst'); if(el) el.textContent=m; }
/* ===== Quran recitation checker on device (opt-in, experimental) =====
   Model: mostafanewir70/quran-recitation-ctc-onnx (wav2vec2 CTC fine-tuned on Quran recitation, Apache-2.0), run with transformers.js in a worker.
   The model is not asked "what was said": each expected word of the ayah is force-aligned against the sound and scored, word by word, while the person recites. */
const ASR_MODEL='mostafanewir70/quran-recitation-ctc-onnx', TJS_URL='https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js';
/* the Quran recitation checker is the only checker; a phone that can't run it falls back to the browser's speech recognition by itself */
const noAI=()=>{ try{ return localStorage.getItem('rafiq-noai')==='1'; }catch(_){ return false; } }; // the person turned recitation (the checkers) off in the account page
const asrCan=()=>!noAI() && typeof fetch!=='undefined' && !!(window.AudioContext||window.webkitAudioContext) && !!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia);
const asrPref=()=>{ try{ return localStorage.getItem('rafiq-asr'); }catch(e){ return null; } }; // 'q' smart checker, 'g' Google, null = not asked yet
const asrWeak=()=>false; // every phone uses the recitation server now, so old and new phones get the same checker
/* strong and medium phones only ever use the smart checker; only a weak phone gets the standard one, and may choose */
const ASRQ=()=>asrCan() && (asrWeak() ? asrPref()==='q' && !ASR.err : true);
function rcStart(){ const rc=ui.rc; if(rc.done){ rc.W=null; rc.segs=[]; rc.done=false; rc.saved=0; } rc.pi=[]; rc.qs=[]; rc.finishing=false; rc.lock=false; rc.okRun=0;
  rc.mode=ASRQ()&&(ASR.ready||!SR||!asrWeak())?'q':'g'; if(rc.mode==='g'&&ASRQ()) asrLoad(); rc.on=true; rc.msg=''; rerender(); startRec(); }
function asrChoose(k){ try{ localStorage.setItem('rafiq-asr',k); }catch(e){}
  if(k==='q'){ if(/Chrome\/|Firefox\//.test(navigator.userAgent)) coiSet(true); asrLoad(); } }
const ASR={w:null,ready:false,loading:false,pct:0,err:'',files:{},cb:{},seq:0,q:[],busy:false};
/* recitation server (server/recite_server.py on Modal): same Quran CTC model at full precision, returns per-frame logits */
const RS_URL='https://d7d7x4x--rafiq-recite-web.us-east.modal.run', RS_OFF='انقطع الاتصال بالنت، فوقف التسميع. اضغط المايكروفون لما يرجع النت.';
const CT_LET='ءآأؤإئابةتثجحخدذرزسشصضطظعغفقكلمنهوىيٱ', CT_GRP={'ا':'ا','أ':'ا','إ':'ا','آ':'ا','ٱ':'ا','ء':'ء','ؤ':'ء','ئ':'ء','ى':'ي','ي':'ي','ة':'ه','ه':'ه'};
const ctG=c=>CT_GRP[c]||c, CT_KEYS=[...new Set([...CT_LET].map(ctG))], CT_K=CT_KEYS.length;
const ctLetters=w=>[...String(w).normalize('NFC')].filter(c=>CT_LET.includes(c)).map(c=>CT_KEYS.indexOf(ctG(c))+1);
const ASR_WK=`let PR,MD,T,MAP,K;
self.onmessage=async e=>{ const m=e.data;
  try{
    if(m.t==='load'){
      T=await import(m.url); T.env.allowLocalModels=false; T.env.backends.onnx.wasm.numThreads=self.crossOriginIsolated?Math.min(4,self.navigator.hardwareConcurrency||2):1;
      const pc=p=>self.postMessage({t:'prog',p:{status:p.status,file:p.file,loaded:p.loaded,total:p.total}});
      PR=await T.AutoProcessor.from_pretrained(m.model,{progress_callback:pc});
      MD=await T.AutoModelForCTC.from_pretrained(m.model,{dtype:'q4',device:'wasm',progress_callback:pc});
      const voc=await (await fetch('https://huggingface.co/'+m.model+'/resolve/main/vocab.json')).json();
      K=m.keys.length; MAP=[]; for(const [c,i] of Object.entries(voc)){ const g=m.grp[c]||c; MAP[i]=m.let.includes(c)?m.keys.indexOf(g)+1:0; }
      self.postMessage({t:'ready',info:{hc:self.navigator.hardwareConcurrency,coi:self.crossOriginIsolated,thr:T.env.backends.onnx.wasm.numThreads}});
    } else if(m.t==='run'){
      const t0=performance.now(); const o=await MD(await PR(m.a)); const L=o.logits, TT=L.dims[1], V=L.dims[2], D=L.data;
      const sk=Math.min(m.skip||0,TT), n=TT-sk, lp=new Float32Array(n*(K+1)), p=new Float64Array(K+1);
      for(let t=sk;t<TT;t++){ let mx=-1e30; for(let v=0;v<V;v++) if(D[t*V+v]>mx) mx=D[t*V+v]; p.fill(0); let z=0;
        for(let v=0;v<V;v++){ const x=Math.exp(D[t*V+v]-mx); z+=x; p[MAP[v]||0]+=x; }
        for(let k=0;k<=K;k++) lp[(t-sk)*(K+1)+k]=Math.log(Math.max(p[k]/z,1e-12)); }
      self.postMessage({t:'lp',id:m.id,lp,n,ms:Math.round(performance.now()-t0)},[lp.buffer]);
    }
  }catch(err){ self.postMessage({t:'err',id:m.id,msg:String((err&&err.message)||err)}); }
};`;
function asrLoad(){
  if(ASR.ready||ASR.loading) return; ASR.loading=true; ASR.err=''; asrWarm();
  if(!navigator.onLine){ ASR.loading=false; ASR.err=RS_OFF; asrMsg(); return; }
  const ac=new AbortController(), to=setTimeout(()=>ac.abort(),60000); // the server may need ~30 s to wake up
  fetch(RS_URL+'/vocab',{signal:ac.signal}).then(r=>{ if(!r.ok) throw 0; return r.json(); }).then(voc=>{ clearTimeout(to);
    const MAP=[]; for(const [c,i] of Object.entries(voc)){ const g=CT_GRP[c]||c; MAP[i]=CT_LET.includes(c)?CT_KEYS.indexOf(g)+1:0; }
    ASR.map=MAP; ASR.V=Object.keys(voc).length; ASR.ready=true; ASR.loading=false; ASR.pct=100; asrMsg(); asrPump(); if((route()||'').startsWith('asrtest')) asrTestRun(); })
  .catch(()=>{ clearTimeout(to); ASR.loading=false; ASR.err=navigator.onLine?'ما قدرنا نوصل للمصحّح الذكي. تأكد من النت وحاول مرة ثانية.':RS_OFF; asrMsg(); });
}
/* keep the server awake while a recitation page is open, so the first word is checked without waiting */
function asrWarm(){ if(ASR.warm) return; ASR.warm=setInterval(()=>{ if(!document.getElementById('rcst')||document.hidden){ clearInterval(ASR.warm); ASR.warm=0; return; } if(navigator.onLine) fetch(RS_URL+'/health').catch(()=>{}); },60000); }
/* server logits [n,V] -> log-probabilities per letter group, exactly as the on-device worker did */
function asrLp(L,V){ const K=CT_K, MAP=ASR.map, n=Math.floor(L.length/V), lp=new Float32Array(n*(K+1)), p=new Float64Array(K+1);
  for(let t=0;t<n;t++){ let mx=-1e30; for(let v=0;v<V;v++) if(L[t*V+v]>mx) mx=L[t*V+v]; p.fill(0); let z=0;
    for(let v=0;v<V;v++){ const x=Math.exp(L[t*V+v]-mx); z+=x; p[MAP[v]||0]+=x; }
    for(let k=0;k<=K;k++) lp[t*(K+1)+k]=Math.log(Math.max(p[k]/z,1e-12)); }
  return [lp,n]; }
function asrNetFail(){ const rc=ui.rc; ASR.q=[]; ASR.busy=false; ASR.cb={}; if(rc && rc.mode==='q' && (rc.on||rc.finishing)){ asrStop(); rc.on=false; rc.finishing=false; rc.ct=null; rc.msg=RS_OFF; rerender(); } }
function asrRun(a,skip,cb){ const id=++ASR.seq; ASR.cb[id]=cb; ASR.q.push({id,a,skip}); asrPump(); return id; }
function asrPump(){ if(!ASR.ready||ASR.busy||!ASR.q.length) return; const j=ASR.q.shift(); ASR.busy=true; const t0=performance.now();
  if(!navigator.onLine){ asrNetFail(); return; }
  const ac=new AbortController(), to=setTimeout(()=>ac.abort(),45000);
  const a=j.a, pcm=new Int16Array(a.length); for(let i=0;i<a.length;i++){ const v=a[i]; pcm[i]=v>=1?32767:v<=-1?-32768:Math.round(v*32767); } // half the upload of float32
  fetch(RS_URL+'/ctc?skip='+j.skip,{method:'POST',headers:{'Content-Type':'application/octet-stream','X-Format':'s16'},body:pcm.buffer,signal:ac.signal})
  .then(r=>{ if(!r.ok) throw 0; return r.arrayBuffer(); }).then(b=>{ clearTimeout(to); const [lp,n]=asrLp(new Float32Array(b),ASR.V); const f=ASR.cb[j.id]; delete ASR.cb[j.id]; ASR.busy=false; if(f) f(lp,n,Math.round(performance.now()-t0)); asrPump(); })
  .catch(()=>{ clearTimeout(to); asrNetFail(); }); }
function asrMsg(){ const rc=ui.rc; const el=document.getElementById('asrst');
  if(ASR.err && rc && rc.on && rc.mode==='q' && !asrWeak()){ stopRec(); rc.on=false; ASR.w=null; rc.msg=ASR.err; rerender(); return; }
  if(ASR.err && rc && rc.on && rc.mode==='q' && asrWeak() && !rc.fb){ rc.fb=1; stopRec(); rc.on=false; ASR.w=null; rc.msg='المصحّح الذكي ما تهيأ على هذا الجوال. اضغط المايكروفون ونكمل بالمصحّح القياسي.'; rerender(); return; }
  const t=ASR.err||(ASR.ready?'المصحّح الذكي جاهز.':ASR.loading?'نجهّز المصحّح الذكي…':'');
  if(el) el.textContent=t;
  if(rc&&rc.on&&rc.mode==='q'&&ASR.ready&&!rc.finishing) rcStatus('أسمعك… اقرأ، وكل كلمة تتصحح أول ما تقولها');
  else if(rc&&rc.on&&rc.mode==='q'&&!ASR.ready&&ASR.loading) rcStatus('أسمعك… والمصحّح يجهز، بيصحح اللي قرأته أول ما يخلص'); }
/* microphone → 16 kHz chunks; every ~0.8 s of new sound goes to the model (with 0.6 s of context before it) */
const AREC={}, CT_HOP=320, CT_CTX=16000*0.6;
function asrDown(d,sr){ if(sr===16000) return new Float32Array(d); const r=sr/16000, n=Math.floor(d.length/r), o=new Float32Array(n); for(let i=0;i<n;i++){ const a=Math.floor(i*r), b=Math.min(d.length,Math.floor((i+1)*r)); let s=0; for(let k=a;k<b;k++) s+=d[k]; o[i]=s/Math.max(1,b-a); } return o; }
function asrRec(){
  const rc=ui.rc; if(!rc) return; asrLoad(); rc.qs=[]; rc.ct={LP:[],f0:0,wi:rc.W.findIndex(w=>w.st==='p'||w.st==='c'||w.st==='h'),pend:0};
  if(rc.ct.wi<0) rc.ct.wi=rc.W.length;
  let ctx; try{ ctx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ rc.on=false; rcStatus('جهازك ما يدعم التسجيل.'); rerender(); return; }
  Object.assign(AREC,{ctx,pcm:new Float32Array(16000*60),pos:0,sent:0,sp:false});
  navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true}}).then(st=>{
    if(!rc.on||ui.rc!==rc){ st.getTracks().forEach(t=>t.stop()); try{ctx.close();}catch(e){} return; }
    AREC.st=st; const src=ctx.createMediaStreamSource(st), pr=ctx.createScriptProcessor(4096,1,1); AREC.pr=pr; AREC.src=src;
    pr.onaudioprocess=e=>asrChunk(asrDown(e.inputBuffer.getChannelData(0),ctx.sampleRate));
    src.connect(pr); pr.connect(ctx.destination); if(ctx.state==='suspended') ctx.resume();
    if(ASR.ready) rcStatus('أسمعك… اقرأ، وكل كلمة تتصحح أول ما تقولها'); else asrMsg();
  }).catch(()=>{ rc.on=false; rcStatus('اسمح للتطبيق باستخدام المايكروفون من إعدادات المتصفح، ثم حاول مرة ثانية.'); rerender(); });
}
function asrChunk(b){ const A=AREC, rc=ui.rc; if(!rc||!rc.on) return;
  if(A.pos+b.length>A.pcm.length){ const keep=Math.max(0,A.sent-CT_CTX)|0; A.pcm.copyWithin(0,keep,A.pos); A.pos-=keep; A.sent-=keep; }
  A.pcm.set(b,A.pos); A.pos+=b.length; asrSend(false); }
function asrSend(force){ const A=AREC, rc=ui.rc; if(!rc||!rc.ct) return; const nw=A.pos-A.sent; if(nw<=0) return;
  if(!force && (nw<16000*0.5 || !ASR.ready || ASR.busy || ASR.q.length)) return;
  const c0=Math.max(0,A.sent-CT_CTX)|0, ctxN=A.sent-c0, seg=A.pcm.slice(c0,A.pos), skip=Math.round(ctxN/CT_HOP); A.sent=A.pos; rc.ct.pend++;
  asrRun(seg,skip,(lp,n)=>{ const ct=ui.rc&&ui.rc.ct; if(!ct) return; ct.pend--; if(lp){ for(let t=0;t<n;t++) ct.LP.push(lp.subarray(t*(CT_K+1),(t+1)*(CT_K+1))); } asrAlign(false); }); }
/* force-align the next expected words against the frames heard since the last confirmed word */
function asrAlign(final){
  const rc=ui.rc, ct=rc&&rc.ct; if(!ct||!rc.W) return; const W=rc.W, F=ct.LP.length-ct.f0; if(F<=0){ asrDone(final); return; }
  const NW=Math.min(4,W.length-ct.wi); if(NW<=0){ asrDone(final); return; }
  const lab=[], wOf=[]; for(let j=0;j<NW;j++){ const w=W[ct.wi+j]; let ls=ctLetters(w.t); if(w.alt && ct.alt!==false) ls=ctLetters(w.alt).length?ls:ls; if(!ls.length) ls=[CT_KEYS.indexOf('ا')+1]; ls.forEach(l=>{ lab.push(l); wOf.push(j); }); }
  const S=2*lab.length+1, NEG=-1e9, SKIP=-6, K1=CT_K+1, em=(t,s)=>{ const r=ct.LP[ct.f0+t]; return s%2===0?r[0]:r[lab[(s-1)>>1]]; };
  let prev=new Float64Array(S).fill(NEG); prev[0]=em(0,0); prev[1]=em(0,1); const bp=[];
  for(let t=1;t<F;t++){ const cur=new Float64Array(S).fill(NEG), b=new Int16Array(S);
    for(let s=0;s<S;s++){ let best=prev[s], from=s;
      if(s>0 && prev[s-1]>best){ best=prev[s-1]; from=s-1; }
      if(s>1 && (s&1) && lab[(s-1)>>1]!==lab[(s-3)>>1] && prev[s-2]>best){ best=prev[s-2]; from=s-2; }
      if(s>3 && (s&1) && prev[s-4]+SKIP>best){ best=prev[s-4]+SKIP; from=s-4; }
      cur[s]=best+em(t,s); b[s]=from; }
    bp.push(b); prev=cur; }
  let s=0; for(let k=1;k<S;k++) if(prev[k]>prev[s]) s=k; const endS=s, path=new Int16Array(F); for(let t=F-1;t>=0;t--){ path[t]=s; if(t>0) s=bp[t-1][s]; }
  let trail=0; for(let t=F-1;t>=0 && path[t]===endS && !(endS&1);t--) trail++;
  const sc=Array.from({length:NW},()=>({sum:0,n:0,last:-1,lets:new Set()}));
  for(let t=0;t<F;t++){ const st=path[t]; if(!(st&1)) continue; const li=(st-1)>>1, j=wOf[li], k=lab[li], r=ct.LP[ct.f0+t]; let bo=r[0]; for(let q=1;q<K1;q++) if(q!==k && r[q]>bo) bo=r[q];
    sc[j].sum+=Math.min(0,r[k]-bo); sc[j].n++; sc[j].last=t; sc[j].lets.add(li); }
  const endLab=endS&1?(endS-1)>>1:(endS>>1)-1, endWord=endLab>=0?wOf[endLab]:-1, lastLabOf=j=>{ let x=-1; wOf.forEach((w,i)=>{ if(w===j) x=i; }); return x; };
  let commit=-1;
  for(let j=0;j<NW;j++){ const ll=lastLabOf(j); const passed = endWord>j || (final && endLab>=ll) || (endLab===ll && !(endS&1) && trail>=15); if(passed) commit=j; else break; }
  for(let j=0;j<=commit;j++){ const w=W[ct.wi+j], c=sc[j], need=lab.filter((_,i)=>wOf[i]===j).length, v=c.n?c.sum/c.n:-99, cov=c.lets.size/Math.max(1,need);
    w.st=(v>-2.5 && cov>=0.6)?'ok':'e'; w.sc=Math.round(v*10)/10; }
  for(let j=0;j<=commit;j++){ const w=W[ct.wi+j]; if(w.st==='ok'){ ct.eRun=0; if(++ui.rc.okRun>=3) ui.rc.lock=true; } else { ct.eRun=(ct.eRun||0)+1; ui.rc.okRun=0; } }
  if(commit>=0){ const lastT=sc[commit].last; ct.f0+=Math.max(0,lastT+1); ct.wi+=commit+1; if(!ct.eRun) ct.g0=ct.f0; }
  ct.g0=ct.g0||0;
  /* every ~2 s, or after 2 wrong words in a row, check where the heard letters really are */
  if(!ct.relo && !final && QT && (ct.eRun>=2 || (!ui.rc.lock && ct.LP.length-(ct.lastLoc||0)>=100))){ ct.lastLoc=ct.LP.length;
    const a=ct.eRun>=2?ct.g0:Math.max(ct.g0,ct.LP.length-220), seq=ctGreedy(ct.LP,a,ct.LP.length);
    const r=rcRelocate(seq,a); if(r===true){ rerender(); return; } if(r==='out'){ for(let x=ct.wi-ct.eRun;x<ct.wi;x++) if(x>=0&&W[x].st==='e') W[x].st='p'; ct.wi=Math.max(0,ct.wi-ct.eRun); ct.eRun=0; ct.f0=ct.g0=ct.LP.length; } }
  /* the whole 4-word window was heard: go on with the next words now, so fast reading never falls behind */
  if(commit===NW-1 && ct.wi<W.length && ct.LP.length>ct.f0){ asrAlign(final); return; }
  W.forEach((w,i)=>{ if(w.st==='c') w.st='p'; }); if(ct.wi<W.length && !final){ const j=ct.wi; const c=sc[commit+1]; if(c&&c.n) W[j].st='c'; }
  rcPaint(); asrDone(final);
}
function asrDone(final){ const rc=ui.rc, ct=rc&&rc.ct; if(!ct) return;
  if(ct.wi>=rc.W.length && rc.on){ stopRec(); rc.done=true; rc.msg=''; rerender(); document.getElementById('rcsum')?.scrollIntoView({block:'nearest',behavior:'smooth'}); return; }
  if(rc.finishing && !ct.pend && !ASR.q.length && !ASR.busy){ if(!final){ asrAlign(true); return; } rc.finishing=false; rc.W.forEach(w=>{ if(w.st==='c') w.st='p'; }); rc.done=true; rc.msg=''; rerender(); document.getElementById('rcsum')?.scrollIntoView({block:'nearest',behavior:'smooth'}); } }
function asrFinish(){ const rc=ui.rc; if(!rc) return; const had=rc.ct; asrSend(true); asrStop(); rc.on=false;
  if(!had){ rc.done=true; rc.msg=''; rerender(); return; }
  rc.finishing=true; if(ASR.ready) rcStatus('لحظة، نصحح آخر كلمات قرأتها…'); else rcStatus('لحظة، المصحّح يجهز ثم يصحح اللي قرأته…'); asrDone(false); }
function asrStop(){ const A=AREC; try{ A.pr&&A.pr.disconnect(); A.src&&A.src.disconnect(); }catch(e){} try{ A.st&&A.st.getTracks().forEach(t=>t.stop()); }catch(e){} try{ A.ctx&&A.ctx.close(); }catch(e){} A.pr=A.src=A.st=A.ctx=null; }
const asrSeal=()=>{};
/* #asrtest: checks Al-Husary's Al-Ikhlas word by word, then the same audio against a deliberately wrong text */
function vAsrTest(r){ asrLoad(); if(ASR.ready) setTimeout(asrTestRun,50);
  return topbar('تجربة المصحّح الذكي',{back:'#me'})+`<div class="stack"><p class="small muted" id="asrst">${ASR.ready?'جاهز':'نجهّز النموذج…'}</p><div class="card" id="asrout" style="line-height:2">—</div></div>`; }
async function asrTestRun(){ if(ASR.tested) return; ASR.tested=true; try{ await loadQuran(); }catch(e){} const out=document.getElementById('asrout'); if(!out) return;
  let h=`<div class="small muted" dir="ltr">cores ${ASR.info&&ASR.info.hc} · isolated ${ASR.info&&ASR.info.coi} · threads ${ASR.info&&ASR.info.thr}</div>`; out.innerHTML=h;
  const tests=[[6222,null],[6223,null],[6224,null],[6225,null],[6222,'قُلْ هُوَ اللَّهُ وَاحِدٌ'],[6225,'وَلَمْ يَكُن لَّهُ مِثْلًا أَحَدٌ']];
  for(const [id,alt] of tests){ try{
    const ab=await (await fetch(audUrl('Husary_128kbps',id))).arrayBuffer(); const buf=await new OfflineAudioContext(1,16000,16000).decodeAudioData(ab);
    const oc=new OfflineAudioContext(1,Math.ceil(buf.duration*16000),16000), s=oc.createBufferSource(); s.buffer=buf; s.connect(oc.destination); s.start(); const pcm=new Float32Array((await oc.startRendering()).getChannelData(0));
    const text=alt||QT[id-1]; const W=text.split(/\s+/).filter(Boolean).map(t=>({t,st:'p'}));
    const t0=performance.now(); const [lp,n]=await new Promise(res=>asrRun(pcm,0,(a,b)=>res([a,b])));
    const save=ui.rc; ui.rc={W,ct:{LP:[],f0:0,wi:0,pend:0},on:false}; for(let t=0;t<n;t++) ui.rc.ct.LP.push(lp.subarray(t*(CT_K+1),(t+1)*(CT_K+1))); const rp=window.rcPaint; window.rcPaint=()=>{}; asrAlign(true); window.rcPaint=rp; ui.rc=save;
    h+=`<div><b>${f(aNo[id])}${alt?' (نص خطأ متعمد)':''}</b> ${W.map(w=>`<span style="padding:0 4px;border-radius:5px;background:${w.st==='ok'?'#d5eedd':w.st==='e'?'#f6d0d0':'#eee'}">${esc(w.t)} <small dir="ltr">${w.sc??''}</small></span>`).join(' ')} <span class="small muted" dir="ltr">(${Math.round(performance.now()-t0)} ms · ${buf.duration.toFixed(1)}s)</span></div>`; out.innerHTML=h;
  }catch(e){ h+=`<div>خطأ: ${esc(String(e.message||e))}</div>`; out.innerHTML=h; } }
}
function coiSet(on){ return new Promise(res=>{ const c=navigator.serviceWorker&&navigator.serviceWorker.controller; if(!c) return res(false); const t=setTimeout(()=>res(false),2500); navigator.serviceWorker.addEventListener('message',function h(e){ if(e.data&&'coiSet' in e.data){ clearTimeout(t); navigator.serviceWorker.removeEventListener('message',h); res(true); } }); c.postMessage({coi:on?1:0}); }); }
/* cross-origin isolation was only needed for the on-device model's threads */
let REC=null;
function stopRec(){ asrStop(); if(ui.rc) ui.rc.on=false; if(REC){ try{ REC.onend=null; REC.abort(); }catch(e){} REC=null; } }
function rcUpdate(final){ const rc=ui.rc; const all=rc.segs.join(' ').split(/\s+/).filter(Boolean), txt=all.slice(rc.gSkip||0).join(' ');
  let i=alignRec(rc.W, txt, final, rc.gStart||0);
  const bad=rc.W.slice(rc.gStart||0,i).filter(w=>w.st==='e'||w.st==='m').length, ok=rc.W.slice(rc.gStart||0,i).filter(w=>w.st==='ok').length;
  if(ok>=3 && ok>bad) rc.lock=true;
  if(QT && bad>=2 && bad>ok && all.length-(rc.gSkip||0)>=3){ const seq=ctLetters(txt.replace(/\s+/g,'')); const prevKey=rc.key;
    const r=rcRelocate(seq,0); if(r===true){ const k=rc.W.findIndex(w=>w.st==='p'||w.st==='c'); rc.gStart=Math.max(0,k); rc.gSkip=all.length; if(rc.key!==prevKey) rerender(); }
    else if(r==='out'){ rc.gSkip=all.length; } i=alignRec(rc.W, all.slice(rc.gSkip||0).join(' '), final, rc.gStart||0); }
  rcPaint();
  if(i>=rc.W.length && final){ finishRec(); } }
function startRec(){
  const rc=ui.rc; if(rc && rc.mode==='q'){ asrRec(); return; } if(!SR||!rc) return;
  const r=new SR(); REC=r; r.lang='ar-SA'; r.continuous=true; r.interimResults=true; r.maxAlternatives=1;
  const idx=rc.segs.length; rc.segs.push('');
  r.onresult=ev=>{ let F='', I=''; for(let k=0;k<ev.results.length;k++){ const x=ev.results[k]; if(x.isFinal) F+=x[0].transcript+' '; else I+=x[0].transcript+' '; } const iw=I.trim().split(/\s+/).filter(Boolean), pw=(rc.pi&&rc.pi[idx])||[]; let n=0; while(n<iw.length && n<pw.length && qnorm(iw[n])===qnorm(pw[n])) n++; (rc.pi=rc.pi||[])[idx]=iw; rc.segs[idx]=F+iw.slice(0,n).join(' '); const fin=!iw.length; rcUpdate(fin); };
  r.onerror=ev=>{ if(ev.error==='not-allowed'||ev.error==='service-not-allowed'){ rc.on=false; rcStatus('اسمح للتطبيق باستخدام المايكروفون من إعدادات المتصفح، ثم حاول مرة ثانية.'); rerender(); }
    else if(ev.error==='network'){ rc.on=false; rcStatus('التسميع يحتاج اتصال إنترنت.'); rerender(); }
    else if(ev.error==='language-not-supported'){ rc.on=false; rcStatus('جهازك ما يدعم التعرّف على العربي. فعّل لغة الإملاء العربية من الإعدادات.'); rerender(); } };
  r.onend=()=>{ REC=null; if(rc.on && ui.rc===rc && route().startsWith('recite-')) { try{ startRec(); }catch(e){ rc.on=false; rerender(); } } };
  try{ r.start(); }catch(e){}
}
function finishRec(){ const rc=ui.rc; stopRec(); rc.done=true; rc.msg=''; rerender(); document.getElementById('rcsum')?.scrollIntoView({block:'nearest',behavior:'smooth'}); }
function rcSummary(){
  const W=ui.rc.W, n=W.length, ok=W.filter(w=>w.st==='ok').length, bad=W.filter(w=>w.st==='e'||w.st==='m'), read=W.filter(w=>w.st!=='p'&&w.st!=='h').length;
  const pct=n?Math.round(ok/n*100):0;
  if(!ui.rc.saved && read>=Math.min(n,5)){ ui.rc.saved=1; try{ const r=rcBest(); r.a=(r.a||0)+1; if(pct>=80) r.n=(r.n||0)+1; if(pct>=100) r.p=(r.p||0)+1; r.best=Math.max(r.best||0,pct); localStorage.setItem('rafiq-rc',JSON.stringify(r)); }catch(e){} }
  const head = pct>=95?'ما شاء الله، تسميع متقن!':pct>=80?'أحسنت، تسميع ممتاز':pct>=50?'بداية طيبة، واصل':'كل محاولة تقرّبك، أعدها مرة ثانية';
  const fr=ui.rc.from, can = fr && state.plans[fr.pid] && pct>=80;
  return `<div class="card rcs"><b>${head}</b><div class="rcpct">${f(pct)}٪</div>
    <div class="small muted">${f(ok)} كلمة صحيحة من ${f(n)}${read<n?` · بقي ${f(n-read)} لم تُقرأ`:''}</div>
    ${bad.length?`<div class="sec-l">كلمات تحتاج مراجعة</div><div class="rcbad">${bad.slice(0,30).map(w=>`<span>${esc(w.t)}</span>`).join('')}</div>`:''}
    <div class="row" style="gap:8px;justify-content:center;margin-top:12px">${read<n?`<button class="btn ghost" data-act="rcCont">كمّل من حيث وقفت</button>`:''}<button class="btn ghost" data-act="rcReset">${read<n?'من البداية':'سمّع مرة ثانية'}</button>${can?`<button class="btn" data-act="rcDone">سجّلها منجزة</button>`:''}</div></div>`;
}

/* ---------- listen & repeat (ayah audio, needs internet) ---------- */
const RECITERS=[['Husary_128kbps','محمود خليل الحصري'],['Husary_Muallim_128kbps','الحصري (المصحف المعلّم)'],['Minshawy_Murattal_128kbps','محمد صديق المنشاوي'],['Abdul_Basit_Murattal_192kbps','عبد الباسط عبد الصمد'],['Maher_AlMuaiqly_64kbps','ماهر المعيقلي'],['Abdurrahmaan_As-Sudais_192kbps','عبد الرحمن السديس'],['Saood_ash-Shuraym_128kbps','سعود الشريم'],['Yasser_Ad-Dussary_128kbps','ياسر الدوسري'],['Abu_Bakr_Ash-Shaatree_128kbps','أبو بكر الشاطري'],['Ghamadi_40kbps','سعد الغامدي'],['Hudhaify_128kbps','علي الحذيفي'],['Muhammad_Ayyoub_128kbps','محمد أيوب'],['Abdullaah_3awwaad_Al-Juhaynee_128kbps','عبد الله الجهني'],['Abdullah_Basfar_192kbps','عبد الله بصفر'],['Nasser_Alqatami_128kbps','ناصر القطامي'],['Ahmed_ibn_Ali_al-Ajamy_128kbps_ketaballah.net','أحمد العجمي'],['Fares_Abbad_64kbps','فارس عباد'],['Ali_Jaber_64kbps','علي جابر'],['Abdul_Basit_Mujawwad_128kbps','عبد الباسط (مجوّد)']];
const AUD_DEF={r:'Husary_128kbps',rep:3,loop:1,gap:0,sp:1,fl:1};
function audOpts(){ let o; try{ o={...AUD_DEF,...JSON.parse(localStorage.getItem('rafiq-audio')||'{}')}; }catch(e){ o={...AUD_DEF}; } if(!RECITERS.some(x=>x[0]===o.r)) o.r=AUD_DEF.r; return o; }
function audSave(o){ try{ localStorage.setItem('rafiq-audio',JSON.stringify(o)); }catch(e){} }
const pad3=n=>String(n).padStart(3,'0');
const audUrl=(r,id)=>`https://everyayah.com/data/${r}/${pad3(sOf[id])}${pad3(aNo[id])}.mp3`;
let AUD=null, audNext=null, audT=null;
/* listen offline: a surah's ayat saved in the browser cache, played from there */
const AUDC='rafiq-aud';
const DLS=()=>{ try{ return JSON.parse(localStorage.getItem('rafiq-dl')||'{}'); }catch(e){ return {}; } };
const isDl=(r,s)=>(DLS()[r]||[]).includes(s);
let DL=null;
async function audSrc(u){
  try{ const hit=await (await caches.open(AUDC)).match(u); if(hit && hit.type!=='opaque') return URL.createObjectURL(await hit.blob()); }catch(e){}
  return u;
}
/* download a range of surahs for one reciter; each surah is marked saved only when all its ayat are in */
async function audDownload(r,list){
  if(DL) return; let fail=0, done=0; DL={n:0,t:list.reduce((x,s)=>x+S[s][1],0),s:list[0],m:list.length,i:0}; dlShow();
  try{ const c=await caches.open(AUDC);
    for(const s of list){ DL.s=s; DL.i++; let bad=0;
      for(let id=S[s][0]; id<S[s][0]+S[s][1]; id++){ const u=audUrl(r,id);
        if(!(await c.match(u))){ let res=null;
          try{ res=await fetch(u); }catch(e){ try{ res=await fetch(u,{mode:'no-cors'}); }catch(e2){} }
          if(res && (res.ok||res.type==='opaque')) await c.put(u,res); else bad++; }
        DL.n++; dlShow(); if(bad>2) break; }
      if(bad){ fail++; break; }
      const d=DLS(); d[r]=[...new Set([...(d[r]||[]),s])].sort((x,y)=>x-y); try{ localStorage.setItem('rafiq-dl',JSON.stringify(d)); }catch(e){} done++; } }catch(e){ fail++; }
  DL=null; dlShow();
  toast(fail?'انقطع التحميل، تأكد من الإنترنت وحاول مرة ثانية':done>1?`حُمّلت ${plural(done,'سورة واحدة','سورتان','سور','سورة')}، تسمعها بدون نت 🎧`:`حُمّلت سورة ${NAMES[list[0]-1]}، تسمعها بدون نت 🎧`);
}
async function audDel(r,s){
  try{ const c=await caches.open(AUDC); for(let id=S[s][0]; id<S[s][0]+S[s][1]; id++) await c.delete(audUrl(r,id)); }catch(e){}
  const d=DLS(); d[r]=(d[r]||[]).filter(x=>x!==s); if(!d[r].length) delete d[r]; try{ localStorage.setItem('rafiq-dl',JSON.stringify(d)); }catch(e){}
}
function dlSurah(){ const id=PL.q[PL.k]||PG[lastPage()||1]; return sOf[id]||1; }
const rName=r=>(RECITERS.find(x=>x[0]===r)||[r,r])[1];
function dlSheet(tab='n'){
  ui.dlTab=tab; const o=audOpts(), s0=dlSurah(), opts=sel=>NAMES.map((n,i)=>`<option value="${i+1}" ${sel===i+1?'selected':''}>${f(i+1)}. ${n}</option>`).join('');
  const d=DLS(), have=Object.keys(d).filter(r=>d[r]&&d[r].length);
  openSheet(`${sheetHead('تحميل التلاوات')}<div class="stack">
    <div class="tabs2">${[['n','تحميل التلاوات'],['h','التلاوات المحمّلة']].map(([k,l])=>`<button class="${tab===k?'on':''}" data-act="dlTab" data-k="${k}">${l}</button>`).join('')}</div>
    ${tab==='n'?`<p class="small muted" style="margin:0">حمّل التلاوة مرة وحدة، وبعدها تسمعها بدون إنترنت.</p>
    <div class="row" style="gap:8px;flex-wrap:nowrap"><label class="field small" style="flex:1"><span class="lbl">من</span><select id="dlA">${opts(s0)}</select></label><label class="field small" style="flex:1"><span class="lbl">إلى</span><select id="dlB">${opts(s0)}</select></label></div>
    <label class="field small"><span class="lbl">القارئ</span><select id="dlR">${RECITERS.map(([v,l])=>`<option value="${v}" ${o.r===v?'selected':''}>${l}</option>`).join('')}</select></label>
    <div id="dlb"></div>`
    :have.length?have.map(r=>`<div class="card dlc"><div class="tile-row"><b>${rName(r)}</b><button class="linkbtn danger" data-act="dlDelAll" data-r="${r}">حذف الكل</button></div>
      <div class="dlls">${d[r].map(s=>`<span>${NAMES[s-1]}<button data-act="dlDel" data-r="${r}" data-s="${s}" aria-label="حذف">✕</button></span>`).join('')}</div></div>`).join('')
    :`<p class="muted" style="text-align:center">ما حمّلت تلاوات للحين.</p>`}</div>`);
  dlShow();
}
function dlShow(){ const el=document.getElementById('dlb'); if(!el) return;
  if(DL){ el.innerHTML=`<div class="dlbar"><i style="width:${Math.round(DL.n/DL.t*100)}%"></i></div><p class="small muted" style="margin:6px 0 0">جارٍ تحميل سورة ${NAMES[DL.s-1]}${DL.m>1?` (${f(DL.i)} من ${f(DL.m)})`:''}… ${f(Math.round(DL.n/DL.t*100))}٪</p>`; return; }
  const a=+document.getElementById('dlA').value, b=+document.getElementById('dlB').value, r=document.getElementById('dlR').value, lo=Math.min(a,b), hi=Math.max(a,b), n=hi-lo+1;
  const left=Array.from({length:n},(_,i)=>lo+i).filter(s=>!isDl(r,s)).length;
  el.innerHTML = !left ? `<p class="small" style="margin:0;color:var(--accent);text-align:center">✓ ${n>1?'كلها محفوظة':'محفوظة'} بصوت ${rName(r)}</p>`
    : `<button class="btn block" data-act="dlGo">⬇ تحميل ${n>1?plural(left,'سورة واحدة','سورتين','سور','سورة'):'سورة '+NAMES[lo-1]}</button>`; }
const PL={q:[],k:0,n:0,l:0,on:false,load:false};
const plIds=rs=>rs.flatMap(([a,b])=>Array.from({length:b-a+1},(_,i)=>a+i));
function plStart(ids){ plStop(); Object.assign(PL,{q:ids,k:0,n:0,l:0,on:true}); plPlay(); }
function plPlay(){
  const o=audOpts(), id=PL.q[PL.k]; if(!id) return plStop();
  if(!AUD){ AUD=new Audio(); if(self.crossOriginIsolated) AUD.crossOrigin='anonymous'; AUD.onended=plEnded;
    AUD.onerror=()=>{ if(!PL.on) return; PL.on=false; PL.load=false; toast(navigator.onLine?'تعذّر تشغيل الصوت، حاول مرة ثانية':'بدون نت تقدر تسمع السور اللي حمّلتها من إعدادات الاستماع'); plBar(); };
    AUD.onplaying=()=>{ PL.load=false; plBar(); }; AUD.onwaiting=()=>{ PL.load=true; plBar(); }; }
  const u=audUrl(o.r,id); PL.load=true;
  audSrc(u).then(src=>{ if(!PL.on || PL.q[PL.k]!==id) return;
    if(AUD._u!==u){ if(AUD._b) URL.revokeObjectURL(AUD._b); AUD._b=src.startsWith('blob:')?src:null; AUD._u=u; AUD.src=src; } else AUD.currentTime=0;
    AUD.playbackRate=o.sp; AUD.preservesPitch=true;
    AUD.play().catch(()=>{ PL.on=false; PL.load=false; plBar(); }); });
  const nx=PL.q[PL.k+1]; if(nx && navigator.onLine){ if(!audNext){ audNext=new Audio(); if(self.crossOriginIsolated) audNext.crossOrigin='anonymous'; } audNext.preload='auto'; audNext.src=audUrl(o.r,nx); }
  plFollow(id); plBar(); plMark(); plMedia(id);
}
function plEnded(){
  if(!PL.on) return; const o=audOpts(); lsInc('rafiq-ls');
  const wait = o.gap==='a' ? (AUD.duration||3)*1000/o.sp : (+o.gap||0)*1000;
  if(++PL.n>=o.rep){ PL.n=0; PL.k++;
    if(PL.k>=PL.q.length){ PL.l++; if(o.loop===0 || PL.l<o.loop) PL.k=0; else { plStop(); toast('تم الاستماع، بارك الله فيك'); return; } } }
  plBar(); clearTimeout(audT); audT=setTimeout(()=>{ if(PL.on) plPlay(); }, wait);
}
function plStop(){ PL.on=false; PL.q=[]; clearTimeout(audT); if(AUD){ AUD.pause(); } plBar(); plMark(); }
function plToggle(){
  if(PL.on){ PL.on=false; clearTimeout(audT); AUD?.pause(); }
  else { PL.on=true; if(AUD && AUD.currentTime>0 && !AUD.ended) AUD.play().catch(()=>{ PL.on=false; plBar(); }); else plPlay(); }
  plBar();
}
function plSkip(d){ if(!PL.q.length) return; PL.k=Math.max(0,Math.min(PL.q.length-1,PL.k+d)); PL.n=0; PL.on=true; clearTimeout(audT); plPlay(); }
/* turn the mushaf page along with the recitation */
function plFollow(id){ const r=route(); if(!r.startsWith('read-') || audOpts().fl===0) return; const p=+r.slice(5), prev=PL.q[PL.k-1];
  if(pOf[id]!==p && (prev===undefined || pOf[prev]===p)) location.hash='#read-'+pOf[id]; }
function plMark(){ document.querySelectorAll('.ay.cur').forEach(e=>e.classList.remove('cur')); const id=PL.q[PL.k]; if(!PL.q.length||!id) return;
  const els=document.querySelectorAll(`.ay[data-id="${id}"]`); els.forEach(e=>e.classList.add('cur')); if(els[0]&&PL.on&&!document.getElementById('mpage')?.classList.contains('mp15')) els[0].scrollIntoView({block:'center',behavior:'smooth'}); }
function plMedia(id){ if(!('mediaSession' in navigator)) return; try{
  const o=audOpts(); navigator.mediaSession.metadata=new MediaMetadata({title:`${NAMES[sOf[id]-1]} · آية ${aNo[id]}`, artist:(RECITERS.find(x=>x[0]===o.r)||RECITERS[0])[1], album:'ربيع القرآن', artwork:[{src:'icon-512.png',sizes:'512x512',type:'image/png'}]});
  if(!plMedia.set){ plMedia.set=1; const ms=navigator.mediaSession; ms.setActionHandler('play',()=>{ if(!PL.on) plToggle(); }); ms.setActionHandler('pause',()=>{ if(PL.on) plToggle(); }); ms.setActionHandler('nexttrack',()=>plSkip(1)); ms.setActionHandler('previoustrack',()=>plSkip(-1)); }
}catch(e){} }
function plBar(){
  let el=document.querySelector('.plbar'); document.body.classList.toggle('pl', PL.q.length>0);
  if(!PL.q.length){ el?.remove(); return; }
  if(!el){ el=document.createElement('div'); el.className='plbar'; el.dir='rtl'; el.setAttribute('role','region'); el.setAttribute('aria-label','مشغّل التلاوة'); document.body.appendChild(el); }
  const o=audOpts(), id=PL.q[PL.k];
  const sub=[o.rep>1?`التكرار ${f(Math.min(PL.n+1,o.rep))} من ${f(o.rep)}`:'', PL.q.length>1?`الآية ${f(PL.k+1)} من ${f(PL.q.length)}`:''].filter(Boolean).join(' · ');
  el.innerHTML=`<div class="tx"><b>${NAMES[sOf[id]-1]} · آية ${f(aNo[id])}</b><span>${sub||(RECITERS.find(x=>x[0]===o.r)||RECITERS[0])[1]}</span></div>
    <button class="pb" data-act="plSkip" data-d="-1" aria-label="الآية السابقة">${IC.prv}</button>
    <button class="pb main ${PL.load&&PL.on?'ld':''}" data-act="plToggle" aria-label="${PL.on?'إيقاف مؤقت':'تشغيل'}">${PL.on?IC.pause:IC.play}</button>
    <button class="pb" data-act="plSkip" data-d="1" aria-label="الآية التالية">${IC.nxt}</button>
    <button class="pb" data-act="audSet" aria-label="إعدادات الاستماع">${IC.gear}</button>
    <button class="pb" data-act="plStop" aria-label="إغلاق">${IC.x}</button>`;
}
function audSheet(){
  const o=audOpts(), chips=(k,vals)=>`<div class="stepbtns">${vals.map(([v,l])=>`<button class="${String(o[k])===String(v)?'on':''}" data-act="audOpt" data-k="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
  openSheet(`${sheetHead('إعدادات الاستماع')}<div class="stack">
    <label class="field small"><span class="lbl">القارئ</span><select id="audR">${RECITERS.map(([v,l])=>`<option value="${v}" ${o.r===v?'selected':''}>${l}</option>`).join('')}</select></label>
    <div class="sec-l">تكرار كل آية</div>${chips('rep',[[1,'مرة'],[3,'٣'],[5,'٥'],[10,'١٠'],[20,'٢٠']])}
    <div class="sec-l">تكرار المقطع كاملاً</div>${chips('loop',[[1,'مرة'],[2,'مرتين'],[3,'٣'],[0,'بلا توقف']])}
    <div class="sec-l">وقفة بعد كل آية</div>${chips('gap',[[0,'بدون'],[2,'ثانيتين'],[5,'٥ ثوانٍ'],['a','بقدر الآية']])}
    <p class="small muted" style="margin:0">«بقدر الآية» تعطيك وقتاً تردد فيه الآية بعد القارئ.</p>
    <div class="sec-l">السرعة</div>${chips('sp',[[0.75,'أبطأ'],[1,'عادية'],[1.25,'أسرع']])}
    <div class="sec-l">تقليب الصفحة مع التلاوة</div>${chips('fl',[[1,'تلقائي'],[0,'يدوي']])}
    <button class="btn ghost block" data-act="rngOpen">🔁 تكرار مقطع من آية إلى آية</button>
    <button class="btn ghost block" data-act="dlOpen">⬇ تحميل التلاوات للاستماع بدون نت</button></div>`);
}
function ayahSheet(id){
  const b=PG[pOf[id]+1]-1, M=MKS()[id], nt=NOTES()[id];
  document.querySelectorAll('.ay.hold').forEach(x=>x.classList.remove('hold')); document.querySelectorAll(`.mread .ay[data-id="${id}"], .wpg .ay[data-id="${id}"]`).forEach(x=>x.classList.add('hold'));
  const vw = MS ? Array.from({length:(id<NA?MS.as[id]:MS.w.length)-MS.as[id-1]},(_,j)=>`<span class="ayw" data-act="ayW" data-w="${MS.as[id-1]+j}">${esc(msTok(MS.as[id-1]+j))}</span>`).join(' ') : esc(QT?QT[id-1]:'');
  openSheet(`${sheetHead(`${NAMES[sOf[id]-1]} · آية ${f(aNo[id])}`)}<div class="stack">
    <div class="verse qv">${vw}</div>
    ${MS?`<p class="small muted" style="margin:-6px 0 0;text-align:center">اضغط على أي كلمة لمعناها ونطقها</p><div id="aywp"></div>`:''}
    <div class="aybar"><button class="aychip ${M&&M.l==='lr'?'on':''}" data-act="ayQuick" data-l="lr" data-id="${id}">🔖 آخر قراءة</button><button class="aychip ${M&&M.l==='td'?'on':''}" data-act="ayQuick" data-l="td" data-id="${id}">🌿 تدبر وتأمل</button><button class="aychip ${nt?'on':''}" data-act="ayNote" data-id="${id}">📝 ملاحظة</button><button class="aychip ${M&&M.l!=='lr'&&M.l!=='td'?'on':''}" data-act="ayCol" data-id="${id}">🎨 تلوين</button><button class="aychip" data-act="ayInfo" data-id="${id}" aria-label="معلومات الآية">ⓘ</button></div>
    ${ui.ayCol===id?`<div class="aybar aycols">${LBS().filter(x=>x.id!=='lr'&&x.id!=='td').map(x=>`<button class="mkl mk-${x.c}${M&&M.l===x.id?' on':''}" data-act="ayQuick" data-l="${x.id}" data-id="${id}"><i></i>${esc(x.n)}</button>`).join('')}<button class="mkl mkadd" data-act="ayLbNew" data-id="${id}">+ لون جديد</button></div>`:''}
    ${nt?`<div class="ntbox" data-act="ayNote" data-id="${id}"><b>الملاحظة</b><p>${esc(nt.t)}</p></div>`:''}
    <div class="row" style="gap:8px;flex-wrap:nowrap"><button class="btn ghost sm" style="flex:1" data-act="ayCopy" data-id="${id}">نسخ الآية</button><button class="btn ghost sm" style="flex:1" data-act="ayShare" data-id="${id}">مشاركة الآية</button></div>
    <div class="tfs"><b>معاني الكلمات</b><div id="ghr" data-id="${id}"><p class="muted">جارٍ التحميل…</p></div><small class="muted">السراج في بيان غريب القرآن · QuranEnc.com</small></div>
    <div class="tfs"><b>التفسير</b><div class="tfk">${TAFSIRS.map(([k,n])=>`<button class="${tfKey()===k?'on':''}" data-act="tfK" data-k="${k}" data-id="${id}">${n}</button>`).join('')}</div><div id="tfs" data-id="${id}"><p class="muted">جارٍ تحميل التفسير…</p></div></div>
    <button class="btn block rcgo" data-act="plAyah" data-a="${id}" data-b="${id}">${IC.play} استمع لها وكرّرها</button>
    <button class="btn ghost block rcgo" data-act="rngOpen" data-id="${id}">🔁 كرّر مقطعاً من هنا</button>
    ${id<b?`<button class="btn ghost block rcgo" data-act="plAyah" data-a="${id}" data-b="${b}">${IC.play} استمع من هنا لآخر الصفحة</button>`:''}
    <a class="btn ghost block rcgo" href="#recite-${id}-${b}">${IC.mic} سمّع من هنا لآخر الصفحة</a>
    <a class="btn ghost block rcgo" href="#quiz-${S[sOf[id]][0]}-${S[sOf[id]][0]+S[sOf[id]][1]-1}">🎯 اختبر حفظك في سورة ${NAMES[sOf[id]-1]}</a>
    <button class="linkbtn" data-act="audSet">إعدادات الاستماع (القارئ، التكرار، السرعة)</button></div>`);
  showTafsir(id);
}

/* ---------- quiz: complete the ayah, what comes next, which surah ---------- */
const shuf=a=>{ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.random()*(i+1)|0; [a[i],a[j]]=[a[j],a[i]]; } return a; };
const qzWords=id=>QT[id-1].split(/\s+/).filter(w=>qnorm(w));
const qzCut=(ws,a,n)=>ws.slice(a,a+n).join(' ')+(ws.length>a+n?' …':'');
const qzEnd=id=>{ const ws=qzWords(id), c=Math.min(Math.ceil(ws.length/2),8); return qzCut(ws,c,8); };
const qzStart=id=>qzCut(qzWords(id),0,6);
const qzShow=id=>{ const ws=qzWords(id); return ws.length>22?'… '+ws.slice(-16).join(' '):QT[id-1]; };
const qzRoute=rs=>{ const ids=[...new Set(plIds(rs))].sort((a,b)=>a-b), out=[]; for(const id of ids){ const l=out[out.length-1]; if(l&&l[1]===id-1) l[1]=id; else out.push([id,id]); } return 'quiz-'+out.map(x=>x.join('-')).join('_'); };
function qzPick(ok,pool,fn){ const seen=new Set([qnorm(ok)]), out=[];
  for(const x of shuf(pool)){ const t=fn(x), n=qnorm(t); if(!n||seen.has(n)) continue; seen.add(n); out.push(t); if(out.length===2) break; }
  return out.length===2?shuf([ok,...out]):null; }
function qzMake(ids){
  const lo=Math.max(1,ids[0]-40), hi=Math.min(NA,ids[ids.length-1]+40);
  const near=Array.from({length:hi-lo+1},(_,i)=>lo+i), pool=ids.length>=8?ids:near;
  const long=x=>qzWords(x).length>=4;
  const mk={
    c:id=>{ if(!long(id)) return null; const ws=qzWords(id), c=Math.min(Math.ceil(ws.length/2),8), ok=qzEnd(id);
      const ch=qzPick(ok,pool.filter(x=>x!==id&&long(x)),qzEnd); return ch&&{t:'أكمل الآية',p:ws.slice(0,c).join(' ')+' …',ch,ok,id}; },
    n:id=>{ if(id>=NA||sOf[id+1]!==sOf[id]) return null; const ok=qzStart(id+1);
      const ch=qzPick(ok,pool.filter(x=>x!==id+1&&x!==id),qzStart); return ch&&{t:'ما الآية التي بعدها؟',p:qzShow(id),ch,ok,id:id+1}; },
    s:id=>{ const s=sOf[id], ss=[...new Set(near.map(x=>sOf[x]))].filter(x=>x!==s), more=[s-2,s-1,s+1,s+2].filter(x=>x>=1&&x<=114&&x!==s);
      const ch=qzPick(NAMES[s-1],ss.length>=2?ss:[...new Set([...ss,...more])],x=>NAMES[x-1]); return ch&&{t:'من أي سورة هذه الآية؟',p:qzShow(id),ch,ok:NAMES[s-1],id}; }
  };
  const order=shuf(ids), qs=[], used=new Set(), T=['c','n','s'];
  for(let r=0;r<3&&qs.length<10;r++) order.forEach((id,i)=>{ if(qs.length>=10) return; const k=T[(i+r)%3]; if(used.has(id+k)) return; const q=mk[k](id); if(q){ used.add(id+k); qs.push(q); } });
  return shuf(qs);
}
const qzStat=()=>{ try{ return JSON.parse(localStorage.getItem('rafiq-qz')||'{}'); }catch(e){ return {}; } };
function vQuiz(r){
  const rs=r.slice(5).split('_').map(x=>x.split('-').map(Number)).filter(x=>x.length===2&&x[0]>=1&&x[1]<=NA&&x[0]<=x[1]);
  const label=rs.map(runLabel).join('، ');
  if(!rs.length) return topbar('اختبر حفظك',{back:'#today'})+'<p class="muted">ما لقينا الآيات.</p>';
  if(!QT){ loadQuran().then(()=>{ if(route()===r) rerender(); }).catch(()=>{ const el=document.getElementById('mload'); if(el) el.textContent='تحتاج اتصال إنترنت أول مرة لتحميل المصحف.'; });
    return topbar('اختبر حفظك',{back:'#today',sub:label})+'<div class="mload" id="mload">جارٍ تحميل الآيات…</div>'; }
  if(!ui.qz||ui.qz.key!==r){ ui.qz={key:r,qs:qzMake(plIds(rs)),i:0,score:0,pick:null}; }
  const z=ui.qz, n=z.qs.length;
  if(!n) return topbar('اختبر حفظك',{back:'#today',sub:label})+'<div class="card muted">الآيات قليلة جدًا للاختبار. جرّب مع ورد أطول.</div>';
  if(z.i>=n){
    const pct=Math.round(z.score/n*100);
    if(!z.saved){ z.saved=1; try{ const s=qzStat(); s.a=(s.a||0)+1; if(pct===100) s.p=(s.p||0)+1; s.best=Math.max(s.best||0,pct); localStorage.setItem('rafiq-qz',JSON.stringify(s)); }catch(e){} }
    const head=pct===100?'ما شاء الله، كلها صح!':pct>=80?'أحسنت، حفظك ثابت':pct>=50?'بداية طيبة، راجعها وتتقن':'لا تشيل هم، المراجعة تثبّته بإذن الله';
    return topbar('اختبر حفظك',{back:'#today',sub:label})+`<div class="stack"><div class="card rcs"><b>${head}</b><div class="rcpct">${f(z.score)} من ${f(n)}</div>
      <button class="btn block" data-act="qzAgain">اختبار جديد</button>
      <button class="btn ghost block rcgo" data-act="plAyah" data-a="${rs[0][0]}" data-b="${rs[rs.length-1][1]}">${IC.play} استمع للآيات</button></div></div>`;
  }
  const q=z.qs[z.i], picked=z.pick!==null;
  const opts=q.ch.map((c,k)=>{ const cls=!picked?'':c===q.ok?'ok':k===z.pick?'bad':'';
    return `<button class="qopt ${cls}" data-act="qzPick" data-k="${k}" ${picked?'disabled':''}>${esc(c)}</button>`; }).join('');
  return topbar('اختبر حفظك',{back:'#today',sub:label})+`<div class="stack">
    <div class="qzbar"><span class="small muted">سؤال ${f(z.i+1)} من ${f(n)}</span><div class="bar"><i style="width:${Math.round(z.i/n*100)}%"></i></div></div>
    <div class="card"><h3 class="qzt">${q.t}</h3><div class="verse qv">${esc(q.p)}</div></div>
    <div class="qopts">${opts}</div>
    ${picked?`<p class="small muted qzfb">${q.ch[z.pick]===q.ok?'صح، بارك الله فيك':`الجواب الصحيح باللون الأخضر (${NAMES[sOf[q.id]-1]}، آية ${f(aNo[q.id])})`}</p><button class="btn block" data-act="qzNext">${z.i+1<n?'السؤال التالي':'شوف النتيجة'}</button>`:''}
  </div>`;
}
/* one ayah a day, the same for everyone on that date */
function ayahOfDay(){
  if(!QT){ loadQuran().then(()=>{ if(route()==='today') rerender(); }).catch(()=>{}); return ''; }
  const d=Math.floor(Date.parse(todayIso())/864e5), id=(d*7919)%NA+1;
  return `<button class="card aod" data-act="ayTap" data-id="${id}"><span class="small muted">آية اليوم</span><span class="aodt">${esc(QT[id-1])} <span class="an">${ayEnd(aNo[id])}</span></span><small class="muted">${NAMES[sOf[id]-1]} · اضغط للتفسير والاستماع</small></button>`;
}
/* a small daily challenge that changes every day: read a page, ponder an ayah with its tafsir, or memorise a short ayah */
const CH_LS='rafiq-chal';
function chalToday(){ const d=Math.floor(Date.parse(todayIso())/864e5), k=d%3;
  if(k===0){ const pg=(d*37)%604+1; return {k, t:'اقرأ صفحة واحدة من المصحف', sub:`الصفحة ${f(pg)}`, go:'#read-'+pg}; }
  if(k===1){ const id=(d*4513)%NA+1; return {k, t:'تدبّر آية واقرأ تفسيرها', sub:`${NAMES[sOf[id]-1]} ${f(aNo[id])}`, id}; }
  let id=(d*2711)%NA+1; for(let i=0;i<NA && QT && QT[id-1] && QT[id-1].split(' ').length>8;i++) id=id%NA+1;
  return {k, t:'احفظ آية قصيرة اليوم', sub:`${NAMES[sOf[id]-1]} ${f(aNo[id])}`, id}; }
/* what friends in my حلقات did today, newest first; members publish their day when they open the app */
const FR={at:0, list:null};
const agoTxt = ms => { const m=Math.max(0,Math.round((Date.now()-ms)/60000)); return m<1?'الآن':m<60?`قبل ${plural(m,'دقيقة','دقيقتين','دقائق','دقيقة')}`:m<1440?`قبل ${plural(Math.round(m/60),'ساعة','ساعتين','ساعات','ساعة')}`:'اليوم'; };
async function frLoad(){ const t=todayIso(), seen={}, out=[];
  for(const code of Object.keys(state.groups||{})){ let ms={}; try{ ms=await groupMembers(code); }catch(e){ continue; }
    for(const [uid,m] of Object.entries(ms)){ if(uid===auth.s.uid || seen[uid] || !m || m.day!==t || !(m.done>0)) continue; seen[uid]=1; out.push({name:(m.name||'صديق').split(' ')[0], done:m.done, total:m.total||0, at:+m.at||0}); } }
  out.sort((a,b)=>b.at-a.at); FR.list=out.slice(0,5); FR.at=Date.now(); FR.day=t;
  if(route()==='today' && !ui.tday){ const el=document.getElementById('frAct'); if(el) el.outerHTML=frCard(true); } }
function frCard(fresh){
  if(!cloudOn() || !auth.s || !Object.keys(state.groups||{}).length) return '';
  if(!fresh && (!FR.list || FR.day!==todayIso() || Date.now()-FR.at>120000) && navigator.onLine) setTimeout(()=>frLoad().catch(()=>{}),0);
  const L=FR.list&&FR.day===todayIso()?FR.list:[];
  if(!L.length) return '<div id="frAct"></div>';
  return `<a class="card fract" id="frAct" href="#groups"><div class="tile-row"><h3 style="margin:0">أصحابك اليوم</h3><span class="muted">‹</span></div>
    ${L.map(m=>{ const all=m.total&&m.done>=m.total; return `<div class="fr-r"><i>${esc(m.name[0]||'؟')}</i><span><b>${esc(m.name)}</b> · ${all?'ورد اليوم مكتمل ✓':`${f(m.done)} من ${f(m.total)} مهام`}</span><small class="muted">${agoTxt(m.at)}</small></div>`; }).join('')}</a>`; }
function chalCard(){
  const c=chalToday(), st=lsJ(CH_LS,{}), done=st.last===todayIso();
  return `<button class="card chal ${done?'on':''}" data-act="chal"><span class="orn" aria-hidden="true">${done?'✅':'🎁'}</span><span><small class="muted">تحدي اليوم${st.n?` · أنجزت ${plural(st.n,'تحدياً واحداً','تحديين','تحديات','تحدياً')}`:''}</small><b>${c.t}</b><small class="muted">${c.sub} · ${done?'أنجزته اليوم، يتجدد غداً':'اضغط للبدء'}</small></span></button>`; }
const ayText=id=>`﴿${QT[id-1]}﴾\n[${NAMES[sOf[id]-1]}: ${f(aNo[id])}]`;
function quizCard(lis){
  const rs=[...(lis.h||[]),...(lis.n||[]),...(lis.f||[])], use=rs.length?rs:(lis.t||[]);
  if(!use.length) return '';
  return `<a class="card qzcard" href="#${qzRoute(use)}"><span class="orn" aria-hidden="true">🎯</span><span><b>اختبر حفظك</b><small class="muted">أسئلة سريعة على ورد اليوم: أكمل الآية، وش بعدها، ومن أي سورة</small></span></a>`;
}

/* ---------- short tafsir (al-Muyassar), cached per surah after first view ---------- */
/* a few well-known tafsirs; the reader picks one and it is remembered. Each surah is cached after its first load */
const TAFSIRS=[...(LANG==='en'?[['aq:en.sahih','Saheeh International']]:[]),['m','الميسر'],['ar-tafsir-al-mukhtasar','المختصر'],['ar-tafseer-al-saddi','السعدي'],['ar-tafsir-ibn-kathir','ابن كثير'],['ar-tafseer-al-qurtubi','القرطبي'],['ar-tafsir-al-tabari','الطبري'],['ar-tafsir-al-baghawi','البغوي'],['ar-tafsir-al-wasit','الوسيط']];
const TAFSIR_URL=(s,k)=>k==='m'||k.startsWith('aq:')?`https://api.alquran.cloud/v1/surah/${s}/${k==='m'?'ar.muyassar':k.slice(3)}`:`https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/${k}/${s}.json`;
const tfKey=()=>{ let k=null; try{ k=localStorage.getItem('rafiq-tfk'); }catch(e){} return TAFSIRS.some(x=>x[0]===k)?k:TAFSIRS[0][0]; };
const TF={};
async function tafsirOf(id,k=tfKey()){
  const s=sOf[id], key=k+'/'+s;
  if(!TF[key]){ const u=TAFSIR_URL(s,k); let r=null, c=null;
    try{ c=await caches.open('rafiq-tafsir'); r=await c.match(u); }catch(e){}
    if(!r){ r=await fetch(u); if(!r.ok) throw new Error('net'); try{ c&&await c.put(u,r.clone()); }catch(e){} }
    const d=await r.json();
    if(k==='m'||k.startsWith('aq:')) TF[key]=d.data.ayahs.map(a=>a.text);
    else { const L=Array.isArray(d)?d:(d.ayahs||[]), out=[]; for(const a of L) out[(a.ayah||0)-1]=(out[(a.ayah||0)-1]?out[(a.ayah||0)-1]+'\n':'')+String(a.text||''); TF[key]=out; } }
  return TF[key][aNo[id]-1]||'';
}
/* word meanings: «السراج في بيان غريب القرآن» as published by QuranEnc.com, shown unmodified */
const GHARIB_URL=s=>`https://quranenc.com/api/v1/translation/sura/arabic_seraj/${s}`;
const GH={};
async function gharibOf(id){
  const s=sOf[id];
  if(!GH[s]){ const u=GHARIB_URL(s); let r=null, c=null;
    try{ c=await caches.open('rafiq-tafsir'); r=await c.match(u); }catch(e){}
    if(!r){ r=await fetch(u); if(!r.ok) throw new Error('net'); try{ c&&await c.put(u,r.clone()); }catch(e){} }
    const d=await r.json(), m={}; (d.result||[]).forEach(x=>{ m[+x.aya]=x.translation||''; }); GH[s]=m; }
  return GH[s][aNo[id]]||'';
}
function showGharib(id){
  gharibOf(id).then(t=>{ const el=document.getElementById('ghr'); if(!el||+el.dataset.id!==id) return;
    if(!t.trim()){ el.parentNode.hidden=true; return; }
    el.innerHTML=t.split(/\n+/).filter(x=>x.trim()).map(x=>`<p dir="auto">${esc(x)}</p>`).join(''); })
    .catch(()=>{ const el=document.getElementById('ghr'); if(el&&+el.dataset.id===id) el.parentNode.hidden=true; });
}
function showTafsir(id){
  showGharib(id);
  const el=document.getElementById('tfs'); if(!el) return;
  const k=tfKey(); el.innerHTML='<p class="muted">جارٍ تحميل التفسير…</p>';
  tafsirOf(id,k).then(t=>{ const e2=document.getElementById('tfs'); if(e2&&+e2.dataset.id===id&&tfKey()===k) e2.innerHTML=t.trim()?t.replace(/<[^>]*>/g,'').split(/\n+/).filter(x=>x.trim()).map(x=>`<p dir="auto">${esc(x)}</p>`).join(''):'<p class="muted">ما فيه تفسير لهذي الآية في هذا الكتاب، جرّب تفسير ثاني.</p>'; })
    .catch(()=>{ const e2=document.getElementById('tfs'); if(e2&&+e2.dataset.id===id) e2.innerHTML='<p class="muted">التفسير يحتاج اتصال إنترنت أول مرة لكل سورة، وبعدها يشتغل بدون نت.</p>'; });
}

