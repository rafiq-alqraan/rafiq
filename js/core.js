/* ---------- formatting ---------- */
const nf = new Intl.NumberFormat(LANG==='en'?'en-US':'ar-EG',{maximumFractionDigits:1});
const f = n => nf.format(n);
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const WD = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const parse = s => { const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d,12); };
const todayIso = () => iso(new Date());
const fmtG = s => parse(s).toLocaleDateString(LANG==='en'?'en-GB':'ar-EG',{day:'numeric',month:'long',year:'numeric'});
const fmtShort = s => parse(s).toLocaleDateString(LANG==='en'?'en-GB':'ar-EG',{day:'numeric',month:'short'});
let fmtH; try{ const hf=new Intl.DateTimeFormat(LANG==='en'?'en-u-ca-islamic-umalqura':'ar-SA-u-ca-islamic-umalqura',{day:'numeric',month:'long',year:'numeric'}); fmtH=s=>hf.format(parse(s)); }catch(e){ fmtH=()=> ''; }

/* ---------- sequences & chunks ---------- */
/* earlier memorisation is ordered like the new memorisation, so its last part is the bit next to where today's memorising starts */
function orient(ids,dir){
  const sorted=[...ids].sort((x,y)=>x-y); if(dir!=='rev') return sorted;
  const groups=[]; for(const id of sorted){ const g=groups[groups.length-1]; if(g && sOf[g[0]]===sOf[id]) g.push(id); else groups.push([id]); }
  return groups.reverse().flat();
}
function buildSeq(r){
  if(!r || r.type==='none') return [];
  if(r.type==='span'){ // from (s1,a1) to (s2,a2); s1>s2 means memorising upward, surah by surah
    const clampA=(s,a)=>Math.max(1,Math.min(S[s][1],a||1));
    let {s1,a1,s2,a2}=r; a1=clampA(s1,a1); a2=clampA(s2,a2);
    const id=(s,a)=>S[s][0]+a-1, ids=[];
    if(s1<s2 || (s1===s2 && a1<=a2)){ for(let i=id(s1,a1);i<=id(s2,a2);i++) ids.push(i); return ids; }
    if(s1===s2){ for(let i=id(s1,a2);i<=id(s1,a1);i++) ids.push(i); return ids; }
    for(let s=s1;s>=s2;s--){ const lo= s===s2?1:(s===s1?a1:1), hi = s===s2?a2:S[s][1]; for(let a=lo;a<=hi;a++) ids.push(id(s,a)); }
    return ids;
  }
  const segs=[];
  if(r.type==='juz'){ const a=Math.min(r.from,r.to), b=Math.max(r.from,r.to), lo=JZ[a], hi=JZ[b+1]-1;
    // split into surah pieces so "from An-Nas upward" walks surah by surah
    for(let id=lo; id<=hi; ){ const s=sOf[id], end=Math.min(hi, S[s][0]+S[s][1]-1); segs.push([id,end]); id=end+1; } }
  else { const a=r.type==='all'?1:Math.min(r.from,r.to), b=r.type==='all'?114:Math.max(r.from,r.to); for(let s=a;s<=b;s++) segs.push([S[s][0],S[s][0]+S[s][1]-1]); }
  if(r.dir==='rev') segs.reverse();
  const ids=[]; for(const [x,y] of segs) for(let i=x;i<=y;i++) ids.push(i);
  return ids;
}
function chunk(ids, amt, unit, from=0){
  const out=[], n=ids.length; let i=0;
  while(i<n){
    let acc=0, j=i;
    while(j<n){
      const w=i>=from&&unit!=='ayah'?lwp(ids[j])*(amt<1&&pOf[ids[j]]<=2?amt*pOf[ids[j]]:1):W(ids[j],unit); /* short daily amounts: Al-Fatihah is one session, Al-Baqarah's first page two */
      if(acc+w>amt+1e-6 && j>i){ if(acc+w-amt < amt-acc){acc+=w;j++;} break; }
      acc+=w; j++;
      if(acc>=amt-1e-6) break;
    }
    /* a surah's tail lighter than a quarter page is finished today, so tomorrow starts a fresh surah */
    if(i>=from && j<n && sOf[ids[j]]===sOf[ids[j-1]] && ids[j]===ids[j-1]+1){ let e=j, tw=0; while(e<n && sOf[ids[e]]===sOf[ids[j]] && ids[e]===ids[e-1]+1){ tw+=lwp(ids[e]); e++; }
      if(e===n || sOf[ids[e]]!==sOf[ids[j]]){ if(tw<=Math.min(0.1, unit==='ayah'?1:amt/2)+1e-6) j=e; } }
    out.push([i,j-1]); i=j;
  }
  if(out.length>1){ const t=out[out.length-1]; let tw=0; for(let k=t[0];k<=t[1];k++) tw+=W(ids[k],unit);
    if(tw<amt*0.25){ out.pop(); out[out.length-1][1]=t[1]; } }
  return out;
}
const seqWeight = ids => ids.reduce((a,id)=>a+pw(id),0);
/* reading plans by the hizb or juz follow the mushaf's real quarter marks (QD.hizbq), not a page count */
let QI=null, QW=null;
function quarters(){ if(QI) return; QI=[]; QW=[0]; let q=0; for(let id=1;id<pOf.length;id++){ while(q<240 && QD.hizbq[q+1]<=id) q++; QI[id]=q; QW[q]=(QW[q]||0)+pw(id); } }
const hzQ = p => p && p.type==='tilawa' && !isWerd(p) && p.review && p.review.unit==='page' && [2.5,5,7.5,10,20].some(v=>Math.abs(v-p.review.amt)<1e-9) ? p.review.amt/2.5 : 0;
function chunkQ(ids,n){
  quarters(); const out=[], L=ids.length; let i=0;
  while(i<L){
    let acc=0, j=i;
    while(j<L){
      const q=QI[ids[j]]; let e=j, w=0; while(e<L && QI[ids[e]]===q){ w+=pw(ids[e]); e++; } w/=QW[q]||1;
      if(acc+w>n+1e-6 && j>i){ if(acc+w-n < n-acc){ acc+=w; j=e; } break; }
      acc+=w; j=e; if(acc>=n-1e-6) break;
    }
    out.push([i,j-1]); i=j;
  }
  if(out.length>1){ const t=out[out.length-1]; let w=0; for(let k=t[0];k<=t[1];k++) w+=pw(ids[k])/(QW[QI[ids[k]]]||1);
    if(w<n*0.25){ out.pop(); out[out.length-1][1]=t[1]; } }
  return out;
}
const rchunk = (p,ids,from) => hzQ(p) ? chunkQ(ids,hzQ(p)) : chunk(ids,p.review.amt,p.review.unit,from);


