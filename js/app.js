/* ---------- badges: 100, front-loaded so the first days are rewarding ---------- */
const lsNum=k=>{ try{ return +localStorage.getItem(k)||0; }catch(e){ return 0; } };
const lsInc=(k,n=1)=>{ try{ localStorage.setItem(k,String(lsNum(k)+n)); }catch(e){} };
/* pages read: only pages of a wird finished on its own reading screen; browsing the mushaf never counts */
const pgSet=()=>{ try{ return new Set(JSON.parse(localStorage.getItem('rafiq-pg')||'[]')); }catch(e){ return new Set(); } };
function notePage(p,on=true){ try{ const s=pgSet(); if(on) s.add(p); else s.delete(p); localStorage.setItem('rafiq-pg',JSON.stringify([...s])); }catch(e){} }
/* ---------- wird reading screen: only the pages of one task, the rest of the page faded; finishing it marks the task and counts the pages ---------- */
const wirdPages=tk=>{ const s=new Set(); for(const [a,b] of tk.rs) for(let id=a;id<=b;id++) s.add(vpOf[id]); return [...s].sort((x,y)=>x-y); }; // in the mushaf's own page order, each page once
function wirdOf(r){ const m=r.match(/^wird-(.+)-(\d+)-(\d+)$/); if(!m) return null; const plan=state.plans[m[1]]; if(!plan) return null;
  const s=compute(plan).sessions[+m[2]], tk=s&&s.tasks[+m[3]]; return tk?{plan,k:+m[2],i:+m[3],tk,ps:wirdPages(tk)}:null; }
function vWird(r){
  const w=wirdOf(r); if(!w) return topbar('الورد',{back:'#today'})+`<div class="card">ما لقينا هذا الورد.</div>`;
  const {plan,tk,ps}=w, idx=Math.max(0,Math.min(ui.wp[r]||0,ps.length-1)), p=ps[idx], on=!!plan.done[tk.key];
  let page;
  if(MS) page=msPage(p,true);
  else { page=`<div class="mload">جارٍ فتح المصحف…</div>`;
    if(!ui.msDl) msHave().then(h=>{ if(h) loadMushaf().then(()=>{ if(route()===r) rerender(); }); else msDownload(); }); }
  const fin = idx===ps.length-1 && !on ? `<button class="btn wfin ${p%2?'wl':'wr'}" data-act="wDone">أنهيت الورد ✓</button>` : '';
  try{ if(!localStorage.getItem('rafiq-whint')){ localStorage.setItem('rafiq-whint','1'); setTimeout(()=>toast('المس الصفحة لتظهر الأزرار، واسحب لتقليب الصفحات'),400); } }catch(e){}
  return `<div class="wird ${ui.wui?'wui':''}"><div class="whead"><button class="icon-btn" data-act="wBack" aria-label="رجوع">${IC.x}</button>
      <div class="wt"><b>${KIND[tk.kind]}: ${tk.label}</b><small>${ps.length>1?`صفحة ${f(idx+1)} من ${f(ps.length)} · `:''}${faces(tk.pages)}</small></div><span class="wsp"></span></div>
    <div class="wbar"><i style="width:${Math.round((idx+1)/ps.length*100)}%"></i></div>
    <div class="wpg mpin" data-r="${esc(r)}">${page}<div class="mfoot ${p%2?'po':'pe'}"><b>${f(p)}</b></div></div>${fin}
    <div class="wfoot">${idx>0?`<button class="btn ghost" data-act="wGo" data-d="-1">السابقة</button>`:'<span></span>'}
      ${idx<ps.length-1?`<button class="btn" data-act="wGo" data-d="1">الصفحة التالية</button>`:on?`<button class="btn ghost" data-act="wBack">✓ أنجزت هذا الورد</button>`:`<button class="btn" data-act="wDone">أنهيت الورد ✓</button>`}</div></div>`;
}
/* a wird's pages look exactly like the mushaf's: whole pages, nothing faded */
function wirdFit(){ const el=document.getElementById('mpage'), w=wirdOf(route()); if(!el||!w) return;
  fit15(el); }
function wirdGo(d){ const r=route(), w=wirdOf(r); if(!w) return; ui.wp[r]=Math.max(0,Math.min(w.ps.length-1,(ui.wp[r]||0)+d)); rerender(); }
let wsX=null, wsY=0;
document.addEventListener('touchstart',e=>{ wsX=null; if(!route().startsWith('wird-')||e.touches.length!==1||!e.target.closest('.wpg')) return; wsX=e.touches[0].clientX; wsY=e.touches[0].clientY; },{passive:true});
document.addEventListener('touchend',e=>{ if(wsX===null) return; const t=e.changedTouches[0], dx=t.clientX-wsX, dy=t.clientY-wsY; wsX=null;
  if(Math.abs(dx)>60 && Math.abs(dx)>Math.abs(dy)*1.5) wirdGo(dx>0?1:-1); },{passive:true}); // finger to the right = next page, like a mushaf
const rcBest=()=>{ try{ return JSON.parse(localStorage.getItem('rafiq-rc')||'{}'); }catch(e){ return {}; } };
function metrics(){
  const h=harvest(), ts=[]; let T=0, notes=0, plansDone=0, grp=0;
  for(const p of Object.values(state.plans)){
    for(const v of Object.values(p.done)) if(v){ ts.push(+v); T++; }
    for(const r of Object.values(p.rec||{})) if(r && r.n) notes++;
    if(status(p)==='complete') plansDone++; }
  grp=Object.keys(state.groups||{}).length;
  const days=[...new Set(ts.map(v=>iso(new Date(v))))].sort();
  let BS=0, run=0, prev=null, back=0;
  for(const d of days){ const t=new Date(d+'T12:00'), gap=prev?(t-prev)/864e5:0; run = prev && gap<1.5 ? run+1 : 1; if(gap>=4) back=1; BS=Math.max(BS,run); prev=t; }
  const fajr=new Set(ts.filter(v=>{ const x=new Date(v).getHours(); return x>=3 && x<7; }).map(v=>iso(new Date(v)))).size;
  const fri=new Set(ts.filter(v=>new Date(v).getDay()===5).map(v=>iso(new Date(v)))).size;
  const M=Math.round([...h.mem].reduce((a,id)=>a+pw(id),0)*1000)/1000;
  const sFull=s=>{ const [a,n]=S[s]; for(let id=a;id<a+n;id++) if(!h.mem.has(id)) return false; return true; };
  let SC=0; for(let s=1;s<=114;s++) if(sFull(s)) SC++;
  const jm=new Float64Array(31), jt=new Float64Array(31); for(const id of h.mem) jm[jOf[id]]+=pw(id); for(let id=1;id<=NA;id++) jt[jOf[id]]+=pw(id);
  const jFull=j=>jm[j]/jt[j]>=0.98; let JC=0; for(let j=1;j<=30;j++) if(jFull(j)) JC++;
  let P=0; try{ P=JSON.parse(localStorage.getItem('rafiq-pg')||'[]').length; }catch(e){}
  const rc=rcBest();
  /* recommended awrad: times each was read, nights with a bedtime werd, days after the prayers, days that held three times of day */
  const wk={}, WD2={}; for(const p of Object.values(state.plans)) if(isWerd(p)){ const sl=slotOf(p);
    for(const v of Object.values(p.done)) if(v){ wk['wk_'+p.werd]=(wk['wk_'+p.werd]||0)+1; const d=iso(new Date(+v)); (WD2[d]||(WD2[d]=new Set())).add(sl); } }
  const wdv=Object.values(WD2), WN=wdv.filter(x=>x.has('n')).length, WSd=wdv.filter(x=>x.has('s')).length, WT3=wdv.filter(x=>x.size>=3).length;
  return {...wk,WN,WSd,WT3,CH:(lsJ(CH_LS,{}).n||0),T,D:days.length,BS,back,fajr,fri,notes,plansDone,grp,M,SC,JC,RV:h.kinds.r,TL:h.kinds.t,
    mulk:+sFull(67),kahf:+sFull(18),yasin:+sFull(36),baqara:+sFull(2),amma:+jFull(30),tabarak:+jFull(29),
    ra:rc.a||0,rn:rc.n||0,rp:rc.p||0,L:lsNum('rafiq-ls'),P};
}
const BADGE_CATS=[['w','الأوراد'],['s','الثبات'],['d','أيام مع القرآن'],['t','المهام'],['m','الحفظ'],['su','السور'],['j','الأجزاء'],['r','المراجعة والتلاوة'],['c','التسميع'],['l','الاستماع والقراءة'],['h','عادات طيبة']];
/* [cat, icon, title, how to earn, metric, target] */
const BADGE_DEF=[
  ['t','🌱','أول خطوة','أنجزت أول مهمة','T',1],
  ['w','🌙','ليلة مع الملك','قرأت سورة الملك من أورادك','wk_mulk',1],
  ['w','🌅','يقظة مباركة','قرأت خواتيم آل عمران عند الاستيقاظ','wk_imran',1],
  ['w','🕯️','نور الجمعة','قرأت الكهف يوم الجمعة','wk_kahf',1],
  ['w','🧭','يوم بثلاثة أوقات','أنجزت أوراد ثلاثة أوقات في يوم واحد','WT3',1],
  ['w','🌌','سبع ليالٍ','أنجزت ورد قبل النوم في ٧ ليالٍ','WN',7],
  ['w','☀️','أسبوع أذكار','قرأت الإخلاص والمعوذتين صباحاً ومساءً ٧ مرات','wk_muaAM',7],
  ['w','🛡️','حصن الليل','قرأت آية الكرسي قبل النوم ٧ مرات','wk_kursiN',7],
  ['w','🕌','بعد الصلاة','أنجزت ورد ما بعد الصلوات في ١٤ يوماً','WSd',14],
  ['w','📜','شهر مع الملك','قرأت سورة الملك ٣٠ مرة','wk_mulk',30],
  ['w','💡','نور أربع جمع','قرأت الكهف في ٤ جمع','wk_kahf',4],
  ['h','🎁','أول تحدٍّ','أنجزت أول تحدٍّ يومي','CH',1],
  ['h','🎯','سبعة تحديات','أنجزت ٧ تحديات يومية','CH',7],
  ['d','🌤️','رجعت ثاني يوم','أنجزت في يومين','D',2],
  ['s','✨','بداية الثبات','يومان متتاليان','BS',2],
  ['m','🌿','أول ربع وجه','حفظت ربع وجه','M',0.25],
  ['l','🎧','أذن واعية','استمعت إلى ٥٠ آية','L',50],
  ['l','📖','فتحت المصحف','قرأت ١٠ صفحات في المصحف','P',10],
  ['c','🎙️','أول تسميع','سمّعت بصوتك أول مرة','ra',1],
  ['s','🔥','ثلاثة أيام','٣ أيام متتالية','BS',3],
  ['d','🌞','ثلاثة أيام إنجاز','أنجزت في ٣ أيام','D',3],
  ['m','☘️','نصف وجه','حفظت نصف وجه','M',0.5],
  ['t','✅','خمس مهام','أنجزت ٥ مهام','T',5],
  ['h','📝','مدوّن','كتبت أول ملاحظة على وردك','notes',1],
  ['h','🌅','فجري','أنجزت وردك قبل السابعة صباحاً','fajr',1],
  ['s','💪','أربعة أيام','٤ أيام متتالية','BS',4],
  ['m','📄','أول وجه','حفظت وجهاً كاملاً','M',1],
  ['c','🌟','تسميع ممتاز','سمّعت بإتقان ٨٠٪ فأكثر','rn',1],
  ['s','⚡','خمسة أيام','٥ أيام متتالية','BS',5],
  ['d','🗓️','خمسة أيام إنجاز','أنجزت في ٥ أيام','D',5],
  ['t','🔟','عشر مهام','أنجزت ١٠ مهام','T',10],
  ['r','🔁','أول مئة آية مراجعة','راجعت ١٠٠ آية','RV',100],
  ['su','🕋','أول سورة كاملة','حفظت سورة كاملة','SC',1],
  ['m','📑','وجهان','حفظت وجهين','M',2],
  ['s','⭐','أسبوع كامل','٧ أيام متتالية','BS',7],
  ['d','🎋','أسبوع إنجاز','أنجزت في ٧ أيام','D',7],
  ['r','📿','مئة آية تلاوة','تلوت ١٠٠ آية','TL',100],
  ['c','💎','تسميع متقن','سمّعت بإتقان ١٠٠٪','rp',1],
  ['m','📃','ثلاثة أوجه','حفظت ٣ أوجه','M',3],
  ['h','🤝','مع الحلقة','دخلت حلقة مع أصحابك','grp',1],
  ['h','🌈','العودة أجمل','رجعت لوردك بعد انقطاع','back',1],
  ['s','🌟','عشرة أيام','١٠ أيام متتالية','BS',10],
  ['d','🧭','عشرة أيام إنجاز','أنجزت في ١٠ أيام','D',10],
  ['t','🎯','٢٥ مهمة','أنجزت ٢٥ مهمة','T',25],
  ['m','📘','خمسة أوجه','حفظت ٥ أوجه','M',5],
  ['su','🌸','خمس سور','حفظت ٥ سور كاملة','SC',5],
  ['r','♻️','٥٠٠ آية مراجعة','راجعت ٥٠٠ آية','RV',500],
  ['l','🎶','٥٠٠ آية استماع','استمعت إلى ٥٠٠ آية','L',500],
  ['h','🕌','خمس جُمع','أنجزت وردك في ٥ أيام جمعة','fri',5],
  ['s','🏅','أسبوعان','١٤ يوماً متتالية','BS',14],
  ['d','🌙','خمسة عشر يوماً','أنجزت في ١٥ يوماً','D',15],
  ['c','🏵️','عشرة تسميعات ممتازة','سمّعت بإتقان ٨٠٪ فأكثر ١٠ مرات','rn',10],
  ['m','📗','نصف جزء','حفظت ١٠ أوجه','M',10],
  ['su','🌺','عشر سور','حفظت ١٠ سور كاملة','SC',10],
  ['j','🌄','جزء عمّ','حفظت جزء عمّ كاملاً','amma',1],
  ['j','🥇','أول جزء','أتممت حفظ جزء كامل','JC',1],
  ['t','🧱','٥٠ مهمة','أنجزت ٥٠ مهمة','T',50],
  ['d','🌻','عشرون يوماً','أنجزت في ٢٠ يوماً','D',20],
  ['s','🌳','عادة راسخة','٢١ يوماً متتالية','BS',21],
  ['h','✅','أتممت خطة','أكملت خطة حتى آخرها','plansDone',1],
  ['m','📙','خمسة عشر وجهاً','حفظت ١٥ وجهاً','M',15],
  ['su','👑','سورة الملك','حفظت سورة الملك','mulk',1],
  ['h','🌄','من أهل الفجر','أنجزت قبل السابعة في ١٠ أيام','fajr',10],
  ['c','🔊','عشرة تسميعات متقنة','سمّعت بإتقان ١٠٠٪ ١٠ مرات','rp',10],
  ['r','🔂','ألف آية مراجعة','راجعت ١٠٠٠ آية','RV',1000],
  ['m','📚','جزء من الحفظ','حفظت ما يعادل جزءاً (٢٠ وجهاً)','M',20],
  ['j','⛰️','جزء تبارك','حفظت جزء تبارك كاملاً','tabarak',1],
  ['s','🪷','شهر من الثبات','٣٠ يوماً متتالية','BS',30],
  ['d','🌕','ثلاثون يوماً','أنجزت في ٣٠ يوماً','D',30],
  ['l','📜','مئة صفحة','قرأت ١٠٠ صفحة في المصحف','P',100],
  ['su','🌊','سورة الكهف','حفظت سورة الكهف','kahf',1],
  ['su','💚','سورة يس','حفظت سورة يس','yasin',1],
  ['j','🏔️','ثلاثة أجزاء','أتممت حفظ ٣ أجزاء','JC',3],
  ['t','💯','مئة مهمة','أنجزت ١٠٠ مهمة','T',100],
  ['su','🌷','٢٥ سورة','حفظت ٢٥ سورة كاملة','SC',25],
  ['c','🎤','٥٠ تسميعاً ممتازاً','سمّعت بإتقان ٨٠٪ فأكثر ٥٠ مرة','rn',50],
  ['r','📖','ألف آية تلاوة','تلوت ١٠٠٠ آية','TL',1000],
  ['m','🧩','جزءان','حفظت ٤٠ وجهاً','M',40],
  ['s','🚀','خمسون يوماً','٥٠ يوماً متتالية','BS',50],
  ['d','🌠','خمسون يوماً إنجاز','أنجزت في ٥٠ يوماً','D',50],
  ['l','🎼','ألفا آية استماع','استمعت إلى ٢٠٠٠ آية','L',2000],
  ['j','🗻','خمسة أجزاء','أتممت حفظ ٥ أجزاء','JC',5],
  ['r','🔄','٣٠٠٠ آية مراجعة','راجعت ٣٠٠٠ آية','RV',3000],
  ['s','🥈','شهران','٦٠ يوماً متتالية','BS',60],
  ['m','🏛️','ثلاثة أجزاء حفظاً','حفظت ٦٠ وجهاً','M',60],
  ['su','🌼','خمسون سورة','حفظت ٥٠ سورة كاملة','SC',50],
  ['s','🎖️','٧٥ يوماً','٧٥ يوماً متتالية','BS',75],
  ['d','🪴','٧٥ يوماً إنجاز','أنجزت في ٧٥ يوماً','D',75],
  ['t','🏗️','٥٠٠ مهمة','أنجزت ٥٠٠ مهمة','T',500],
  ['su','🌴','سورة البقرة','حفظت سورة البقرة','baqara',1],
  ['j','🏞️','عشرة أجزاء','أتممت حفظ ١٠ أجزاء','JC',10],
  ['m','📚','خمسة أجزاء حفظاً','حفظت ١٠٠ وجه','M',100],
  ['s','💯','مئة يوم','١٠٠ يوم متتالية','BS',100],
  ['d','🏵️','مئة يوم إنجاز','أنجزت في ١٠٠ يوم','D',100],
  ['r','🌍','ختمة مراجعة','راجعت ٦٢٣٦ آية','RV',6236],
  ['r','🕊️','ختمة تلاوة','تلوت ٦٢٣٦ آية','TL',6236],
  ['l','🎧','ختمة استماع','استمعت إلى ٦٢٣٦ آية','L',6236],
  ['l','🗺️','المصحف كله','قرأت صفحات المصحف الـ٦٠٤ كلها','P',604],
  ['su','🌹','٧٥ سورة','حفظت ٧٥ سورة كاملة','SC',75],
  ['j','🌋','خمسة عشر جزءاً','أتممت حفظ ١٥ جزءاً','JC',15],
  ['s','🏆','١٥٠ يوماً','١٥٠ يوماً متتالية','BS',150],
  ['d','🌳','١٥٠ يوم إنجاز','أنجزت في ١٥٠ يوماً','D',150],
  ['t','🏰','ألف مهمة','أنجزت ١٠٠٠ مهمة','T',1000],
  ['m','📖','عشرة أجزاء حفظاً','حفظت ٢٠٠ وجه','M',200],
  ['j','🌌','عشرون جزءاً','أتممت حفظ ٢٠ جزءاً','JC',20],
  ['s','🥇','٢٠٠ يوم','٢٠٠ يوم متتالية','BS',200],
  ['d','🎆','٢٠٠ يوم إنجاز','أنجزت في ٢٠٠ يوم','D',200],
  ['m','🌙','نصف القرآن','حفظت نصف القرآن','M',302],
  ['d','🎇','سنة مع القرآن','أنجزت في ٣٦٥ يوماً','D',365],
  ['m','💫','٢٥ جزءاً','حفظت ٥٠٠ وجه','M',500],
  ['s','👑','سنة من الثبات','٣٦٥ يوماً متتالية','BS',365],
  ['m','🏆','حافظ القرآن','أتممت حفظ القرآن كاملاً','M',603.5],
].map(([c,i,t,d,k,n])=>({c,i,t,d,k,n}));
function badges(){ const m=metrics(); return BADGE_DEF.map(b=>({...b, v:m[b.k]||0, on:(m[b.k]||0)>=b.n, p:Math.min(1,(m[b.k]||0)/b.n)})); }
const bdgCell=b=>`<div class="${b.on?'on':''}" title="${b.d}"><span class="ic" aria-hidden="true">${b.i}</span><b>${b.t}</b><small>${b.d}</small>${!b.on&&b.p>0?`<i class="bp"><i style="width:${Math.round(b.p*100)}%"></i></i>`:''}</div>`;
function badgeCard(){
  const B=badges(), got=B.filter(b=>b.on), n=got.length;
  const next=B.filter(b=>!b.on).map((b,i)=>({...b,i0:i})).sort((a,b)=>(b.p-a.p)||(a.i0-b.i0)).slice(0,3);
  return `<section class="card"><div class="tile-row"><h3 style="margin:0">الأوسمة</h3><b class="bdg-n">${f(n)} <span class="small muted" style="font-weight:400">من ${f(B.length)}</span></b></div>
    <div class="bar" style="margin:8px 0 4px"><i style="width:${Math.round(n/B.length*100)}%;background:var(--accent)"></i></div>
    ${next.length?`<div class="sec-l">أقرب الأوسمة</div><div class="bdg-next">${next.map(b=>`<div><span class="ic" aria-hidden="true">${b.i}</span><div><b>${b.t}</b><small>${b.d}</small><i class="bp"><i style="width:${Math.round(b.p*100)}%"></i></i></div></div>`).join('')}</div>`:''}
    ${n?`<div class="sec-l">حصلت عليها</div><div class="bdg">${got.slice(-8).reverse().map(bdgCell).join('')}</div>`:''}
    <button class="btn ghost block" data-act="allBadges" style="margin-top:10px">كل الأوسمة</button></section>`;
}
function badgesSheet(){
  const B=badges();
  openSheet(`${sheetHead(`الأوسمة · ${f(B.filter(b=>b.on).length)} من ${f(B.length)}`)}<div class="stack">${BADGE_CATS.map(([c,l])=>{ const L=B.filter(b=>b.c===c);
    return `<div><div class="sec-l">${l} <span class="muted" style="font-weight:400">${f(L.filter(b=>b.on).length)}/${f(L.length)}</span></div><div class="bdg">${L.map(bdgCell).join('')}</div></div>`; }).join('')}</div>`);
}
/* tell the user once when a new badge is earned */
function checkBadges(){ try{
  const got=badges().filter(b=>b.on).map(b=>b.t), seen=JSON.parse(localStorage.getItem('rafiq-badges2')||'null');
  localStorage.setItem('rafiq-badges2',JSON.stringify(got));
  if(seen){ const nw=got.filter(t=>!seen.includes(t)); if(nw.length) setTimeout(()=>toast(nw.length>1?`${f(nw.length)} أوسمة جديدة، آخرها: ${nw[nw.length-1]} 🎉`:`وسام جديد: ${nw[0]} 🎉`),600); }
}catch(e){} }

