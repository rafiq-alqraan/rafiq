/* ---------- small helpers ---------- */
const view=document.getElementById('view'), sheetRoot=document.getElementById('sheet-root');
const IC = {moon:'<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5a.6.6 0 0 0-.8-.7A9.5 9.5 0 1 0 21.2 15.4a.6.6 0 0 0-.7-.8z"/></svg>',sun:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  back:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="${LANG==='en'?'M15 6l-6 6 6 6':'M9 6l6 6-6 6'}"/></svg>`,
  gear:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>',
  x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  ok:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 12l5 5 9-10"/></svg>',
  dots:'<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
  mic:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  play:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>',
  pause:'<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4.5" width="4" height="15" rx="1"/><rect x="14" y="4.5" width="4" height="15" rx="1"/></svg>',
  nxt:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 6v12l-9-6zM6 6h2v12H6z"/></svg>',
  prv:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 6v12l9-6zM16 6h2v12h-2z"/></svg>',
  share:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12M7 8l5-5 5 5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>',
  cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
};
let toastT; function toast(m){ let el=document.querySelector('.toast'); if(!el){el=document.createElement('div');el.className='toast';el.setAttribute('role','status');document.body.appendChild(el);} el.textContent=m; el.hidden=false; clearTimeout(toastT); toastT=setTimeout(()=>el.hidden=true,2600); }
const topbar=(title,{back,right,sub,pop}={})=>`<header class="topbar">${back?`<a class="icon-btn" href="${back}" aria-label="رجوع">${IC.back}</a>`:'<span></span>'}<h1>${title}${sub?`<span class="sub">${sub}</span>`:''}</h1>${right||'<span></span>'}${pop||''}</header>`;
function faces(p){
  if(Math.abs(p-20)<1.5) return 'جزء'; if(Math.abs(p-10)<1) return 'نصف جزء';
  if(p<0.29) return 'ربع وجه'; if(p<0.42) return 'ثلث وجه'; if(p<0.625) return 'نصف وجه'; if(p<0.875) return 'ثلاثة أرباع وجه';
  const n=Math.round(p*2)/2; if(n===1) return 'وجه'; if(n===2) return 'وجهان';
  if(n%1) return `${f(n)} وجه`; return n<=10?`${f(n)} أوجه`:`${f(n)} وجهاً`;
}
const plural=(n,one,two,few,many)=> n===1?one:n===2?two:(n<=10?`${f(n)} ${few}`:`${f(n)} ${many}`);
const status = p => p.status||'active';
const STATUS = {active:'نشطة', paused:'معلّقة', complete:'مكتملة', archived:'مؤرشفة'};
const plansSorted = () => Object.values(state.plans).sort((a,b)=>b.created-a.created);
const sessDone = (plan,s) => s.tasks.every(tk=>plan.done[tk.key]);
const sessPart = (plan,s) => { let g=0,n=0; for(const tk of s.tasks){ g+=gotOf(plan,tk); n+=stepsOf(tk); } return n?g/n:0; };
const rangeEnds = plan => { const c=compute(plan); if(!c.seq.length) return ['','']; const a=c.seq[0], b=c.seq[c.seq.length-1]; return [`${NAMES[sOf[a]-1]} ${f(aNo[a])}`,`${NAMES[sOf[b]-1]} ${f(aNo[b])}`]; };
function nextOpenStudyDays(plan,from){ return datesOf(plan); }

/* ---------- stages of three juz (progress the user sees) ---------- */
function seqSlice(plan,k){ const c=compute(plan); if(!c.rch) c.rch=rchunk(plan,c.seq,tailFrom(plan)); const [a,b]=c.rch[k]; return c.seq.slice(a,b+1); }
/* stages are fixed groups of three juz in the plan's order: 30–28, 27–25, … (or 1–3, 4–6, …).
   For memorisation, what the person already memorised counts as done. */
const planDir = p => (isCycle(p)?p.review:p.hifz).range.dir==='rev' ? 'rev' : 'fwd';
const stageOfJuz = (dir,j) => dir==='rev' ? Math.floor((30-j)/3) : Math.floor((j-1)/3);
function stages(plan){
  const c=compute(plan), seq=c.seq, dir=planDir(plan), wt={}, got={};
  const add=id=>{ const j=jOf[id]; if(!(j in wt)){ wt[j]=0; got[j]=0; } wt[j]+=pw(id); };
  const base = !isCycle(plan) && plan.base && plan.base.type!=='none' ? buildSeq(plan.base) : [];
  for(const id of base){ add(id); got[jOf[id]]+=pw(id); }
  for(const id of seq) add(id);
  let cycle=1;
  if(isCycle(plan)){
    const m=c.perCycle; let n=0; for(let k=0;k<c.sessions.length;k++) if(plan.done[k+'r']) n++;
    cycle=Math.min(cyclesOf(plan), Math.floor(n/m)+1);
    const base=(cycle-1)*m;
    for(let k=0;k<m;k++){ const tk=c.sessions[base+k].tasks[0], fr=gotOf(plan,tk)/stepsOf(tk); if(fr>0) for(const id of seqSlice(plan,k)) got[jOf[id]]+=pw(id)*fr; }
  } else c.chunks.forEach(([i0,i1],k)=>{ const tk=c.sessions[k].tasks[0], fr=gotOf(plan,tk)/stepsOf(tk); if(fr>0) for(let i=i0;i<=i1;i++) got[jOf[seq[i]]]+=pw(seq[i])*fr; });
  const groups={};
  for(const j of Object.keys(wt).map(Number)) (groups[stageOfJuz(dir,j)] ||= []).push(j);
  const out=Object.keys(groups).map(Number).sort((a,b)=>a-b).map(g=>{ const js=groups[g].sort((a,b)=>dir==='rev'?b-a:a-b); let w=0,x=0; for(const j of js){ w+=wt[j]; x+=got[j]; }
    return {no:g+1, js, pct: w? Math.min(100,Math.floor(x/w*100+1e-6)) : 0}; });
  const cur=out.findIndex(x=>x.pct<100), jStage={}; out.forEach((x,i)=>x.js.forEach(j=>jStage[j]=i));
  return {list:out, cur: cur<0? out.length-1 : cur, cycle, jStage};
}
/* date of the last session that belongs to stage i (null if none left) */
function stageEnd(plan,sg,i){ const c=compute(plan), ds=datesOf(plan), n=isCycle(plan)?c.perCycle:c.sessions.length, off=isCycle(plan)?(sg.cycle-1)*c.perCycle:0;
  let last=-1; for(let k=off;k<off+n;k++) if(sessionStage(plan,k,sg)===i) last=k; return last<0?null:ds[last]; }
/* a session belongs to the stage of its juz, but stages never go backwards in plan order: when a surah crosses a juz line
   (e.g. Fussilat 1-46 is juz 24, 47-54 juz 25) its sessions stay in the stage that is still running, so none go missing */
function sessionStage(plan,k,sg){ const c=compute(plan), cy=isCycle(plan), m=cy?c.perCycle:c.sessions.length, key=JSON.stringify(sg.jStage);
  if(c.ssK!==key){ const r=[]; for(let i=0;i<m;i++){ const id=cy?seqSlice(plan,i)[0]:c.seq[c.chunks[i][0]]; r.push(sg.jStage[jOf[id]] ?? Infinity); }
    for(let i=m-2;i>=0;i--) r[i]=Math.min(r[i],r[i+1]); c.ss=r.map(x=>x===Infinity?undefined:x); c.ssK=key; }
  return c.ss[cy?k%m:k]; }
const juzNames = js => js.length===1 ? `الجزء ${f(js[0])}` : `الأجزاء ${js.map(f).join(' و')}`;
const ui = {menu:null, stage:{}, stageMenu:{}, mode:{}, calMonth:{}, filter:'active', type:'all', sort:'new', tpl:null, wiz:null, sess:null, wp:{}};

/* ---------- session card ---------- */
function sessCard(plan,k,{showPlan}={}){
  const c=compute(plan), s=c.sessions[k], d=datesOf(plan)[k], t=todayIso(), done=sessDone(plan,s);
  return `<div class="sess ${d===t?'today':''} ${done?'done':''}" id="s-${plan.id}-${k}">
    <div class="sh"><span class="num">الجلسة ${f(k+1)}</span><small>${fmtShort(d)}${d===t?' · اليوم':''}</small>${showPlan?`<span class="plan-tag">${esc(plan.name)}</span>`:''}</div>
    ${s.tasks.map((tk,i)=>{ const n=stepsOf(tk), g=gotOf(plan,tk), on=g>=n;
      return `<div class="sl ${on?'on':''}"><button class="circle sm ${on?'on':g?'part':''}" style="--p:${Math.round(g/n*100)}%" data-act="toggleTask" data-plan="${plan.id}" data-k="${k}" data-i="${i}" aria-pressed="${on}" aria-label="${KIND[tk.kind]}: ${esc(tk.label)}"></button>
        <button class="ln ${tk.kind} ${on?'done':''}" data-act="openSess" data-plan="${plan.id}" data-k="${k}" data-i="${i}"><b>${KIND[tk.kind]}:</b> ${tk.label}${!on&&g?` <small>(${f(g)}/${f(n)})</small>`:''}</button>
        <span class="amt">${faces(tk.pages)}</span></div>`; }).join('')}
  </div>`;
}

/* ---------- today: one card per plan with today's wird ---------- */
const stkW=n=>n===1?'يوم متواصل':n>10?'يوماً متواصلاً':'أيام متواصلة';
function streakInfo(){
  const days=new Set();
  for(const p of Object.values(state.plans)) for(const v of Object.values(p.done)) if(v) days.add(iso(new Date(+v)));
  const act=Object.values(state.plans).filter(p=>status(p)==='active'), study=new Set(); for(const p of act) for(const w of (p.days&&p.days.length?p.days:[0,1,2,3,4,5,6])) study.add(w);
  const rest=x=>study.size>0 && !study.has(x.getDay());
  let n=0; const d=new Date(); if(!days.has(iso(d))) d.setDate(d.getDate()-1);
  /* one grace day a week (Sunday to Saturday): a single missed day does not break the streak when the day before it was kept */
  const wkOf=x=>{ const y=new Date(x); y.setDate(y.getDate()-y.getDay()); return iso(y); }, graced=new Set(), thisWk=wkOf(new Date());
  for(let g=0; g<800; g++){ if(days.has(iso(d))) n++;
    else if(!rest(d)){ const pv=new Date(d); pv.setDate(pv.getDate()-1); const wkk=wkOf(d);
      if(!graced.has(wkk) && days.has(iso(pv))) graced.add(wkk); else break; }
    d.setDate(d.getDate()-1); }
  const wk=[]; const s=new Date(); s.setDate(s.getDate()-s.getDay()); // week starts Sunday
  for(let i=0;i<7;i++){ const x=new Date(s); x.setDate(s.getDate()+i); wk.push({iso:iso(x), on:days.has(iso(x))}); }
  return {n, wk, g:graced.has(thisWk)};
}

function taskRow(plan,k,i){
  const tk=compute(plan).sessions[k].tasks[i], n=stepsOf(tk), g=gotOf(plan,tk), on=g>=n;
  return `<div class="trow ${on?'on':''}">
    <button class="circle ${on?'on':g?'part':''}" style="--p:${Math.round(g/n*100)}%" data-act="toggleTask" data-plan="${plan.id}" data-k="${k}" data-i="${i}" aria-pressed="${on}" aria-label="${KIND[tk.kind]}: ${esc(tk.label)}"></button>
    <button class="tmain" data-act="openSess" data-plan="${plan.id}" data-k="${k}" data-i="${i}">
      <span class="kind ${tk.kind}">${KIND[tk.kind]}</span>
      <span class="what">${tk.label}</span>
      <span class="amt">${faces(tk.pages)}</span>
      ${n>1?`<span class="prog"><span class="segs">${n<=24?Array.from({length:n},(_,j)=>`<i class="${j<g?'on':''}"></i>`).join(''):`<i class="on" style="flex:${g}"></i><i style="flex:${n-g}"></i>`}</span><small>${f(g)} من ${f(n)}</small></span>`:''}
    </button></div>`;
}
/* one task card; a day's tasks sit one under another, each with its everyday buttons right here */
function taskTile(plan,k,i,noKind){
  const tk=compute(plan).sessions[k].tasks[i], n=stepsOf(tk), g=gotOf(plan,tk), on=g>=n, ctx=`data-tk="${plan.id}|${k}|${i}"`;
  /* one fixed size for every task card, with or without step boxes, so 5+ fit on one screen */
  const boxes=n>1&&n<=8?`<div class="tt-steps" aria-label="${tk.kind==='h'?'كم حفظت؟':'كم أنجزت؟'}">${Array.from({length:n},(_,j)=>`<button class="${j<g?'on':''}" data-act="setStep" ${ctx} data-n="${j+1}" aria-label="${tk.kind==='h'?faces((j+1)/2):f(j+1)}">${f(j+1)}</button>`).join('')}</div>`
    :n>8?`<div class="tt-steps tt-bar"><span class="segs"><i class="on" style="flex:${g}"></i><i style="flex:${n-g}"></i></span><small>${f(g)}/${f(n)}</small></div>`:'<div class="tt-steps"></div>';
  return `<div class="tt ${tk.kind} ${on?'on':''}">
    <button class="tt-main" data-act="openSess" data-plan="${plan.id}" data-k="${k}" data-i="${i}">
      <span class="tt-top">${noKind?'':`<span class="kind ${tk.kind}">${KIND[tk.kind]}</span>`}<span class="amt">${faces(tk.pages)} · ${tk.pr}</span></span>
      <span class="what">${tk.label}</span>
    </button>
    ${boxes}
    <div class="tt-acts">
      <button data-act="wOpen" ${ctx} aria-label="اقرأ">📖</button>
      <button data-act="listenTask" ${ctx} aria-label="استمع">${IC.play}</button>
      <button data-act="recFromTask" ${ctx} aria-label="سمّع">${IC.mic}</button>
      <button class="tt-check" data-act="toggleTask" data-plan="${plan.id}" data-k="${k}" data-i="${i}" aria-pressed="${on}" aria-label="${on?'تم':'أنجزت'}"><span class="circle ${on?'on':g?'part':''}" style="--p:${Math.round(g/n*100)}%"></span></button>
    </div>
  </div>`;
}
/* rest days: nothing due → a real rest. Overdue sessions are made up one session a day, only on Thu/Fri/Sat rest days */
const CATCH_DAYS=new Set([4,5,6]);
/* the sessions that belong to today: same rules as the «المهام» page */
function todayKeys(p,c,ds,t){ let ks=[]; ds.forEach((d,k)=>{ if(d===t) ks.push(k); });
  if(rolls(p)){ c.sessions.forEach((s,k)=>{ const v=p.done[k+'h']; if(v && iso(new Date(+v))===t && !ks.includes(k)) ks.push(k); }); ks.sort((x,y)=>x-y); }
  ks=ks.filter(k=>!doneBefore(p,c.sessions[k],t));
  if(!ks.length && status(p)==='active'){ const wd=parse(t).getDay(), studyDay=new Set(p.days.length?p.days:[0,1,2,3,4,5,6]).has(wd); if(!studyDay && CATCH_DAYS.has(wd) && !isWerd(p)) ks=catchUp(p,c,ds,t); }
  return ks; }
function catchUp(p,c,ds,t){
  const today=[]; c.sessions.forEach((s,k)=>{ if(s.tasks.some(tk=>{ const v=p.done[tk.key]; return v && iso(new Date(+v))===t; })) today.push(k); });
  if(today.length) return today;                       // already made up a day today: that's enough
  const due=rolls(p)?c.base:ds;                         // rolling plans shift their dates, so compare with the original schedule
  const k=c.sessions.findIndex((s,k)=>due[k]<t && !sessDone(p,s));
  return k<0?[]:[k];
}
/* ---- day strip: one circle per day, filled by how much of that day's tasks are done; swipe or tap to see another day ---- */
function dayKeys(p,c,ds,day){ const ks=[];
  c.sessions.forEach((s,k)=>{ if(ds[k]===day || s.tasks.some(tk=>{ const v=p.done[tk.key]; return v && iso(new Date(+v))===day; })) ks.push(k); });
  return ks.filter(k=>!doneBefore(p,c.sessions[k],day)); }
/* one pass over every plan gives each day of the strip its tasks and how many are done */
function dayStats(from,to){ const T=todayIso(), m={};
  for(const p of plansSorted().filter(p=>status(p)==='active')){ const c=compute(p), ds=datesOf(p), tk0=todayKeys(p,c,ds,T);
    c.sessions.forEach((s,k)=>{ const D=new Set(); if(ds[k]>=from&&ds[k]<=to) D.add(ds[k]);
      for(const tk of s.tasks){ const v=p.done[tk.key]; if(v){ const d=iso(new Date(+v)); if(d>=from&&d<=to) D.add(d); } }
      D.delete(T); if(tk0.includes(k)) D.add(T);
      for(const day of D){ if(day!==T && doneBefore(p,s,day)) continue; const o=m[day]||(m[day]={n:0,d:0}); for(const tk of s.tasks){ o.n++; if(p.done[tk.key]) o.d++; } } }); }
  return m; }
let hdf=null; try{ hdf=new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura',{day:'numeric'}); }catch(e){}
const HDC=new Map(), hDay=x=>{ const k=x.getTime(); if(!HDC.has(k)) HDC.set(k,hdf?hdf.format(x).replace(/[^\u0660-\u0669\d]/g,''):''); return HDC.get(k); };
const WDS=['أحد','اثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'];
function dayStrip(sel){ const T=todayIso(), base=parse(T); let h='';
  const a=new Date(base), z=new Date(base); a.setDate(a.getDate()-21); z.setDate(z.getDate()+10); const M=dayStats(iso(a),iso(z));
  for(let i=-21;i<=10;i++){ const x=new Date(base); x.setDate(base.getDate()+i); const day=iso(x), st=M[day]||{n:0,d:0}, pc=st.n?Math.round(st.d/st.n*100):0;
    h+=`<button class="dc ${day===sel?'sel':''} ${day===T?'td':''} ${st.n?'':'rest'} ${day>T?'fut':''}" data-act="tdDay" data-d="${day}" aria-label="${WD[x.getDay()]} ${f(x.getDate())}"><small>${day===T?'اليوم':WDS[x.getDay()]}</small><i style="--p:${pc}%"><b>${f(x.getDate())}</b></i><em>${hDay(x)}</em></button>`; }
  return `<div class="dsw"><div class="dstrip" id="dstrip">${h}</div><label class="dcal" aria-label="اختر تاريخ">${IC.cal||'📅'}<input type="date" id="tdpick" value="${sel}"></label></div>`; }
let tdLast=null;
function tdScroll(){ const st=document.getElementById('dstrip'), el=st&&st.querySelector('.dc.sel'); if(!el) return;
  const key=ui.tday||'t'; if(tdLast&&tdLast.k===key){ const x=tdLast.x; requestAnimationFrame(()=>{ st.scrollLeft=x; }); return; } // keep the strip where it was on a plain refresh
  requestAnimationFrame(()=>{ el.scrollIntoView({inline:'center',block:'nearest'}); tdLast={k:key,x:st.scrollLeft}; }); }
document.addEventListener('scroll',e=>{ if(e.target&&e.target.id==='dstrip'&&tdLast) tdLast.x=e.target.scrollLeft; },true);
document.addEventListener('change',e=>{ if(e.target.id!=='tdpick'||!e.target.value) return; ui.tday=e.target.value; rerender(); });
let tdX=null, tdY=0;
document.addEventListener('touchstart',e=>{ tdX=null; if(route()!=='today'||e.touches.length!==1||e.target.closest('.dstrip,.sheet,.nav,input')) return; tdX=e.touches[0].clientX; tdY=e.touches[0].clientY; },{passive:true});
document.addEventListener('touchend',e=>{ if(tdX===null) return; const t=e.changedTouches[0], dx=t.clientX-tdX, dy=t.clientY-tdY; tdX=null;
  if(Math.abs(dx)>70 && Math.abs(dx)>Math.abs(dy)*1.6){ const d=parse(ui.tday||todayIso()); d.setDate(d.getDate()+(dx>0?1:-1)); ui.tday=iso(d); rerender(); } },{passive:true});
/* the kind of a task (حفظ جديد، مراجعة…) is written once above its cards, not on every card:
   a plan with one kind shows it beside the plan's name; a plan with several kinds gets a small heading per kind */
const KORD={h:0,n:1,f:2,r:3,t:4};
const kindsOf=(c,ks)=>[...new Set(ks.flatMap(k=>c.sessions[k].tasks.map(tk=>tk.kind)))];
function kindTiles(p,c,ks,multi){ const its=ks.flatMap(k=>c.sessions[k].tasks.map((tk,i)=>({k,i,kd:tk.kind}))).sort((a,b)=>KORD[a.kd]-KORD[b.kd]); let h='', last=null;
  for(const x of its){ if(multi && x.kd!==last){ h+=`<div class="tkh ${x.kd}">${KIND[x.kd]}</div>`; last=x.kd; } h+=taskTile(p,x.k,x.i,true); } return h; }
function tdHead(p,many,kinds){ const one=kinds.length===1?KIND[kinds[0]]:'', nm=p.name.trim();
  const chip=one&&one!==nm?`<span class="tkh ${kinds[0]}">${one}</span>`:'';
  if(many) return `<a class="tday-h" href="#plan-${p.id}">${esc(nm)}${chip?' · '+chip:''}</a>`;
  return one?`<div class="tday-h"><span class="tkh ${kinds[0]}">${one}</span></div>`:''; }
function vDay(t){ // another day than today: what was due or done that day
  const ps=plansSorted().filter(p=>status(p)==='active'), many=ps.length>1, T=todayIso(); let out='', total=0, done=0;
  for(const p of ps){ const c=compute(p), ds=datesOf(p), ks=dayKeys(p,c,ds,t); if(!ks.length) continue;
    ks.forEach(k=>c.sessions[k].tasks.forEach(tk=>{ total++; if(p.done[tk.key]) done++; }));
    const kinds=kindsOf(c,ks), tiles=kindTiles(p,c,ks,kinds.length>1);
    out+=`<section class="tday">${tdHead(p,many,kinds)}<div class="tgrid">${tiles}</div></section>`; }
  const x=parse(t);
  return `<header class="hello"><div class="hello-row"><h1>${t<T?'مهام':'مهام'} ${WD[x.getDay()]}</h1><button class="btn ghost sm" data-act="tdDay" data-d="${T}">اليوم</button></div><span>${fmtG(t)}${total?` · <span>أنجزت</span> <b>${f(done)} من ${f(total)}</b>`:''}</span><small class="hij">${fmtH(t)}</small></header>${dayStrip(t)}
    <div class="stack">${out||`<div class="card restday"><div class="orn" aria-hidden="true">🌿</div><h3>${t<T?'ما كان عليك ورد هذا اليوم':'لا ورد في هذا اليوم'}</h3></div>`}</div>`;
}
function vToday(){
  if(ui.tday && ui.tday!==todayIso() && plansSorted().length) return vDay(ui.tday);
  ui.tday=null;
  const t=todayIso(), all=plansSorted(), ps=all.filter(p=>status(p)==='active'), wd=new Date().getDay();
  if(!all.length) return hello()+emptyState();
  let out='', many=ps.length>1, total=0, done=0, nextDay=null; const lis={}, soon=[];
  const B={}, BN={};
  for(const p of ps){ const o0=out.length, t0=total, d0=done; try{ const c=compute(p), ds=datesOf(p);
    let ks=[]; ds.forEach((d,k)=>{ if(d===t) ks.push(k); });
    if(rolls(p)){ c.sessions.forEach((s,k)=>{ const v=p.done[k+'h']; if(v && iso(new Date(+v))===t && !ks.includes(k)) ks.push(k); }); ks.sort((x,y)=>x-y); }
    const ahead=ks.length; ks=ks.filter(k=>!doneBefore(p,c.sessions[k],t));
    if(ahead && !ks.length){ out+=`<div class="card well">${many?`<b>${esc(p.name)}</b>: `:''}ورد اليوم أنجزته مقدّماً، بارك الله فيك.</div>`; continue; }
    let note='';
    if(!ks.length){
      if(ds.findIndex(d=>d>=t)<0 && ds.every((d,k)=>sessDone(p,c.sessions[k]))){ out+=`<div class="card well">${many?`<b>${esc(p.name)}</b>: `:''}أتممت هذه الخطة. تقبّل الله منك.</div>`; continue; }
      const studyDay=new Set(p.days.length?p.days:[0,1,2,3,4,5,6]).has(wd);
      if(!studyDay && CATCH_DAYS.has(wd) && !isWerd(p)){ ks=catchUp(p,c,ds,t); if(ks.length) note=`<div class="carry">عندك ورد فاتك، هذا تعويض يوم واحد فقط، وبعده ارتاح.</div>`; }
      if(!ks.length && p.start>t){ soon.push(p); continue; } // the plan has not started yet: say when it starts, not «rest day»
      if(!ks.length){ const nx=ds.find(d=>d>t); if(nx && (!nextDay||nx<nextDay)) nextDay=nx; continue; }
    }
    const carried = !note && rolls(p) && ks.some(k=>!p.done[k+'h'] && c.base[k]<t);
    /* sessions already finished today fold into one line; only what is still due shows as cards */
    ks.forEach(k=>c.sessions[k].tasks.forEach(tk=>{ total++; if(p.done[tk.key]) done++; const g=tk.kind==='h'?'h':tk.kind==='n'?'n':tk.kind==='t'?'t':'f'; (lis[g]=lis[g]||[]).push(...tk.rs); }));
    /* a ready-made werd keeps its full card even when done, so it can be read, heard or recited again */
    const dks=isWerd(p)?[]:ks.filter(k=>sessDone(p,c.sessions[k])), oks=ks.filter(k=>!dks.includes(k)), open=!!(ui.tdOpen&&ui.tdOpen[p.id]);
    const kinds=kindsOf(c,ks), multi=kinds.length>1;
    const dTiles=dks.length?kindTiles(p,c,dks,multi):'', oTiles=oks.length?kindTiles(p,c,oks,multi):'';
    const fold=dks.length?`<button class="tdone" data-act="tdFold" data-plan="${p.id}"><span class="circle on"></span><span>أنجزت اليوم ${plural(dks.reduce((n,k)=>n+c.sessions[k].tasks.length,0),'مهمة واحدة','مهمتين','مهام','مهمة')}</span><small>${open?'إخفاء':'عرض'}</small></button>`:'';
    const tiles=fold+(open?dTiles:'')+oTiles;
    out+=`<section class="tday">${tdHead(p,many,kinds)}${note}${carried?`<div class="carry">حفظك السابق لم يكتمل، فبقي هو ورد اليوم. أكمله ثم ننتقل للجديد.</div>`:''}<div class="tgrid">${tiles}</div></section>`;
  } finally { const sl=slotOf(p), b=BN[sl]||(BN[sl]={n:0,d:0}); b.n+=total-t0; b.d+=done-d0; if(out.length>o0){ B[sl]=(B[sl]||'')+out.slice(o0); out=out.slice(0,o0); } } }
  /* with recommended awrad the day is split by time; with ordinary plans only it looks as before */
  const sls=SLOTS.filter(x=>B[x[0]]);
  if(sls.length>1 || (sls.length===1 && sls[0][0]!=='d')){ const now=slotNow();
    out=sls.map(([k,name,ic])=>{ const b=BN[k], fin=b.n&&b.d===b.n;
      return `<div class="slot-h ${k===now?'now':''} ${fin?'fin':''}"><span>${ic} ${name}</span>${k===now?'<em>الآن</em>':''}${b.n?`<small>${fin?'✓ ':''}${f(b.d)} من ${f(b.n)}</small>`:''}</div>${B[k]}`; }).join(''); }
  else out=sls.length?B[sls[0][0]]:'';
  ui.todayListen=lis;
  const all_done = total && done===total;
  /* plans whose start date is still ahead: tell when they start, with a way to start earlier */
  const soonCards = soon.map(p=>{ const n=Math.round((parse(p.start)-parse(t))/864e5);
    return `<div class="card well"><b>${esc(p.name)}</b>: تبدأ خطتك يوم ${WD[parse(p.start).getDay()]} ${fmtG(p.start)} إن شاء الله، بعد ${plural(n,'يوم واحد','يومين','أيام','يوماً')}.${isWerd(p)?'':`<br><a href="#edit-${p.id}">تريد تبدأ قبل؟ غيّر تاريخ البداية</a>`}</div>`; }).join('');
  const restCard = `<div class="card restday"><div class="orn" aria-hidden="true">🌿</div><h3>اليوم استراحة</h3><p class="muted">ارتح وجدّد نشاطك${nextDay?`، نلقاك ${WD[parse(nextDay).getDay()]} إن شاء الله`:''}.</p></div>`;
  return hello(total?`${f(done)} من ${f(total)}`:'')+dayStrip(t)+`<div class="stack">
    ${ps.map(tailCard).join('')}
    ${all_done?`<div class="card well">أحسنت، أنهيت مهام اليوم كلها. بارك الله فيك.</div>`:''}
    ${soonCards}
    ${out || (soon.length?'':ps.length?restCard:`<div class="card small muted">كل الخطط موقوفة. افتح «الخطط» لاستئناف واحدة.</div>`)}
    ${total?quizCard(lis):''}
    ${frCard()}
    ${chalCard()}
    ${ayahOfDay()}
  </div>`;
}
const LIS_NAME={h:'الحفظ الجديد',n:'المراجعة القريبة',f:'المراجعة البعيدة',t:'التلاوة'};
function listenCard(lis){
  const o=audOpts(), rname=(RECITERS.find(x=>x[0]===o.r)||RECITERS[0])[1];
  const rows=['h','n','f','t'].filter(k=>lis[k]&&lis[k].length).map(k=>{ const n=plIds(lis[k]).length;
    return `<button class="lrow" data-act="listenKind" data-k="${k}"><span class="lp">${IC.play}</span><span class="lt"><b>${LIS_NAME[k]}</b><small>${plural(n,'آية واحدة','آيتان','آيات','آية')}</small></span></button>`; }).join('');
  return `<section class="card"><div class="tile-row"><h3 style="margin:0">الاستماع للورد</h3><button class="icon-btn" data-act="audSet" aria-label="إعدادات الاستماع">${IC.gear}</button></div>
    <div class="small muted" style="margin:4px 0 10px">${rname} · ${o.rep>1?`كل آية ${f(o.rep)} مرات`:'بدون تكرار'} · ${o.sp<1?'أبطأ':o.sp>1?'أسرع':'سرعة عادية'}${o.gap==='a'?' · وقفة بقدر الآية':''}</div>
    <div class="lrows">${rows}</div></section>`;
}
function hello(count){
  const t=todayIso();
  return `<header class="hello"><h1>مهام اليوم</h1><span>${WD[new Date().getDay()]} ${fmtG(t)}${count?` · <span>أنجزت</span> <b>${count}</b>`:''}</span><small class="hij">${fmtH(t)}</small></header>`;
}
function emptyState(){
  return `<div class="card empty"><div class="orn">۞</div><h3>ابدأ الخطة مع القرآن</h3>
    <p class="muted">ثلاث أسئلة فقط، ونقسّم لك الورد على الأيام. كل يوم تفتح التطبيق، تقرأ وردك، وتضع علامة.</p>
    <a class="btn block" href="#new">إنشاء أول خطة</a></div>`;
}

/* ---------- recommended awrad ---------- */
const werdDone = p => Object.keys(p.done||{}).filter(k=>p.done[k]).length;
const werdTimes = p => { const n=werdDone(p); return n ? 'أنجزته '+plural(n,'مرة واحدة','مرتين','مرات','مرة') : 'لم تنجزه بعد'; };
function werdNext(p){ const ds=datesOf(p), c=compute(p), t=todayIso(); const k=ds.findIndex((d,k)=>d>=t && !(d===t && sessDone(p,c.sessions[k]))); return k<0?null:ds[k]; }
function werdCard(p){ const w=WERDS[p.werd], paused=status(p)==='paused';
  return `<a class="card pcard" href="#plan-${p.id}"><div class="t"><h3>${esc(p.name)}</h3>${paused?'<span class="chip">موقوفة</span>':'<span class="chip">ورد</span>'}</div>
    <div class="r"><span>${w.when}</span><b>${werdTimes(p)}</b></div></a>`; }
function werdPicker(){
  const have=new Set(Object.values(state.plans).filter(isWerd).map(p=>p.werd));
  return `<section class="werds"><h3>أوراد مستحبة جاهزة</h3>
    <div class="small muted">اضغط على الورد ليُضاف إلى مهامك في أيامه، وإن فاتك يوم فلا تراكم عليك.</div>
    <div class="wgrid">${Object.keys(WERDS).map(k=>{ const w=WERDS[k], on=have.has(k);
      return `<button type="button" class="wpick ${on?'on':''}" data-act="addWerd" data-w="${k}" ${on?'aria-disabled="true"':''}><b>${w.name}</b><small>${on?'مضاف عندك ✓':w.when}</small></button>`; }).join('')}</div></section>`; }
function vWerdPlan(plan){
  const id=plan.id, w=WERDS[plan.werd], c=compute(plan), ds=datesOf(plan), t=todayIso(), paused=status(plan)==='paused', open=ui.menu===id, nx=werdNext(plan);
  const lo=iso(new Date(+parse(t)-7*864e5)), hi=iso(new Date(+parse(t)+7*864e5)), ks=[]; ds.forEach((d,k)=>{ if(d>=lo && d<=hi) ks.push(k); });
  const pop = open ? `<div class="pop" role="menu">
      <button role="menuitem" data-act="linkApps" data-plan="${id}">ربط مع تطبيقاتك</button>
      <button role="menuitem" data-act="pause" data-plan="${id}">${paused?'استئناف الورد':'إيقاف مؤقت'}</button>
      <button role="menuitem" class="danger" data-act="askDel" data-plan="${id}">حذف الورد</button>
      <div id="delc"></div></div>` : '';
  return topbar(esc(plan.name),{back:'#plans',right:`<button class="icon-btn" data-act="planMenu" data-plan="${id}" aria-label="خيارات الورد" aria-haspopup="menu" aria-expanded="${open}">${IC.dots}</button>`,pop})+`<div class="stack">
    <section class="card hero">
      <div class="big"><b>${f(werdDone(plan))}</b><span>${werdDone(plan)?'عدد المرات التي أنجزته فيها':'لم تنجزه بعد'}<br>${w.when}</span></div>
      <div class="facts">${paused?'<span class="chip">موقوف</span>':nx?`<span>${nx===t?'عليك اليوم':`القادم ${WD[parse(nx).getDay()]} ${fmtShort(nx)}`}</span>`:''}</div>
    </section>
    <div class="list-head"><h2 style="margin:0">هذا الأسبوع وما حوله</h2></div>
    ${ks.map(k=>sessCard(plan,k)).join('')}
  </div>`;
}

/* ---------- my plans ---------- */
function vPlans(){
  const ps=plansSorted().sort((a,b)=>(status(a)==='paused')-(status(b)==='paused'));
  return `<header class="hello"><h1>الخطط</h1><span>${plural(ps.length,'خطة واحدة','خطتان','خطط','خطة')}</span></header><div class="stack">
    ${ps.length? ps.map(p=>{ if(isWerd(p)) return werdCard(p); const st=stats(p), sg=stages(p), cs=sg.list[sg.cur]||{js:[],pct:0}, paused=status(p)==='paused', done=st.firstOpen<0;
      return `<a class="card pcard" href="#plan-${p.id}"><div class="t"><h3>${esc(p.name)}</h3>${paused?'<span class="chip">موقوفة</span>':done?'<span class="chip ok">مكتملة</span>':st.overdue?`<span class="chip warn">${f(st.overdue)} متأخرة</span>`:''}</div>
        <div class="r"><span>${TYPE_NAME[p.type]} · ${sg.list.length>1?`المرحلة ${f(cs.no)} · ${juzNames(cs.js)}`:juzNames(cs.js)}</span><b>${f(cs.pct)}٪</b></div>
        <div class="bar"><i style="width:${cs.pct}%"></i></div></a>`; }).join('')
      : werdPicker()+emptyState()}
    ${ps.length?'<a class="btn block ghost" href="#new">+ خطة جديدة</a>'+werdPicker():''}
    ${cloudOn()&&auth.s?'<button class="btn block ghost" data-act="joinOpen">الانضمام بكود</button>':''}
  </div>`;
}

/* ---------- stages screen ---------- */
const stagesTitle = p => p.type==='hifz'||p.type==='both' ? 'مراحل حفظ القرآن' : 'مراحل الخطة';
const CHEER = ['بداية الطريق، والقرآن يستحق','خطوة ثابتة، استمر','ما شاء الله، تقدّم جميل','قطعت شوطاً طيباً','أكثر من نصف الطريق، بارك الله فيك','اقتربت، لا تتوقف','على وشك الختام'];
function vStages(id){
  const plan=state.plans[id];
  if(!plan) return topbar('المراحل',{back:'#plans'})+`<div class="card">لم أجد هذه الخطة.</div>`;
  const sg=stages(plan), L=sg.list, done=L.filter(x=>x.pct>=100).length, all=done===L.length;
  const tot=Math.floor(L.reduce((a,x)=>a+x.pct,0)/L.length), cur=L[sg.cur];
  const msg = all ? 'أتممت كل المراحل، تقبّل الله منك' : CHEER[Math.min(CHEER.length-1, Math.floor(tot/100*CHEER.length))];
  const R=52, C=2*Math.PI*R;
  return topbar(stagesTitle(plan),{back:`#plan-${id}`})+`<div class="stack">
    <section class="card st-hero">
      <svg viewBox="0 0 120 120" class="ring" aria-hidden="true"><circle cx="60" cy="60" r="${R}" class="rb"/><circle cx="60" cy="60" r="${R}" class="rf" stroke-dasharray="${C*tot/100} ${C}"/></svg>
      <div class="st-in"><b>${f(tot)}٪</b><span>من الخطة</span></div>
      <h2>${all?'ختمت، الحمد لله':`أنت في المرحلة ${f(cur.no)}`}</h2>
      <p>${msg}</p>
      <div class="st-facts"><span><b>${f(done)}</b> ${done===1?'مرحلة مكتملة':'مراحل مكتملة'}</span><span><b>${f(L.length-done)}</b> باقية</span></div>
    </section>
    <ol class="st-list">${L.map((x,i)=>{ const st = x.pct>=100?'ok':i===sg.cur?'now':'next';
      return `<li class="st ${st}"><a href="#plan-${id}" data-act="stage" data-plan="${id}" data-i="${i}">
        <span class="st-n">${st==='ok'?'✓':f(x.no)}</span>
        <span class="st-b"><b>المرحلة ${f(x.no)}${st==='now'?' <em>أنت هنا</em>':''}</b><small>${juzNames(x.js)}</small>
          <span class="bar"><i style="width:${x.pct}%"></i></span></span>
        <span class="st-p">${st==='ok'?'مكتملة':`${f(x.pct)}٪`}</span></a></li>`; }).join('')}</ol>
    <p class="small muted" style="text-align:center">كل مرحلة ثلاثة أجزاء. اضغط على مرحلة لترى جلساتها.</p>
  </div>`;
}

/* ---------- plan page ---------- */
/* one-time notice for plans made before the new split rule */
const needTail = p => p.tail==null && !p.tailNo && status(p)!=='archived' && status(p)!=='complete';
const tailCard = p => needTail(p) ? `<section class="card tailc row" style="justify-content:space-between;align-items:center;gap:10px"><b>✨ تحديث جديد لخطة «${esc(p.name)}»</b><button class="btn sm" data-act="tailYes" data-plan="${p.id}">تحديث الخطة</button></section>` : '';
function tailApply(p){
  const c=compute(p); let from=0;
  if(isCycle(p)){ let n=0; c.sessions.forEach((s,k)=>{ if(p.done[k+'r']) n++; }); const ch=rchunk(p,c.seq,Infinity); from=n>=ch.length?0:ch[n%ch.length][0]; }
  else { const k=c.chunks.findIndex((ch,k)=>!p.done[k+'h']); from=k<0?c.seq.length:c.chunks[k][0]; }
  p.tail=from; put(p);
}
function vPlan(id){
  const plan=state.plans[id];
  if(!plan) return topbar('الخطة',{back:'#plans'})+`<div class="card">لم أجد هذه الخطة.</div>`;
  if(isWerd(plan)) return vWerdPlan(plan);
  const c=compute(plan), st=stats(plan), n=c.sessions.length;
  const sg=stages(plan), vs=sg.cur, cs=sg.list[sg.cur]||{js:[],pct:0}, sk=pdfKeys(plan,'stage');
  const cyc0 = isCycle(plan)?(sg.cycle-1)*c.perCycle:0, cyc1 = isCycle(plan)?cyc0+c.perCycle:n;
  const ks=[]; for(let k=cyc0;k<cyc1;k++) if(sg.list.length<2 || sessionStage(plan,k,sg)===vs) ks.push(k);
  const paused=status(plan)==='paused', open=ui.menu===id;
  const pop = open ? `<div class="pop" role="menu">
      <a role="menuitem" href="#edit-${id}">تعديل الخطة</a>
      <button role="menuitem" data-act="linkApps" data-plan="${id}">ربط مع تطبيقاتك</button>
      ${cloudOn()&&auth.s?`<button role="menuitem" data-act="friends" data-plan="${id}">شاركها في حلقة</button>`:''}
      <button role="menuitem" data-act="pdfOpen" data-plan="${id}">ملف PDF للخطة</button>
      <button role="menuitem" data-act="shareApp">مشاركة التطبيق</button>
      <button role="menuitem" data-act="pause" data-plan="${id}">${paused?'استئناف الخطة':'إيقاف مؤقت'}</button>
      <button role="menuitem" class="danger" data-act="askDel" data-plan="${id}">حذف الخطة</button>
      <div id="delc"></div></div>` : '';
  return topbar(esc(plan.name),{back:'#plans',right:`<button class="icon-btn" data-act="planMenu" data-plan="${id}" aria-label="خيارات الخطة" aria-haspopup="menu" aria-expanded="${open}">${IC.dots}</button>`,pop})+`<div class="stack">
    ${tailCard(plan)}
    <section class="card hero">
      <div class="big"><b>${f(cs.pct)}٪</b><span>المرحلة ${f(cs.no)}${isCycle(plan)&&plan.cycles>1?` · الختمة ${f(sg.cycle)}`:''}<br>${juzNames(cs.js)}</span></div>
      <div class="bar thick"><i style="width:${cs.pct}%"></i></div>
      <div class="facts"><span><b>${f(sk.filter(k=>sessDone(plan,c.sessions[k])).length)}/${f(sk.length)}</b> جلسة${sg.list.length>1?' في المرحلة':''}</span><span>${st.firstOpen<0?'اكتملت':(()=>{ const e=stageEnd(plan,sg,sg.cur); return e?`تختم المرحلة ${fmtShort(e)}`:'مرحلتك مكتملة'; })()}</span>${status(plan)==='paused'?'<span class="chip">موقوفة</span>':st.overdue?`<span class="chip warn">${f(st.overdue)} متأخرة</span>`:'<span class="chip ok">على الجدول</span>'}</div>
      ${st.overdue&&status(plan)==='active'?`<button class="late-line" data-act="askResched" data-plan="${id}">رتّب المتأخر من اليوم</button>`:''}
    </section>
    <div class="list-head"><h2 style="margin:0">${sg.list.length>1?`المرحلة ${f(sg.list[vs].no)}${vs===sg.cur?' (الحالية)':''}<span class="small muted" style="font-weight:400"> · ${juzNames(sg.list[vs].js)}</span>`:'الجلسات'}</h2></div>
    ${ks.length? (()=>{ const dsP=datesOf(plan), t=todayIso(), lim=iso(new Date(+parse(t)+7*864e5)), i0=ks.findIndex(k=>!sessDone(plan,c.sessions[k]));
        const sh = i0<0 ? [] : ks.filter((k,i)=>i>=i0 && (i===i0 || dsP[k]<lim)), all = (ui.allS||{})[plan.id] || i0<0 || sh.length>=ks.length;
        return (all?ks:sh).map(k=>sessCard(plan,k)).join('') + (all ? '' : `<button class="btn ghost block" data-act="allSess" data-id="${plan.id}">عرض كل الجلسات (${f(ks.length)})</button>`); })() : `<div class="card well">${sg.list[vs].pct>=100?'هذه المرحلة مكتملة بحفظك السابق، ما شاء الله.':'لا جلسات في هذه المرحلة.'}</div>`}
  </div>`;
}

/* ---------- printable plan (saved as PDF from the print dialog) ---------- */
function pdfSheet(id){
  const plan=state.plans[id], sg=stages(plan), multi=sg.list.length>1, ds=datesOf(plan), n=compute(plan).sessions.length;
  const lo=ds[0], hi=ds[n-1], t=todayIso(), from=t<lo?lo:t>hi?lo:t, to=iso(new Date(+parse(from)+29*864e5)), to2=to>hi?hi:to;
  const pg=sc=>`<em class="pdf-pg" data-scope="${sc}">…</em>`;
  openSheet(`${sheetHead('ملف PDF للخطة')}<div class="stack">
    <p class="small muted" style="margin:0">يطلع لك ملف مرتب بهوية ربيع القرآن، تحفظه PDF أو تطبعه وتعلّقه.</p>
    <button class="listbtn" data-act="pdfGo" data-plan="${id}" data-scope="stage"><span>${multi?'المرحلة الحالية':'جلسات الخطة'}<small>${multi?`المرحلة ${f(sg.list[sg.cur].no)} · `:''}${plural(pdfKeys(plan,'stage').length,'جلسة واحدة','جلستان','جلسات','جلسة')}</small></span>${pg('stage')}</button>
    <div class="card pdf-rng"><b>اختر الأيام بنفسك</b>
      <div class="row" style="gap:8px;flex-wrap:nowrap;margin-top:8px"><label class="field" style="flex:1"><span class="lbl">من يوم</span><input type="date" id="pdfFrom" value="${from}" min="${lo}" max="${hi}"></label>
      <label class="field" style="flex:1"><span class="lbl">إلى يوم</span><input type="date" id="pdfTo" value="${to2}" min="${lo}" max="${hi}"></label></div>
      <button class="btn block" style="margin-top:10px" data-act="pdfGo" data-plan="${id}" data-scope="range"><span id="pdfRngT">نزّل هذي الأيام</span> ${pg('range')}</button></div>
    <p class="small muted" style="margin:0">ينحفظ الملف في جهازك مباشرة (في التنزيلات).</p></div>`);
  pdfCounts(plan);
  ['pdfFrom','pdfTo'].forEach(x=>document.getElementById(x)?.addEventListener('change',()=>pdfCounts(plan,['range'])));
}
function stEnd(plan,ds){ const ks=pdfKeys(plan,'stage'); return ds[ks.length?ks[ks.length-1]:ds.length-1]; }
function pdfRange(){ const a=document.getElementById('pdfFrom')?.value, b=document.getElementById('pdfTo')?.value; return a&&b?(a<=b?{from:a,to:b}:{from:b,to:a}):null; }
/* page count of a PDF before downloading: lay out the same page and split it the same way */
function pdfLayout(plan,scope,rng){
  const box=document.createElement('div'); box.style.cssText='position:fixed;left:-10000px;top:0;width:794px;background:#fff;padding:40px 38px;box-sizing:border-box';
  box.innerHTML=printDoc(plan,scope,rng); document.body.appendChild(box);
  const pageH=Math.round(794*297/210), top0=box.getBoundingClientRect().top;
  const cuts=[...box.querySelectorAll('.pd-tb tr,section,header,footer')].map(r=>r.getBoundingClientRect().bottom-top0).sort((a,b)=>a-b);
  const pages=[]; let y=0; const H=box.offsetHeight;
  while(y<H-2){ const lim=pages.length?pageH-56:pageH; let e=Math.min(H,y+lim); if(e<H){ const c=cuts.filter(v=>v>y+lim*.5&&v<=e).pop(); if(c) e=c; } pages.push([y,e]); y=e; }
  return {box,pages,pageH};
}
async function pdfCounts(plan,only){
  await (document.fonts&&document.fonts.ready);
  document.querySelectorAll('.pdf-pg').forEach(el=>{ const sc=el.dataset.scope; if(only&&!only.includes(sc)) return;
    const rng=sc==='range'?pdfRange():null, L=pdfLayout(plan,sc,rng); L.box.remove();
    el.textContent=plural(L.pages.length,'صفحة واحدة','صفحتان','صفحات','صفحة');
    if(sc==='range'){ const k=pdfKeys(plan,'range',rng).length, tt=document.getElementById('pdfRngT'); if(tt) tt.textContent=k?`نزّل ${plural(k,'جلسة واحدة','جلستين','جلسات','جلسة')}`:'ما فيه جلسات في هذي الأيام'; }
  });
}
function pdfKeys(plan,scope,rng){
  const c=compute(plan), ds=datesOf(plan), sg=stages(plan);
  const cyc0=isCycle(plan)?(sg.cycle-1)*c.perCycle:0, cyc1=isCycle(plan)?cyc0+c.perCycle:c.sessions.length;
  const ks=[];
  if(scope==='range'){ if(rng) for(let k=0;k<c.sessions.length;k++) if(ds[k]>=rng.from && ds[k]<=rng.to) ks.push(k); return ks; }
  for(let k=(scope==='all'?0:cyc0);k<(scope==='all'?c.sessions.length:cyc1);k++) if(scope==='all' || sg.list.length<2 || sessionStage(plan,k,sg)===sg.cur) ks.push(k);
  return ks;
}
function printDoc(plan,scope,rng){
  const c=compute(plan), ds=datesOf(plan), sg=stages(plan), st=stats(plan), cs=sg.list[sg.cur]||{no:1,js:[],pct:0};
  const ks=pdfKeys(plan,scope,rng);
  const kinds=['h','n','f','r','t'].filter(x=>ks.some(k=>c.sessions[k].tasks.some(tk=>tk.kind===x)));
  const prng=(isCycle(plan)?plan.review:plan.hifz).range, days=(plan.days.length?plan.days:[0,1,2,3,4,5,6]).map(i=>WD[i]).join('، ');
  const amt=tk=>`<small>${faces(tk.pages)}</small>`;
  const row=k=>{ const s=c.sessions[k], done=sessDone(plan,s);
    return `<tr class="${done?'dn':''}"><td class="n">${f(k+1)}</td><td class="d">${WD[parse(ds[k]).getDay()]}<br><small>${fmtShort(ds[k])}</small></td>
      ${kinds.map(x=>{ const tk=s.tasks.find(t=>t.kind===x); return `<td>${tk?`<div class="tk"><span class="bx${plan.done[tk.key]?' on':''}">${plan.done[tk.key]?'✓':''}</span><span>${tk.label}${amt(tk)}</span></div>`:'—'}</td>`; }).join('')}</tr>`; };
  const ttl = scope==='all' ? 'الخطة كاملة' : scope==='range'&&rng ? `من ${fmtG(rng.from)} إلى ${fmtG(rng.to)}` : `المرحلة ${f(cs.no)} · ${juzNames(cs.js)}`;
  return `<div class="pd">
    <header class="pd-h"><div class="pd-logo"><span>۞</span><b>ربيع القرآن</b></div><div class="pd-t"><h1>${esc(plan.name)}</h1><p>${ttl}</p></div></header>
    <section class="pd-info">
      <div><small>نوع الخطة</small><b>${TYPE_NAME[plan.type]}</b></div>
      <div><small>النطاق</small><b>${rangeName(prng)}</b></div>
      <div><small>أيام الورد</small><b>${days}</b></div>
      <div><small>بداية الخطة</small><b>${fmtG(plan.start)}</b></div>
    </section>
    ${sg.list.length>1?`<section class="pd-cur"><div><small>المرحلة الحالية</small><b>المرحلة ${f(cs.no)}</b><span>${juzNames(cs.js)}</span></div><i style="--w:${cs.pct}%"></i><strong>${f(cs.pct)}٪</strong></section>`:''}
    <section><h2>الجلسات <small>(${f(ks.filter(k=>sessDone(plan,c.sessions[k])).length)} من ${f(ks.length)} منجزة)</small></h2>
    ${ks.length?`<table class="pd-tb"><thead><tr><th>#</th><th>اليوم</th>${kinds.map(x=>`<th>${KIND[x]}</th>`).join('')}</tr></thead><tbody>${ks.map(row).join('')}</tbody></table>`:`<p>${scope==='range'?'ما فيه جلسات في هذي الأيام.':'هذه المرحلة مكتملة، ما شاء الله.'}</p>`}</section>
    <footer class="pd-f"><span>«خيركم من تعلّم القرآن وعلّمه»</span><span dir="ltr">${esc(APP_URL.replace(/^https?:\/\//,''))}</span><span>أُنشئ ${fmtG(todayIso())}</span></footer>
  </div>`;
}
function printPlan(plan,scope){
  let el=document.getElementById('print'); if(!el){ el=document.createElement('div'); el.id='print'; document.body.appendChild(el); }
  el.innerHTML=printDoc(plan,scope); document.body.classList.add('printing');
  const t=document.title; document.title=`ربيع القرآن - ${plan.name}`;
  const done=()=>{ document.body.classList.remove('printing'); el.innerHTML=''; document.title=t; window.removeEventListener('afterprint',done); };
  window.addEventListener('afterprint',done);
  setTimeout(()=>window.print(),300);
}
/* a real PDF file saved to the device (the print dialog does not open inside installed apps on many phones) */
const loadJs=src=>new Promise((ok,no)=>{ const s=document.createElement('script'); s.crossOrigin='anonymous'; s.src=src; s.onload=ok; s.onerror=no; document.head.appendChild(s); });
let pdfBusy=false;
async function savePdf(plan,scope,rng){
  if(pdfBusy) return; pdfBusy=true; toast('جارٍ تجهيز ملف PDF…');
  let box=null;
  try{
    if(!window.html2canvas) await loadJs('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    if(!window.jspdf) await loadJs('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    await (document.fonts&&document.fonts.ready);
    const L=pdfLayout(plan,scope,rng); box=L.box; const {pages,pageH}=L;
    const sc=1.6, cv=await html2canvas(box,{scale:sc,backgroundColor:'#ffffff',useCORS:true,logging:false});
    const {jsPDF}=window.jspdf, doc=new jsPDF({unit:'px',format:[794,pageH],hotfixes:['px_scaling']});
    pages.forEach(([a,b],i)=>{ const c=document.createElement('canvas'); c.width=cv.width; c.height=Math.round((b-a)*sc);
      const g=c.getContext('2d'); g.fillStyle='#fff'; g.fillRect(0,0,c.width,c.height); g.drawImage(cv,0,Math.round(a*sc),cv.width,c.height,0,0,cv.width,c.height);
      if(i) doc.addPage([794,pageH]); doc.addImage(c.toDataURL('image/jpeg',.86),'JPEG',0,i?28:0,794,b-a); });
    const blob=doc.output('blob'), name=`ربيع القرآن - ${plan.name}.pdf`.replace(/[\\/:*?"<>|]/g,'');
    const file=new File([blob],name,{type:'application/pdf'}), ios=/iPad|iPhone|iPod/.test(navigator.userAgent);
    if(ios && navigator.canShare && navigator.canShare({files:[file]})){ await navigator.share({files:[file],title:name}).catch(()=>{}); }
    else { const u=URL.createObjectURL(blob), a=document.createElement('a'); a.href=u; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),60000); toast('تم حفظ الملف في التنزيلات'); }
  }catch(e){ toast('ما قدرنا نجهّز الملف، تأكد من الاتصال وجرب مرة ثانية'); }
  finally{ box&&box.remove(); pdfBusy=false; }
}

/* ---------- sheets ---------- */
function openSheet(html){ sheetRoot.innerHTML=`<div class="scrim" data-act="closeSheet"><div class="sheet" role="dialog" aria-modal="true"><div class="grip"></div>${html}</div></div>`; sheetRoot.querySelector('.sheet').focus?.(); }
function closeSheet(){ if(typeof attStop==='function') attStop(); sheetRoot.innerHTML=''; ui.sess=null; document.querySelectorAll('.ay.hold').forEach(x=>x.classList.remove('hold')); }
function setRec(patch){ const {pid,k,tab}=ui.sess, plan=state.plans[pid], s=compute(plan).sessions[k], tk=s.tasks[Math.min(tab,s.tasks.length-1)];
  plan.rec=plan.rec||{}; plan.rec[tk.key]={...(plan.rec[tk.key]||{}),...patch}; put(plan); }
function reschedSheet(id){
  const plan=state.plans[id], st=stats(plan); if(st.firstOpen<0) return;
  const trial={...plan, anchor:{k:st.firstOpen,date:todayIso()}}; const nd=datesFor(trial,compute(plan).sessions.length);
  openSheet(`<div class="sheet-head"><button class="icon-btn" data-act="closeSheet" aria-label="إغلاق">${IC.x}</button><h3>ترحيل الجلسات</h3><span></span></div>
    <div class="stack"><p style="margin:0;text-align:center">تبدأ الجلسة ${f(st.firstOpen+1)} اليوم، وتتأخر بقية الجلسات بنفس المقدار. لا تُحذف أي جلسة.</p>
    <div class="card" style="text-align:center"><div class="small muted">${stages(plan).list.length>1?'تختم المرحلة الحالية':'تختم خطتك'}</div><b>${fmtG(stEnd(trial,nd))}</b> <span class="small muted" style="text-decoration:line-through">${fmtG(stEnd(plan,datesOf(plan)))}</span></div>
    <button class="btn block" data-act="resched" data-plan="${id}">ترحيل</button></div>`);
}


function sessSheet(){
  const {pid,k,tab}=ui.sess, plan=state.plans[pid]; if(!plan) return closeSheet();
  const s=compute(plan).sessions[k], tk=s.tasks[Math.min(tab,s.tasks.length-1)], rec=(plan.rec||{})[tk.key]||{}, done=plan.done[tk.key];
  openSheet(`<div class="sheet-head"><button class="icon-btn" data-act="closeSheet" aria-label="إغلاق">${IC.x}</button><h3>الجلسة ${f(k+1)}<span class="sub">${fmtShort(datesOf(plan)[k])}</span></h3><button class="icon-btn ok" data-act="closeSheet" aria-label="تم">${IC.ok}</button></div>
    ${s.tasks.length>1?`<div class="tabs2">${s.tasks.map((x,i)=>`<button class="${x===tk?'on':''}" data-act="sessTab" data-i="${i}">${KIND[x.kind]}${plan.done[x.key]?' ✓':''}</button>`).join('')}</div>`:''}
    <div class="verse">${tk.label}</div>
    <div class="row small muted" style="justify-content:center">${tk.pr} · ${faces(tk.pages)}</div>
    <button class="btn block" style="margin-top:10px" data-act="wOpen">📖 ${tk.kind==='h'?'افتح ورد الحفظ':'اقرأ الورد'} (${plural(wirdPages(tk).length,'صفحة واحدة','صفحتان','صفحات','صفحة')})</button>
    <div class="row" style="gap:8px;margin-top:10px;flex-wrap:nowrap"><button class="btn ghost rcgo" style="flex:1" data-act="listenTask">${IC.play} استمع وكرّر</button><button class="btn ghost rcgo" style="flex:1" data-act="recFromTask">${IC.mic} سمّع بصوتك</button></div>
    ${stepsOf(tk)>1?`<div class="sec-l">${tk.kind==='h'?'كم حفظت منه؟':'كم وجهاً أنجزت؟'}</div>
    <div class="stepbtns">${Array.from({length:stepsOf(tk)},(_,i)=>`<button class="${i<gotOf(plan,tk)?'on':''}" data-act="setStep" data-n="${i+1}">${tk.kind==='h'?faces((i+1)/2):f(i+1)}</button>`).join('')}</div>
    <div class="small muted" style="text-align:center;margin-top:6px"><bdi>${f(gotOf(plan,tk))} من ${f(stepsOf(tk))}</bdi> · <bdi>${f(Math.round(gotOf(plan,tk)/stepsOf(tk)*100))}٪</bdi></div>`:''}
    <button class="toggle" data-act="sheetDone" style="margin-top:14px"><span>${done?`أنجزته كاملاً · ${fmtShort(iso(new Date(+done)))}`:'أنجزته كاملاً'}</span><span class="circle ${done?'on':''}"></span></button>
    <div class="sec-l">كيف كان؟</div>
    <div class="stars">${[1,2,3,4,5].map(i=>`<button class="${(rec.s||0)>=i?'on':''}" data-act="star" data-i="${i}" aria-label="${f(i)} من ٥">★</button>`).join('')}</div>
    <div class="sec-l">ملاحظة (اختياري)</div>
    <textarea id="note" placeholder="مثلاً: انتبه للمتشابه في الآية ٥">${esc(rec.n||'')}</textarea>`);
}
function settingsSheet(id){
  const plan=state.plans[id], paused=status(plan)==='paused';
  openSheet(`<div class="sheet-head"><button class="icon-btn" data-act="closeSheet" aria-label="إغلاق">${IC.x}</button><h3>${esc(plan.name)}</h3><span></span></div>
    <div class="stack">
      ${isWerd(plan)?'':`<a class="listbtn" href="#edit-${id}"><span>تعديل الخطة<small>المقدار والنطاق والأيام</small></span></a>`}
      <button class="listbtn" data-act="linkApps" data-plan="${id}"><span>ربط مع تطبيقاتك<small>التقويم وتطبيقات المهام والعادات</small></span></button>
      <button class="listbtn" data-act="pause" data-plan="${id}"><span>${paused?'استئناف الخطة':'إيقاف مؤقت'}<small>${paused?'ترجع جلساتها إلى وردك اليوم':'تختفي من وردك اليوم حتى تستأنفها'}</small></span></button>
      <button class="listbtn danger" data-act="askDel" data-plan="${id}"><span>حذف الخطة</span></button>
      <div id="delc"></div>
    </div>`);
}

/* ---------- link with to-do, habit and calendar apps ---------- */
const APP_URL=location.origin+location.pathname;
const plain=h=>{ const d=document.createElement('div'); d.innerHTML=h; return d.textContent.trim(); };
function wirdText(plan){
  const c=compute(plan), ds=datesOf(plan), t=todayIso();
  let ks=[]; ds.forEach((d,k)=>{ if(d===t) ks.push(k); });
  let head='وردي اليوم';
  if(!ks.length){ const nx=ds.findIndex(d=>d>t); if(nx<0) return ''; ks=[nx]; head=`وردي ${WD[parse(ds[nx]).getDay()]} ${fmtShort(ds[nx])}`; }
  const lines=ks.flatMap(k=>c.sessions[k].tasks.map(tk=>`• ${KIND[tk.kind]}: ${plain(tk.label)} (${plain(faces(tk.pages))})`));
  return `${head} · ${plan.name}\n${lines.join('\n')}`;
}
function gcalUrl(plan){
  const [hh,mm]=(plan.remindAt||'05:30').split(':').map(Number), ds=datesOf(plan), t=todayIso();
  const first=ds.find(d=>d>=t)||t, last=ds[ds.length-1]||first;
  const days=(plan.days.length?plan.days:[0,1,2,3,4,5,6]).map(i=>['SU','MO','TU','WE','TH','FR','SA'][i]).join(',');
  const pad=n=>String(n).padStart(2,'0'), ymd=x=>x.replaceAll('-','');
  const st=`${ymd(first)}T${pad(hh)}${pad(mm)}00`, e=new Date(2000,0,1,hh,mm+30), en=`${ymd(first)}T${pad(e.getHours())}${pad(e.getMinutes())}00`;
  const q=new URLSearchParams({action:'TEMPLATE', text:`ورد القرآن · ${plan.name}`, dates:`${st}/${en}`,
    ctz:Intl.DateTimeFormat().resolvedOptions().timeZone||'Asia/Riyadh',
    recur:`RRULE:FREQ=WEEKLY;BYDAY=${days};UNTIL=${ymd(last)}T235959Z`,
    details:`افتح وردك وضع علامة الإنجاز:\n${APP_URL}`});
  return 'https://calendar.google.com/calendar/render?'+q.toString().replaceAll('+','%20');
}
function linkSheet(id){
  const plan=state.plans[id], txt=wirdText(plan);
  openSheet(`<div class="sheet-head"><button class="icon-btn" data-act="closeSheet" aria-label="إغلاق">${IC.x}</button><h3>ربط مع تطبيقاتك</h3><span></span></div>
    <div class="stack">
      <div class="card"><div class="sec-l" style="margin-top:0">تذكير يومي في التقويم</div>
        <p class="small muted" style="margin:0 0 10px">موعد متكرر في أيام خطتك حتى تختم، وفيه رابط وردك.</p>
        <label class="field small">وقت التذكير<input type="time" id="remindAt" data-plan="${id}" value="${plan.remindAt||'05:30'}"></label>
        <a class="btn block" id="gcal" href="${esc(gcalUrl(plan))}" target="_blank" rel="noopener" style="margin-top:10px">أضفه إلى تقويم <bdi>Google</bdi></a>
        <p class="small muted" style="margin:8px 0 0">تقويم <bdi>Google</bdi> يظهر أيضاً في تقويم آيفون وتطبيقات العادات المربوطة بالتقويم.</p></div>
      <div class="card"><div class="sec-l" style="margin-top:0">ورد اليوم إلى تطبيق المهام</div>
        ${txt?`<textarea id="wirdTxt" dir="rtl" readonly rows="4">${esc(txt)}</textarea>
        <div class="row" style="margin-top:10px"><button class="btn" data-act="shareWird">مشاركة</button><button class="btn ghost" data-act="copyWird">نسخ</button></div>
        <p class="small muted" style="margin:8px 0 0">شاركه إلى <bdi>Todoist</bdi> أو <bdi>TickTick</bdi> أو تذكيرات آبل أو <bdi>Microsoft To Do</bdi> أو <bdi>Google Tasks</bdi>، أو الصقه فيها مهمةً لليوم.</p>`
        :`<p class="small muted" style="margin:0">لا ورد قادم في هذه الخطة.</p>`}</div>
    </div>`);
}
async function copyWird(){
  const ta=document.getElementById('wirdTxt'); if(!ta) return;
  try{ await navigator.clipboard.writeText(ta.value); toast('نُسخ ورد اليوم'); }
  catch{ ta.focus(); ta.select(); try{ document.execCommand('copy'); toast('نُسخ ورد اليوم'); }catch{ toast('حدّد النص وانسخه'); } }
}

/* ---------- new plan: three questions ---------- */
function rangeName(r){
  if(r.type==='span'){ const pt=(s,a,last)=> `${NAMES[s-1]}${(last? a<S[s][1] : a>1)?' '+f(a):''}`;
    if(r.s1===r.s2) return (Math.min(r.a1,r.a2)===1 && Math.max(r.a1,r.a2)===S[r.s1][1]) ? `سورة ${NAMES[r.s1-1]}` : `${NAMES[r.s1-1]} ${f(Math.min(r.a1,r.a2))}–${f(Math.max(r.a1,r.a2))}`;
    return `${pt(r.s1,r.a1,false)} – ${pt(r.s2,r.a2,true)}`; }
  if(r.type==='all') return 'القرآن كاملاً';
  if(r.type==='juz') return r.from===r.to?`الجزء ${f(r.from)}`:`الأجزاء ${f(Math.min(r.from,r.to))}–${f(Math.max(r.from,r.to))}`;
  const a=Math.min(r.from,r.to), b=Math.max(r.from,r.to); return a===b?`سورة ${NAMES[a-1]}`: r.dir==='rev'?`${NAMES[b-1]} – ${NAMES[a-1]}`:`${NAMES[a-1]} – ${NAMES[b-1]}`;
}
function opt(name,val,text,checked,sub){ return `<label class="opt"><input type="radio" name="${name}" value="${val}" ${checked?'checked':''}><span>${text}${sub?`<small>${sub}</small>`:''}</span></label>`; }
function setRadio(form,name,val){ const el=form.querySelector(`input[name="${name}"][value="${val}"]`); if(el) el.checked=true; }
function carryOver(old,np){
  const oc=compute(old), nc=compute(np);
  if(isCycle(old) && isCycle(np)){ let n=0; for(let k=0;k<oc.sessions.length;k++) if(old.done[k+'r']) n++;
    for(let k=0;k<Math.min(n,nc.sessions.length);k++) np.done[k+'r']=old.done[k+'r']||Date.now(); return; }
  if(isCycle(old) || isCycle(np)) return;
  const mem=new Set(); oc.chunks.forEach(([i0,i1],k)=>{ if(old.done[k+'h']) for(let i=i0;i<=i1;i++) mem.add(oc.seq[i]); });
  nc.chunks.forEach(([i0,i1],k)=>{ let all=true; for(let i=i0;i<=i1&&all;i++) if(!mem.has(nc.seq[i])) all=false;
    if(all) for(const tk of nc.sessions[k].tasks) np.done[tk.key]=Date.now(); });
}


/* the first and last ayah of a stored range, as surah numbers (older plans may hold juz ranges) */
function surahEnds(r){
  if(!r || r.type==='none') return null;
  if(r.type==='all') return [1,114];
  if(r.type==='juz'){ const a=Math.min(r.from,r.to), b=Math.max(r.from,r.to); return [sOf[JZ[a]], sOf[JZ[b+1]-1]]; }
  return [Math.min(r.from,r.to), Math.max(r.from,r.to)];
}
const AMTS = { mem:[[0.25,'ربع وجه'],[1/3,'ثلث وجه'],[0.5,'نصف وجه'],[1,'وجه واحد'],['c','اكتب بنفسك']],
               rev:[[1,'وجه'],[5,'٥ أوجه'],[10,'نصف جزء'],[20,'جزء'],['c','اكتب بنفسك']],
               /* reading plans by the hizb (a juz is two ahzab, about 20 pages, so a hizb is about 10) */
               til:[[2.5,'ربع حزب','وجهان ونصف تقريباً'],[5,'نصف حزب','٥ أوجه تقريباً'],[7.5,'ثلاثة أرباع حزب','٧ أوجه ونصف تقريباً'],[10,'حزب','١٠ أوجه تقريباً'],[20,'جزء','٢٠ وجه تقريباً'],['c','اكتب بنفسك']] };
function vNew(editing){
  const d=new Date();
  const pt=(p,lbl,none)=>`<div class="pt" id="pt-${p}"><span class="lbl" id="${p}l">${lbl}</span><div class="pt-in"><label class="field small">السورة<select id="${p}s">${none?'<option value="0">لم أحفظ شيئاً بعد</option>':''}</select></label><label class="field small">الآية<select id="${p}a"></select></label></div></div>`;
  return topbar(editing?'تعديل الخطة':'خطة جديدة',{back:editing?`#plan-${editing.id}`:'#today'})+`<form class="stack" id="newf" autocomplete="off" ${editing?`data-edit="${editing.id}"`:''}>
    <section class="card q"><h3><span class="qn">١</span>ترتيب الخطة</h3>
      <div class="types">${opt('pdir','rev','من الناس إلى الفاتحة',true,'تبدأ بجزء عمّ وتصعد')}${opt('pdir','fwd','من الفاتحة إلى الناس',false,'على ترتيب المصحف')}</div></section>
    <section class="card q"><h3><span class="qn">٢</span>نوع الخطة</h3>
      <div class="types">${opt('ptype','hifz','حفظ',true,'آيات جديدة كل يوم')}${opt('ptype','both','حفظ ومراجعة',false,'جديد مع مراجعة قريبة وبعيدة')}${opt('ptype','review','مراجعة',false,'تثبيت ما تحفظه')}${opt('ptype','tilawa','ختمة تلاوة',false,'قراءة القرآن')}</div></section>
    <section class="card q"><h3><span class="qn">٣</span><span id="rq">أين وصلت في الحفظ؟</span></h3>
      ${pt('m-','آخر ما حفظته',true)}<div class="small muted" id="mhint"></div>${pt('b-','من')}${pt('e-','إلى')}</section>
    <section class="card q"><h3><span class="qn">٤</span>كم كل يوم؟</h3>
      <div class="opts" id="amts"></div>
      <div class="grid2" id="camt" hidden><label class="field small">المقدار<input type="number" id="amt" min="0.25" step="0.25" value="2" inputmode="decimal"></label>
        <label class="field small" id="unitf">الوحدة<select id="unit"><option value="ayah">آية</option><option value="page">وجه</option><option value="juz">جزء</option></select></label></div></section>
    <section class="card q" data-only="both"><h3><span class="qn">٥</span>المراجعة</h3>
      <div class="small muted">تدخل فيها كل ما حفظته، ويُضاف لها حفظك الجديد أولاً بأول.</div>
      <div class="grid2"><label class="field small">المراجعة القريبة (أوجه يومياً)<input type="number" id="near" min="0" max="40" step="0.5" value="5"></label>
        <label class="field small">المراجعة البعيدة (أوجه يومياً)<input type="number" id="far" min="0" step="0.5" value="10"></label></div></section>
    <div class="preview" id="preview" aria-live="polite"></div>
    <section class="card q"><h3><span class="qn" id="qn-days">٦</span>أيام الخطة</h3>
      <div class="field"><span class="lbl">الأيام التي تعمل فيها</span><div class="opts">${[6,0,1,2,3,4,5].map(i=>`<label class="opt"><input type="checkbox" name="wd" value="${i}" checked><span>${WD[i]}</span></label>`).join('')}</div></div>
      <label class="field"><span class="lbl">تبدأ من</span><input type="date" id="start" value="${iso(d)}"></label>
      <div data-only="review tilawa"><label class="field"><span class="lbl">عدد الختمات</span><input type="number" id="cycles" min="1" max="400" step="1" value="1"></label></div></section>
    <section class="card q"><h3><span class="qn" id="qn-name">٧</span>اسم الخطة</h3>
      <label class="field"><input type="text" id="pname" maxlength="60" placeholder="يُقترح تلقائياً" aria-label="اسم الخطة"></label></section>
    <button type="submit" class="btn block big">${editing?'احفظ التعديل':'ابدأ الخطة'}</button>
  </form>`;
}
const rv=(form,n)=>{ const el=form.querySelector(`input[name="${n}"]:checked`); return el?el.value:null; };
/* points are [surah, ayah]; the plan's order (An-Nas first or Al-Fatiha first) decides what "before" and "after" mean */
const dirOf = form => rv(form,'pdir')==='fwd' ? 'fwd' : 'rev';
const ends = dir => dir==='rev' ? {first:[114,1], last:[1,7]} : {first:[1,1], last:[114,6]};
const posOf = (dir,[s,a]) => (dir==='rev' ? 115-s : s)*1000 + a;
const nextPt = (dir,[s,a]) => a<S[s][1] ? [s,a+1] : dir==='rev' ? (s>1?[s-1,1]:null) : (s<114?[s+1,1]:null);
const prevPt = (dir,[s,a]) => a>1 ? [s,a-1] : dir==='rev' ? (s<114?[s+1,S[s+1][1]]:null) : (s>1?[s-1,S[s-1][1]]:null);
const spanOf = (dir,p,q) => ({type:'span', s1:p[0], a1:p[1], s2:q[0], a2:q[1], dir});
function fillSurahs(form){
  const dir=dirOf(form), order=[...Array(114)].map((_,i)=>dir==='rev'?114-i:i+1);
  for(const p of ['m-','b-','e-']){ const el=form.querySelector('#'+p+'s'), v=el.value, none=el.querySelector('option[value="0"]');
    el.innerHTML=(none?'<option value="0">لم أحفظ شيئاً بعد</option>':'')+order.map(s=>`<option value="${s}">${f(s)}. ${NAMES[s-1]}</option>`).join('');
    if(v!=='') el.value=v; }
}
function fillAyat(form,p,want){
  const s=+form.querySelector('#'+p+'s').value, el=form.querySelector('#'+p+'a');
  el.disabled=!s; if(!s){ el.innerHTML='<option value="0">—</option>'; return; }
  const n=S[s][1], keep=want ?? +el.value;
  el.innerHTML=Array.from({length:n},(_,i)=>`<option value="${i+1}">${f(i+1)}</option>`).join('');
  el.value=String(Math.min(n,Math.max(1,keep||n)));
}
function setPt(form,p,pt){ form.querySelector('#'+p+'s').value=pt?pt[0]:0; fillAyat(form,p,pt?pt[1]:0); }
const readPt = (form,p) => { const s=+form.querySelector('#'+p+'s').value; return s ? [s, +form.querySelector('#'+p+'a').value||S[s][1]] : null; };
function initForm(form){
  fillSurahs(form); const {first,last}=ends('rev');
  setPt(form,'m-',null); setPt(form,'b-',first); setPt(form,'e-',last);
}
/* returns {plan} or {err} */
function planFromForm(form){
  const type=rv(form,'ptype'), cyc=type==='review'||type==='tilawa', dir=dirOf(form), {first,last}=ends(dir);
  const m=readPt(form,'m-'), b=readPt(form,'b-'), e=readPt(form,'e-');
  let range, base={type:'none'}, err='';
  if(type==='hifz'||type==='both'){
    const st = m ? nextPt(dir,m) : first;
    if(!st) { err='ما شاء الله، محفوظك يصل إلى آخر المصحف. اختر «مراجعة» بدلاً من الحفظ.'; range=spanOf(dir,first,last); }
    else range=spanOf(dir,st,last);
    if(m) base=spanOf(dir,first,m);
  } else if(type==='review'){
    if(!m){ err='اختر إلى أين وصل حفظك.'; range=spanOf(dir,first,first); } else range=spanOf(dir,first,m);
  } else {
    if(!b || !e || posOf(dir,b)>posOf(dir,e)){ err='اختر بداية قبل النهاية.'; range=spanOf(dir,first,last); } else range=spanOf(dir,b,e);
  }
  const qa=rv(form,'qa'); let unit='page', amt=parseFloat(qa)||1;
  if(qa==='c'){ unit=cyc?form.querySelector('#unit').value:'page'; amt=Math.max(0.1,parseFloat(form.querySelector('#amt').value)||1); if(unit==='juz'){ unit='page'; amt*=20; } }
  const days=[...form.querySelectorAll('input[name=wd]:checked')].map(i=>+i.value).sort();
  const plan={id:'p'+Date.now().toString(36), created:Date.now(), type, tail:0, status:'active', days:days.length?days:[0,1,2,3,4,5,6], start:form.querySelector('#start').value||todayIso(), done:{}};
  const block={range,amt,unit};
  if(cyc){ plan.review=block; plan.cycles=Math.max(1,Math.min(400,parseInt(form.querySelector('#cycles').value)||1)); } else plan.hifz=block;
  if(type==='both'){ plan.near=0; plan.nearPages=Math.max(0,parseFloat(form.querySelector('#near').value)||0); plan.far=Math.max(0,parseFloat(form.querySelector('#far').value)||0); }
  if(!cyc) plan.base=base;
  plan.name=form.querySelector('#pname').value.trim() || `${type==='tilawa'?'ختمة':TYPE_NAME[type]} ${rangeName(range)}`;
  plan.err=err; return plan;
}
function fillForm(form,pl){
  const b=isCycle(pl)?pl.review:pl.hifz, dir=b.range.dir==='rev'?'rev':'fwd';
  setRadio(form,'pdir',dir); setRadio(form,'ptype',pl.type); fillSurahs(form);
  const seq=compute(pl).seq, P=id=>[sOf[id],aNo[id]], {first,last}=ends(dir);
  if(pl.type==='hifz'||pl.type==='both'){ setPt(form,'m-',prevPt(dir,P(seq[0]))); setPt(form,'e-',P(seq[seq.length-1])); setPt(form,'b-',first); }
  else if(pl.type==='review'){ setPt(form,'m-',P(seq[seq.length-1])); setPt(form,'b-',first); setPt(form,'e-',last); }
  else { setPt(form,'m-',null); setPt(form,'b-',P(seq[0])); setPt(form,'e-',P(seq[seq.length-1])); }
  form.dataset.amt = b.unit==='page' && (isCycle(pl)?[1,5,10,20]:[0.25,1/3,0.5,1]).some(v=>Math.abs(v-b.amt)<1e-9) ? String(b.amt) : 'c';
  form.querySelector('#amt').value=Math.round(b.amt*100)/100; form.querySelector('#unit').value=b.unit;
  if(pl.cycles) form.querySelector('#cycles').value=pl.cycles;
  if(pl.type==='both'){ form.querySelector('#near').value=pl.nearPages ?? (pl.near*b.amt); form.querySelector('#far').value=pl.far; }
  form.querySelectorAll('input[name=wd]').forEach(i=>i.checked=pl.days.includes(+i.value));
  form.querySelector('#start').value=pl.start; form.querySelector('#pname').value=pl.name;
}
function syncForm(form,changed){
  const type=rv(form,'ptype'), cyc=type==='review'||type==='tilawa', dir=dirOf(form), {first,last}=ends(dir);
  if(changed){
    if(changed.name==='pdir'){ fillSurahs(form); setPt(form,'e-',last); setPt(form,'b-',first);
      const m=readPt(form,'m-'); if(m) fillAyat(form,'m-'); }
    else if(changed.name==='ptype' && type==='review' && !readPt(form,'m-')) setPt(form,'m-', dir==='rev'?[78,40]:[1,7]);
    else if(/^[mbe]-s$/.test(changed.id||'')){ const p=changed.id.slice(0,2); fillAyat(form,p, p==='b-'?1:S[+changed.value]?.[1]); }
  }
  const til=type==='tilawa', set=til?AMTS.til:cyc?AMTS.rev:AMTS.mem, dflt=til?'10':cyc?'20':'1', want=form.dataset.amt || rv(form,'qa') || dflt;
  const pick = set.some(([v])=>String(v)===want) ? want : dflt;
  form.querySelector('#amts').innerHTML = set.map(([v,l,sub])=>opt('qa',v,l,String(v)===pick,sub)).join('');
  delete form.dataset.amt;
  form.querySelector('#camt').hidden = rv(form,'qa')!=='c';
  form.querySelector('#unitf').hidden = !cyc;
  const hif = type==='hifz'||type==='both';
  form.querySelector('#rq').textContent = hif ? 'أين وصلت في الحفظ؟' : type==='review' ? 'إلى أين وصل حفظك؟' : 'من أين إلى أين؟';
  form.querySelector('#pt-m-').hidden = type==='tilawa';
  form.querySelector('#pt-b-').hidden = type!=='tilawa';
  form.querySelector('#pt-e-').hidden = type!=='tilawa';
  form.querySelector('#m-s option[value="0"]').hidden = type==='review';
  const m=readPt(form,'m-'), startName=NAMES[first[0]-1];
  form.querySelector('#mhint').textContent = type==='tilawa' ? '' : type==='review' ? `تراجع من سورة ${startName} إلى هنا.` :
    m ? (type==='both' ? `يبدأ حفظك الجديد بعدها مباشرة، وتراجع من سورة ${startName} إلى هنا، ويُضاف لها كل ما تحفظه.` : `يبدأ حفظك الجديد بعدها مباشرة، وتستمر حتى سورة ${NAMES[last[0]-1]}.`) : `يبدأ حفظك من سورة ${startName} حتى سورة ${NAMES[last[0]-1]}.`;
  form.querySelectorAll('[data-only]').forEach(el=>el.hidden=!el.dataset.only.split(' ').includes(type));
  const qn=type==='both'?6:5; form.querySelector('#qn-days').textContent=f(qn); form.querySelector('#qn-name').textContent=f(qn+1);
  const p=planFromForm(form), pv=form.querySelector('#preview');
  if(p.err){ pv.textContent=p.err; return; }
  const tmp={...p,id:'__pv'}; cache.delete('__pv');
  const c=compute(tmp), ds=datesOf(tmp);
  if(!c.sessions.length){ pv.textContent='اختر نطاقاً فيه آيات.'; return; }
  const sg=stages(tmp), cs=sg.list[sg.cur], end=stageEnd(tmp,sg,sg.cur)||ds[ds.length-1], fst=c.sessions[0].tasks;
  const span=Math.round((parse(end)-parse(ds[0]))/864e5)+1, days=plural(span,'يوم واحد','يومين','أيام','يوماً');
  const head = sg.list.length>1 ? `${hif?'تختم حفظ':'تنهي'} المرحلة ${f(cs.no)} (${juzNames(cs.js)}) خلال ${days} بإذن الله` : `تنهي ${rangeName(p.hifz?p.hifz.range:p.review.range)} خلال ${days} بإذن الله`;
  const had = hif && cs.pct>0 ? `<span class="good">ممتاز، أنجزت ${f(cs.pct)}٪ من هذه المرحلة بحفظك السابق${sg.cur>0?`، و${plural(sg.cur,'مرحلة كاملة','مرحلتين كاملتين','مراحل كاملة','مرحلة كاملة')} قبلها`:''}.</span>`
    : hif && sg.cur>0 ? `<span class="good">ممتاز، أنهيت ${plural(sg.cur,'مرحلة كاملة','مرحلتين كاملتين','مراحل كاملة','مرحلة كاملة')} بحفظك السابق.</span>` : '';
  pv.innerHTML=`<b>${head}</b><span>${fmtG(end)} · ${fmtH(end)}</span>${had}${fst.map(t=>`<span class="first">${KIND[t.kind]}: ${t.label}</span>`).join('')}`;
}

/* ---------- my progress ---------- */
/* ---------- harvest (stats) ---------- */
function harvest(){
  const mem=new Set(), rev=new Set(), til=new Set(), perDay={}, kinds={h:0,r:0,t:0};
  const today=new Date(); const day0=new Date(today); day0.setDate(today.getDate()-6);
  for(const p of Object.values(state.plans)){ const c=compute(p);
    c.sessions.forEach(s=>s.tasks.forEach(tk=>{ const ts=p.done[tk.key]; if(!ts) return;
      const set = tk.kind==='h'?mem: tk.kind==='t'?til: rev; let n=0;
      for(const [a,b] of tk.rs) for(let id=a;id<=b;id++){ set.add(id); n++; }
      const k = tk.kind==='h'?'h':tk.kind==='t'?'t':'r', di=iso(new Date(+ts));
      (perDay[di]=perDay[di]||{h:0,r:0,t:0})[k]+=n; kinds[k]+=n; })); }
  return {mem,rev,til,perDay,kinds};
}
function ring(vals){ // concentric arcs, fraction of 6236 each
  const R=[54,42,30], col=['var(--h)','var(--f)','var(--t)'];
  return `<svg viewBox="0 0 130 130" width="130" height="130" role="img" aria-label="نصيبك من المصحف">${vals.map((v,i)=>{ const r=R[i], C=2*Math.PI*r, len=Math.max(0,Math.min(1,v/NA))*C;
    return `<circle cx="65" cy="65" r="${r}" fill="none" stroke="var(--raised)" stroke-width="9"/><circle cx="65" cy="65" r="${r}" fill="none" stroke="${col[i]}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${len.toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 65 65)" ${len<0.5?'opacity="0"':''}/>`; }).join('')}</svg>`;
}
function weekCmp(perDay){ const sum=(a,b)=>{ let n=0; for(let i=a;i<=b;i++){ const d=new Date(); d.setDate(d.getDate()-i); const v=perDay[iso(d)]; if(v) n+=v.h+v.r+v.t; } return n; };
  const a=sum(0,6), b=sum(7,13); if(!a&&!b) return '';
  const up=a>=b, pct=b?Math.round(Math.abs(a-b)/b*100):0;
  return `<div class="wkcmp"><span>هذا الأسبوع <b>${f(a)}</b> آية</span><span>الأسبوع الماضي <b>${f(b)}</b></span>${b?`<em class="${up?'up':'down'}">${up?'▲':'▼'} ${f(pct)}٪</em>`:''}</div>`; }
function monthCard(perDay){ const now=new Date(), y=now.getFullYear(), m=now.getMonth(), n=new Date(y,m+1,0).getDate(), first=new Date(y,m,1).getDay(), t=todayIso();
  let on=0, cells=''; for(let i=0;i<first;i++) cells+='<i class="mc0"></i>';
  for(let d=1; d<=n; d++){ const k=iso(new Date(y,m,d)), v=perDay[k], tot=v?v.h+v.r+v.t:0, lv=!tot?0:tot<20?1:tot<60?2:3; if(tot) on++;
    cells+=`<i class="mc l${lv}${k===t?' td':''}${k>t?' fu':''}" title="${f(d)}">${f(d)}</i>`; }
  const past=Math.min(n, now.getDate());
  return `<section class="card"><div class="tile-row"><h3 style="margin:0">هذا الشهر</h3><span class="small muted">أيام الإنجاز <b style="color:var(--accent)">${f(on)}</b> من ${f(past)}</span></div>
    <div class="mcal">${['ح','ن','ث','ر','خ','ج','س'].map(x=>`<b>${x}</b>`).join('')}${cells}</div>
    <div class="mclg small muted"><span>أقل</span><i class="mc l1"></i><i class="mc l2"></i><i class="mc l3"></i><span>أكثر</span></div></section>`; }
function weekChart(perDay){
  const days=[]; for(let i=6;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); days.push(iso(d)); }
  const vals=days.map(d=>perDay[d]||{h:0,r:0,t:0}), max=Math.max(10,...vals.map(v=>v.h+v.r+v.t));
  const W=320,H=150,pl=8,pb=22,bw=26, step=(W-pl*2)/7;
  let bars='';
  vals.forEach((v,i)=>{ const x=(LANG==='en'?pl+step*(i+0.5):W-pl-step*(i+0.5))-bw/2; let y=H-pb;
    for(const [k,c] of [['h','var(--h)'],['r','var(--f)'],['t','var(--t)']]){ const h=(v[k]/max)*(H-pb-14); if(h>0){ y-=h; bars+=`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw}" height="${h.toFixed(1)}" rx="3" fill="${c}"/>`; } }
    const tot=v.h+v.r+v.t; if(tot) bars+=`<text x="${(x+bw/2).toFixed(1)}" y="${(y-4).toFixed(1)}" text-anchor="middle" font-size="10" fill="var(--muted)">${f(tot)}</text>`;
    bars+=`<text x="${(x+bw/2).toFixed(1)}" y="${H-6}" text-anchor="middle" font-size="10" fill="${i===6?'var(--ink)':'var(--muted)'}" font-weight="${i===6?700:400}">${i===6?'اليوم':['أحد','اثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'][parse(days[i]).getDay()]}</text>`; });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="الآيات المنجزة في آخر سبعة أيام"><line x1="${pl}" x2="${W-pl}" y1="${H-pb}" y2="${H-pb}" stroke="var(--line)"/>${bars}</svg>`;
}

/* how much of each kind of task was done, counting partial work (3 of 5 pages = 60%) */
function stepCard(){
  const tot={}, got={}, t=todayIso();
  for(const p of Object.values(state.plans)){ if(status(p)==='paused') continue; const c=compute(p), ds=datesOf(p);
    c.sessions.forEach((s,k)=>s.tasks.forEach(tk=>{ const g=gotOf(p,tk); if(ds[k]>t && !g) return; const n=stepsOf(tk);
      tot[tk.kind]=(tot[tk.kind]||0)+n; got[tk.kind]=(got[tk.kind]||0)+g; })); }
  const rows=['h','n','f','r','t'].filter(k=>tot[k]).map(k=>{ const u=k==='h'?2:1, pct=Math.round(got[k]/tot[k]*100);
    return `<div class="krow"><b class="kind ${k}">${KIND[k]}</b><div class="bar"><i style="width:${pct}%;background:var(--${k==='r'?'f':k})"></i></div><b>${f(pct)}٪</b>
      <small>${f(Math.round(got[k]/u*10)/10)} من ${f(Math.round(tot[k]/u*10)/10)} وجه</small></div>`; }).join('');
  return rows ? `<section class="card"><h3>نسبة الإنجاز حتى اليوم</h3><div class="small muted">تُحسب من كل ورد حلّ موعده، ويدخل فيها الإنجاز الجزئي.</div>${rows}</section>` : '';
}
function vStats(){
  const h=harvest(), st=streakInfo(), memPages=[...h.mem].reduce((a,id)=>a+pw(id),0);
  const jm=new Float64Array(31); for(const id of h.mem) jm[jOf[id]]+=pw(id);
  const jt=new Float64Array(31); for(let id=1;id<=NA;id++) jt[jOf[id]]+=pw(id);
  return `<header class="hello hello-row"><div><h1>الإنجاز</h1><span>${fmtG(todayIso())}</span></div>${cloudOn()&&auth.s?`<a class="acct-btn" href="#me" aria-label="الحساب"><span class="av">${esc((auth.profile?.first||'؟')[0])}</span></a>`:''}</header><div class="stack">
    ${groupsSection()}
    <div class="tiles three">
      <div class="tile"><b style="color:var(--h)">${f(Math.round(memPages*10)/10)}</b><span>وجه حفظته</span></div>
      <div class="tile"><b style="color:var(--f)">${f(h.kinds.r+h.kinds.t)}</b><span>آية راجعتها أو تلوتها</span></div>
      <div class="tile"><b>${f(st.n)}</b><span>${stkW(st.n)}${st.g?'<small class="grace">استُخدم يوم السماح هذا الأسبوع</small>':''}</span></div>
    </div>
    ${stepCard()}
    ${badgeCard()}
    <button class="btn block rcgo" data-act="shareCard">${IC.share} مشاركة الإنجاز كصورة</button>
    ${(()=>{ const done=[], now=[]; for(let j=1;j<=30;j++){ const r=Math.min(1,jm[j]/jt[j]); if(r>=0.98) done.push(j); else if(r>0) now.push([j,r]); }
      const jn=j=>j===30?'جزء عمّ':j===29?'جزء تبارك':j===28?'جزء قد سمع':`الجزء ${f(j)}`;
      return `<section class="card"><h3>حفظك</h3>
        ${done.length?`<div class="jdone">${done.map(j=>`<span>✓ ${jn(j)}</span>`).join('')}</div>`:''}
        ${now.map(([j,r])=>`<div class="jnow"><div class="tile-row"><b>تحفظ الحين: ${jn(j)}</b><b style="color:var(--accent)">${f(Math.round(r*100))}٪</b></div><div class="bar"><i style="width:${Math.round(r*100)}%"></i></div></div>`).join('')}
        ${!done.length&&!now.length?`<p class="muted" style="margin:6px 0 0">أول وجه تحفظه يظهر هنا 🌱</p>`:''}</section>`; })()}
    <section class="card"><h3>آخر سبعة أيام</h3><div class="row small muted" style="gap:12px"><span><span style="color:var(--h)">●</span> حفظ</span><span><span style="color:var(--f)">●</span> مراجعة</span><span><span style="color:var(--t)">●</span> تلاوة</span></div>${weekChart(h.perDay)}${weekCmp(h.perDay)}</section>
    ${monthCard(h.perDay)}
  </div>`;
}


/* ---------- account screens ---------- */
function vVerify(){
  const e=esc(auth.s.email||'');
  return `<header class="hello auth-h"><div class="orn">✉️</div><h1>أكّد إيميلك</h1><span>أرسلنا رابط التأكيد إلى</span><b dir="ltr" class="vmail">${e}</b></header>
  <div class="card stack">
    <ol class="vsteps"><li>افتح إيميلك واضغط على رابط التأكيد</li><li>بعدها يفتح لك التطبيق تلقائياً</li></ol>
    <p class="small muted" style="margin:0">ما وصلك؟ شيّك على مجلد الرسائل غير المرغوب فيها (Spam).</p>
    <div class="auth-err" id="authErr" role="alert"></div>
    <button class="btn block big" data-act="verifyCheck">أكّدت الإيميل</button>
    <button class="btn ghost block" data-act="verifyResend">أرسل الرابط مرة ثانية</button>
    <button type="button" class="linkbtn" data-act="verifyOut">إيميل غلط؟ سجّل خروج وأنشئ حساب جديد</button>
  </div>`;
}
function vAction(){
  const a=ui.act;
  if(a.st==='busy') return `<header class="hello auth-h act-h"><div class="act-spin" aria-hidden="true"></div><h1>لحظة…</h1><span>${a.mode==='resetPassword'?'نجهّز صفحة تغيير كلمة السر':'نأكّد إيميلك وندخلك التطبيق'}</span></header>`;
  if(a.st==='pass') return `<header class="hello auth-h"><div class="orn">🔑</div><h1>كلمة سر جديدة</h1><span>للحساب</span><b dir="ltr" class="vmail">${esc(a.email)}</b></header>
  <form class="card stack" id="npassf" novalidate>
    <label class="field"><span class="lbl">كلمة السر الجديدة</span><input id="n-pass" type="password" autocomplete="new-password" dir="ltr" minlength="6" required></label>
    <label class="field"><span class="lbl">تأكيد كلمة السر</span><input id="n-pass2" type="password" autocomplete="new-password" dir="ltr" minlength="6" required></label>
    <div class="auth-err" id="authErr" role="alert"></div>
    <button type="submit" class="btn block big">حفظ والدخول</button>
  </form>`;
  return `<header class="hello auth-h"><div class="orn">⏳</div><h1>الرابط انتهى</h1><span>هذا الرابط استُخدم من قبل أو انتهت صلاحيته. اطلب رابطاً جديداً من التطبيق.</span></header>
  <div class="card stack"><button class="btn block big" data-act="actDone">افتح التطبيق</button></div>`;
}
function vAuth(){
  const m=ui.authMode||'up';
  const fld=(id,lbl,type,extra='')=>`<label class="field"><span class="lbl">${lbl}</span><input id="${id}" type="${type}" ${extra}></label>`;
  return `<header class="hello auth-h"><div class="orn">۞</div><h1>ربيع القرآن</h1><span>${m==='in'?'أهلاً بعودتك. سجّل دخولك لتكمل خطتك.':m==='reset'?'نرسل لك رابطاً لتغيير كلمة السر.':'أنشئ حسابك لتُحفظ خطتك وتصل إليها من أي جهاز، وتشارك أصحابك الإنجاز.'}</span></header>
  ${m!=='reset'?`<div class="seg2"><button class="${m==='up'?'on':''}" data-act="authMode" data-m="up">حساب جديد</button><button class="${m==='in'?'on':''}" data-act="authMode" data-m="in">تسجيل الدخول</button></div>`:''}
  <form class="card stack" id="authf" novalidate>
    ${m==='up'?`<div class="grid2">${fld('a-first','الاسم الأول','text','autocomplete="given-name" maxlength="30" required')}${fld('a-last','الاسم الأخير','text','autocomplete="family-name" maxlength="30" required')}</div>
      ${fld('a-email','الإيميل','email','autocomplete="email" dir="ltr" placeholder="name@example.com" required')}
      ${fld('a-phone','رقم الجوال','tel','autocomplete="tel" inputmode="tel" dir="ltr" placeholder="05xxxxxxxx" maxlength="16" required')}`
    :fld('a-id',m==='reset'?'الإيميل':'رقم الجوال أو الإيميل','text',`autocomplete="username" dir="ltr" required value="${esc(ui.prefill||'')}"`)}
    ${m==='in'&&ui.authNote?`<p class="auth-ok">${esc(ui.authNote)}</p>`:''}
    ${m!=='reset'?fld('a-pass','كلمة السر','password',`autocomplete="${m==='up'?'new-password':'current-password'}" dir="ltr" minlength="6" required`):''}
    ${m==='up'?fld('a-pass2','تأكيد كلمة السر','password','autocomplete="new-password" dir="ltr" minlength="6" required'):''}
    <div class="auth-err" id="authErr" role="alert"></div>
    <button type="submit" class="btn block big">${m==='up'?'إنشاء الحساب':m==='in'?'دخول':'أرسل الرابط'}</button>
    ${m!=='reset'?`<p class="small muted" style="text-align:center;margin:0">🔒 يبقى دخولك محفوظ على هذا الجهاز، وما تحتاج تسجّل كل مرة</p>`:''}
    ${m==='in'?`<button type="button" class="linkbtn" data-act="authMode" data-m="reset">نسيت كلمة السر؟</button>`:''}
    ${m==='reset'?`<button type="button" class="linkbtn" data-act="authMode" data-m="in">رجوع لتسجيل الدخول</button>`:''}
  </form>
  ${m==='up'?`<p class="small muted" style="text-align:center">بياناتك محفوظة لك وحدك، ولا يرى أصحابك إلا اسمك وإنجازك.</p>`:''}`;
}
async function submitAuth(form){
  const v=id=>(form.querySelector('#'+id)?.value||'').trim(), err=form.querySelector('#authErr'), btn=form.querySelector('[type=submit]'), m=ui.authMode||'up';
  const say=t=>{ err.textContent=t; };
  const mailOk=e=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  say('');
  if(m!=='up'){
    const raw=v('a-id'), id=raw.includes('@')?raw:normDigits(raw);
    if(!id) return say('اكتب رقم الجوال أو الإيميل.');
    if(id.includes('@')?!mailOk(id):!phoneOk(id)) return say('اكتب رقم الجوال أو الإيميل بشكل صحيح.');
    if(m==='reset'){
      btn.disabled=true;
      try{
        if(!id.includes('@')){ say('اكتب إيميلك، ونرسل لك عليه رابط تغيير كلمة السر.'); btn.disabled=false; return; }
        await resetPassword(id); toast('أرسلنا الرابط إلى إيميلك'); ui.authMode='in'; render();
      }catch(e){ say(e.message); }
      btn.disabled=false; return;
    }
    const pass=form.querySelector('#a-pass').value;
    if(pass.length<6) return say('كلمة السر ٦ أحرف أو أكثر.');
    btn.disabled=true; btn.textContent='لحظة…';
    try{ await signIn(id,pass); toast(`أهلاً ${auth.profile?.first||''}`); afterAuth(); }catch(e){ say(e.message); btn.disabled=false; btn.textContent='دخول'; }
    return;
  }
  const pass=form.querySelector('#a-pass').value;
  {
    const first=v('a-first'), last=v('a-last'), phone=normDigits(v('a-phone')), email=v('a-email');
    /* every empty field gets a red star, and their names are listed above the button */
    const pass2=form.querySelector('#a-pass2').value;
    const req=[['a-first','الاسم الأول',first],['a-last','الاسم الأخير',last],['a-email','الإيميل',email],['a-phone','رقم الجوال',phone],['a-pass','كلمة السر',pass],['a-pass2','تأكيد كلمة السر',pass2]];
    form.querySelectorAll('.field.miss').forEach(f=>f.classList.remove('miss'));
    form.oninput=e=>e.target.closest('.field')?.classList.remove('miss');
    const miss=req.filter(r=>!r[2]);
    if(miss.length){ miss.forEach(r=>form.querySelector('#'+r[0])?.closest('.field')?.classList.add('miss')); return say('الخانات الناقصة: '+miss.map(r=>r[1]).join('، ')); }
    const bad=(id,t)=>{ form.querySelector('#'+id)?.closest('.field')?.classList.add('miss'); say(t); };
    if(!mailOk(email)) return bad('a-email','الإيميل غير صحيح، مثال: name@example.com');
    if(!phoneOk(phone)) return bad('a-phone','رقم الجوال غير صحيح، مثال: 05xxxxxxxx');
    if(pass.length<6) return bad('a-pass','كلمة السر ٦ أحرف أو أكثر.');
    if(pass!==pass2) return bad('a-pass2','كلمتا السر غير متطابقتين.');
    btn.disabled=true; btn.textContent='لحظة…';
    try{ await signUp({first,last,phone,email,password:pass}); toast(`أهلاً ${first}، حياك الله`); afterAuth(); }catch(e){ say(e.message); btn.disabled=false; btn.textContent='إنشاء الحساب'; }
  }
}
/* asked once when only one of phone / email was written */
function authMissSheet(miss){
  const em=miss==='email';
  openSheet(`${sheetHead(em?'متأكد ما تبي تضيف إيميلك؟':'متأكد ما تبي تضيف رقم جوالك؟')}<div class="stack">
    <p class="muted" style="margin:0">${em?'الإيميل يفيدك لو نسيت كلمة السر، نرسل لك عليه رابط تغييرها.':'رقم الجوال يخليك تدخل به بسهولة، ويسهّل نتواصل معك لو احتجت مساعدة.'}</p>
    <button class="btn block big" data-act="authAddMiss" data-f="${em?'a-email':'a-phone'}">${em?'أضيف الإيميل':'أضيف رقم الجوال'}</button>
    <button class="btn block ghost" data-act="authSkipMiss" data-f="${miss}">متأكد، كمّل بدونه</button></div>`);
}
function afterAuth(){ syncLabel(); const j=ui.pendingJoin; if(j){ ui.pendingJoin=null; location.hash='#join-'+j; } else render(); }
const lb=(act,title,sub,extra='')=>`<button class="listbtn${extra}" data-act="${act}"><span>${title}${sub?`<small>${sub}</small>`:''}</span><i class="chev">${IC.back}</i></button>`;
function vMe(){
  const pr=auth.profile||{}, on=cloudOn()&&auth.s;
  return `<header class="hello"><h1>الحساب</h1><span>${on?'البيانات والدعم الفني':'الدعم الفني وعن التطبيق'}</span></header><div class="stack">
    ${on?`<section class="card me-card"><span class="av big">${esc((pr.first||'؟')[0])}</span><div class="acct"><b>${esc(myName()||'—')}</b>${realEmail()?`<span dir="ltr">${esc(realEmail())}</span>`:''}${pr.phone?`<span dir="ltr">${esc(pr.phone)}</span>`:''}</div></section>
    <div class="me-list">${lb('editProfile','تعديل البيانات',isPhoneMail(auth.s?.email)?'الاسم':'الاسم ورقم الجوال')}${realEmail()?lb('changePass','تغيير كلمة السر','نرسل لك رابطاً على إيميلك'):''}</div>`:''}
    <h3 class="me-h">الدعم الفني</h3>
    <div class="me-list">${on?lb('support','راسلنا','اقتراح، مشكلة، أو سؤال. نقرأ كل رسالة'):''}${lb('faq','أسئلة شائعة','كيف أبدأ، المراحل، الأصحاب')}</div>
    <h3 class="me-h">لون التطبيق</h3>
    <div class="thpick">${THS.map(([k,l])=>`<button class="${appTh()===k?'on':''}" data-act="appTh" data-k="${k}"><i class="thsw th-${k}"></i>${l}</button>`).join('')}</div>
    <div class="me-list"><button class="listbtn mmi swrow" data-act="setNoMus" data-k="${noMus()?'0':'1'}" role="switch" aria-checked="${noMus()?'false':'true'}">${IC2.pg}<span>المصحف في القائمة<small>يضيف زر المصحف للقائمة اللي تحت</small></span><i class="sw ${noMus()?'':'on'}"><b></b></i></button></div>
    <div class="me-list"><button class="listbtn mmi swrow" data-act="setNoAI" data-k="${noAI()?'0':'1'}" role="switch" aria-checked="${noAI()?'false':'true'}">${IC.mic}<span>التسميع بالصوت<small>أزرار التسميع والمصحّح الذكي والعادي</small></span><i class="sw ${noAI()?'':'on'}"><b></b></i></button>${noAI()?'':`<button class="listbtn mmi swrow" data-act="setVoice" data-k="${vcOn()?'0':'1'}" role="switch" aria-checked="${vcOn()?'true':'false'}">${IC.mic}<span>المساهمة في تحسين المصحّح<small>نحفظ تسجيلات تسميعك بدون اسمك لتدريب المصحّح، وإيقافه يحذفها كلها</small></span><i class="sw ${vcOn()?'on':''}"><b></b></i></button>`}</div>
    ${isAdm()?`<h3 class="me-h">الإدارة</h3><div class="me-list">${mmB('admOpen','الرسائل والتقييمات','كل ما يرسله المستخدمون',IC2.chat)}</div>`:''}
    <h3 class="me-h">التطبيق</h3>
    <div class="me-list">${mmB('langOpen','اللغة',LANG==='en'?'English':'العربية',IC2.lang)}${mmB('rateOpen','قيّم التطبيق','رأيك يساعدنا نحسّنه',IC2.star)}${mmB('shareApp','مشاركة','الدال على الخير كفاعله',IC2.shr)}${mmB('feedback','رأيك يهمنا','اقتراح أو ملاحظة، نقرأ كل رسالة',IC2.chat)}${mmB('install','ثبّت التطبيق على جوالك','يفتح مثل التطبيق وبدون إنترنت',IC2.inst)}${mmB('about','عن التطبيق','',IC2.info)}</div>
    <h3 class="me-h">التلاوات</h3>
    <div class="me-list">${mmB('dlOpen','تحميل التلاوات','تسمعها بدون إنترنت',IC2.dl)}</div>
    ${on?`<div class="me-list">${lb('signOut','تسجيل الخروج','')}</div>
    <button class="linkbtn danger" data-act="delAcct" style="align-self:center">حذف الحساب</button>`:''}
    <p class="small muted" style="text-align:center;margin:0">ربيع القرآن · الإصدار ${verTxt()}</p>
  </div>`;
}
const sheetHead=t=>`<div class="sheet-head"><button class="icon-btn" data-act="closeSheet" aria-label="إغلاق">${IC.x}</button><h3>${t}</h3><span></span></div>`;
function profileSheet(){
  const pr=auth.profile||{};
  openSheet(`${sheetHead('تعديل البيانات')}<form class="stack" id="proff">
    <div class="row2"><label class="field"><span class="lbl">الاسم الأول</span><input type="text" id="p-first" value="${esc(pr.first||'')}" autocomplete="given-name"></label>
    <label class="field"><span class="lbl">الاسم الأخير</span><input type="text" id="p-last" value="${esc(pr.last||'')}" autocomplete="family-name"></label></div>
    ${isPhoneMail(auth.s.email)?`<p class="small muted" style="margin:0">رقم الجوال (تدخل به): <span dir="ltr">${esc(pr.phone||'')}</span></p>`
      :`<label class="field"><span class="lbl">رقم الجوال (اختياري)</span><input type="tel" id="p-phone" dir="ltr" value="${esc(pr.phone||'')}" autocomplete="tel" placeholder="05xxxxxxxx"></label>`}
    ${realEmail()?`<p class="small muted" style="margin:0">الإيميل: <span dir="ltr">${esc(realEmail())}</span></p>`:''}
    <div class="auth-err" id="profErr" role="alert"></div>
    <button type="submit" class="btn block big">حفظ</button></form>`);
}
async function submitProfile(form){
  const v=id=>form.querySelector('#'+id).value.trim(), err=form.querySelector('#profErr');
  const first=v('p-first'), last=v('p-last'), pf=form.querySelector('#p-phone'), old=auth.profile?.phone||'', phone=pf?normDigits(pf.value.trim()):old;
  if(!first||!last){ err.textContent='اكتب اسمك الأول والأخير.'; return; }
  if(phone && !phoneOk(phone)){ err.textContent='اكتب رقم الجوال بشكل صحيح.'; return; }
  const btn=form.querySelector('[type=submit]'); btn.disabled=true;
  if(pf && phone && phoneKey(phone)!==phoneKey(old)){ const l=await loginOf(phone); if(l && l.u!==auth.s.uid){ err.textContent='رقم الجوال هذا مسجّل في حساب ثاني.'; btn.disabled=false; return; } }
  try{ await saveProfile({first,last,phone});
    if(pf && phoneKey(phone)!==phoneKey(old)){ if(old) await setLogin(old,null); if(phone) await setLogin(phone,true); }
    closeSheet(); toast('حُفظت بياناتك'); rerender(); }catch(e){ err.textContent='تعذّر الحفظ، تأكد من الإنترنت.'; btn.disabled=false; }
}
function supportSheet(){
  openSheet(`${sheetHead('راسلنا')}<form class="stack" id="supf">
    <p class="small muted" style="margin:0">اكتب اقتراحك أو المشكلة اللي واجهتك، ونرد عليك على إيميلك أو جوالك بإذن الله.</p>
    <label class="field"><span class="lbl">رسالتك</span><textarea id="s-msg" maxlength="2000" rows="4" placeholder="مثلاً: أتمنى تضيفون…"></textarea></label>
    <div id="attbox" class="attbox">${attHtml()}</div>
    <div class="auth-err" id="supErr" role="alert"></div>
    <button type="submit" class="btn block big">إرسال</button></form>`);
}
async function submitSupport(form){
  const msg=form.querySelector('#s-msg').value.trim(), err=form.querySelector('#supErr');
  if(attRec){ err.textContent='وقّف التسجيل أولاً.'; return; }
  if(msg.length<3 && !attHas(ui.att)){ err.textContent='اكتب رسالتك أو سجّل رسالة صوتية.'; return; }
  const btn=form.querySelector('[type=submit]'); btn.disabled=true; btn.textContent='لحظة…';
  try{ await sendSupport(msg||(ui.att&&ui.att.voice?'🎤 رسالة صوتية':'📷 صور'), ui.att); ui.att=null; closeSheet(); toast('وصلت رسالتك، جزاك الله خيراً'); }catch(e){ err.textContent='تعذّر الإرسال، تأكد من الإنترنت.'; btn.disabled=false; btn.textContent='إرسال'; }
}
const FAQ=[
  ['كيف أبدأ؟','اضغط زر + تحت، واختر نوع خطتك وأيامك ومقدارك. بعدها تلقى مهام كل يوم في «المهام».'],
  ['ما فاتني اليوم، وش يصير؟','الحفظ الجديد اللي ما خلصته ينتقل لليوم اللي بعده، فما يتراكم عليك ولا يضيع.'],
  ['وش هي المراحل؟','قسمنا القرآن عشر مراحل، كل مرحلة ثلاثة أجزاء بترتيب حفظك. محفوظك السابق محسوب من ضمنها.'],
  ['كيف يكون الحفظ مع الأصحاب؟','من قائمة الخطة اختر «الحفظ مع الأصحاب» وأرسل له الكود. هو يدخله من «الانضمام بكود»، وتشوفون إنجاز بعض في «الإنجاز».'],
  ['هل يرى الأصحاب البيانات؟','لا. يشوفون اسمك وإنجازك في الخطة المشتركة فقط، أما إيميلك وجوالك فما يشوفها أحد.'],
  ['عند تغيير الجوال، هل تضيع الخطط؟','لا. سجّل دخولك بنفس الإيميل وتلقى خططك كلها.']
];
function faqSheet(){ openSheet(`${sheetHead('أسئلة شائعة')}<div class="stack">${FAQ.map(([q,a])=>`<details class="faq"><summary>${q}</summary><p>${a}</p></details>`).join('')}</div>`); }