/* a slice of a sequence -> contiguous runs of ayah ids */
function runs(ids,i0,i1){
  const r=[]; let a=ids[i0], b=a;
  for(let k=i0+1;k<=i1;k++){ const id=ids[k]; if(id===b+1 && sOf[id]===sOf[b]) b=id; else if(id===b+1){ b=id; } else { r.push([a,b]); a=b=id; } }
  r.push([a,b]); return r;
}
function runLabel([a,b]){
  const s1=sOf[a], s2=sOf[b];
  if(s1===s2){ const st=aNo[a]===1, en=aNo[b]===S[s1][1], n=NAMES[s1-1];
    /* ayah numbers only where the range starts or stops partway through a surah */
    if(st&&en) return `سورة ${n}`;
    if(st) return `${n} إلى ${f(aNo[b])}`;
    if(en) return `${n} من ${f(aNo[a])}`;
    return `${n} ${f(aNo[a])}${a!==b?'–'+f(aNo[b]):''}`; }
  return `${ptFrom(a)} إلى ${ptTo(b)}`;
}
/* "الذاريات ٨ إلى ق": a surah's name alone when the run starts at its first ayah or ends at its last */
const ptFrom=a=>NAMES[sOf[a]-1]+(aNo[a]>1?' '+f(aNo[a]):'');
const ptTo=b=>NAMES[sOf[b]-1]+(aNo[b]<S[sOf[b]][1]?' '+f(aNo[b]):'');
/* runs that go surah after surah with nothing skipped read as one span */
function spanLabel(rs){
  if(rs.length<2) return null;
  for(let i=0;i<rs.length;i++){ const [a,b]=rs[i];
    if(i>0 && aNo[a]!==1) return null;
    if(i<rs.length-1 && aNo[b]!==S[sOf[b]][1]) return null;
    if(i>0 && Math.abs(sOf[a]-sOf[rs[i-1][1]])!==1) return null; }
  return `${ptFrom(rs[0][0])} إلى ${ptTo(rs[rs.length-1][1])}`;
}
function describe(rs){
  let pages=0, pmin=999, pmax=0;
  for(const [a,b] of rs){ for(let id=a;id<=b;id++) pages+=pw(id); pmin=Math.min(pmin,pOf[a],pOf[b]); pmax=Math.max(pmax,pOf[a],pOf[b]); }
  const label = spanLabel(rs) || (rs.length>4 ? `${ptFrom(rs[0][0])} إلى ${ptTo(rs[rs.length-1][1])}` : rs.map(runLabel).join('، '));
  const [a,b]=rs[0];
  const link = sOf[a]===sOf[b] ? `https://quran.com/${sOf[a]}/${aNo[a]}-${aNo[b]}` : `https://quran.com/${sOf[a]}/${aNo[a]}`;
  return {rs, label, pages, pr: pmin===pmax?`ص ${f(pmin)}`:`ص ${f(pmin)}–${f(pmax)}`, link};
}

