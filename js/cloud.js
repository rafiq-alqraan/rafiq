/* ---------- accounts and friends (public site only): Firebase Auth + Realtime Database over REST ---------- */
const FB = {"apiKey":"AIzaSyD1yubZkN2ODekOD5eBPnlL1PPBNONvZLg","db":"https://rafiq-alhifz-4b088-default-rtdb.europe-west1.firebasedatabase.app"}; // {apiKey, db} — filled in by buildsite.py
const AUTH_LS='rafiq-auth-v1';
const auth = { s:null, profile:null };
try{ auth.s = JSON.parse(localStorage.getItem(AUTH_LS)||'null'); }catch(e){}
const authSave = () => { try{ auth.s ? localStorage.setItem(AUTH_LS,JSON.stringify(auth.s)) : localStorage.removeItem(AUTH_LS); }catch(e){} };
const cloudOn = () => !!(FB && FB.apiKey);

const AUTH_ERR = {
  EMAIL_EXISTS:'هذا الإيميل مسجّل من قبل. سجّل دخولك بدلاً من ذلك.',
  EMAIL_NOT_FOUND:'الجوال أو الإيميل أو كلمة السر غير صحيحة.',
  INVALID_PASSWORD:'الجوال أو الإيميل أو كلمة السر غير صحيحة.',
  INVALID_LOGIN_CREDENTIALS:'الجوال أو الإيميل أو كلمة السر غير صحيحة.',
  INVALID_EMAIL:'اكتب الإيميل بشكل صحيح.',
  WEAK_PASSWORD:'كلمة السر قصيرة، اجعلها ٦ أحرف أو أكثر.',
  TOO_MANY_ATTEMPTS_TRY_LATER:'محاولات كثيرة، انتظر قليلاً ثم حاول.',
  USER_DISABLED:'هذا الحساب موقوف.',
  MISSING_PASSWORD:'اكتب كلمة السر.',
  CREDENTIAL_TOO_OLD_LOGIN_AGAIN:'حفاظاً على أمان حسابك، يحتاج الحذف إلى تسجيل دخول جديد.',
  TOKEN_EXPIRED:'حفاظاً على أمان حسابك، يحتاج الحذف إلى تسجيل دخول جديد.'
};
async function idp(path,body){
  const r=await fetch(`https://identitytoolkit.googleapis.com/v1/${path}?key=${FB.apiKey}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const j=await r.json().catch(()=>({}));
  if(!r.ok){ const code=(j.error&&j.error.message||'').split(' ')[0]; const e=new Error(AUTH_ERR[code]||'تعذّر الاتصال، تأكد من الإنترنت وحاول مرة ثانية.'); e.code=code; throw e; }
  return j;
}
function takeSession(j){ const keep=auth.s&&auth.s.uid===(j.localId||j.user_id)?{ev:auth.s.ev,vs:auth.s.vs,lk:auth.s.lk}:{}; auth.s={...keep, uid:j.localId||j.user_id, email:j.email||auth.s?.email, id:j.idToken||j.id_token, rt:j.refreshToken||j.refresh_token, exp:Date.now()+((+(j.expiresIn||j.expires_in)||3600)-120)*1000}; authSave(); }
async function token(){
  if(!auth.s) throw new Error('no session');
  if(Date.now()<auth.s.exp) return auth.s.id;
  const r=await fetch(`https://securetoken.googleapis.com/v1/token?key=${FB.apiKey}`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=refresh_token&refresh_token='+encodeURIComponent(auth.s.rt)});
  if(!r.ok){ if(r.status===400){ signOut(); } throw new Error('refresh'); }
  takeSession(await r.json()); return auth.s.id;
}
async function rtdb(path,method='GET',data){
  const r=await fetch(`${FB.db}/${path}.json?auth=${await token()}`,{method, headers:{'Content-Type':'application/json'}, body: data===undefined?undefined:JSON.stringify(data)});
  if(!r.ok) throw new Error('db '+r.status);
  try{ return await r.json(); }catch(e){ throw new Error('تعذّر الاتصال، تأكد من الإنترنت وحاول مرة ثانية.'); }
}
/* Firebase drops empty objects and arrays, so put back what a plan needs */
function normPlan(p){ p.done=p.done||{}; p.days=p.days||[]; if(p.prog===undefined) delete p.prog; return p; }

/* phone OR email: an account made with a phone only signs in through a fixed address made from the number;
   logins/<number> points a number to the account's sign-in address so either one can be used to log in */
const PHONE_DOM='phone.rabi-alquran.app';
const normDigits=t=>(t||'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[\s\-()]/g,'');
const phoneOk=p=>/^\+?\d{9,15}$/.test(p);
function phoneKey(p){ let d=normDigits(p).replace(/^\+/,'').replace(/^00/,''); if(/^05\d{8}$/.test(d)) d='966'+d.slice(1); else if(/^5\d{8}$/.test(d)) d='966'+d; return d; }
const phoneMail=p=>`p${phoneKey(p)}@${PHONE_DOM}`;
const isPhoneMail=e=>(e||'').toLowerCase().endsWith('@'+PHONE_DOM);
const realEmail=()=>{ const e=auth.profile?.email||auth.s?.email||''; return isPhoneMail(e)?'':e; };
/* logins/<number> = {u: uid, s: salt, iv, c}: the sign-in address locked (AES-GCM) with a key made from the account's password (PBKDF2),
   so a number shows nobody the email; only the one who types the right password can open it */
const LK_IT=150000, b64=u=>btoa(String.fromCharCode(...new Uint8Array(u))), unb64=x=>Uint8Array.from(atob(x),c=>c.charCodeAt(0));
async function lkKey(pass,salt){ const m=await crypto.subtle.importKey('raw',new TextEncoder().encode(pass),'PBKDF2',false,['deriveBits']); return new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:LK_IT},m,256)); }
async function lkOpen(rec,pass){ try{ const k=await crypto.subtle.importKey('raw',await lkKey(pass,unb64(rec.s)),'AES-GCM',false,['decrypt']); return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(rec.iv)},k,unb64(rec.c))); }catch(e){ return null; } }
/* the key is made once at sign-in and kept with the session, so a changed number can be locked without asking for the password again */
async function lkPrep(pass){ try{ const salt=crypto.getRandomValues(new Uint8Array(16)); auth.s.lk={s:b64(salt), k:b64(await lkKey(pass,salt))}; authSave(); }catch(e){} }
async function loginOf(phone){ try{ const r=await fetch(`${FB.db}/logins/${phoneKey(phone)}.json`); if(!r.ok) return null; const v=await r.json(); return v&&typeof v==='object'&&v.u?v:null; }catch(e){ return null; } }
async function setLogin(phone,on){ if(!phone) return; try{
  if(!on){ await rtdb(`logins/${phoneKey(phone)}`,'DELETE'); return; }
  if(!auth.s?.lk) return;
  const k=await crypto.subtle.importKey('raw',unb64(auth.s.lk.k),'AES-GCM',false,['encrypt']), iv=crypto.getRandomValues(new Uint8Array(12));
  const c=await crypto.subtle.encrypt({name:'AES-GCM',iv},k,new TextEncoder().encode(auth.s.email));
  await rtdb(`logins/${phoneKey(phone)}`,'PUT',{u:auth.s.uid, s:auth.s.lk.s, iv:b64(iv), c:b64(c)});
}catch(e){} }
/* after each sign-in: write (or refresh, if the password changed) the record of the account's own number */
async function lkSync(){ const ph=auth.profile?.phone; if(!ph||!auth.s?.lk) return; const rec=await loginOf(ph); if(!rec||rec.u===auth.s.uid) await setLogin(ph,true); }
async function signUp({first,last,phone,email,password}){
  if(phone && await loginOf(phone)){ const e=new Error('رقم الجوال هذا مسجّل من قبل. سجّل دخولك بدلاً من ذلك.'); e.code='PHONE_EXISTS'; throw e; }
  const login=email||phoneMail(phone);
  try{ takeSession(await idp('accounts:signUp',{email:login,password,returnSecureToken:true})); }
  catch(e){ if(e.code==='EMAIL_EXISTS' && !email) e.message='رقم الجوال هذا مسجّل من قبل. سجّل دخولك بدلاً من ذلك.'; throw e; }
  await lkPrep(password);
  auth.profile={first,last,phone:phone||'',email:email||'',created:Date.now()};
  await rtdb(`users/${auth.s.uid}/profile`,'PUT',auth.profile);
  if(phone) await setLogin(phone,true);
  auth.s.ev=false; authSave(); await sendVerify().catch(()=>{});
  await afterSignIn();
}
async function signIn(id,password){
  let login=id;
  if(!id.includes('@')){ const rec=await loginOf(id);
    if(rec){ login=await lkOpen(rec,password); if(!login){ const e=new Error('الجوال أو كلمة السر غير صحيحة. إذا غيّرت كلمة السر مؤخراً، ادخل بإيميلك مرة واحدة.'); e.code='INVALID_LOGIN_CREDENTIALS'; throw e; } }
    else login=phoneMail(id); }
  takeSession(await idp('accounts:signInWithPassword',{email:login,password,returnSecureToken:true}));
  await lkPrep(password);
  if(!isPhoneMail(auth.s.email)){ try{ if(!(await checkVerified()) && !auth.s.vs) await sendVerify().catch(()=>{}); }catch(e){} }
  await afterSignIn();
  lkSync().catch(()=>{});
}
/* email links come back to the app: continueUrl (domain authorised in Firebase) + handled in the app by readAction() */
const ACT_URL='https://rafiq-alqraan.github.io/rafiq/';
async function oob(body){
  const go=b=>fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${FB.apiKey}`,{method:'POST',headers:{'Content-Type':'application/json','X-Firebase-Locale':'ar'},body:JSON.stringify(b)});
  let r=await go({...body,continueUrl:ACT_URL,canHandleCodeInApp:true}); let j=await r.json().catch(()=>({}));
  const code=(j.error&&j.error.message||'').split(' ')[0];
  if(!r.ok && /CONTINUE|DOMAIN|DYNAMIC|LINK|HOSTING/.test(code)){ r=await go(body); j=await r.json().catch(()=>({})); } // fall back to the plain link
  if(!r.ok){ const c=(j.error&&j.error.message||'').split(' ')[0]; const e=new Error(AUTH_ERR[c]||'تعذّر الإرسال، تأكد من الإنترنت وحاول مرة ثانية.'); e.code=c; throw e; }
  return j;
}
const resetPassword = email => oob({requestType:'PASSWORD_RESET',email});
/* email verification: accounts with a real email must confirm it before using the app */
const needsVerify = () => cloudOn() && auth.s && auth.s.ev!==true && !isPhoneMail(auth.s.email);
async function sendVerify(){ await oob({requestType:'VERIFY_EMAIL',idToken:await token()}); auth.s.vs=Date.now(); authSave(); }
async function checkVerified(){ const j=await idp('accounts:lookup',{idToken:await token()}); const u=(j.users||[])[0]||{}; if(u.emailVerified && auth.s.ev!==true) auth.s.exp=0; /* new token carries email_verified for the database rules */ auth.s.ev=!!u.emailVerified; if(u.email) auth.s.email=u.email; authSave(); return auth.s.ev; }
/* on start: learn the state once; old unverified accounts get the link sent automatically one time */
/* membership number: 0001, 0002… given in the order people confirm their email (no number before that).
   new accounts take the next free number: members/byNo/<n> is write-once in the database rules */
const MEMB_OLD={'1KzAdQgYYcXlRa1ioRmvQcJb22Y2':1}; // the owner keeps 0001
const MEMB_BASE=1;
const membNo=()=>auth.s && auth.s.ev===true ? (MEMB_OLD[auth.s.uid]||auth.s.no||0) : 0; // only confirmed emails get a number
const membTxt=n=>String(n).padStart(4,'0');
async function claimMemberNo(){
  if(!cloudOn()||!auth.s||auth.s.ev!==true||membNo()) return;
  try{
    const have=await rtdb(`memberNo/${auth.s.uid}`).catch(()=>null);
    if(typeof have==='number'){ auth.s.no=have; authSave(); return; }
    const hint=await rtdb('members/count').catch(()=>null); let n=Math.max(typeof hint==='number'?hint:0,MEMB_BASE)+1;
    for(let i=0;i<25 && n<=9999;i++,n++){ // byNo/<n> can be written only once, so the first person to take a number keeps it
      const w=await fetch(`${FB.db}/members/byNo/${n}.json?auth=${await token()}`,{method:'PUT',body:JSON.stringify(auth.s.uid)});
      if(w.status===401||w.status===403) continue; if(!w.ok) return;
      await rtdb(`memberNo/${auth.s.uid}`,'PUT',n); auth.s.no=n; authSave(); rtdb('members/count','PUT',n).catch(()=>{}); return;
    }
  }catch(e){}
}
/* links from Firebase emails open the app: ?mode=verifyEmail|resetPassword&oobCode=… */
function readAction(){ try{ const q=new URLSearchParams(location.search), mode=q.get('mode'), code=q.get('oobCode'); if(!mode||!code) return null; history.replaceState(null,'',location.pathname+(location.hash||'#today')); return {mode,code,st:'busy'}; }catch(e){ return null; } }
function enterApp(){ ui.act=null; document.body.classList.remove('gated'); if(!location.hash||location.hash==='#') history.replaceState(null,'','#today'); afterAuth(); }
async function runAction(){
  const a=ui.act; if(!a||a.ran) return; a.ran=true;
  if(a.mode==='verifyEmail'){
    try{
      const j=await idp('accounts:update',{oobCode:a.code});
      const mine=auth.s && (j.email||'').toLowerCase()===(auth.s.email||'').toLowerCase();
      if(mine){ auth.s.ev=true; auth.s.exp=0; authSave(); enterApp(); claimMemberNo().then(()=>{ if(route()==='me') render(); }); return; }
      ui.act=null; if(auth.s) signOut(); ui.authMode='in'; ui.prefill=j.email||''; ui.authNote='تم تأكيد إيميلك ✓ سجّل دخولك وابدأ.'; render(); return;
    }catch(e){
      if(auth.s){ try{ if(await checkVerified()){ enterApp(); claimMemberNo(); return; } }catch(_){} }
      a.st='bad'; render(); return;
    }
  }
  if(a.mode==='resetPassword'){
    try{ const j=await idp('accounts:resetPassword',{oobCode:a.code}); a.email=j.email||''; a.st='pass'; }catch(e){ a.st='bad'; }
    render(); return;
  }
  ui.act=null; render();
}
async function submitNewPass(form){
  const a=ui.act, err=form.querySelector('#authErr'), btn=form.querySelector('[type=submit]');
  const p1=form.querySelector('#n-pass').value, p2=form.querySelector('#n-pass2').value;
  if(p1.length<6) return err.textContent='كلمة السر ٦ أحرف أو أكثر.';
  if(p1!==p2) return err.textContent='كلمتا السر غير متطابقتين.';
  btn.disabled=true; btn.textContent='لحظة…';
  try{
    await idp('accounts:resetPassword',{oobCode:a.code,newPassword:p1});
    if(auth.s && (auth.s.email||'').toLowerCase()!==a.email.toLowerCase()) signOut();
    ui.act=null; await signIn(a.email,p1); toast('تم تغيير كلمة السر ✓'); afterAuth();
  }catch(e){ err.textContent=e.code==='EXPIRED_OOB_CODE'||e.code==='INVALID_OOB_CODE'?'الرابط انتهى، اطلب رابطاً جديداً.':e.message; btn.disabled=false; btn.textContent='حفظ والدخول'; }
}
let vpT=null; function verifyPoll(){ clearTimeout(vpT); vpT=setTimeout(async()=>{ if(!needsVerify()) return; if(document.visibilityState==='visible' && navigator.onLine){ try{ if(await checkVerified()){ enterApp(); claimMemberNo().then(()=>{ if(route()==='me') render(); }); return; } }catch(e){} } if(needsVerify()) verifyPoll(); },4000); }
async function verifyBoot(){ if(!cloudOn()||!auth.s||auth.s.ev===true||isPhoneMail(auth.s.email)||!navigator.onLine) return; try{ const ok=await checkVerified(); if(!ok && !auth.s.vs) await sendVerify().catch(()=>{}); render(); }catch(e){} }
function signOut(){ try{ localStorage.removeItem(PD_LS); }catch(e){} auth.s=null; auth.profile=null; authSave(); state.plans={}; state.groups={}; state.centers={}; try{ localStorage.removeItem(GR_LS); localStorage.removeItem(CT_LS); }catch(e){} cache.clear?.(); lsSave(); state.mode='local'; render(); }

/* load the account's plans; plans made on this device before signing in move into the account */
async function afterSignIn(){
  const t0=Date.now();
  const [prof,remote,grs,cts]=await Promise.all([rtdb(`users/${auth.s.uid}/profile`), rtdb(`users/${auth.s.uid}/plans`), rtdb(`users/${auth.s.uid}/groups`).catch(()=>null), rtdb(`users/${auth.s.uid}/centers`).catch(()=>null)]);
  auth.profile=prof||auth.profile;
  // changes made on this device that have not reached the account yet (offline, or the app closed too soon) win over the account's older copy
  const pd=pendGet(), mine=id=>pd[id] || (svAt[id]||0)>=t0;
  const plans={}; for(const [id,p] of Object.entries(remote||{})) if(!mine(id)) plans[id]=normPlan(p);
  for(const [id,p] of Object.entries(state.plans)) if(!plans[id] && (mine(id) || !(remote||{})[id])){ plans[id]=p; if(!pd[id]) pd[id]=1; }
  state.plans=plans; state.mode='cloud'; lsSave(); pendSet(pd);
  pendFlush();
  for(const p of Object.values(plans)) if(!p.code){ p.code=newCode(); cloudSave(p.id,p); }
  const groups={...(grs||{})}; let moved=false; // plans shared the old way (one code per plan) become a حلقة
  for(const p of Object.values(plans)) if(p.group && !groups[p.group]){ groups[p.group]={name:'', plan:p.id, at:p.created||Date.now()}; moved=true; }
  state.groups=groups; if(moved) grStore(); else { try{ localStorage.setItem(GR_LS,JSON.stringify(groups)); }catch(e){} }
  state.centers={...(cts||{})}; try{ localStorage.setItem(CT_LS,JSON.stringify(state.centers)); }catch(e){}
  pushAllGroups();
  claimMemberNo().then(()=>{ if(route()==='me') render(); });
}
async function cloudInit(){
  if(!cloudOn() || !auth.s) return;
  try{ await afterSignIn(); }catch(e){ console.warn('cloud',e); }
}
/* plans changed on this device and not yet saved in the account: rafiq-pending = {u: uid, p: {plan id: change no.}}.
   kept until the account confirms the save, and sent again when the internet comes back or the app is opened */
const PD_LS='rafiq-pending', cq={}, svAt={};
function pendGet(){ try{ const v=JSON.parse(localStorage.getItem(PD_LS)||'null'); return v&&auth.s&&v.u===auth.s.uid&&v.p?v.p:{}; }catch(e){ return {}; } }
function pendSet(p){ try{ Object.keys(p).length&&auth.s ? localStorage.setItem(PD_LS,JSON.stringify({u:auth.s.uid,p})) : localStorage.removeItem(PD_LS); }catch(e){} }
let offNote=0;
function cloudSave(id,data){
  if(!cloudOn() || !auth.s) return;
  const uid=auth.s.uid, pd=pendGet(), n=(pd[id]||0)+1; pd[id]=n; pendSet(pd); svAt[id]=Date.now();
  cq[id]=(cq[id]||Promise.resolve()).then(()=>new Promise(r=>setTimeout(r,60))).then(()=>{
      if(!auth.s||auth.s.uid!==uid) return;
      const cur=id in state.plans?state.plans[id]:null; // always send the newest copy
      return rtdb(`users/${uid}/plans/${id}`, cur===null?'DELETE':'PUT', cur===null?undefined:JSON.parse(JSON.stringify(cur)))
        .then(()=>{ const q=pendGet(); if(q[id]===n){ delete q[id]; pendSet(q); } }); })
    .catch(e=>{ console.warn(e); if(Date.now()-offNote>60000){ offNote=Date.now(); toast(navigator.onLine?'تعذّر الحفظ في حسابك الآن، وحُفظ على جهازك وسيُرفع تلقائياً':'لا يوجد اتصال الآن، حُفظ على جهازك وسيُرفع لحسابك تلقائياً'); } });
  if(data) setTimeout(()=>pushGroup(data),120);
}
let pfBusy=false;
function pendFlush(){ if(pfBusy||!cloudOn()||!auth.s||!navigator.onLine) return; const ids=Object.keys(pendGet()); if(!ids.length) return;
  pfBusy=true; setTimeout(()=>{ pfBusy=false; },3000); for(const id of ids) cloudSave(id, id in state.plans?state.plans[id]:null); }
window.addEventListener('online',()=>setTimeout(pendFlush,1500));
document.addEventListener('visibilitychange',()=>{ if(!document.hidden) pendFlush(); });
setInterval(pendFlush,60000);

/* ---------- friends: every plan has a code; whoever enters it shares progress with you ---------- */
const rid=(n,abc)=>[...crypto.getRandomValues(new Uint8Array(n))].map(x=>abc[x%abc.length]).join('');
const newCode=()=>rid(6,'ABCDEFGHJKLMNPQRSTUVWXYZ23456789');
const myName = () => auth.profile ? `${auth.profile.first||''} ${auth.profile.last||''}`.trim() : '';
function summary(plan){
  const sg=stages(plan), cs=sg.list[sg.cur]||{no:1,pct:0}, c=compute(plan), ds=datesOf(plan), t=todayIso();
  let total=0, done=0, pages=0;
  const ks={};
  for(const k of todayKeys(plan,c,ds,t)) for(const tk of c.sessions[k].tasks){ total++; if(plan.done[tk.key]) done++; const g=tk.kind==='r'||tk.kind==='t'?'f':tk.kind; ks[g]=(ks[g]===0?0:1)&(plan.done[tk.key]?1:0); }
  for(const s of c.sessions) for(const tk of s.tasks) if(tk.kind==='h' && plan.done[tk.key]) pages+=tk.pages;
  const mo={}, due=rolls(plan)&&c.base?c.base:ds, td=parse(t);
  for(let dn=1; dn<=td.getDate(); dn++){ const dd=iso(new Date(td.getFullYear(),td.getMonth(),dn)), sk=new Set();
    due.forEach((d,k)=>{ if(d===dd) sk.add(k); });
    c.sessions.forEach((x,k)=>{ if(x.tasks.some(tk=>{ const v=plan.done[tk.key]; return v && iso(new Date(+v))===dd; })) sk.add(k); });
    if(dd===t) for(const k of todayKeys(plan,c,ds,t)) sk.add(k);
    if(!sk.size) continue; const g={};
    for(const k of sk) for(const tk of c.sessions[k].tasks){ const q=tk.kind==='r'||tk.kind==='t'?'f':tk.kind; g[q]=(g[q]===0?0:1)&(plan.done[tk.key]?1:0); }
    mo[String(dn)]=['h','n','f'].map(q=>g[q]==null?'-':String(g[q])).join(''); }
  return {name:myName()||'صديق', plan:plan.name, type:plan.type, stage:cs.no, pct:cs.pct, done, total, pages:Math.round(pages*10)/10, ks, mo, mon:t.slice(0,7), streak:streakInfo().n, day:t, at:Date.now()};
}
/* ---------- الحلقة: a group of friends; each member shares one plan (or none) and sees everyone's day ---------- */
const GR_LS='rafiq-groups';
state.groups={}; try{ state.groups=JSON.parse(localStorage.getItem(GR_LS)||'{}')||{}; }catch(e){}
function grStore(){ try{ localStorage.setItem(GR_LS,JSON.stringify(state.groups)); }catch(e){}
  if(cloudOn() && auth.s) rtdb(`users/${auth.s.uid}/groups`,'PUT',Object.keys(state.groups).length?state.groups:null).catch(e=>console.warn('groups',e)); }
/* مجمع قرآني: a center (mosque, school) that holds several حلقات; centers/<code> = {info:{name,owner}, circles:{<group code>:{name}}} */
const CT_LS='rafiq-centers';
state.centers={}; try{ state.centers=JSON.parse(localStorage.getItem(CT_LS)||'{}')||{}; }catch(e){}
function ctStore(){ try{ localStorage.setItem(CT_LS,JSON.stringify(state.centers)); }catch(e){}
  if(cloudOn() && auth.s) rtdb(`users/${auth.s.uid}/centers`,'PUT',Object.keys(state.centers).length?state.centers:null).catch(e=>console.warn('centers',e)); }
async function centerData(code){ return (await rtdb(`centers/${code}`))||null; }
async function createCenter(name){
  const code=newCode(); await rtdb(`centers/${code}/info`,'PUT',{name, owner:auth.s.uid, at:Date.now()});
  state.centers[code]={name, at:Date.now(), own:1}; ctStore(); await ctJoinMe(code); return code;
}
async function addCircle(cc,name,pid){
  const g=await createGroup(name,pid); state.groups[g].ctr=cc; grStore();
  await rtdb(`centers/${cc}/circles/${g}`,'PUT',{name, at:Date.now()}); return g;
}
function followCenter(code,d){ state.centers[code]={name:(d&&d.info&&d.info.name)||'المجمع', at:Date.now()}; ctStore(); ctJoinMe(code); }
/* everyone in a center is listed under members so the supervisor can give them a role:
   المشرف (owner) → نائب المشرف (deputy: adds حلقات, renames, gives «يضيف حلقات») → يضيف حلقات (editor) → عضو */
const ctJoinMe=code=>rtdb(`centers/${code}/members/${auth.s.uid}`,'PUT',{name:myName()||'عضو', at:Date.now()}).catch(()=>{});
const ctRoleOf=(d,uid)=>d&&d.info&&d.info.owner===uid?'owner':(d&&d.roles&&d.roles[uid])||'';
const ROLE_N={owner:'المشرف', deputy:'نائب المشرف', editor:'يضيف حلقات', '':'عضو'};
const ctCache={};
function leaveCenter(code){ delete state.centers[code]; ctStore(); }
/* what a friend needs to start the same plan: its settings, without anyone's progress */
function planTpl(plan){ const t=JSON.parse(JSON.stringify(plan)); for(const k of ['id','created','done','rec','prog','code','group','anchor','status']) delete t[k]; return t; }
function memberEntry(code){
  const g=state.groups[code], plan=g&&state.plans[g.plan];
  const base = plan ? {...summary(plan), tpl:planTpl(plan)} : {name:myName()||'صديق', plan:'', streak:streakInfo().n, day:todayIso(), at:Date.now()};
  return {...base, gname:(g&&g.name)||''};
}
const gTimers={};
function pushMember(code){
  if(!cloudOn() || !auth.s || !state.groups[code]) return Promise.resolve();
  return rtdb(`groups/${code}/members/${auth.s.uid}`,'PUT',memberEntry(code));
}
function pushGroup(plan){
  if(!cloudOn() || !auth.s) return;
  for(const [code,g] of Object.entries(state.groups)) if(g.plan===plan.id){
    clearTimeout(gTimers[code]); gTimers[code]=setTimeout(()=>pushMember(code).catch(e=>console.warn('group',e)),800); }
}
function pushAllGroups(){ for(const code of Object.keys(state.groups)) pushMember(code).catch(()=>{}); }
let grDay=null; function grFresh(){ const t=todayIso(); if(grDay!==t && cloudOn() && auth.s){ grDay=t; pushAllGroups(); } }
document.addEventListener('visibilitychange',()=>{ if(!document.hidden) grFresh(); });
async function groupMembers(code){ const m=await rtdb(`groups/${code}/members`); return m||{}; }
const groupName=(code,ms)=>(state.groups[code]&&state.groups[code].name)||Object.values(ms||{}).map(m=>m.gname).find(Boolean)||'الحلقة';
async function createGroup(name,pid){
  const code=newCode(); state.groups[code]={name, plan:pid||null, at:Date.now(), own:1}; grStore();
  await pushMember(code); return code;
}
async function joinGroup(code,pid,ms){
  ms=ms||await groupMembers(code);
  state.groups[code]={name:groupName(code,ms), plan:pid||null, at:Date.now()}; grStore();
  await pushMember(code);
}
async function setGroupPlan(code,pid){ if(!state.groups[code]) return; state.groups[code].plan=pid||null; grStore(); await pushMember(code); }
async function leaveGroup(code){
  delete state.groups[code]; grStore();
  await rtdb(`groups/${code}/members/${auth.s.uid}`,'DELETE').catch(()=>{});
}

/* ---------- account page ---------- */
async function saveProfile(p){
  auth.profile={...(auth.profile||{}), ...p};
  await rtdb(`users/${auth.s.uid}/profile`,'PUT',auth.profile);
  pushAllGroups();
}

/* attachments for «رأيك يهمنا» and the rating: one voice note (up to 2 min) and up to 3 photos, squeezed small enough for the database */
const ATT_MAXS=120, ATT_MAXI=3;
let attRec=null;
const attHtml=()=>{ const a=ui.att||{}, r=attRec;
  return `<div class="attrow"><button type="button" class="btn ghost sm${r?' rec':''}" data-act="attRec">${r?`⏹ إيقاف · <bdi dir="ltr">${f(Math.floor(r.t/60))}:${f(String(r.t%60).padStart(2,'0'))}</bdi>`:a.voice?'🎤 سجّل من جديد':'🎤 رسالة صوتية'}</button>
    <button type="button" class="btn ghost sm" data-act="attImg" ${(a.imgs||[]).length>=ATT_MAXI?'disabled':''}>📷 أضف صورة</button><input type="file" id="attfile" accept="image/*" multiple hidden></div>
    ${a.voice?`<div class="attv"><audio controls src="${a.voice.d}"></audio><button type="button" class="icon-btn" data-act="attRmV" aria-label="حذف التسجيل">${IC.x}</button></div>`:''}
    ${(a.imgs||[]).length?`<div class="atti">${a.imgs.map((d,i)=>`<span><img src="${d}" alt=""><button type="button" data-act="attRmI" data-i="${i}" aria-label="حذف الصورة">✕</button></span>`).join('')}</div>`:''}`; };
const attPaint=()=>{ const el=document.getElementById('attbox'); if(el) el.innerHTML=attHtml(); };
const blobUrl=b=>new Promise((ok,no)=>{ const r=new FileReader(); r.onload=()=>ok(r.result); r.onerror=no; r.readAsDataURL(b); });
async function attRecToggle(){
  if(attRec){ attRec.mr.stop(); return; }
  if(!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder==='undefined'){ toast('جهازك ما يدعم التسجيل من هنا'); return; }
  let st; try{ st=await navigator.mediaDevices.getUserMedia({audio:true}); }catch(e){ toast('اسمح للتطبيق باستخدام المايك عشان تسجّل'); return; }
  const mime=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(m=>MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(m))||'';
  const mr=new MediaRecorder(st, mime?{mimeType:mime,audioBitsPerSecond:24000}:{audioBitsPerSecond:24000}), ch=[];
  attRec={mr,t:0,iv:setInterval(()=>{ attRec.t++; if(attRec.t>=ATT_MAXS) mr.stop(); attPaint(); },1000)};
  mr.ondataavailable=e=>{ if(e.data.size) ch.push(e.data); };
  mr.onstop=async()=>{ const t=attRec?attRec.t:0; clearInterval(attRec&&attRec.iv); attRec=null; st.getTracks().forEach(x=>x.stop());
    const b=new Blob(ch,{type:mr.mimeType||mime||'audio/webm'}); if(t<1||!b.size){ attPaint(); return; }
    ui.att=ui.att||{}; ui.att.voice={d:await blobUrl(b), s:t}; attPaint(); };
  mr.start(1000); attPaint(); }
const attStop=()=>{ if(attRec){ try{ attRec.mr.onstop=null; attRec.mr.stop(); attRec.mr.stream.getTracks().forEach(x=>x.stop()); }catch(e){} clearInterval(attRec.iv); attRec=null; } };
async function attFiles(fl){ ui.att=ui.att||{}; ui.att.imgs=ui.att.imgs||[];
  for(const fi of [...fl]){ if(ui.att.imgs.length>=ATT_MAXI){ toast(`أقصى شي ${f(ATT_MAXI)} صور`); break; } if(!/^image\//.test(fi.type)) continue;
    try{ const bm=await createImageBitmap(fi), k=Math.min(1,1280/Math.max(bm.width,bm.height)), c=document.createElement('canvas');
      c.width=Math.round(bm.width*k); c.height=Math.round(bm.height*k); c.getContext('2d').drawImage(bm,0,0,c.width,c.height);
      let q=.75, d=c.toDataURL('image/jpeg',q); while(d.length>450000 && q>.35){ q-=.1; d=c.toDataURL('image/jpeg',q); }
      ui.att.imgs.push(d); }catch(e){ toast('تعذّر فتح الصورة'); } }
  attPaint(); }
document.addEventListener('change',e=>{ if(e.target&&e.target.id==='attfile'){ attFiles(e.target.files); e.target.value=''; } });
const attHas=a=>!!(a&&(a.voice||(a.imgs&&a.imgs.length)));
const SN=n=>`<i class="sn" aria-label="سورة ${NAMES[n-1]}">${String.fromCharCode(0xE000+parseInt(String(n),16))} \uE000</i>`; // name, then «سورة» on its right
const ADM=['1KzAdQgYYcXlRa1ioRmvQcJb22Y2'], W3F='30a4cf48-2347-4b99-9670-7a9d202a217b';
const isAdm=()=>!!(auth.s&&ADM.includes(auth.s.uid));
async function sendSupport(msg,att){
  const pr=auth.profile||{}, ver=typeof APP_VER!=='undefined'?APP_VER:'';
  const has=attHas(att), m={msg, name:myName(), email:realEmail(), phone:pr.phone||'', at:Date.now(), ver};
  if(has){ m.v=att.voice?1:0; m.ni=(att.imgs||[]).length; }
  const r=await rtdb(`support/${auth.s.uid}`,'POST',m);
  if(has && r && r.name) try{ await rtdb(`supportFiles/${auth.s.uid}/${r.name}`,'PUT',{...(att.voice?{voice:att.voice}:{}), ...(m.ni?{imgs:att.imgs}:{})}); }catch(e){ toast('وصلت رسالتك، بس المرفق ما انرسل'); }
  const ax=has?`\n\n📎 مرفق: ${[m.v?'رسالة صوتية':'', m.ni?m.ni+' صورة':''].filter(Boolean).join(' و ')}. افتحها من التطبيق: الحساب ← الإدارة ← الرسائل والتقييمات.`:'';
  if(W3F) try{ const rt=/^تقييم التطبيق/.test(msg);
    await fetch('https://api.web3forms.com/submit',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},
      body:JSON.stringify({access_key:W3F, subject:(rt?'تقييم جديد':'رسالة جديدة')+' · ربيع القرآن', from_name:'ربيع القرآن', name:myName()||'مستخدم', email:realEmail()||undefined,
        message:`${msg}${ax}\n\n— ${myName()||''}\nالإيميل: ${realEmail()||'-'}\nالجوال: ${pr.phone||'-'}\nالإصدار: ${ver}`})}); }catch(e){} // the copy in the database is what counts
}
/* admin: every message and rating, newest first (only the owner's account can read support/) */
async function admSheet(){ openSheet(`${sheetHead('الرسائل والتقييمات')}<div id="admb"><p class="muted" style="text-align:center">جارٍ التحميل…</p></div>`);
  let d; try{ d=await rtdb('support'); }catch(e){ const el=document.getElementById('admb'); if(el) el.innerHTML=`<p class="muted" style="text-align:center">تعذّر فتح الرسائل (${esc(String(e.message||e))}).</p>`; return; }
  const L=[]; for(const [u,m] of Object.entries(d||{})) for(const [k,x] of Object.entries(m||{})) L.push({...x,u,k});
  L.sort((a,b)=>(b.at||0)-(a.at||0)); ui.adm=L; admPaint(); }
async function admAtt(u,k){ const el=document.getElementById('ax-'+k); if(!el) return; el.innerHTML='<p class="muted small">جارٍ التحميل…</p>';
  try{ const d=await rtdb(`supportFiles/${u}/${k}`)||{};
    el.innerHTML=`${d.voice?`<audio controls src="${d.voice.d}"></audio>`:''}${(d.imgs||[]).length?`<div class="atti big">${d.imgs.map(x=>`<a href="${x}" download="صورة.jpg"><img src="${x}" alt=""></a>`).join('')}</div>`:''}`||'<p class="muted small">ما لقينا المرفق.</p>'; }
  catch(e){ el.innerHTML='<p class="muted small">تعذّر تحميل المرفق.</p>'; } }
function admPaint(){ const el=document.getElementById('admb'); if(!el) return; const L=ui.adm||[], t=ui.admT||'a';
  const rate=x=>{ const m=/\((\d)\/5\)/.exec(x.msg||''); return /^تقييم التطبيق/.test(x.msg||'')&&m?+m[1]:0; };
  const R=L.filter(rate), avg=R.length?R.reduce((s,x)=>s+rate(x),0)/R.length:0;
  const V=L.filter(x=>t==='a'||(t==='r')===!!rate(x));
  const dt=x=>x.at?new Date(x.at).toLocaleString('ar-SA-u-ca-gregory',{day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'}):'';
  const ph=p=>{ let n=String(p||'').replace(/\D/g,''); if(/^05\d{8}$/.test(n)) n='966'+n.slice(1); return n?`<a href="https://wa.me/${n}" target="_blank" rel="noopener">${esc(p)}</a>`:''; };
  el.innerHTML=`<div class="stack"><div class="admsum"><div><b>${f(L.length-R.length)}</b><small>رسالة</small></div><div><b>${f(R.length)}</b><small>تقييم</small></div><div><b>${R.length?f(avg.toFixed(1))+' ★':'—'}</b><small>متوسط التقييم</small></div></div>
    <div class="tabs2 sm">${[['a','الكل'],['m','الرسائل'],['r','التقييمات']].map(([k,l])=>`<button class="${t===k?'on':''}" data-act="admT" data-k="${k}">${l}</button>`).join('')}</div>
    ${V.length?V.map(x=>{ const r=rate(x), body=r?(x.msg||'').split('\n').slice(1).join('\n').trim():x.msg;
      return `<div class="admc"><div class="admh"><b>${esc(x.name||'مستخدم')}</b><small>${dt(x)}</small></div>${r?`<div class="admr">${'★'.repeat(r)}<span>${'★'.repeat(5-r)}</span></div>`:''}${body?`<p>${esc(body)}</p>`:''}
      ${x.v||x.ni?`<div class="admx" id="ax-${x.k}"><button class="btn ghost sm" data-act="admAtt" data-u="${x.u}" data-k="${x.k}">📎 ${[x.v?'اسمع الرسالة الصوتية':'', x.ni?`${f(x.ni)} صورة`:''].filter(Boolean).join(' و ')}</button></div>`:''}
      <div class="admf">${x.email?`<a href="mailto:${esc(x.email)}">${esc(x.email)}</a>`:''}${ph(x.phone)}${x.ver?`<small>الإصدار ${esc(x.ver)}</small>`:''}</div></div>`; }).join('')
      :`<p class="muted" style="text-align:center">ما فيه شي هنا للحين.</p>`}</div>`; }
/* Firebase deletes an account only shortly after a sign-in (about 5 minutes), so check that first and delete nothing otherwise */
function signInAge(){ try{ const t=JSON.parse(atob(auth.s.id.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))); return Date.now()-t.auth_time*1000; }catch(e){ return Infinity; } }
const delFresh=()=>!!auth.s && signInAge()<4*60*1000;
/* an older sign-in confirms the password in the delete sheet itself: a fresh sign-in with it makes the session recent again */
async function delReauth(pass){ try{ takeSession(await idp('accounts:signInWithPassword',{email:auth.s.email,password:pass,returnSecureToken:true})); }
  catch(e){ if(/INVALID|EMAIL_NOT_FOUND/.test(e.code||'')) e.message='كلمة السر غير صحيحة.'; throw e; } }
async function deleteAccount(){
  if(!delFresh()){ const e=new Error(AUTH_ERR.CREDENTIAL_TOO_OLD_LOGIN_AGAIN); e.code='CREDENTIAL_TOO_OLD_LOGIN_AGAIN'; throw e; }
  const uid=auth.s.uid, id=await token(), ph=auth.profile?.phone;
  if(ph){ const rec=await loginOf(ph); if(rec && rec.u===uid) await rtdb(`logins/${phoneKey(ph)}`,'DELETE'); }
  for(const code of Object.keys(state.groups)) await rtdb(`groups/${code}/members/${uid}`,'DELETE').catch(()=>{});
  for(const code of Object.keys(state.centers)) await rtdb(`centers/${code}/members/${uid}`,'DELETE').catch(()=>{});
  await rtdb(`users/${uid}`,'DELETE');
  await idp('accounts:delete',{idToken:id});
  signOut();
}