/* ---------- share progress as an image ---------- */
async function shareCard(){
  const h=harvest(), st=streakInfo(), mem=Math.round([...h.mem].reduce((a,id)=>a+pw(id),0)*10)/10, B=badges().filter(b=>b.on);
  const jm=new Float64Array(31), jt=new Float64Array(31); for(const id of h.mem) jm[jOf[id]]+=pw(id); for(let id=1;id<=NA;id++) jt[jOf[id]]+=pw(id);
  try{ await Promise.all(['700 64px "IBM Plex Sans Arabic"','400 40px "IBM Plex Sans Arabic"','700 80px "Amiri"'].map(x=>document.fonts.load(x))); }catch(e){}
  const W=1080,H=1350,c=document.createElement('canvas'); c.width=W; c.height=H; const x=c.getContext('2d'); x.direction='rtl'; x.textAlign='center';
  const g=x.createLinearGradient(0,0,0,H); g.addColorStop(0,'#118A88'); g.addColorStop(1,'#0B5E5D'); x.fillStyle=g; x.fillRect(0,0,W,H);
  x.fillStyle='rgba(255,255,255,.08)'; x.beginPath(); x.arc(W-80,120,260,0,7); x.fill(); x.beginPath(); x.arc(60,H-140,220,0,7); x.fill();
  x.fillStyle='#fff'; x.font='700 84px "Amiri",serif'; x.fillText('ربيع القرآن',W/2,160);
  x.font='400 38px "IBM Plex Sans Arabic",sans-serif'; x.fillStyle='rgba(255,255,255,.85)'; x.fillText(auth?.profile?.first?`إنجاز ${auth.profile.first} مع القرآن`:'إنجازي مع القرآن',W/2,262);
  const box=(cx,y,num,lbl)=>{ x.fillStyle='rgba(255,255,255,.14)'; x.beginPath(); x.roundRect(cx-230,y,460,230,36); x.fill();
    x.fillStyle='#fff'; x.font='700 96px "IBM Plex Sans Arabic",sans-serif'; x.fillText(num,cx,y+125); x.font='400 36px "IBM Plex Sans Arabic",sans-serif'; x.fillStyle='rgba(255,255,255,.85)'; x.fillText(lbl,cx,y+190); };
  box(W-290,310,f(st.n),stkW(st.n)); box(290,310,f(mem),'وجه حفظته');
  x.fillStyle='#fff'; x.font='600 40px "IBM Plex Sans Arabic",sans-serif'; x.fillText('خريطة حفظي',W/2,640);
  const cw=150,ch=76,gap=14,cols=6; for(let j=1;j<=30;j++){ const i=j-1, col=i%cols, row=Math.floor(i/cols), r=Math.min(1,jm[j]/jt[j]);
    const px=W/2+(cols*cw+(cols-1)*gap)/2-col*(cw+gap), py=670+row*(ch+gap); x.fillStyle='rgba(255,255,255,.14)'; x.beginPath(); x.roundRect(px-cw,py,cw,ch,16); x.fill();
    if(r>0){ x.save(); x.beginPath(); x.roundRect(px-cw,py,cw,ch,16); x.clip(); x.fillStyle='#F5C66B'; x.fillRect(px-cw,py+ch*(1-r),cw,ch*r); x.restore(); }
    x.fillStyle=r>0.55?'#0B5E5D':'rgba(255,255,255,.9)'; x.font='600 30px "IBM Plex Sans Arabic",sans-serif'; x.fillText(f(j),px-cw/2,py+ch/2+11); }
  x.fillStyle='#fff'; x.font='400 64px sans-serif'; x.fillText(B.slice(-6).map(b=>b.i).join('  ')||'🌱',W/2,1180);
  x.font='400 34px "IBM Plex Sans Arabic",sans-serif'; x.fillStyle='rgba(255,255,255,.85)'; x.fillText(`${f(B.length)} من ${f(BADGE_DEF.length)} وسام · «خيركم من تعلّم القرآن وعلّمه»`,W/2,1250);
  x.direction='ltr'; x.font='400 30px "IBM Plex Sans Arabic",sans-serif'; x.fillText(APP_URL.replace(/^https?:\/\//,''),W/2,1310);
  const blob=await new Promise(r=>c.toBlob(r,'image/png')); const file=new File([blob],'rabi-alquran.png',{type:'image/png'});
  const text=`إنجازي مع القرآن في تطبيق ربيع القرآن، جرّبه معي:\n${APP_URL}`;
  if(navigator.canShare && navigator.canShare({files:[file]})){ try{ await navigator.share({files:[file],text}); return; }catch(e){ if(e?.name==='AbortError') return; } }
  const u=URL.createObjectURL(blob);
  openSheet(`${sheetHead('مشاركة الإنجاز')}<div class="stack"><img src="${u}" alt="صورة إنجازك" style="width:100%;border-radius:16px"><a class="btn block" href="${u}" download="rabi-alquran.png">احفظ الصورة</a><p class="small muted" style="margin:0;text-align:center">على الجوال: اضغط على الصورة مطولاً واحفظها، ثم شاركها مع أصحابك.</p></div>`);
}

/* ---------- install as app ---------- */
let instEvt=null;
const isStandalone=()=>matchMedia('(display-mode: standalone)').matches || navigator.standalone===true;
const isIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
const SHARE_SVG='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12M7 8l5-5 5 5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';
const ADD_SVG='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/></svg>';
function canInstall(){ return !isStandalone() && (instEvt || isIOS()); }
function instBanner(){
  let el=document.querySelector('.inst'); let hide=true;
  try{ hide = !canInstall() || sessionStorage.getItem('rafiq-inst-x')==='1' || (+localStorage.getItem('rafiq-inst-x')||0) > Date.now(); }catch(e){ hide=!canInstall(); }
  if(hide){ el?.remove(); return; }
  if(el) return;
  el=document.createElement('div'); el.className='inst'; el.setAttribute('role','region'); el.setAttribute('aria-label','تثبيت التطبيق');
  el.innerHTML=`<div class="ic" aria-hidden="true"><img src="icon-192.png" alt="" onerror="this.parentNode.textContent='۞'"></div><div class="tx"><b>ثبّت ربيع القرآن</b><span>يفتح مثل التطبيق من شاشة جوالك</span></div><button class="btn" data-act="installNow">تثبيت</button><button class="x" data-act="installX" aria-label="إغلاق">${IC.x}</button>`;
  document.body.appendChild(el);
}
async function installNow(){
  if(instEvt){ const e=instEvt; instEvt=null; e.prompt(); try{ const c=await e.userChoice; if(c.outcome==='accepted') toast('تم التثبيت، تلقاه على شاشة جوالك'); }catch(_){} instBanner(); return; }
  if(isIOS()){ iosSheet(); return; }
  installSheet();
}
function iosSheet(){
  const top=/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent) || /ipad/i.test(navigator.userAgent) || (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const rtl=/^ar/i.test(navigator.language||'');
  const MORE_SVG='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 9l6 6 6-6"/></svg>';
  const step=(n,html)=>`<div class="ios-step"><span class="n">${n}</span><div>${html}</div></div>`;
  openSheet(`${sheetHead('ثبّته على جوالك')}<div class="ios-steps">
    ${step('١',`اضغط زر المشاركة <span class="glyph">${SHARE_SVG}</span> ${top?'بجانب رابط الموقع فوق':'تحت'}`)}
    ${step('٢',`اضغط «عرض المزيد» <span class="glyph">${MORE_SVG}</span>`)}
    ${step('٣',`اختر «إضافة إلى الصفحة الرئيسية» <span class="glyph">${ADD_SVG}</span>`)}
    ${step('٤','خلّ «فتح كتطبيق ويب» شغّال، ثم اضغط «إضافة» فوق')}
    <p class="small muted" style="margin:0">في سفاري، إذا ما شفت زر المشاركة اضغط «⋯» أولاً.</p>${top?'':'<div style="height:52px"></div>'}</div>`);
  const a=document.createElement('div'); a.className='ios-arrow '+(top?'up'+(rtl?' l':' r'):'down'); a.setAttribute('aria-hidden','true'); a.textContent=top?'⬆':'⬇';
  sheetRoot.querySelector('.scrim')?.appendChild(a);
}
function installSheet(){
  if(isStandalone()){ openSheet(`${sheetHead('التطبيق مثبّت')}<p style="margin:0">أنت تستخدم ربيع القرآن كتطبيق الحين، ما شاء الله.</p>`); return; }
  if(instEvt){ installNow(); return; }
  if(isIOS()){ iosSheet(); return; }
  openSheet(`${sheetHead('أضفه لشاشة جوالك')}<div class="stack">
    <div class="card"><b>أندرويد (كروم)</b><p class="small" style="margin:6px 0 0">اضغط النقاط الثلاث فوق، ثم «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».</p></div>
    <div class="card"><b>الكمبيوتر (كروم أو إيدج)</b><p class="small" style="margin:6px 0 0">اضغط أيقونة التثبيت في شريط العنوان فوق.</p></div></div>`);
}
window.addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); instEvt=e; instBanner(); });
window.addEventListener('appinstalled',()=>{ instEvt=null; instBanner(); });
function aboutSheet(){
  openSheet(`${sheetHead('عن ربيع القرآن')}<div class="stack"><p style="margin:0;line-height:1.9">ربيع القرآن يرتب لك خطة حفظ ومراجعة القرآن يوماً بيوم، ويوريك مهام اليوم ببساطة، وتقدر تحفظ مع أصحابك وتتشجعون. مجاني بالكامل.</p>
    <p class="small muted" style="margin:0">«اللهم اجعل القرآن العظيم ربيع قلوبنا»</p><p class="small muted" style="margin:0">«خيركم من تعلّم القرآن وعلّمه»</p><p class="small muted" style="margin:0">نص المصحف: الرسم العثماني من مجمع الملك فهد لطباعة المصحف الشريف عبر موسوعة القرآن الكريم (quranenc.com)، بيانات quran-json برخصة CC BY-SA 4.0. التفسير الميسر من مجمع الملك فهد عبر alquran.cloud، وبقية التفاسير (المختصر، السعدي، ابن كثير، القرطبي) عبر مشروع tafsir_api المفتوح (spa5k) من مصادر qul.tarteel.ai. صفحات المصحف بترتيب أسطر مصحف المدينة (الإصدار ٣ من خط حفص لمجمع الملك فهد) عبر بيانات quran-text من quran.ws برخصة CC BY 4.0. تلوين التجويد من بيانات tajwid-annotations لـ Quranpedia (quran.ws) برخصة CC BY 4.0، مع تجميع الأحكام في ألوان. معاني الكلمات من «السراج في بيان غريب القرآن» كما نشرته موسوعة القرآن الكريم دون تعديل (quranenc.com/ar/browse/arabic_seraj). لفظ الكلمات وترجمتها بالإنجليزية من بيانات Quran.com كلمة بكلمة (مكتبة QUL)، والترجمة الإنجليزية للآيات Saheeh International عبر alquran.cloud.</p><p class="small muted" style="margin:0">الإصدار ${verTxt()}</p></div>`);
}
function delAcctSheet(){
  const pw=!delFresh();
  openSheet(`${sheetHead('حذف الحساب')}<div class="stack"><p style="margin:0">يُحذف حسابك وخططك وإنجازك من حسابك نهائياً، وتخرج من حلقات أصحابك. ما نقدر نرجعها بعد الحذف.</p>
    ${pw?`<label class="field" id="delPwF"><span class="lbl">كلمة السر</span><input id="delPw" type="password" autocomplete="current-password" dir="ltr"></label><p class="small muted" style="margin:0">حفاظاً على أمان حسابك، نحتاج إلى التأكد من كلمة السر قبل الحذف.</p>`:''}
    <div class="auth-err" id="delErr" role="alert"></div>
    <button class="btn block danger" data-act="delAcctGo">حذف الحساب نهائياً</button><button class="btn block ghost" data-act="closeSheet">تراجع</button></div>`);
}
function signOutSheet(){
  openSheet(`${sheetHead('تسجيل الخروج')}<div class="stack"><p style="margin:0;text-align:center"><b>هل تريد تسجيل الخروج من حسابك؟</b></p><p class="small muted" style="margin:0;text-align:center">خططك محفوظة في حسابك، وترجع لها متى ما دخلت مرة ثانية.</p>
    <button class="btn block danger" data-act="signOutGo">نعم، سجّل خروجي</button><button class="btn block ghost" data-act="closeSheet">إلغاء</button></div>`);
}
async function shareApp(){
  const text=appShareText();
  try{ if(navigator.share){ await navigator.share({text}); return; } }catch(e){ return; }
  try{ await navigator.clipboard.writeText(text); toast('نُسخ الرابط، أرسله لمن تحب'); }catch(e){ toast(APP_URL); }
}
/* ---------- الحلقة (groups of friends) ---------- */
const GR_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="8" r="3.2"/><circle cx="17" cy="9.5" r="2.5"/><path d="M3 20c.8-3.6 3.2-5.5 6-5.5s5.2 1.9 6 5.5M15 15c2.8-.4 5 1.2 6 4.2"/></svg>';
const grLink=code=>`${APP_URL}#join-${code}`;
const GRN={};
const inviteText=code=>{ const g=state.groups[code]; return `تعال معي في حلقة «${(g&&g.name)||GRN[code]||'ربيع القرآن'}» على تطبيق ربيع القرآن، نحفظ القرآن مع بعض ونشوف إنجاز بعض كل يوم 🌿\nاضغط الرابط وتنضم مباشرة، وإذا ما عندك التطبيق يفتح لك وتقدر تثبّته على جوالك:\n${grLink(code)}`; };
const appShareText=()=>`ربيع القرآن 🌿 تطبيق مجاني يعطيك ورد يومي سهل لحفظ القرآن ومراجعته وتلاوته، ويتابع إنجازك مرحلة مرحلة.\nحمّله من هنا:\n${APP_URL.replace(/#.*$/,'')}`;
function memberCard(m,mine,code,uid){
  const dp = m.total ? Math.round(m.done/m.total*100) : 0, fresh = m.day===todayIso(), hasPlan=!!m.plan;
  const today = !hasPlan ? `<span class="muted">ما اختار خطة بعد</span>` : fresh && m.total ? `<span>اليوم ${f(m.done)} من ${f(m.total)}${m.done>=m.total?' ✓':''}</span><div class="bar"><i style="width:${dp}%"></i></div>` : `<span class="muted">${fresh?'اليوم استراحة':'ما فتح التطبيق اليوم'}</span>`;
  return `<div class="mem ${mine?'me':''} ${hasPlan&&fresh&&m.total&&m.done>=m.total?'full':''}"><div class="mem-h"><span class="av">${esc((m.name||'؟').trim()[0]||'؟')}</span><span><b>${esc(m.name||'صديق')}${mine?' <em>أنت</em>':''}</b><small>${hasPlan?esc(m.plan):''}</small></span></div>
    <div class="mem-today">${today}</div>
    ${hasPlan?`<div class="mem-f"><span><b>${f(m.streak||0)}</b> ${stkW(m.streak||0)}</span><span>المرحلة <b>${f(m.stage||1)}</b> · ${f(m.pct||0)}٪</span><span><b>${f(m.pages||0)}</b> وجه</span></div>`:''}
    ${!mine&&m.tpl&&code?`<button class="btn ghost sm mem-copy" data-act="grCopy" data-code="${code}" data-uid="${esc(uid)}">خذ نفس خطته</button>`:''}</div>`;
}
const grSorted=()=>Object.entries(state.groups).sort((a,b)=>(b[1].at||0)-(a[1].at||0));
const ctLink=code=>`${APP_URL}#center-${code}`;
const ctInvite=code=>{ const c=state.centers[code]; return `انضم لـ«${(c&&c.name)||'المجمع القرآني'}» على تطبيق ربيع القرآن، واختر حلقتك وتابع وردك اليومي مع حلقتك 🌿\n${ctLink(code)}`; };
const CT_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 21V10l8-6 8 6v11"/><path d="M9 21v-5a3 3 0 0 1 6 0v5M3 21h18"/><path d="M12 4V2"/></svg>';
function vGroups(){
  const gs=grSorted(), on=cloudOn()&&auth.s, cs=Object.entries(state.centers).sort((a,b)=>(b[1].at||0)-(a[1].at||0));
  const btns=(sm)=>`<div class="row gr-acts"><button class="btn${sm?' ghost sm':''}" data-act="grNew">حلقة جديدة</button><button class="btn ghost${sm?' sm':''}" data-act="ctNew">مجمع جديد</button><button class="btn ghost${sm?' sm':''}" data-act="joinOpen">الانضمام برابط أو كود</button></div>`;
  const intro=`<section class="card gr-hero"><div class="gr-ic">${GR_IC}</div><h2>احفظوا مع بعض</h2>
    <p class="muted">سوّ حلقة لأهلك أو أصحابك، وأرسل لهم الرابط. كل واحد يشوف إنجاز الباقين كل يوم، ويقدر ياخذ نفس خطة صاحبه بضغطة.</p>
    <p class="muted small">ويخدم حلقات تحفيظ القرآن والمجمعات القرآنية: سوّ مجمع لمسجدك أو مدرستك، وداخله الحلقات اللي تبيها، وكل طالب ينضم لحلقته ويتابعه معلمه يوم بيوم.</p>
    ${on?btns(false):`<p class="small muted" style="margin:0">الحلقة تحتاج حساب، سجّل دخولك من «الحساب».</p>`}</section>`;
  if(on) setTimeout(()=>gs.forEach(([c])=>grPeek(c)),0);
  const list=gs.map(([c,g])=>`<a class="card gr-row" href="#group-${c}"><span class="gr-ic sm">${GR_IC}</span><span class="gr-t"><b>${esc(g.name||'الحلقة')}</b><small id="gp-${c}">${g.plan&&state.plans[g.plan]?'خطتك: '+esc(state.plans[g.plan].name):'بدون خطة'}</small></span><span class="gr-av" id="ga-${c}"></span></a>`).join('');
  const clist=cs.map(([c,x])=>`<a class="card gr-row ct-row" href="#center-${c}"><span class="gr-ic sm">${CT_IC}</span><span class="gr-t"><b>${esc(x.name||'المجمع')}</b><small>مجمع قرآني${x.own?' · أنت المشرف':''}</small></span></a>`).join('');
  if(!gs.length && !cs.length) return topbar('الحلقات')+`<div class="stack">${intro}</div>`;
  return topbar('الحلقات')+`<div class="stack">${cs.length?`<h3 class="gr-sec">المجمعات</h3>${clist}${gs.length?'<h3 class="gr-sec">الحلقات</h3>':''}`:''}${list}${btns(true)}</div>`;
}
/* a center's page: its حلقات, each with how many members and how many finished today; the owner adds حلقات */
function vCenter(code){
  const on=cloudOn()&&auth.s; if(!on) return topbar('المجمع',{back:'#groups'})+`<div class="stack"><p class="muted" style="text-align:center">المجمع يحتاج حساب، سجّل دخولك من «الحساب».</p></div>`;
  const c=state.centers[code], open=ui.menu==='ct:'+code;
  setTimeout(()=>ctFill(code),0);
  const pop = open ? `<div class="pop" role="menu">
      <button role="menuitem" data-act="ctShare" data-code="${code}">مشاركة المجمع</button>
      <button role="menuitem" data-act="ctLink" data-code="${code}">نسخ رابط المجمع</button>
      <button role="menuitem" data-act="ctCode" data-code="${code}">نسخ الكود <b class="code sm" dir="ltr">${code}</b></button>
      ${c&&(c.role==='owner'||c.role==='deputy'||c.own)?`<button role="menuitem" data-act="ctRen" data-code="${code}">تغيير اسم المجمع</button>`:''}
      ${c?`<button role="menuitem" class="danger" data-act="ctLeave" data-code="${code}">إزالة المجمع من القائمة</button>`:''}</div>` : '';
  return topbar(esc((c&&c.name)||'المجمع'),{back:'#groups',right:`<button class="icon-btn" data-act="ctMenu" data-code="${code}" aria-label="خيارات المجمع" aria-haspopup="menu" aria-expanded="${open}">${IC.dots}</button>`,pop})+`<div class="stack" id="ctv"><p class="small muted">يحمّل…</p></div>`;
}
async function ctFill(code){
  const el=document.getElementById('ctv'); if(!el) return;
  let d; try{ d=await centerData(code); }catch(e){ el.innerHTML=`<p class="small muted">تعذّر التحميل، تأكد من الإنترنت.</p>`; return; }
  if(!d||!d.info){ el.innerHTML=`<p class="muted" style="text-align:center">ما لقينا مجمع بهذا الكود.</p>`; return; }
  ctCache[code]=d; const role=ctRoleOf(d,auth.s.uid), own=role==='owner', canAdd=!!role, c=state.centers[code];
  if(c && c.role!==role){ c.role=role; ctStore(); }
  if(c && !(d.members&&d.members[auth.s.uid])) ctJoinMe(code);
  const ownerN=(d.members&&d.members[d.info.owner]&&d.members[d.info.owner].name)||'';
  if(c && d.info.name && c.name!==d.info.name){ c.name=d.info.name; ctStore(); const h=document.querySelector('.topbar h1'); if(h) h.textContent=d.info.name; }
  if(own && c && !c.own){ c.own=1; ctStore(); }
  const cs=Object.entries(d.circles||{}).sort((a,b)=>(a[1].at||0)-(b[1].at||0));
  const rows=cs.map(([g,x])=>{ const mine=!!state.groups[g]; GRN[g]=x.name;
    return `<div class="card gr-row ct-c"><span class="gr-ic sm">${GR_IC}</span><span class="gr-t"><b>${esc(x.name||'حلقة')}</b><small id="gp-${g}">…</small></span><span class="gr-av" id="ga-${g}"></span><button class="icon-btn sm" data-act="shareCode" data-code="${g}" aria-label="مشاركة الحلقة">${IC.share||'↗'}</button>${mine?`<a class="btn ghost sm" href="#group-${g}">افتح</a>`:`<button class="btn sm" data-act="joinOpen" data-code="${g}">انضم</button>`}</div>`; }).join('');
  el.innerHTML=`${!c?`<section class="card gr-hero"><div class="gr-ic">${CT_IC}</div><h2>${esc(d.info.name)}</h2><p class="muted">مجمع قرآني فيه ${plural(cs.length,'حلقة واحدة','حلقتان','حلقات','حلقة')}. أضفه لقائمتك واختر حلقتك.</p><button class="btn" data-act="ctFollow" data-code="${code}">أضف المجمع لقائمتي</button></section>`:`<p class="small muted ct-sum">مجمع قرآني · ${cs.length?plural(cs.length,'حلقة واحدة','حلقتان','حلقات','حلقة'):'ما فيه حلقات بعد'}${ownerN?` · المشرف: ${esc(ownerN)}`:''}${role&&!own?` · صلاحيتك: ${ROLE_N[role]}`:''}</p>`}
    ${rows}
    ${canAdd?`<button class="btn block" data-act="ctAdd" data-code="${code}">+ حلقة جديدة في المجمع</button><p class="small muted" style="margin:0;text-align:center">أرسل رابط المجمع للطلاب، وكل واحد يختار حلقته.</p>`:''}
    ${own||role==='deputy'?`<button class="listbtn" data-act="ctAdmin" data-code="${code}"><span>الصلاحيات<small>عيّن نائب المشرف، ومن يقدر يضيف حلقات</small></span><i class="chev">${IC.back}</i></button>`:''}`;
  cs.forEach(([g])=>grPeek(g));
}
function ctAdminSheet(code){ const d=ctCache[code]; if(!d) return; const me=ctRoleOf(d,auth.s.uid);
  const ms=Object.entries(d.members||{}).sort((a,b)=>(a[1].at||0)-(b[1].at||0));
  const opts=me==='owner'?['','editor','deputy']:['','editor'];
  const row=([uid,m])=>{ const r=ctRoleOf(d,uid), fixed=r==='owner'||uid===auth.s.uid||(me!=='owner'&&r==='deputy');
    return `<div class="ctm"><span class="av">${esc((m.name||'؟').trim()[0]||'؟')}</span><b>${esc(m.name||'عضو')}${uid===auth.s.uid?' <em>أنت</em>':''}</b>${fixed?`<span class="small muted">${ROLE_N[r]}</span>`:`<select data-ctrole="${code}" data-uid="${esc(uid)}">${opts.map(o=>`<option value="${o}" ${r===o?'selected':''}>${ROLE_N[o]}</option>`).join('')}</select>`}</div>`; };
  openSheet(`${sheetHead('الصلاحيات')}<div class="stack"><p class="small muted" style="margin:0">المشرف ونائبه يقدرون يضيفون حلقات ويغيّرون اسم المجمع. «يضيف حلقات» يقدر يضيف حلقات بس. الباقي أعضاء ما يعدّلون شي.</p>${ms.map(row).join('')||'<p class="small muted">ما انضم أحد للمجمع بعد.</p>'}</div>`);
}
document.addEventListener('change',async e=>{ const el=e.target; if(!el.dataset||!el.dataset.ctrole) return; const code=el.dataset.ctrole, uid=el.dataset.uid, v=el.value;
  try{ await rtdb(`centers/${code}/roles/${uid}`, v?'PUT':'DELETE', v?v:undefined); const d=ctCache[code]; if(d){ d.roles=d.roles||{}; if(v) d.roles[uid]=v; else delete d.roles[uid]; } toast('تم حفظ الصلاحية'); }
  catch(err){ toast('ما عندك صلاحية لهذا، أو تعذّر الاتصال'); } });