/* ---------- plan model ---------- */
const KIND = {h:'حفظ جديد', n:'مراجعة قريبة', f:'مراجعة بعيدة', r:'مراجعة', t:'تلاوة'};
const TYPE_NAME = {hifz:'حفظ', review:'مراجعة', both:'حفظ ومراجعة', tilawa:'تلاوة'};
const isCycle = p => p.type==='review' || p.type==='tilawa';
/* ready-made recommended awrad: a recitation plan of one fixed passage, read again on each of its days.
   A missed day is simply missed: no «late» count and no catching up. Sessions reach about a year past today. */
const WERDS = {
  kahf:  {name:'سورة الكهف', s:18, a1:1,   a2:110, days:[5], when:'كل جمعة', slot:'d'},
  mulk:  {name:'سورة الملك', s:67, a1:1,   a2:30,  days:[0,1,2,3,4,5,6], when:'كل يوم، ويُستحب ليلاً', slot:'n'},
  baqara:{name:'آخر آيتين من سورة البقرة', s:2, a1:285, a2:286, days:[0,1,2,3,4,5,6], when:'كل ليلة', slot:'n'},
  imran: {name:'خواتيم سورة آل عمران', s:3, a1:190, a2:200, days:[0,1,2,3,4,5,6], when:'عند الاستيقاظ من النوم', slot:'w'},
  sajda: {name:'سورة السجدة', s:32, a1:1, a2:30, days:[0,1,2,3,4,5,6], when:'كل ليلة قبل النوم، مع سورة الملك', slot:'n'},
  kursiN:{name:'آية الكرسي قبل النوم', s:2, a1:255, a2:255, days:[0,1,2,3,4,5,6], when:'كل ليلة قبل النوم', slot:'n'},
  kursiS:{name:'آية الكرسي دبر الصلوات', s:2, a1:255, a2:255, days:[0,1,2,3,4,5,6], when:'بعد كل صلاة مكتوبة', slot:'s'},
  muaAM: {name:'الإخلاص والمعوذتان صباحاً ومساءً', s:112, a1:1, s2:114, a2:6, days:[0,1,2,3,4,5,6], when:'ثلاث مرات في الصباح وفي المساء', slot:'m'},
  muaN:  {name:'الإخلاص والمعوذتان قبل النوم', s:112, a1:1, s2:114, a2:6, days:[0,1,2,3,4,5,6], when:'قبل النوم، مع النفث في الكفين', slot:'n'},
  muaS:  {name:'المعوذات دبر الصلوات', s:112, a1:1, s2:114, a2:6, days:[0,1,2,3,4,5,6], when:'بعد كل صلاة مكتوبة', slot:'s'},
  kafir: {name:'سورة الكافرون', s:109, a1:1, a2:6, days:[0,1,2,3,4,5,6], when:'كل ليلة قبل النوم', slot:'n'}
};
const isWerd = p => !!(p && p.werd && WERDS[p.werd]);
/* the times of day «مهام اليوم» is split into; a plan that is not a werd belongs to the day as a whole */
const SLOTS = [['w','عند الاستيقاظ','🌅'],['d','ورد اليوم','📖'],['m','أذكار الصباح والمساء','☀️'],['s','بعد الصلوات','🕌'],['n','قبل النوم','🌙']];
const slotOf = p => isWerd(p) ? (WERDS[p.werd].slot||'d') : 'd';
const slotNow = () => { const h=new Date().getHours(); return h>=3&&h<10 ? 'w' : h>=20||h<3 ? 'n' : ''; };
function werdN(p){ const days=new Set(p.days&&p.days.length?p.days:[0,1,2,3,4,5,6]), d=parse(p.start), end=parse(todayIso()); end.setDate(end.getDate()+400);
  const span=Math.round((end-d)/864e5)+1; if(span<=0) return 1; let n=Math.floor(span/7)*days.size; const x=new Date(d); x.setDate(x.getDate()+Math.floor(span/7)*7);
  for(let i=0;i<span%7;i++){ if(days.has(x.getDay())) n++; x.setDate(x.getDate()+1); } return Math.max(1,n); }
const cyclesOf = p => isWerd(p) ? werdN(p) : p.cycles;
function werdPlan(key){ const w=WERDS[key], t=todayIso();
  return {id:'p'+Date.now().toString(36), created:Date.now(), type:'tilawa', werd:key, tail:0, status:'active', days:w.days.slice(), start:t, done:{},
    review:(r=>({range:r, amt:buildSeq(r).length, unit:'ayah'}))({type:'span', s1:w.s, a1:w.a1, s2:w.s2||w.s, a2:w.a2, dir:'fwd'}), cycles:1, name:w.name}; }
const cache = new Map();
/* plans made before the «finish a light surah tail» rule keep their old split until the owner opts in; plan.tail is the sequence index the rule starts at */
const tailFrom = p => p.tail==null ? Infinity : p.tail;
function compute(plan){
  const ck = JSON.stringify([plan.type,plan.hifz,plan.review,plan.base,plan.near,plan.far,cyclesOf(plan),plan.tail]);
  let c = cache.get(plan.id); if(c && c.ck===ck) return c;
  const sessions=[];
  if(isCycle(plan)){
    const kind = plan.type==='tilawa'?'t':'r';
    const seq=buildSeq(plan.review.range), ch=rchunk(plan,seq,tailFrom(plan)), m=ch.length;
    const dsc=[]; for(let k=0;k<m*cyclesOf(plan);k++){ const [i0,i1]=ch[k%m], d=isWerd(plan)?(dsc[k%m]||=describe(runs(seq,i0,i1))):describe(runs(seq,i0,i1)); sessions.push({tasks:[{key:k+'r',kind,cycle:Math.floor(k/m)+1,...d}]}); }
    c={ck,sessions,seq,perCycle:m};
  } else {
    const seq=buildSeq(plan.hifz.range), ch=chunk(seq,plan.hifz.amt,plan.hifz.unit,tailFrom(plan));
    const base = plan.type==='both' ? orient(buildSeq(plan.base), plan.hifz.range.dir) : [];
    const pool = base.concat(seq), P=[0]; for(const id of pool) P.push(P[P.length-1]+pw(id));
    const near = plan.type==='both' ? (plan.near||0) : 0, far = plan.type==='both' ? (plan.far||0) : 0;
    ch.forEach(([i0,i1],k)=>{
      const tasks=[{key:k+'h',kind:'h',i0,i1,...describe(runs(seq,i0,i1))}];
      // near review: either the last `near` sessions, or (nearPages) the last N pages memorised before today's portion, reaching into earlier memorisation
      let nearStart = base.length + (k-near>0 ? ch[k-near][0] : 0);
      if(plan.nearPages>0){
        const end = base.length + i0; let st=end;
        while(st>0 && P[end]-P[st-1] <= plan.nearPages+1e-6) st--;
        if(st<end){ tasks.push({key:k+'n',kind:'n',...describe(runs(pool,st,end-1))}); }
        nearStart = st;
      } else if(near>0 && k>0){ const s0=ch[Math.max(0,k-near)][0], s1=ch[k-1][1]; tasks.push({key:k+'n',kind:'n',...describe(runs(seq,s0,s1))}); }
      if(far>0){
        const L = nearStart, Wt=P[L];
        if(Wt>0.2){
          let slices;
          if(far>=Wt-1e-6) slices=[[0,L-1]];
          else{
            const o=(k*far)%Wt; let s=0; while(s<L && P[s+1]<=o+1e-9) s++;
            let acc=0, e=s, n=0; while(n<L){ acc+=pw(pool[e]); n++; if(acc>=far-1e-6) break; e=(e+1)%L; }
            slices = e>=s ? [[s,e]] : [[s,L-1],[0,e]];
          }
          const rs=[]; for(const [x,y] of slices) rs.push(...runs(pool,x,y));
          tasks.push({key:k+'f',kind:'f',...describe(rs)});
        }
      }
      sessions.push({tasks});
    });
    c={ck,sessions,seq,chunks:ch};
  }
  c.base = c.dates = datesFor(plan, sessions.length);
  c.dk = plan.start+'|'+plan.days.join()+'|'+JSON.stringify(plan.anchor||null); c.rk='null';
  cache.set(plan.id,c); return c;
}
function datesFor(plan,n,roll){
  const out=[], days=new Set(plan.days.length?plan.days:[0,1,2,3,4,5,6]);
  let d=parse(plan.start), k=0;
  const anchor=plan.anchor;
  while(k<n){
    if(anchor && k===anchor.k){ d=parse(anchor.date); }
    if(roll && k===roll.k){ d=parse(roll.date); }
    while(!days.has(d.getDay())) d.setDate(d.getDate()+1);
    out.push(iso(d)); d.setDate(d.getDate()+1); k++;
  }
  return out;
}
/* new memorisation never runs ahead: an unfinished portion stays as the day's wird, and the rest of the plan moves back with it */
const rolls = p => p.type==='hifz' || p.type==='both';
const doneBefore = (p,s,t) => { let last=0; for(const tk of s.tasks){ const v=+p.done[tk.key]; if(!v) return false; if(v>last) last=v; } return !!last && iso(new Date(last))<t; };
function rollAnchor(plan,base){
  const n=base.length, t=todayIso(); let k=0, doneToday=false;
  for(let j=0;j<n;j++){ const v=plan.done[j+'h']; if(v && iso(new Date(+v))===t) doneToday=true; }
  while(k<n && plan.done[k+'h']) k++;
  if(k>=n) return null;
  const days=new Set(plan.days.length?plan.days:[0,1,2,3,4,5,6]), d=parse(t);
  if(doneToday) d.setDate(d.getDate()+1);
  while(!days.has(d.getDay())) d.setDate(d.getDate()+1);
  const date=iso(d); return date>base[k] ? {k,date} : null;
}
function datesOf(plan){
  const c=compute(plan), dk=plan.start+'|'+plan.days.join()+'|'+JSON.stringify(plan.anchor||null);
  if(c.dk!==dk){ c.base=c.dates=datesFor(plan,c.sessions.length); c.dk=dk; c.rk='null'; }
  if(!rolls(plan)) return c.base;
  const ra=rollAnchor(plan,c.base), rk=JSON.stringify(ra);
  if(c.rk!==rk){ c.dates = ra ? datesFor(plan,c.sessions.length,ra) : c.base; c.rk=rk; }
  return c.dates;
}
/* steps: new memorisation counts in half pages, review and recitation in pages */
const stepsOf = tk => Math.max(1, Math.round(tk.pages*(tk.kind==='h'?2:1)));
const gotOf = (plan,tk) => plan.done[tk.key] ? stepsOf(tk) : Math.min(stepsOf(tk), (plan.prog||{})[tk.key]||0);
function setGot(plan,tk,n){
  const m=stepsOf(tk); n=Math.max(0,Math.min(m,n)); plan.prog=plan.prog||{};
  if(n>=m){ if(!plan.done[tk.key]) plan.done[tk.key]=Date.now(); delete plan.prog[tk.key]; }
  else { delete plan.done[tk.key]; if(n>0) plan.prog[tk.key]=n; else delete plan.prog[tk.key]; }
}
function stats(plan){
  const c=compute(plan), dates=datesOf(plan), t=todayIso();
  let total=0, done=0, sDone=0, firstOpen=-1, overdue=0;
  const roll=rolls(plan);
  c.sessions.forEach((s,k)=>{ let all=true; for(const tk of s.tasks){ total++; if(plan.done[tk.key]) done++; else all=false; }
    if(all) sDone++; else { if(firstOpen<0) firstOpen=k; if(dates[k]<t && !roll && !isWerd(plan)) overdue++; } });
  return {total,done,sDone,n:c.sessions.length,firstOpen,overdue,end:dates[dates.length-1]};
}