function ctNewSheet(){
  openSheet(`${sheetHead('مجمع قرآني جديد')}<form class="stack" id="ctf">
    <p class="small muted" style="margin:0">المجمع يجمع عدة حلقات في مكان واحد، مثل مسجد أو مدرسة أو دار تحفيظ. بعد ما تنشئه تضيف حلقاته.</p>
    <label class="field"><span class="lbl">اسم المجمع</span><input id="ct-name" maxlength="60" autocomplete="off" placeholder="مثلاً: مجمع جامع عمر بن عبدالعزيز" required></label>
    <div class="auth-err" id="ctErr" role="alert"></div>
    <button type="submit" class="btn block big">أنشئ المجمع</button></form>`);
  setTimeout(()=>document.getElementById('ct-name')?.focus(),50);
}
async function submitCenterNew(form){
  const name=form.querySelector('#ct-name').value.trim(), err=form.querySelector('#ctErr');
  if(!name){ err.textContent='اكتب اسم للمجمع.'; return; }
  const btn=form.querySelector('[type=submit]'); btn.disabled=true;
  try{ const code=await createCenter(name); closeSheet(); location.hash='#center-'+code; toast('جاهز، أضف حلقات المجمع'); }
  catch(e){ err.textContent='تعذّر الاتصال، تأكد من الإنترنت.'; btn.disabled=false; }
}
function ctAddSheet(cc){
  const ps=plansSorted().filter(p=>status(p)!=='archived');
  openSheet(`${sheetHead('حلقة جديدة في المجمع')}<form class="stack" id="ctaf" data-code="${cc}">
    <label class="field"><span class="lbl">اسم الحلقة</span><input id="cta-name" maxlength="40" autocomplete="off" placeholder="مثلاً: حلقة الفرسان" required></label>
    <label class="field"><span class="lbl">خطتك في هذي الحلقة</span><select id="cta-plan">${ps.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}<option value="" selected>بدون خطة</option></select></label>
    <div class="auth-err" id="ctaErr" role="alert"></div>
    <button type="submit" class="btn block big">أضف الحلقة</button></form>`);
  setTimeout(()=>document.getElementById('cta-name')?.focus(),50);
}
async function submitCircleAdd(form){
  const cc=form.dataset.code, name=form.querySelector('#cta-name').value.trim(), pid=form.querySelector('#cta-plan').value, err=form.querySelector('#ctaErr');
  if(!name){ err.textContent='اكتب اسم للحلقة.'; return; }
  const btn=form.querySelector('[type=submit]'); btn.disabled=true;
  try{ await addCircle(cc,name,pid); closeSheet(); toast('أُضيفت الحلقة للمجمع'); rerender(); }
  catch(e){ err.textContent='تعذّر الاتصال، تأكد من الإنترنت.'; btn.disabled=false; }
}
/* the list shows who is in each حلقة and how many finished today */
async function grPeek(code){
  try{ const ms=await groupMembers(code), el=document.getElementById('ga-'+code); if(!el) return;
    const vs=Object.values(ms), t=todayIso(), dn=vs.filter(m=>m.day===t&&m.total&&m.done>=m.total).length;
    el.innerHTML=vs.slice(0,4).map(m=>`<i>${esc((m.name||'؟').trim()[0]||'؟')}</i>`).join('')+(vs.length>4?`<i>+${f(vs.length-4)}</i>`:'');
    const sm=document.getElementById('gp-'+code); if(sm) sm.textContent=`${plural(vs.length,'عضو واحد','عضوان','أعضاء','عضواً')}${dn?` · ${f(dn)} أنهى ورده اليوم`:''}`;
    const g=state.groups[code]; if(g && !g.name){ const n=groupName(code,ms); if(n!=='الحلقة'){ g.name=n; grStore(); } }
  }catch(e){}
}
function vGroup(code){
  const g=state.groups[code]; if(!g) return topbar('الحلقة',{back:'#groups'})+`<div class="stack"><p class="muted" style="text-align:center">ما أنت في هذي الحلقة.</p><button class="btn" data-act="joinOpen" data-code="${code}">انضم لها</button></div>`;
  const ps=plansSorted().filter(p=>status(p)!=='archived');
  setTimeout(()=>grFill(code),0);
  const open=ui.menu==='gr:'+code;
  const pop = open ? `<div class="pop" role="menu">
      <button role="menuitem" data-act="shareCode" data-code="${code}">مشاركة الحلقة</button>
      <button role="menuitem" data-act="copyLink" data-code="${code}">نسخ رابط الحلقة</button>
      <button role="menuitem" data-act="copyCode" data-code="${code}">نسخ الكود <b class="code sm" dir="ltr">${code}</b></button>
      <button role="menuitem" data-act="grRen" data-code="${code}">تغيير اسم الحلقة</button></div>` : '';
  return topbar(esc(g.name||'الحلقة'),{back:'#groups',right:`<button class="icon-btn" data-act="grMenu" data-code="${code}" aria-label="خيارات الحلقة" aria-haspopup="menu" aria-expanded="${open}">${IC.dots}</button>`,pop})+`<div class="stack">
    <label class="field"><span class="lbl">الخطة في هذي الحلقة</span><select id="grPlan" data-code="${code}">${ps.map(p=>`<option value="${p.id}" ${g.plan===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}<option value="" ${!g.plan||!state.plans[g.plan]?'selected':''}>بدون خطة</option></select></label>
    <section class="card grst"><h3 style="margin:0 0 8px">مهام الحلقة هذا الشهر</h3><div id="grst"><p class="small muted">يحمّل…</p></div></section>
    <h3 style="margin:6px 0 0">الأعضاء</h3><div class="mems" id="grm"><p class="small muted">يحمّل…</p></div>
    <button class="linkbtn danger" data-act="grLeave" data-code="${code}">الخروج من الحلقة</button></div>`;
}
/* today's three tasks for every member: new memorization, near review, far review */
function grStats(ms,ids){
  const t=todayIso(), td=parse(t), sel=(ui.grD&&ui.grD.slice(0,7)===t.slice(0,7)&&ui.grD<=t)?ui.grD:t, isT=sel===t, dn=String(parse(sel).getDate()), cols=[['h','حفظ جديد'],['n','مراجعة قريبة'],['f','مراجعة بعيدة']];
  const K=m=>{ if(!m.plan) return null; if(m.mon===t.slice(0,7) && m.mo && m.mo[dn]){ const c=m.mo[dn], o={}; ['h','n','f'].forEach((q,i)=>{ if(c[i]!=='-') o[q]=+c[i]; }); return o; } if(isT && m.day===t && m.ks) return m.ks; if(m.mon===t.slice(0,7) && m.mo && m.day>=sel) return {}; return null; };
  const allDone=m=>{ const k=K(m); if(!k) return false; const v=Object.values(k); return v.length>0 && v.every(x=>x); };
  const cell=(m,k)=>{ const ks=K(m); if(!ks) return '<td class="muted">–</td>'; const v=ks[k]; return v==null?'<td class="muted">–</td>':v?'<td class="ok">✓</td>':'<td class="no">○</td>'; };
  const WD=['أحد','اثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'];
  const days=Array.from({length:td.getDate()},(_,i)=>{ const d=new Date(td.getFullYear(),td.getMonth(),i+1), di=iso(d); const hd=HJd(d), hm=(i===0||hd==='١')?' '+HJm(d):''; return `<button class="${di===sel?'on':''}" data-act="grDay" data-d="${di}"><span>${di===t?'اليوم':WD[d.getDay()]}</span><b>${f(i+1)}</b><i>${hd}${hm}</i></button>`; }).join('');
  const strip=`<div class="grmon small muted">${GMON(td)}، ${HJmy(new Date(td.getFullYear(),td.getMonth(),1))}${HJmy(new Date(td.getFullYear(),td.getMonth(),1))!==HJmy(td)?' – '+HJmy(td):''}</div><div class="grdays" id="grdays">${days}</div>`;
  const rows=ids.map(id=>{ const m=ms[id], all=allDone(m); return `<tr class="${all?'all':''}"><th>${esc((m.name||'صديق').split(' ')[0])}${id===auth.s.uid?' <em>أنت</em>':''}</th>${cols.map(([k])=>cell(m,k)).join('')}</tr>`; }).join('');
  const n=ids.filter(id=>allDone(ms[id])).length;
  return `${strip}<table class="grtab"><thead><tr><th></th>${cols.map(([,l])=>`<th>${l}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table><p class="small muted" style="margin:8px 0 0;text-align:center">${f(n)} من ${f(ids.length)} أنهوا كل مهام ${isT?'اليوم':'ذاك اليوم'}</p>${isT?'':'<p class="small muted" style="margin:4px 0 0;text-align:center">«–» يعني ما عنده مهام ذاك اليوم، أو ما فتح التطبيق من بعد هذا التحديث.</p>'}`;
}
const grCache={};
const HJF=o=>{ try{ return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-arab',o); }catch(e){ return null; } }, HJd=d=>{ const x=HJF({day:'numeric'}); return x?x.format(d):''; }, HJm=d=>{ const x=HJF({month:'long'}); return x?x.format(d):''; }, HJmy=d=>{ const x=HJF({month:'long',year:'numeric'}); return x?x.format(d).replace(/\s*هـ$/,'')+' هـ':''; }, GMON=d=>{ try{ return new Intl.DateTimeFormat('ar-u-nu-arab',{month:'long',year:'numeric',calendar:'gregory'}).format(d)+' م'; }catch(e){ return ''; } };
function grDaysScroll(){ const s=document.getElementById('grdays'), o=s&&s.querySelector('.on'); if(o) o.scrollIntoView({block:'nearest',inline:'center'}); }
async function grFill(code){
  const el=document.getElementById('grm'); if(!el) return;
  try{ const ms=await groupMembers(code); grCache[code]=ms; const ids=Object.keys(ms).sort((a,b)=>(b===auth.s.uid)-(a===auth.s.uid));
    const st=document.getElementById('grst'); if(st){ st.innerHTML=grStats(ms,ids); grDaysScroll(); }
    el.innerHTML = ids.map(id=>memberCard(ms[id],id===auth.s.uid,code,id)).join('') + (ids.length<2?`<p class="small muted">ما انضم أحد بعد. أرسل الرابط لأصحابك.</p>`:''); }
  catch(e){ el.innerHTML=`<p class="small muted">تعذّر التحميل، تأكد من الإنترنت.</p>`; }
}
function grNewSheet(pid){
  const ps=plansSorted().filter(p=>status(p)!=='archived');
  openSheet(`${sheetHead('حلقة جديدة')}<form class="stack" id="grf">
    <label class="field"><span class="lbl">اسم الحلقة</span><input id="gr-name" maxlength="40" autocomplete="off" placeholder="مثلاً: حلقة البيت، شباب الحي" required></label>
    <label class="field"><span class="lbl">أي خطة تشاركهم فيها؟</span><select id="gr-plan">${ps.map(p=>`<option value="${p.id}" ${p.id===pid?'selected':''}>${esc(p.name)}</option>`).join('')}<option value="">بدون خطة الحين</option></select></label>
    <div class="auth-err" id="grErr" role="alert"></div>
    <button type="submit" class="btn block big">أنشئ الحلقة</button></form>`);
  setTimeout(()=>document.getElementById('gr-name')?.focus(),50);
}
async function submitGroupNew(form){
  const name=form.querySelector('#gr-name').value.trim(), pid=form.querySelector('#gr-plan').value, err=form.querySelector('#grErr');
  if(!name){ err.textContent='اكتب اسم للحلقة.'; return; }
  const btn=form.querySelector('[type=submit]'); btn.disabled=true;
  try{ const code=await createGroup(name,pid); closeSheet(); location.hash='#group-'+code; toast('جاهزة، أرسل الرابط لأصحابك'); }
  catch(e){ err.textContent='تعذّر الاتصال، تأكد من الإنترنت.'; btn.disabled=false; }
}
/* the plan menu's «الحفظ مع الأصحاب» opens the حلقة that shares this plan, or starts a new one */
function friendsSheet(id){ const c=Object.keys(state.groups).find(k=>state.groups[k].plan===id); if(c){ location.hash='#group-'+c; return; } grNewSheet(id); }
function joinSheet(code=''){
  const ps=plansSorted().filter(p=>status(p)!=='archived');
  if(code && state.groups[code]){ location.hash='#group-'+code; return; }
  openSheet(`${sheetHead('انضم لحلقة')}
    <form class="stack" id="joinf">
      <div class="gr-prev" id="grPrev"></div>
      <label class="field"><span class="lbl">كود الحلقة أو المجمع (موجود آخر الرابط)</span><input id="j-code" dir="ltr" class="code-in" maxlength="6" autocomplete="off" autocapitalize="characters" value="${esc(code)}" placeholder="ABC123"></label>
      <label class="field"><span class="lbl">أي خطة تشاركهم فيها؟</span><select id="j-plan">${ps.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}<option value="__new">خطة جديدة</option><option value="">بدون خطة الحين</option></select></label>
      <div class="auth-err" id="joinErr" role="alert"></div>
      <button type="submit" class="btn block big">انضم</button></form>`);
  if(code) groupMembers(code).then(ms=>{ const el=document.getElementById('grPrev'); const vs=Object.values(ms); if(el&&vs.length) el.innerHTML=`<b>${esc(groupName(code,ms))}</b><small>${vs.slice(0,3).map(m=>esc(m.name||'صديق')).join('، ')}${vs.length>3?` و${f(vs.length-3)} غيرهم`:''}</small>`; }).catch(()=>{});
}
async function submitJoin(form){
  const code=form.querySelector('#j-code').value.trim().toUpperCase().replace(/.*#(JOIN|CENTER)-/,''), pid=form.querySelector('#j-plan').value, err=form.querySelector('#joinErr');
  if(!/^[A-Z0-9]{6}$/.test(code)){ err.textContent='الكود ستة أحرف وأرقام.'; return; }
  if(state.groups[code]){ closeSheet(); location.hash='#group-'+code; return; }
  const btn=form.querySelector('[type=submit]'); btn.disabled=true;
  let ms; try{ ms=await groupMembers(code); }catch(e){ err.textContent='تعذّر الاتصال، تأكد من الإنترنت.'; btn.disabled=false; return; }
  if(!Object.keys(ms).length){ let d=null; try{ d=await rtdb(`centers/${code}/info`); }catch(e){}
    if(d){ closeSheet(); location.hash='#center-'+code; return; }
    err.textContent='ما لقينا حلقة ولا مجمع بهذا الكود. تأكد منه مع صاحبك.'; btn.disabled=false; return; }
  if(pid==='__new'){ ui.joinCode=code; closeSheet(); location.hash='#new'; toast(`أنشئ خطتك، وتنضم مباشرة لـ«${groupName(code,ms)}»`); return; }
  try{ await joinGroup(code,pid,ms); }catch(e){ err.textContent='تعذّر الاتصال، تأكد من الإنترنت.'; btn.disabled=false; return; }
  closeSheet(); toast(`انضممت لـ«${groupName(code,ms)}»، بالتوفيق`); location.hash='#group-'+code;
}
/* start the same plan a friend follows, from today, with your own progress */
function copyFriendPlan(code,uid){
  const m=(grCache[code]||{})[uid]; if(!m||!m.tpl) return;
  const plan=normPlan({...JSON.parse(JSON.stringify(m.tpl)), id:'p'+Date.now().toString(36), created:Date.now(), status:'active', start:todayIso(), done:{}, code:newCode()});
  if(!buildSeq(isCycle(plan)?plan.review.range:plan.hifz.range).length){ toast('ما قدرنا ننسخ هذي الخطة'); return; }
  put(plan); toast(`بدأت نفس خطة ${m.name||'صاحبك'}، بالتوفيق`); location.hash='#plan-'+plan.id;
}
function groupsSection(){
  if(!cloudOn() || !auth.s) return '';
  const n=Object.keys(state.groups).length;
  return `<a class="card gr-row" href="#groups"><span class="gr-ic sm">${GR_IC}</span><span class="gr-t"><b>الحلقات</b><small>${n?plural(n,'حلقة واحدة','حلقتان','حلقات','حلقة'):'احفظ مع أصحابك وشوفوا إنجاز بعض'}</small></span><span class="muted">‹</span></a>`;
}
function syncLabel(){ const el=document.getElementById('sync'); if(el) el.textContent = state.mode==='cloud' ? (auth.s?'خططك محفوظة في حسابك':'خططك محفوظة في حسابك') : 'الخطط محفوظة على هذا الجهاز'; }

/* ---------- router ---------- */
function route(){ return (location.hash||'#today').slice(1); }
function render(){
  let r=route();
  document.body.classList.toggle('gated', cloudOn() && !auth.s);
  if(r.startsWith('join-')){ const code=r.slice(5).toUpperCase(); if(cloudOn() && !auth.s){ ui.pendingJoin=code; } else { r=state.groups[code]?'group-'+code:'groups'; history.replaceState(null,'','#'+r); if(!state.groups[code]) setTimeout(()=>joinSheet(code),0); } }
  if(r.startsWith('asrtest')){ view.innerHTML=vAsrTest(r); return; }
  if(ui.act){ document.body.classList.add('gated'); view.innerHTML=vAction(); runAction(); return; }
  if(cloudOn() && !auth.s){ view.innerHTML=vAuth(); return; }
  if(needsVerify()){ document.body.classList.add('gated'); view.innerHTML=vVerify(); verifyPoll(); return; }
  if(r==='mushaf'){ r='read-'+(lastPage()||1); history.replaceState(null,'','#'+r); }
  document.querySelectorAll('.nav .tabs a').forEach(a=>a.classList.toggle('on', a.dataset.v===r || ((r.startsWith('plan-')||r.startsWith('edit-')||r.startsWith('stages-'))&&a.dataset.v==='plans') || ((r.startsWith('read-')||r.startsWith('tafs-')||r.startsWith('recite-')||r==='mindex')&&a.dataset.v==='mushaf')||(r.startsWith('quiz-')&&a.dataset.v==='today')||((r.startsWith('group-')||r.startsWith('center-'))&&a.dataset.v==='groups')));
  if(!r.startsWith('recite-')) stopRec();
  if(!r.startsWith('read-')) mkClose(); if(r!==wbR) wbClose(); document.documentElement.classList.toggle('aml', amStyle()==='l'); document.documentElement.classList.toggle('amm', amStyle()==='m'||amStyle()==='v'); { const sy=document.getElementById('sync'); if(sy) sy.hidden=!(r==='plans'||r==='me'); } mthClose();
  document.documentElement.classList.toggle('mpg', /^(read|wird|tafs)-/.test(r)); document.documentElement.dataset.mth=mth(); document.documentElement.dataset.tj=tjMode(); document.documentElement.classList.toggle('nomus',noMus()); document.documentElement.classList.toggle('norec',noAI()); document.documentElement.classList.toggle('mbold',mBold());
  document.body.classList.toggle('mreading', r.startsWith('read-')); document.body.classList.toggle('rcfull', r.startsWith('recite-') && !!MS); if(!r.startsWith('recite-')) document.body.classList.remove('rchide'); document.documentElement.classList.toggle('mreading', r.startsWith('read-')); document.body.classList.toggle('mui', !!ui.mui);
  if(r==='new' || r.startsWith('edit-')){
    const ed = r.startsWith('edit-') ? state.plans[r.slice(5)] : null;
    view.innerHTML=vNew(ed); const fm=document.getElementById('newf'); if(ed) fillForm(fm,ed); else initForm(fm); syncForm(fm);
  }
  else if(r==='plans') view.innerHTML=vPlans();
  else if(r==='stats') view.innerHTML=vStats();
  else if(r==='me') view.innerHTML=vMe();
  else if(r==='mindex') view.innerHTML=vMushaf();
  else if(r==='groups') view.innerHTML=vGroups();
  else if(r.startsWith('group-')) view.innerHTML=vGroup(r.slice(6));
  else if(r.startsWith('center-')) view.innerHTML=vCenter(r.slice(7).toUpperCase());
  else if(r.startsWith('read-')) view.innerHTML=vRead(+r.slice(5));
  else if(r.startsWith('tafs-')) view.innerHTML=vTafs(+r.slice(5));
  else if(r.startsWith('recite-')) view.innerHTML=vRecite(r);
  else if(r.startsWith('quiz-')) view.innerHTML=vQuiz(r);
  else if(r.startsWith('plan-')) view.innerHTML=vPlan(r.slice(5));
  else if(r.startsWith('wird-')) view.innerHTML=vWird(r);
  else if(r.startsWith('stages-')) { location.replace('#plan-'+r.slice(7)); return; }
  else view.innerHTML=vToday();
  plMark();
  if(r.startsWith('read-')) fitPage();
  if(r.startsWith('read-') && ui.flash){ const id=ui.flash; ui.flash=null; document.querySelectorAll(`#mpage .ay[data-id="${id}"]`).forEach(x=>{ x.classList.add('flash'); setTimeout(()=>x.classList.remove('flash'),2600); }); }
  if(r.startsWith('wird-')) wirdFit();
  if(r.startsWith('recite-')) rcFit();
  if(r.startsWith('tafs-')) tafsFill(r);
  if(r==='today'||r==='stats') checkBadges();
  if(r==='today') tdScroll();
}
function rerender(){ const y=window.scrollY; render(); window.scrollTo(0,y); }
window.addEventListener('hashchange',()=>{ ui.menu=null; closeSheet(); render(); window.scrollTo(0,0); });

/* ---------- events ---------- */
function toggleSession(plan,k){
  const s=compute(plan).sessions[k], all=sessDone(plan,s), now=Date.now();
  for(const tk of s.tasks){ if(all) setGot(plan,tk,0); else if(!plan.done[tk.key]) setGot(plan,tk,stepsOf(tk)); }
  if(!all && stats(plan).firstOpen<0 && status(plan)==='active'){ plan.status='complete'; toast('ما شاء الله، أتممت الخطة كاملة'); }
  put(plan);
}

function toggleTask(plan,k,i){
  const tk=compute(plan).sessions[k].tasks[i];
  setGot(plan,tk, plan.done[tk.key] ? 0 : stepsOf(tk));
  if(plan.done[tk.key] && stats(plan).firstOpen<0){ plan.status='complete'; toast('ما شاء الله، أتممت الخطة كاملة'); }
  put(plan);
}
document.addEventListener('click',e=>{
  if(lpDone){ lpDone=false; e.preventDefault(); return; } // the click that ends a long press
  if(document.getElementById('mthpop') && !e.target.closest('.mthpop,[data-act=mThPop]')){ mthClose(); if(!e.target.closest('[data-act]:not(.ay),a')){ e.preventDefault(); return; } }
  if(document.getElementById('wbpop') && !e.target.closest('.wbpop')){ wbClose(); if(!e.target.closest('[data-act]:not(.ay),a')){ e.preventDefault(); return; } }
  { const tw=(wbL()||wbT()) && e.target.closest('.tafsv .tw[data-w], .mread .ay[data-w]'); if(tw && !e.target.closest('.sheet')){ wbPop(tw); e.preventDefault(); return; } }
  // reading a wird: the page fills the screen; a short tap shows or hides the header and buttons
  if(route().startsWith('wird-') && e.target.closest('.wpg') && !e.target.closest('.sheet,.scrim,.mkbar,.wbpop')){ ui.wui=!ui.wui; document.querySelector('.wird')?.classList.toggle('wui',ui.wui); e.preventDefault(); return; }
  if(document.body.classList.contains('mreading') && !e.target.closest('.sheet,.scrim,.plbar,.topbar,.mnav,.mslide,.nav,.toast,.msdl,.mload,.mkbar,.mrd,.wbpop,.mthpop')){
    const mk=e.target.closest('.mread .ay.mk'); if(mk){ ayahSheet(+mk.dataset.id); e.preventDefault(); return; }
    if(document.getElementById('mkbar')){ mkClose(); e.preventDefault(); return; }
    // a short tap only shows or hides the controls; a long press on a word opens its ayah
    ui.mui=!ui.mui; document.body.classList.toggle('mui',ui.mui); e.preventDefault(); return;
  }
  const b=e.target.closest('[data-act]');
  if(ui.menu && !e.target.closest('.pop') && !(b && (b.dataset.act==='planMenu'||b.dataset.act==='grMenu'||b.dataset.act==='ctMenu'))){ ui.menu=null; rerender(); return; }
  if(b && ui.menu && b.closest('.pop') && b.dataset.code){ ui.menu=null; rerender(); }
  if(!b) return;
  const act=b.dataset.act, plan=b.dataset.plan?state.plans[b.dataset.plan]:null;
  if(b.dataset.tk){ const [pid,k,i]=b.dataset.tk.split('|'); ui.sess={pid,k:+k,tab:+i}; } // buttons on a task card act like the ones in its sheet
  if(act==='closeSheet'){ if(e.target!==b && b.classList.contains('scrim')) return; closeSheet(); rerender(); return; }
  if(act==='toggleSess'){ toggleSession(plan,+b.dataset.k); rerender(); return; }
  if(act==='toggleTask'){ toggleTask(plan,+b.dataset.k,+b.dataset.i); rerender(); return; }
  if(act==='openSess'){ ui.sess={pid:plan.id,k:+b.dataset.k,tab:+(b.dataset.i||0)}; sessSheet(); return; }
  if(act==='sessTab'){ ui.sess.tab=+b.dataset.i; sessSheet(); return; }
  if(act==='sheetDone'){ toggleTask(state.plans[ui.sess.pid],ui.sess.k,ui.sess.tab); sessSheet(); rerender(); return; }
  if(act==='star'){ setRec({s:+b.dataset.i}); sessSheet(); return; }
  if(act==='settings'){ settingsSheet(plan.id); return; }
  if(act==='ctMenu'){ const k='ct:'+b.dataset.code; ui.menu = ui.menu===k ? null : k; rerender(); return; }
  if(act==='grMenu'){ const k='gr:'+b.dataset.code; ui.menu = ui.menu===k ? null : k; rerender(); return; }
  if(act==='planMenu'){ ui.menu = ui.menu===plan.id ? null : plan.id; rerender(); return; }
  if(act==='setStep'){ const {pid,k,tab}=ui.sess, pl=state.plans[pid], s=compute(pl).sessions[k], tk=s.tasks[Math.min(tab,s.tasks.length-1)], n=+b.dataset.n;
    setGot(pl,tk, gotOf(pl,tk)===n ? n-1 : n);
    if(pl.done[tk.key] && stats(pl).firstOpen<0 && status(pl)==='active'){ pl.status='complete'; toast('ما شاء الله، أتممت الخطة كاملة'); }
    put(pl); if(b.closest('.sheet')) sessSheet(); rerender(); return; }
  if(act==='linkApps'){ ui.menu=null; rerender(); linkSheet(plan.id); return; }
  if(act==='pdfOpen'){ ui.menu=null; rerender(); pdfSheet(plan.id); return; }
  if(act==='pdfGo'){ const sc=b.dataset.scope, rng=sc==='range'?pdfRange():null; if(sc==='range' && !pdfKeys(plan,sc,rng).length) return toast('ما فيه جلسات في هذي الأيام، غيّر التاريخ'); closeSheet(); savePdf(plan,sc,rng); return; }
  if(act==='friends'){ ui.menu=null; rerender(); friendsSheet(plan.id); return; }
  if(act==='authMode'){ ui.authMode=b.dataset.m; ui.authNote=''; render(); return; }
  if(act==='verifyCheck'){ const er=document.getElementById('authErr'); b.disabled=true; b.textContent='لحظة…'; checkVerified().then(ok=>{ if(ok){ toast('تم تأكيد الإيميل ✓'); afterAuth(); claimMemberNo().then(()=>{ if(route()==='me') render(); }); } else { er.textContent='لسا ما تأكد الإيميل. افتح الرابط اللي وصلك ثم اضغط هنا.'; b.disabled=false; b.textContent='أكّدت الإيميل'; } },()=>{ er.textContent='تعذّر الاتصال، تأكد من الإنترنت وحاول مرة ثانية.'; b.disabled=false; b.textContent='أكّدت الإيميل'; }); return; }
  if(act==='verifyResend'){ const er=document.getElementById('authErr'); if(auth.s.vs && Date.now()-auth.s.vs<60000){ er.textContent='أرسلناه قبل شوي، انتظر دقيقة ثم حاول.'; return; } b.disabled=true; sendVerify().then(()=>{ toast('أرسلنا الرابط مرة ثانية'); b.disabled=false; },e=>{ er.textContent=e.message; b.disabled=false; }); return; }
  if(act==='actDone'){ ui.act=null; render(); return; }
  if(act==='verifyOut'){ signOut(); ui.authMode='up'; render(); return; }
  if(act==='authAddMiss'){ closeSheet(); const f=document.getElementById(b.dataset.f); if(f){ f.scrollIntoView({block:'center'}); f.focus(); } return; }
  if(act==='authSkipMiss'){ ui.authSkip=b.dataset.f; closeSheet(); document.getElementById('authf')?.requestSubmit(); return; }
  if(act==='account'){ location.hash='#me'; return; }
  if(act==='editProfile'){ profileSheet(); return; }
  if(act==='changePass'){ resetPassword(auth.profile?.email||auth.s.email).then(()=>toast('أرسلنا رابط تغيير كلمة السر إلى إيميلك'),()=>toast('تعذّر الإرسال، تأكد من الإنترنت')); return; }
  if(act==='support'){ ui.att=null; attStop(); supportSheet(); return; }
  if(act==='faq'){ faqSheet(); return; }
  if(act==='install'){ installSheet(); return; }
  if(act==='installNow'){ installNow(); return; }
  if(act==='installX'){ try{ sessionStorage.setItem('rafiq-inst-x','1'); localStorage.setItem('rafiq-inst-x', String(Date.now()+3*864e5)); }catch(_){} instBanner(); return; }
  if(act==='ayTap'){ ayahSheet(+b.dataset.id); return; }
  if(act==='chal'){ const c=chalToday(), st=lsJ(CH_LS,{}); if(st.last!==todayIso()){ st.last=todayIso(); st.n=(st.n||0)+1; lsW(CH_LS,st); }
    if(c.go){ location.hash=c.go; return; } rerender(); ayahSheet(c.id); return; }
  if(act==='tfK'){ try{ localStorage.setItem('rafiq-tfk',b.dataset.k); }catch(_){} if(route().startsWith('tafs-')){ rerender(); return; } document.querySelectorAll('.tfk button').forEach(x=>x.classList.toggle('on',x===b)); showTafsir(+b.dataset.id); return; }
  if(act==='mkC'){ const id=+document.getElementById('mkbar').dataset.id, m=MKS()[id], u=ui.mkUndo, l=b.dataset.l;
    if(u && u.for===id && l!==u.l){ ui.mkUndo=null; if(u.prev){ MKS()[u.prev.id]=u.prev.m; mkSave(); mkPaint(u.prev.id); } }
    try{ localStorage.setItem('rafiq-mkl',l); }catch(_){} mkSet(id,m?m.w:-1,l); mkBar(id); return; }
  if(act==='lbNew'){ ui.lbEd=null; labSheet(null); return; }
  if(act==='lbList'){ labsSheet(); return; }
  if(act==='lbEdit'){ ui.lbEd=null; labSheet(b.dataset.l); return; }
  if(act==='lbC'||act==='lbM'){ const e=ui.lbEd; e.n=document.getElementById('lbn')?.value||''; if(act==='lbC') e.c=b.dataset.c; else e.m=+b.dataset.m; labSheet(e.id); return; }
  if(act==='lbSave'){ const e=ui.lbEd, n=(document.getElementById('lbn')?.value||'').trim()||MKCOL[e.c];
    let x=e.id&&lab(e.id); if(x){ x.n=n; x.c=e.c; if(e.m && !x.m){ const ids=mkOf(x.id).sort((a,b2)=>MKS()[b2].t-MKS()[a].t); ids.slice(1).forEach(mkDel); } x.m=e.m; }
    else { x={id:'l'+Date.now().toString(36),n,c:e.c,m:e.m}; LBS().push(x); }
    lbSaveAll(); ui.lbEd=null; closeSheet();
    const bar=document.getElementById('mkbar'); if(bar){ const id=+bar.dataset.id; if(!e.id){ const m=MKS()[id]; try{ localStorage.setItem('rafiq-mkl',x.id); }catch(_){} mkSet(id,m?m.w:-1,x.id); } mkBar(id); }
    if(ui.lbFor){ const id=ui.lbFor; ui.lbFor=null; if(!e.id) mkSet(id,MS?MS.as[id-1]:-1,x.id); ui.ayCol=id; ayahSheet(id); }
    Object.keys(MKS()).forEach(id=>mkPaint(+id)); if(route()==='mindex') rerender(); return; }
  if(act==='lbDel'){ const l=ui.lbEd&&ui.lbEd.id; if(!l) return; if(LBS().length<2) return toast('خلّ علامة وحدة على الأقل');
    mkOf(l).forEach(mkDel); lbCache=LBS().filter(x=>x.id!==l); lbSaveAll(); ui.lbEd=null; closeSheet(); const bar=document.getElementById('mkbar'); if(bar) mkBar(+bar.dataset.id); if(route()==='mindex') rerender(); return; }
  if(act==='lbTab'){ ui.lbTab=b.dataset.l; labsSheet(); return; }
  if(act==='lbSort'){ ui.lbSort=b.dataset.k; labsSheet(); return; }
  if(act==='mkRm'){ mkDel(+b.dataset.id); labsSheet(); if(route()==='mindex') rerender(); return; }
  if(act==='mkDel'){ mkDel(+document.getElementById('mkbar').dataset.id); mkClose(); return; }
  if(act==='mkX'){ ui.mkUndo=null; mkClose(); return; }
  if(act==='wGo'){ wirdGo(+b.dataset.d); return; }
  if(act==='wBack'){ if(history.length>1) history.back(); else location.hash='#today'; return; }
  if(act==='wDone'){ const w=wirdOf(route()); if(!w) return; if(!w.plan.done[w.tk.key]) toggleTask(w.plan,w.k,w.i); w.ps.forEach(p=>notePage(p));
    try{ navigator.vibrate&&navigator.vibrate(20); }catch(_){} toast(`ما شاء الله، أنجزت ${KIND[w.tk.kind]} وانحسبت لك ${plural(w.ps.length,'صفحة واحدة','صفحتان','صفحات','صفحة')}`);
    if(history.length>1) history.back(); else location.hash='#today'; return; }
  if(act==='wOpen'){ const {pid,k,tab}=ui.sess, s=compute(state.plans[pid]).sessions[k], i=Math.min(tab,s.tasks.length-1); closeSheet(); location.hash=`#wird-${pid}-${k}-${i}`; return; }
  if(act==='mkTf'){ const id=+document.getElementById('mkbar').dataset.id; mkClose(); ayahSheet(id); return; }
  if(act==='plAyah'){ closeSheet(); plStart(plIds([[+b.dataset.a,+b.dataset.b]])); return; }
  if(act==='listenTask'){ const {pid,k,tab}=ui.sess, s=compute(state.plans[pid]).sessions[k], tk=s.tasks[Math.min(tab,s.tasks.length-1)]; closeSheet(); rerender(); plStart(plIds(tk.rs)); return; }
  if(act==='plToggle'){ plToggle(); return; }
  if(act==='plSkip'){ plSkip(+b.dataset.d); return; }
  if(act==='plStop'){ plStop(); return; }
  if(act==='audSet'){ audSheet(); return; }
  if(act==='tailYes'){ const p=state.plans[b.dataset.plan]; if(p){ tailApply(p); toast('تم تحديث خطتك'); rerender(); } return; }
  if(act==='tailNo'){ const p=state.plans[b.dataset.plan]; if(p){ p.tailNo=1; put(p); rerender(); } return; }
  if(act==='ayCopy'){ const t=ayText(+b.dataset.id); navigator.clipboard?.writeText(t).then(()=>toast('نُسخت الآية'),()=>toast('ما قدرنا ننسخ')); return; }
  if(act==='ayShare'){ const t=ayText(+b.dataset.id)+'\n\nمن تطبيق ربيع القرآن 🌿\n'+APP_URL; if(navigator.share) navigator.share({text:t}).catch(()=>{}); else navigator.clipboard?.writeText(t).then(()=>toast('نُسخت الآية، الصقها وين ما تبي')); return; }
  if(act==='dlGo'){ const a=+document.getElementById('dlA').value, z=+document.getElementById('dlB').value, r=document.getElementById('dlR').value, lo=Math.min(a,z);
    audDownload(r,Array.from({length:Math.abs(z-a)+1},(_,i)=>lo+i).filter(s=>!isDl(r,s))); return; }
  if(act==='dlOpen'){ dlSheet('n'); return; }
  if(act==='dlTab'){ dlSheet(b.dataset.k); return; }
  if(act==='dlDel'){ audDel(b.dataset.r,+b.dataset.s).then(()=>dlSheet('h')); return; }
  if(act==='dlDelAll'){ const r=b.dataset.r; Promise.all((DLS()[r]||[]).map(s=>audDel(r,s))).then(()=>{ dlSheet('h'); toast('حُذفت التلاوات'); }); return; }
  if(act==='audOpt'){ const o=audOpts(), v=b.dataset.v; o[b.dataset.k]= v==='a'?'a':+v; audSave(o); if(AUD) AUD.playbackRate=o.sp; audSheet(); plBar(); if(route()==='today'||route()==='') rerender(); if(b.dataset.from==='rng'){ rngSheet(); return; } return; }
  if(act==='qzPick'){ const z=ui.qz; if(z&&z.pick===null){ z.pick=+b.dataset.k; if(z.qs[z.i].ch[z.pick]===z.qs[z.i].ok) z.score++; rerender(); } return; }
  if(act==='qzNext'){ const z=ui.qz; if(z){ z.i++; z.pick=null; render(); window.scrollTo(0,0); } return; }
  if(act==='qzAgain'){ ui.qz=null; render(); window.scrollTo(0,0); return; }
  if(act==='listenKind'){ const rs=(ui.todayListen||{})[b.dataset.k]; if(rs) plStart(plIds(rs)); return; }
  if(act==='allBadges'){ badgesSheet(); return; }
  if(act==='shareCard'){ shareCard().catch(()=>toast('تعذّر تجهيز الصورة')); return; }
  if(act==='mTheme'){ const cyc=['w','y','k'], k=b.dataset.k||cyc[(cyc.indexOf(mth())+1)%3]; try{ localStorage.setItem('rafiq-mth',k); }catch(_){} if(b.dataset.from==='pop'){ document.documentElement.dataset.mth=k; document.querySelectorAll('.mnight').forEach(x=>x.innerHTML=isNight()?IC.sun:IC.moon); mthClose(); return; } if(b.dataset.from==='mm'){ document.documentElement.dataset.mth=k; document.querySelectorAll('.mnight').forEach(x=>x.innerHTML=isNight()?IC.sun:IC.moon); mMenu(); return; } if(document.querySelector('.apsw')){ document.documentElement.dataset.mth=k; apSheet(); return; } if(route()==='mindex') rerender(); else { document.documentElement.dataset.mth=k; document.querySelectorAll('.mthb .mthdot').forEach(x=>x.className='mthdot t-'+k); toast(MTH.find(x=>x[0]===k)[1]); } return; }
  if(act==='setVoice'){ const on=b.dataset.k==='1'; try{ localStorage.setItem('rafiq-voice',on?'1':'0'); }catch(_){} render();
    if(on){ toast('شكراً لك، تسجيلاتك القادمة تساعد في تحسين المصحّح'); return; }
    let v=null; try{ v=localStorage.getItem('rafiq-vid'); }catch(_){} if(!v){ toast('أوقفنا حفظ التسجيلات'); return; }
    vcForget(v).then(ok=>toast(ok?'أوقفنا الحفظ وحذفنا تسجيلاتك المحفوظة':'أوقفنا الحفظ، وسنحذف تسجيلاتك المحفوظة أول ما يتوفر الاتصال')); return; }
  if(act==='setNoAI'){ try{ localStorage.setItem('rafiq-noai',b.dataset.k); }catch(_){} render(); toast(b.dataset.k==='1'?'أخفينا التسميع':'رجع التسميع'); return; }
  if(act==='setNoMus'){ try{ localStorage.setItem('rafiq-nomus',b.dataset.k); }catch(_){} render(); toast(b.dataset.k==='1'?'أخفينا المصحف من القائمة':'رجع المصحف للقائمة'); return; }
  if(act==='setLang'){ if(b.dataset.k===LANG) return; try{ localStorage.setItem('rafiq-lang',b.dataset.k); }catch(_){} location.reload(); return; }
  if(act==='allSess'){ ui.allS=ui.allS||{}; ui.allS[b.dataset.id]=1; rerender(); return; }
  if(act==='appTh'){ try{ localStorage.setItem('rafiq-th',b.dataset.k); }catch(_){} applyTh(); rerender(); return; }
  if(act==='mNight'){ let day='y'; try{ day=localStorage.getItem('rafiq-mday')||'y'; if(!isNight()&&mth()!=='a') localStorage.setItem('rafiq-mday',mth()); }catch(_){}
    const k=isNight()?day:'k'; try{ localStorage.setItem('rafiq-mth',k); }catch(_){} document.documentElement.dataset.mth=k; document.querySelectorAll('.mnight').forEach(x=>x.innerHTML=isNight()?IC.sun:IC.moon); toast(k==='k'?'الوضع الليلي':'وضع النهار'); return; }
  if(act==='tjOpen'){ tjSheet(); return; }
  if(act==='mThPop'){ mthPop(b); return; }
  if(act==='mMenu'){ mMenu(); return; }
  if(act==='ayCol'){ const id=+b.dataset.id; ui.ayCol=ui.ayCol===id?null:id; ayahSheet(id); return; }
  if(act==='ayLbNew'){ ui.lbFor=+b.dataset.id; ui.lbEd=null; labSheet(null); return; }
  if(act==='ayW'){ ayWordPanel(+b.dataset.w); return; }
  if(act==='ayQuick'){ const id=+b.dataset.id, l=b.dataset.l, m=MKS()[id]; if(m&&m.l===l) mkDel(id); else mkSet(id,MS?MS.as[id-1]:-1,l); toast(m&&m.l===l?'شلنا العلامة':`حُفظت في «${lab(l).n}»`); ayahSheet(id); return; }
  if(act==='ayNote'){ noteSheet(+b.dataset.id); return; }
  if(act==='noteSave'){ const id=+b.dataset.id, t=document.getElementById('ntx').value.trim(), N=NOTES(); if(t) N[id]={t,ts:Date.now()}; else delete N[id]; lsW('rafiq-notes',N); toast(t?'حُفظت الملاحظة':'حُذفت الملاحظة'); ayahSheet(id); return; }
  if(act==='noteDel'){ const id=+b.dataset.id, N=NOTES(); delete N[id]; lsW('rafiq-notes',N); toast('حُذفت الملاحظة'); ayahSheet(id); return; }
  if(act==='notesOpen'){ notesSheet(); return; }
  if(act==='ayInfo'){ ayInfoSheet(+b.dataset.id); return; }
  if(act==='rngOpen'){ const id=+b.dataset.id||0; ui.rgA=id||ui.rgA; ui.rgB=id?Math.min(PG[pOf[id]+1]-1,S[sOf[id]][0]+S[sOf[id]][1]-1):ui.rgB; rngSheet(); return; }
  if(act==='rgGo'){ const o=audOpts(), r=document.getElementById('audR'); if(r){ o.r=r.value; audSave(o); } const a=Math.min(ui.rgA,ui.rgB), z=Math.max(ui.rgA,ui.rgB); closeSheet(); plStart(plIds([[a,z]])); if(!route().startsWith('read-')) location.hash='#read-'+pOf[a]; return; }
  if(act==='tfFold'){ const k=b.dataset.k, c=TFC(), i=c.indexOf(k); if(i<0) c.push(k); else c.splice(i,1); lsW('rafiq-tfc',c); document.querySelectorAll(`.tatf[data-k="${k}"]`).forEach(x=>x.classList.toggle('shut',i<0)); return; }
  if(act==='tfAll'){ lsW('rafiq-tfc',b.dataset.v==='1'?[]:tfList()); document.querySelectorAll('.tatf').forEach(x=>x.classList.toggle('shut',b.dataset.v!=='1')); return; }
  if(act==='tfShare'){ const id=+b.dataset.id, k=b.dataset.k, el=b.closest('.tatf').querySelector('.tfb'), text=`${ayText(id)}\n\n${tfName(k)}:\n${el.innerText.trim()}`;
    (async()=>{ try{ if(navigator.share){ await navigator.share({text}); return; } }catch(_){ return; } try{ await navigator.clipboard.writeText(text); toast('نُسخ التفسير'); }catch(_){} })(); return; }
  if(act==='tfEye'){ const on=!lsOn('rafiq-tfh'); try{ localStorage.setItem('rafiq-tfh',on?'1':'0'); }catch(_){} document.querySelector('.tafsv')?.classList.toggle('noay',on); b.classList.toggle('on',on); toast(on?'أخفينا الآيات، يظهر التفسير بس':'رجعت الآيات'); return; }
  if(act==='tfTog'){ const L=tfList(), k=b.dataset.k, i=L.indexOf(k); if(i<0) L.push(k); else L.splice(i,1); tfSave(L); tfSrcSheet(); if(route().startsWith('tafs-')) rerender(); return; }
  if(act==='libOpen'){ libSheet(); return; }
  if(act==='libTab'){ libSheet(b.dataset.k); return; }
  if(act==='libAbout'){ libAbout(b.dataset.k); return; }
  if(act==='libDl'||act==='libUpd'){ tfDownload(b.dataset.k); libSheet(); return; }
  if(act==='libDel'){ confirmSheet(`هل أنت متأكد من حذف تحميل «${tfName(b.dataset.k)}»؟ يرجع يحتاج إنترنت.`,'libDelGo',b.dataset.k); return; }
  if(act==='libDelGo'){ tfDel(b.dataset.k).then(()=>{ toast('حُذف التحميل'); libSheet(); }); return; }
  if(act==='libEye'){ const L=tfList(), k=b.dataset.k, i=L.indexOf(k); if(i<0) L.push(k); else L.splice(i,1); tfSave(L); libSheet(); if(route().startsWith('tafs-')) rerender(); return; }
  if(act==='wbL'||act==='wbT'){ const k=act==='wbL'?'rafiq-wl':'rafiq-wt', on=!lsOn(k); try{ localStorage.setItem(k,on?'1':'0'); }catch(_){} mMenu();
    if(on){ toast('اضغط على أي كلمة في المصحف'); loadWbw().catch(()=>toast('تحتاج إنترنت أول مرة لتحميل الكلمات')); } return; }
  if(act==='wbPlay'){ wbPlay(b.dataset.u); return; }
  if(act==='fontOpen'){ fontSheet(); return; }
  if(act==='mushafsOpen'){ mushafsSheet(); return; }
  if(act==='remOpen'){ remSheet(); return; }
  if(act==='remPlan'){ linkSheet(b.dataset.plan); return; }
  if(act==='goIdx'){ closeSheet(); location.hash='#mindex'; return; }
  if(act==='tfSrc'){ tfSrcSheet(); return; }
  if(act==='tfAdd'||act==='tfRm'||act==='tfMv'){ const L=tfList(), k=b.dataset.k, i=L.indexOf(k);
    if(act==='tfAdd' && i<0) L.push(k); if(act==='tfRm' && i>=0) L.splice(i,1);
    if(act==='tfMv' && i>=0){ const j=i+ +b.dataset.d; if(j>=0&&j<L.length){ L[i]=L[j]; L[j]=k; } }
    tfSave(L); tfSrcSheet(); if(route().startsWith('tafs-')) rerender(); return; }
  if(act==='boldSet'){ try{ localStorage.setItem('rafiq-bold',b.dataset.k); }catch(_){} document.documentElement.classList.toggle('mbold',b.dataset.k==='1'); fontSheet(); if(/^(read|wird)-/.test(route())) rerender(); return; }
  if(act==='tfDiaK'){ try{ localStorage.setItem('rafiq-nodia',b.dataset.k); }catch(_){} fontSheet(); if(route().startsWith('tafs-')) rerender(); return; }
  if(act==='langOpen'){ langSheet(); return; }
  if(act==='admOpen'){ admSheet(); return; }
  if(act==='admT'){ ui.admT=b.dataset.k; admPaint(); return; }
  if(act==='attRec'){ attRecToggle(); return; }
  if(act==='attImg'){ document.getElementById('attfile')?.click(); return; }
  if(act==='attRmV'){ if(ui.att) ui.att.voice=null; attPaint(); return; }
  if(act==='attRmI'){ if(ui.att&&ui.att.imgs) ui.att.imgs.splice(+b.dataset.i,1); attPaint(); return; }
  if(act==='admAtt'){ admAtt(b.dataset.u,b.dataset.k); return; }
  if(act==='rateOpen'){ ui.att=null; attStop(); ui.rate=0; rateSheet(); return; }
  if(act==='rateStar'){ ui.rate=+b.dataset.n; const msg=document.getElementById('r-msg')?.value||''; rateSheet(); const t=document.getElementById('r-msg'); if(t) t.value=msg; return; }
  if(act==='feedback'){ if(!(cloudOn()&&auth.s)){ toast('سجّل دخولك عشان نقدر نرد عليك'); return; } ui.att=null; attStop(); supportSheet(); return; }
  if(act==='tfSz'){ try{ localStorage.setItem('rafiq-tfs',String(tfSize()+ +b.dataset.d)); }catch(_){} if(b.dataset.from==='font'){ fontSheet(); if(!route().startsWith('tafs-')) return; } rerender(); return; }
  if(act==='tfDia'){ try{ localStorage.setItem('rafiq-nodia',noDia()?'0':'1'); }catch(_){} rerender(); return; }
  if(act==='apOpen'){ apSheet(); return; }
  if(act==='amSet'){ try{ localStorage.setItem('rafiq-am',b.dataset.k); }catch(_){} (b.dataset.from==='font'?fontSheet:apSheet)(); if(/^(read|wird|tafs|recite)-/.test(route())) rerender(); return; }
  if(act==='tjSet'){ const k=b.dataset.k; try{ localStorage.setItem('rafiq-tj',k); }catch(_){} document.documentElement.dataset.tj=k; if(b.dataset.from==='ap') apSheet(); else tjSheet();
    const go=()=>{ if(/^(read|wird|tafs)-/.test(route())) rerender(); }; if(k!=='0' && !TJ){ toast('جارٍ تجهيز التلوين…'); loadTajweed().then(go).catch(()=>toast('تحتاج إنترنت أول مرة لتحميل التلوين')); } else go(); return; }
  if(act==='flipDir'){ try{ localStorage.setItem('rafiq-flip',b.dataset.k); }catch(_){} rerender(); return; }
  if(act==='mjTog'){ const j=+b.dataset.j, op=ui.mjOpen||(ui.mjOpen={}); if(op[j]) delete op[j]; else op[j]=1; rerender(); return; }
  if(act==='mtab'){ ui.mtab=b.dataset.k; rerender(); if(ui.mtab==='q') document.getElementById('aq')?.focus(); return; }
  if(act==='aqGo'){ ui.flash=+b.dataset.id; if(b.classList.contains('aqrow')) aqKeep(ui.aq); return; }
  if(act==='aqX'){ ui.aqx=!ui.aqx; b.querySelector('.circle').classList.toggle('on',ui.aqx); const el=document.getElementById('aqr'); if(el) el.innerHTML=aqResults(); return; }
  if(act==='aqHs'){ ui.aq=ui.mq=b.dataset.q; rerender(); return; } // the link opens the page; the ayah glows there for a moment
  if(act==='msDl'){ msDownload(); return; }
  if(act==='msSkip'){ ui.msSkip=true; rerender(); return; }
  if(act==='mretry'){ qtP=null; rerender(); return; }
  if(act==='recFromTask'){ const {pid,k,tab}=ui.sess, pl=state.plans[pid], s=compute(pl).sessions[k], i=Math.min(tab,s.tasks.length-1), tk=s.tasks[i];
    ui.rcFrom={pid,k,i}; location.hash='#recite-'+tk.rs.map(([a,b])=>a+'-'+b).join('_'); return; }
  if(act==='grDay'){ ui.grD=b.dataset.d; const st=document.getElementById('grst'), code=(route()||'').slice(6), ms=grCache[code]; if(st&&ms){ const ids=Object.keys(ms).sort((a,c)=>(c===auth.s.uid)-(a===auth.s.uid)); st.innerHTML=grStats(ms,ids); grDaysScroll(); } return; }
  if(act==='rcHide'){ ui.rc.hide=!ui.rc.hide; rerender(); return; }
  if(act==='tdDay'){ ui.tday=b.dataset.d===todayIso()?null:b.dataset.d; rerender(); return; }
  if(act==='tdFold'){ ui.tdOpen=ui.tdOpen||{}; ui.tdOpen[b.dataset.plan]=!ui.tdOpen[b.dataset.plan]; rerender(); return; }
  if(act==='rcOpt'){ ui.rcOpt=!ui.rcOpt; rerender(); return; }
  if(act==='rcAsr'){ const on=!ASRQ(); try{ localStorage.setItem('rafiq-asr',on?'q':''); }catch(e){} stopRec(); coiSet(on).then(ok=>{ if(on && ok && !self.crossOriginIsolated){ toast('نجهّز المصحّح الذكي…'); setTimeout(()=>location.reload(),600); } }); if(on) asrLoad(); rerender(); return; }
  if(act==='rcMic'){ const rc=ui.rc; if(rc.on && rc.mode==='q'){ asrFinish(); rerender(); return; } if(rc.on){ stopRec(); alignRec(rc.W, rc.segs.join(' '), true); rc.done=true; rc.msg=''; rerender(); document.getElementById('rcsum')?.scrollIntoView({block:'nearest',behavior:'smooth'}); } else { if(rc.done){ rc.W=null; rc.segs=[]; rc.done=false; rc.saved=0; } rcStart(); } return; }
  if(act==='rcAsrYes'||act==='rcAsrNo'){ ui.rcAsk=false; asrChoose(act==='rcAsrYes'?'q':'g'); if(act==='rcAsrYes'&&!ASR.ready) toast('نجهّز المصحّح الذكي… وتقدر تسمّع الحين بالمصحّح القياسي'); rcStart(); return; }
  if(act==='rcAsrSet'){ asrChoose(b.dataset.k); rerender(); return; }
  if(act==='rcHint'){ const w=ui.rc.W?.find(x=>(x.st==='p'||x.st==='c')&&!x.hint); if(w){ w.hint=true; rcPaint(); } return; }
  if(act==='rcCont'){ const rc=ui.rc; rc.done=false; rc.on=true; rc.msg=''; rerender(); startRec(); return; }
  if(act==='rcReset'){ stopRec(); Object.assign(ui.rc,{W:null,segs:[],done:false,msg:'',saved:0,pi:[],qs:[],finishing:false,gStart:0,gSkip:0,cp:null,autoP:null,map:null}); rerender(); return; }
  if(act==='rcDone'){ const {pid,k,i}=ui.rc.from, pl=state.plans[pid], tk=compute(pl).sessions[k].tasks[i]; setGot(pl,tk,stepsOf(tk));
    if(stats(pl).firstOpen<0 && status(pl)==='active') pl.status='complete'; put(pl); toast('سجّلناها منجزة، بارك الله فيك'); location.hash='#today'; return; }
  if(act==='about'){ aboutSheet(); return; }
  if(act==='shareApp'){ if(ui.menu){ ui.menu=null; rerender(); } shareApp(); return; }
  if(act==='delAcct'){ delAcctSheet(); return; }
  if(act==='delAcctGo'){ const pwEl=document.getElementById('delPw'), er=document.getElementById('delErr');
    if(!delFresh() && !pwEl){ closeSheet(); delAcctSheet(); return; }
    if(pwEl && !delFresh() && !pwEl.value){ document.getElementById('delPwF').classList.add('miss'); if(er) er.textContent='كلمة السر مطلوبة للتأكد من صاحب الحساب.'; pwEl.focus(); return; }
    b.disabled=true; (pwEl && !delFresh() ? delReauth(pwEl.value) : Promise.resolve()).then(()=>deleteAccount()).then(()=>{ closeSheet(); toast('حُذف حسابك. في أمان الله'); },e=>{ b.disabled=false; const el=document.getElementById('delErr'); if(el) el.textContent=e.message; }); return; }
  if(act==='signOut'){ signOutSheet(); return; }
  if(act==='signOutGo'){ closeSheet(); signOut(); return; }
  if(act==='joinOpen'){ joinSheet(b.dataset.code||''); return; }
  if(act==='grNew'){ grNewSheet(); return; }
  if(act==='ctNew'){ ctNewSheet(); return; }
  if(act==='ctAdmin'){ ctAdminSheet(b.dataset.code); return; }
  if(act==='ctAdd'){ ctAddSheet(b.dataset.code); return; }
  if(act==='ctFollow'){ const c=b.dataset.code; centerData(c).then(d=>{ followCenter(c,d); toast('أُضيف المجمع، اختر حلقتك'); rerender(); }).catch(()=>toast('تعذّر الاتصال، تأكد من الإنترنت')); return; }
  if(act==='ctLeave'){ leaveCenter(b.dataset.code); toast('أُزيل المجمع من القائمة'); location.hash='#groups'; return; }
  if(act==='ctRen'){ const c=b.dataset.code, x=state.centers[c]; if(!x) return;
    openSheet(`${sheetHead('اسم المجمع')}<form class="stack" id="ctRenF"><label class="field"><input id="ctRenI" maxlength="60" autocomplete="off" value="${esc(x.name||'')}"></label><button type="submit" class="btn block">حفظ الاسم</button></form>`);
    document.getElementById('ctRenF').addEventListener('submit',async e=>{ e.preventDefault(); const n=document.getElementById('ctRenI').value.trim(); if(!n) return;
      try{ await rtdb(`centers/${c}/info/name`,'PUT',n); x.name=n; ctStore(); closeSheet(); toast('تم تغيير الاسم'); rerender(); }catch(err){ toast('تعذّر الاتصال، تأكد من الإنترنت'); } });
    setTimeout(()=>document.getElementById('ctRenI')?.focus(),50); return; }
  if(act==='ctShare'||act==='ctLink'||act==='ctCode'){ const c=b.dataset.code, txt=ctInvite(c);
    if(act==='ctShare' && navigator.share){ navigator.share({text:txt}).catch(()=>{}); return; }
    navigator.clipboard?.writeText(act==='ctCode'?c:act==='ctLink'?ctLink(c):txt).then(()=>toast(act==='ctCode'?'نُسخ الكود':'نُسخ الرابط، أرسله للطلاب')).catch(()=>toast(ctLink(c))); return; }
  if(act==='grRen'){ const c=b.dataset.code, g=state.groups[c]; if(!g) return;
    openSheet(`${sheetHead('اسم الحلقة')}<form class="stack" id="grRenF" data-code="${c}"><label class="field"><input id="grRenI" maxlength="40" autocomplete="off" value="${esc(g.name||'')}" placeholder="مثلاً: حلقة البيت، شباب الحي"></label><button type="submit" class="btn block">حفظ الاسم</button></form>`);
    const f=document.getElementById('grRenF'); f.addEventListener('submit',e=>{ e.preventDefault(); const n=document.getElementById('grRenI').value.trim(); if(!n) return; g.name=n; grStore(); pushMember(c).catch(()=>{}); closeSheet(); toast('تم تغيير الاسم'); rerender(); });
    setTimeout(()=>document.getElementById('grRenI')?.focus(),50); return; }
  if(act==='grCopy'){ copyFriendPlan(b.dataset.code,b.dataset.uid); return; }
  if(act==='grLeave'){ const c=b.dataset.code; leaveGroup(c); toast('خرجت من الحلقة'); location.hash='#groups'; return; }
  if(act==='copyCode'||act==='shareCode'||act==='copyLink'){ const c=b.dataset.code, txt=inviteText(c);
    if(act==='shareCode' && navigator.share){ navigator.share({text:txt}).catch(()=>{}); return; }
    navigator.clipboard?.writeText(act==='copyCode'?c:act==='copyLink'?grLink(c):txt).then(()=>toast(act==='copyCode'?'نُسخ الكود':'نُسخ الرابط، أرسله لأصحابك')).catch(()=>toast(grLink(c))); return; }
  if(act==='addWerd'){ const k=b.dataset.w; if(!WERDS[k]) return;
    if(Object.values(state.plans).some(p=>p.werd===k)){ toast('هذا الورد مضاف عندك من قبل'); return; }
    const p=werdPlan(k); p.code=newCode(); put(p); toast(`أُضيف ورد ${WERDS[k].name}، ${WERDS[k].when}`); rerender(); return; }
  if(act==='copyWird'){ copyWird(); return; }
  if(act==='shareWird'){ const ta=document.getElementById('wirdTxt');
    if(navigator.share) navigator.share({text:ta.value}).catch(err=>{ if(err?.name!=='AbortError') copyWird(); }); else copyWird(); return; }
  if(act==='pause'){ ui.menu=null; plan.status = status(plan)==='paused'?'active':'paused'; put(plan); closeSheet(); toast(plan.status==='paused'?'أُوقفت الخطة مؤقتاً':'استُؤنفت الخطة'); rerender(); return; }
  if(act==='askDel'){ document.getElementById('delc').innerHTML=`<div class="card" style="border-color:var(--warn)"><p style="margin:0 0 10px">ستُحذف «${esc(plan.name)}» وكل ما سجّلته فيها. متأكد؟</p><div class="row"><button class="btn danger" data-act="del" data-plan="${plan.id}">نعم، احذفها</button><button class="btn ghost" data-act="closeSheet">إلغاء</button></div></div>`; return; }
  if(act==='del'){ ui.menu=null; del(plan.id); closeSheet(); toast('حُذفت الخطة'); location.hash='#plans'; return; }
  if(act==='askResched'){ reschedSheet(plan.id); return; }
  if(act==='resched'){ const st=stats(plan); plan.anchor={k:st.firstOpen,date:todayIso()}; put(plan); closeSheet(); toast('رُتّبت الجلسات من اليوم'); rerender(); return; }
  if(act==='stageMenu'){ ui.stageMenu[plan.id]=!ui.stageMenu[plan.id]; rerender(); return; }
  if(act==='stage'){ ui.stage[plan.id]=+b.dataset.i; ui.menu=null; if(b.tagName!=='A') rerender(); return; }
});
document.addEventListener('change',e=>{
  const t=e.target;
  if(t.id==='remindAt'){ const plan=state.plans[t.dataset.plan]; if(plan && t.value){ plan.remindAt=t.value; put(plan); document.getElementById('gcal').href=gcalUrl(plan); } return; }
  if(t.id==='grPlan'){ setGroupPlan(t.dataset.code,t.value).then(()=>{ toast('تم'); grFill(t.dataset.code); }).catch(()=>toast('تعذّر الاتصال، تأكد من الإنترنت')); return; }
  if(t.id==='audR'){ const o=audOpts(); o.r=t.value; audSave(o); plBar(); if(route()==='today') rerender(); return; }
  if(t.id==='dlA'||t.id==='dlB'||t.id==='dlR'){ dlShow(); return; }
  if(t.id==='note' && ui.sess){ setRec({n:t.value.slice(0,500)}); return; }
  const form=t.closest('#newf'); if(form) syncForm(form,t);
});
let aqT=null;
document.addEventListener('input',e=>{ if(e.target.id==='aq'){ ui.aq=e.target.value; clearTimeout(aqT); aqT=setTimeout(()=>{ const el=document.getElementById('aqr'); if(el) el.innerHTML=aqResults(); },200); return; }
  if(e.target.id==='mq'){ ui.mq=e.target.value; const pos=e.target.selectionStart; rerender(); const el=document.getElementById('mq'); if(el){ el.focus(); try{ el.setSelectionRange(pos,pos); }catch(_){} } return; }
  const form=e.target.closest('#newf'); if(form && e.target.type==='number') syncForm(form); });
document.addEventListener('keydown',e=>{ if(e.key!=='Escape') return; if(sheetRoot.innerHTML){ closeSheet(); rerender(); } else if(ui.menu){ ui.menu=null; rerender(); } });
document.addEventListener('submit',e=>{
  if(e.target.id==='authf'){ e.preventDefault(); submitAuth(e.target); return; }
  if(e.target.id==='npassf'){ e.preventDefault(); submitNewPass(e.target); return; }
  if(e.target.id==='joinf'){ e.preventDefault(); submitJoin(e.target); return; }
  if(e.target.id==='grf'){ e.preventDefault(); submitGroupNew(e.target); return; }
  if(e.target.id==='ctf'){ e.preventDefault(); submitCenterNew(e.target); return; }
  if(e.target.id==='ctaf'){ e.preventDefault(); submitCircleAdd(e.target); return; }
  if(e.target.id==='proff'){ e.preventDefault(); submitProfile(e.target); return; }
  if(e.target.id==='supf'){ e.preventDefault(); submitSupport(e.target); return; }
  if(e.target.id==='ratef'){ e.preventDefault(); submitRate(e.target); return; }
  if(e.target.id!=='newf') return;
  e.preventDefault(); const plan=planFromForm(e.target);
  if(plan.err){ toast(plan.err); return; } delete plan.err;
  if(!buildSeq(isCycle(plan)?plan.review.range:plan.hifz.range).length){ toast('اختر نطاقاً فيه آيات'); return; }
  const editId=e.target.dataset.edit;
  if(editId && state.plans[editId]){ const old=state.plans[editId];
    plan.id=old.id; plan.created=old.created; plan.status=old.status==='complete'?'active':old.status; plan.rec=old.rec; cache.delete(plan.id); carryOver(old,plan);
    const st=stats(plan), t=todayIso(); if(st.firstOpen>0) plan.anchor={k:st.firstOpen,date:plan.start>t?plan.start:t};
    put(plan); toast('حُفظ التعديل'); location.hash='#plan-'+plan.id; return; }
  plan.code=newCode(); const jc=ui.joinCode; ui.joinCode=null;
  put(plan); if(jc){ joinGroup(jc,plan.id).then(()=>{ toast('بدأت الخطة وانضممت للحلقة'); location.hash='#group-'+jc; }).catch(()=>toast('بدأت الخطة، وتعذّر الانضمام للحلقة')); return; }
  toast('بدأت الخطة، بارك الله لك'); location.hash='#today';
});

ui.act=readAction();
render(); instBanner();
/* fetch the mushaf in the background on first launch, so it is ready (and offline) before the reader opens it */
setTimeout(()=>{ if(!MS && !ui.msDl) msHave().then(h=>{ ui.msHave=h; if(!h && !ui.msDl) msDownload(); }).catch(()=>{}); },2000);
/* reload into a newer version when the site was updated while this page stayed open */
async function checkUpdate(){ vcRetry(); if(!FB || !navigator.onLine) return; try{ const t=await (await fetch('index.html?v='+Date.now(),{cache:'no-store'})).text(); const m=t.match(/const APP_VER='([^']+)'/); if(m && m[1]!==APP_VER && !document.querySelector('.sheet') && !document.activeElement?.matches('input,textarea,select')) location.reload(); }catch(e){} }
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible') checkUpdate(); });
setTimeout(checkUpdate,4000);
setTimeout(()=>{ if(navigator.onLine) loadQuran().catch(()=>{}); },6000);
initStore().then(syncLabel);
setTimeout(()=>verifyBoot().then(()=>navigator.onLine&&claimMemberNo()).then(()=>{ if(route()==='me') render(); }),1500);