/* ---------- storage: private per-person store in claude.ai, browser storage as fallback ---------- */
const LS='rafiq-plans-v1';
const state={plans:{}, mode:'local', col:null, q:{}};
function lsLoad(){ try{ return JSON.parse(localStorage.getItem(LS)||'{}'); }catch(e){ return {}; } }
function lsSave(){ try{ localStorage.setItem(LS,JSON.stringify(state.plans)); }catch(e){} }
async function initStore(){
  state.plans = lsLoad();
  if(cloudOn()){ if(auth.s){ try{ await afterSignIn(); }catch(e){ console.warn('cloud',e); } } render(); return; }
  try{
    if(window.claude && window.claude.use){
      const [db,user]=await Promise.all([window.claude.use('db'),window.claude.use('user')]);
      const uid = user ? await user.id() : null;
      if(db && uid){
        state.col = db.collection(`data/users/${uid}/app/plans`);
        const snap = await state.col.get();
        const remote={}; snap.docs.forEach(d=>{ const v=d.data(); if(v && v.id) remote[v.id]=v; });
        // carry plans made before sign-in into the account
        for(const id of Object.keys(state.plans)) if(!remote[id]){ remote[id]=state.plans[id]; save(id,remote[id]); }
        state.plans=remote; state.mode='cloud'; lsSave();
      }
    }
  }catch(e){ console.warn('store',e); }
    render();
}
function save(id, data){
  lsSave(); cloudSave(id,data);
  if(!state.col) return;
  const doc=state.col.doc(id);
  state.q[id]=(state.q[id]||Promise.resolve()).then(()=> data===null ? doc.delete() : doc.set(JSON.parse(JSON.stringify(data)))).catch(e=>{ console.warn(e); toast('تعذّر الحفظ في الحساب، بقيت نسخة على هذا الجهاز'); });
}
function put(plan){ state.plans[plan.id]=plan; save(plan.id,plan); }
function del(id){ delete state.plans[id]; cache.delete(id); save(id,null); }

