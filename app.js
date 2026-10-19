/* Road to 2:30 — client-only, free, private-first PWA. No analytics or external JS. */
'use strict';
const STORE = 'road230.v1';
const KEY_STORE = 'road230.intervalKey';
const START = new Date(2026,9,19);
const RACE_DATE = '2027-04-04';
// 24 Kalenderwochen: 19.10.2026 bis zum Wettkampf am Sonntag, 04.04.2027.
const PLAN = [
  [3.5,4],[4,5],[4,6],[4,5],[5,7],[5,8],[5,6],[5,9],
  [5,10],[5,8],[6,11],[5,9],[6,12],[6,13],[6,10],[6,14],
  [7,12],[7,15],[7,13],[7,16],[7,17],[7,18],[6,11],[3,'race']
];
const ROADMAP = [
  {name:'Nov 2026',target:'6–8 km',km:8,desc:'Routine finden und locker längere Läufe etablieren'},
  {name:'Dez 2026',target:'9–11 km',km:11,desc:'Grundlagenausdauer und Erholung stärken'},
  {name:'Jan 2027',target:'11–13 km',km:13,desc:'Regelmäßige Kilometer, gelegentlich längerer Lauf'},
  {name:'Feb 2027',target:'13–16 km',km:16,desc:'Längere Belastung vertragen und Verpflegung testen'},
  {name:'Mär 2027',target:'16–18 km',km:18,desc:'Spezifische Vorbereitung und 10-km-Test'},
  {name:'Apr 2027',target:'21,1 km',km:21.1,desc:'Vor dem Wettkampf reduzieren und erholt starten'}
];
const DEFAULT = {manual:[],synced:[],notes:{},raceDate:RACE_DATE,reminders:{easyDay:2,easyTime:'18:00',longDay:4,longTime:'18:00'},feedback:{},training:{},planOverrides:{},changeLog:[],profile:{notes:''},lastSync:null};
let state = loadState();
let toastTimer;
let editingFeedbackId=null;
let inspectedWeek=null;
function feedbackFor(r){const f=state.feedback&&state.feedback[r.id];return {rpe:f&&f.rpe!=null?f.rpe:r.rpe,note:f&&typeof f.note==='string'?f.note:(r.note||''),test10k:!!f?.test10k,warning:!!f?.warning}}
function el(id){return document.getElementById(id)}
function loadState(){try{const data=JSON.parse(localStorage.getItem(STORE)||'{}');return {...DEFAULT,...data,manual:Array.isArray(data.manual)?data.manual:[],synced:Array.isArray(data.synced)?data.synced:[],notes:data.notes && typeof data.notes==='object'?data.notes:{},feedback:data.feedback && typeof data.feedback==='object'?data.feedback:{},reminders:{...DEFAULT.reminders,...(data.reminders||{})},training:{},planOverrides:data.planOverrides&&typeof data.planOverrides==='object'&&!Array.isArray(data.planOverrides)?data.planOverrides:{},changeLog:Array.isArray(data.changeLog)?data.changeLog.slice(-50):[],profile:{notes:typeof data.profile?.notes==='string'?data.profile.notes.slice(0,600):''}}}catch{return {...DEFAULT}}}
function save(){try{localStorage.setItem(STORE,JSON.stringify(state))}catch{toast('Lokaler Speicher nicht verfügbar. Bitte Daten exportieren.')}}
function toast(msg){const t=el('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),3700)}
function dateStr(d){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function parseDate(s){if(!s)return new Date(NaN);const x=s.slice(0,10).split('-').map(Number);return new Date(x[0],x[1]-1,x[2])}
function addDays(d,n){const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()+n);return x}
function weekMonday(d){const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()-(x.getDay()+6)%7);return x}
function weekIdx(){const d=weekMonday(new Date());const day=Date.UTC(d.getFullYear(),d.getMonth(),d.getDate());const start=Date.UTC(START.getFullYear(),START.getMonth(),START.getDate());return Math.max(0,Math.min(PLAN.length-1,Math.floor((day-start)/604800000)))}
function weekStart(){return addDays(START,weekIdx()*7)}
function displayDate(s){const d=parseDate(s);return Number.isNaN(+d)?'–':d.toLocaleDateString('de-AT',{day:'2-digit',month:'short',year:'numeric'})}
function formatNumber(n,dec=1){return Number(n).toLocaleString('de-AT',{minimumFractionDigits:dec,maximumFractionDigits:dec})}
function fmtKm(n){return formatNumber(n,1)+' km'}
function minsPerKm(km,sec){if(!km||!sec)return '–';let v=Math.round(sec/km);return `${Math.floor(v/60)}:${String(v%60).padStart(2,'0')}/km`}
function allRuns(){const combined=new Map();for(const r of [...state.synced,...state.manual])if(r&&r.id&&Number(r.km)>0)combined.set(String(r.id),r);return [...combined.values()].sort((a,b)=>String(b.date).localeCompare(String(a.date)))}
function currentWeekRuns(runs){const start=weekStart(),end=addDays(start,7);return runs.filter(r=>{const d=parseDate(r.date);return d>=start&&d<end})}
function sumKm(runs){return runs.reduce((s,r)=>s+(Number(r.km)||0),0)}
function maxKm(runs){return runs.reduce((m,r)=>Math.max(m,Number(r.km)||0),0)}
function thisPlan(){return PLAN[weekIdx()].slice()}
function phaseText(){const m=new Date().getMonth();if(m<=0)return 'Grundlage festigen';if(m===1||m===2)return 'Ausdauer steigern';if(m===3)return 'Wettkampffokus';return 'Routine aufbauen'}
// Trainingszonen direkt als Nummer anzeigen; Garmin zeigt die zugehörigen bpm selbst an.
function pulseLabel(zone){return `Zone ${zone}`}
function baseSessionPrescription(index,week=weekIdx()){
  const p=PLAN[week].slice(),isRace=p[1]==='race';
  if(isRace){
    if(index===0)return {title:'Lauf 1 · Aktivierung',dist:'3 km',pace:'ca. 7:30–8:30 min/km',rpe:'2–3 / 10',pulse:pulseLabel(2),duration:'ca. 23–26 Min. zzgl. Lockerung',structure:'5 Min. gehen → 3 km sehr locker → 5 Min. gehen.',why:'Nur etwas bewegen und frisch bleiben. Auslassen ist bei Müdigkeit in Ordnung.',icon:'◌'};
    return {title:'Sonntag, 04.04. · Halbmarathon',dist:'21,1 km',pace:'Ziel 7:06 min/km',rpe:'Kontrolliert starten',pulse:'Zone 2–3 (nach Gefühl)',duration:'Ziel unter 2:30 h',structure:'Die ersten 3 km bewusst kontrolliert anlaufen. Verpflegung und Trinken wie in langen Läufen erprobt. Nicht die Pulszone erzwingen.',why:'Bei Schmerzen, Krankheit oder fehlender Vorbereitung die Zielzeit loslassen.',icon:'★'};
  }
  const km=Number(p[index]);
  const distance=Math.round(km*10)/10;
  const late=week>=16&&week<=21;
  const hasSteady=index===0&&late;
  const pace=hasSteady?'Locker ca. 7:15–8:15; flotter Abschnitt nur nach Gefühl':index===0?'ca. 7:15–8:15 min/km':'ca. 7:25–8:40 min/km';
  const minPace=index===0?7.25:7.4167,maxPace=index===0?8.25:8.6667;
  const minutesMin=Math.round(distance*minPace),minutesMax=Math.round(distance*maxPace);
  let structure,why;
  if(hasSteady){structure=`5–8 Min. locker anlaufen → insgesamt ${formatNumber(distance,1)} km. Optional in der Mitte 8–12 Min. etwas flotter (RPE 5–6), danach locker auslaufen.`;why='Nur wenn du regelmäßig trainiert hast, schmerzfrei bist und dich gut erholt fühlst. Sonst vollständig in Zone 2 laufen.'}
  else if(index===0){structure=`5 Min. zügig gehen → ${formatNumber(distance,1)} km locker joggen → 5 Min. auslaufen oder gehen.`;why='Du solltest ganze Sätze sprechen können. Wenn nicht, langsamer werden oder 1–2 Min. gehen.'}
  else {structure=`5–8 Min. locker starten → ${formatNumber(distance,1)} km sehr entspannt → 5 Min. gehen. Gehpausen jederzeit erlaubt.`;why='Nicht das Tempo erzwingen: Regelmäßiges, verträgliches Laufen ist wichtiger als der Wochenschnitt.'}
  return {title:index===0?'Lauf 1 · Locker':'Lauf 2 · Länger',dist:formatNumber(distance,1)+' km',pace,rpe:hasSteady?'Meist 2–4; optional 5–6':'2–4 / 10',pulse:hasSteady?`${pulseLabel(2)}; optional ${pulseLabel(3)}`:pulseLabel(2),duration:`ca. ${minutesMin}–${minutesMax} Min. Laufzeit`,structure,why,icon:index===0?'◌':'↗'}
}

function plannedDate(week,index){
  if(week===PLAN.length-1&&index===1)return RACE_DATE;
  const monday=addDays(START,week*7),day=Number(index===0?state.reminders.easyDay:state.reminders.longDay);
  return dateStr(addDays(monday,(day+6)%7));
}
function workoutKey(week,index){return `${week}:${index}`}
function workoutData(week,index){
  const raw=baseSessionPrescription(index,week);
  const race=week===PLAN.length-1&&index===1;
  const defaultKm=race?21.1:Number(PLAN[week][index]);
  const defaults={week,index,date:plannedDate(week,index),title:raw.title,distanceKm:defaultKm,
    paceFrom:index===0?'7:15':'7:25',paceTo:index===0?'8:15':'8:40',zone:2,
    structure:raw.structure,reason:raw.why,rpe:raw.rpe,icon:raw.icon,race};
  const override=state.planOverrides[workoutKey(week,index)];
  return {...defaults,...(!race&&override&&typeof override==='object'?override:{}),date:plannedDate(week,index),race};
}
function paceMinutes(p){if(!/^\d{1,2}:\d{2}$/.test(String(p)))return NaN;const [m,s]=p.split(':').map(Number);return s<60?m+s/60:NaN}
function workoutResult(week,index){
  const w=workoutData(week,index);
  const pace=w.race?'Ziel 7:06 min/km':`${w.paceFrom}–${w.paceTo} min/km`;
  const duration=w.race?'Ziel unter 2:30 h':`ca. ${Math.round(w.distanceKm*paceMinutes(w.paceFrom))}–${Math.round(w.distanceKm*paceMinutes(w.paceTo))} Min. Laufzeit`;
  const raw=baseSessionPrescription(index,week);
  const overridden=Boolean(state.planOverrides[workoutKey(week,index)])&&!w.race;
  return {...raw,...w,dist:fmtKm(w.distanceKm),pace,pulse:w.race?'Zone 2–3 (nach Gefühl)':`Zone ${w.zone}`,duration,why:w.reason,overridden};
}
function trainingHistory(action,week,index,previous,next){
  state.changeLog.push({at:new Date().toISOString(),action,week,index,date:plannedDate(week,index),previous:previous||null,next:next||null});
  state.changeLog=state.changeLog.slice(-50);
}
function validWorkoutChange(o){
  if(!o||typeof o!=='object'||Array.isArray(o))throw new Error('Ungültige Trainingseinheit.');
  const km=Number(o.distanceKm),z=Number(o.zone),lo=String(o.paceFrom||''),hi=String(o.paceTo||'');
  if(!Number.isFinite(km)||km<0.5||km>22||!Number.isFinite(z)||!Number.isInteger(z)||z<1||z>5)throw new Error('Distanz (0,5–22 km) oder Pulszone (1–5) ungültig.');
  if(!Number.isFinite(paceMinutes(lo))||!Number.isFinite(paceMinutes(hi))||paceMinutes(lo)<4||paceMinutes(hi)>13||paceMinutes(lo)>paceMinutes(hi))throw new Error('Ungültige Pace: beispielsweise 7:30 bis 8:30.');
  const title=String(o.title||'').trim().slice(0,80),structure=String(o.structure||'').trim().slice(0,600),reason=String(o.reason||'').trim().slice(0,400);
  if(!title||!structure)throw new Error('Bitte Titel und Trainingsablauf angeben.');
  return {title,distanceKm:Math.round(km*10)/10,paceFrom:lo,paceTo:hi,zone:z,structure,reason,rpe:String(o.rpe||'2–4 / 10').slice(0,50)};
}
function saveWorkoutOverride(week,index,newWorkout,source){
  const key=workoutKey(week,index),prev=state.planOverrides[key]||null;
  state.planOverrides[key]={...newWorkout,source,changedAt:new Date().toISOString()};
  trainingHistory(source,week,index,prev,state.planOverrides[key]);save();renderAll();
}
function findWorkoutByDate(date){
  for(let week=0;week<PLAN.length;week++)for(let index=0;index<2;index++){
    if(plannedDate(week,index)===date)return {week,index};
  }
  return null;
}
function sessionPrescription(index,week=weekIdx()){return workoutResult(week,index)}
function sessionDoneFlags(week=weekIdx()){
  const runs=allRuns().filter(r=>{const d=parseDate(r.date);const start=addDays(START,week*7);return d>=start&&d<addDays(start,7)});
  const a=workoutData(week,0),b=workoutData(week,1);
  const longHit=runs.some(r=>r.km>=b.distanceKm*.85);
  return [runs.length>=2||(runs.length===1&&!longHit),longHit];
}
function renderSession(run,title,subtitle,dist,icon){const row=document.createElement('div');row.className='session';const a=document.createElement('div');a.className='session-icon';a.textContent=icon;const content=document.createElement('div');content.className='session-main';const n=document.createElement('div');n.className='session-title';n.textContent=title;const s=document.createElement('div');s.className='session-sub';s.textContent=subtitle;content.append(n,s);const tag=document.createElement('span');tag.className='session-tag'+(run?' done':'');tag.textContent=run?'✓ Erledigt':dist;row.append(a,content,tag);return row}
function renderSessions(target){
  target.replaceChildren();const week=weekIdx(),done=sessionDoneFlags(week);
  for(let i=0;i<2;i++){
    const v=sessionPrescription(i,week);
    target.append(renderSession(done[i],`${v.title} · ${displayDate(v.date)}`,`${v.pace} · ${v.pulse}`,v.dist,v.icon));
  }
}
function renderDetailedSessions(week){
  const target=el('planSessions');target.replaceChildren();const done=sessionDoneFlags(week);
  for(let i=0;i<2;i++){
    const s=sessionPrescription(i,week),card=document.createElement('article');card.className='workout-card';
    const top=document.createElement('div');top.className='workout-top';
    const badge=document.createElement('div');badge.className='workout-number';badge.textContent=s.icon;
    const name=document.createElement('div');name.className='workout-name';
    const title=document.createElement('h3');title.textContent=s.title;
    const note=document.createElement('p');note.textContent=`${displayDate(s.date)} · ${s.duration}`;
    name.append(title,note);const tag=document.createElement('span');tag.className='session-tag'+(done[i]?' done':'');tag.textContent=done[i]?'✓ Erledigt':s.overridden?'✎ Angepasst':s.dist;
    top.append(badge,name,tag);card.append(top);
    const grid=document.createElement('div');grid.className='workout-metrics';
    for(const [label,text] of [['Distanz',s.dist],['Pace',s.pace],['Puls',s.pulse],['Anstrengung',s.rpe]]){
      const metric=document.createElement('div');metric.className='workout-metric';const a=document.createElement('span');a.textContent=label;const b=document.createElement('strong');b.textContent=text;metric.append(a,b);grid.append(metric);
    }
    const desc=document.createElement('div');desc.className='workout-body';const strong=document.createElement('strong');strong.textContent='Ablauf';const p=document.createElement('p');p.textContent=s.structure;const hint=document.createElement('p');hint.className='workout-why';hint.textContent=s.why;
    desc.append(strong,p,hint);card.append(grid,desc);
    if(!s.race){const actions=document.createElement('div');actions.className='actions';const edit=document.createElement('button');edit.className='btn outline';edit.textContent='✎ Training bearbeiten';edit.addEventListener('click',()=>openWorkoutEditor(week,i));actions.append(edit);if(s.overridden){const reset=document.createElement('button');reset.className='btn subtle';reset.textContent='Original wiederherstellen';reset.addEventListener('click',()=>resetWorkout(week,i));actions.append(reset)}card.append(actions)}
    target.append(card);
  }
}
function renderTrainingHorizon(week){
 const box=el('trainingHorizon');box.replaceChildren();
 for(let k=week;k<Math.min(PLAN.length,week+5);k++){
   const a=workoutData(k,0),bData=workoutData(k,1),b=document.createElement('button');b.type='button';b.className='horizon-week'+(k===week?' highlighted':'');
   const head=document.createElement('span');head.textContent='Woche '+(k+1);
   const summary=document.createElement('strong');summary.textContent=bData.race?`${fmtKm(a.distanceKm)} + Wettkampf`: `${fmtKm(a.distanceKm)} + ${fmtKm(bData.distanceKm)}`;
   const tip=document.createElement('small');tip.textContent=bData.race?'So., 04.04.2027':k===22?'Taper / Erholung':k%4===3?'Entlastung / ruhig':`${displayDate(a.date)} · ${displayDate(bData.date)}`;
   b.append(head,summary,tip);b.addEventListener('click',()=>{inspectedWeek=k;renderPlan();el('planWeekTitle').scrollIntoView({behavior:'smooth',block:'center'})});box.append(b);
 }
}
function renderMilestones(target,mini=false){target.replaceChildren();const best=maxKm(allRuns());for(const [i,r] of ROADMAP.entries()){if(mini){const div=document.createElement('div');div.className='milestone-row';const n=document.createElement('span');n.className='milestone-name';n.textContent=r.name;const track=document.createElement('div');track.className='bar-track';const bar=document.createElement('div');bar.className='bar-fill';bar.style.width=Math.round(Math.min(1,best/r.km)*100)+'%';track.append(bar);const val=document.createElement('span');val.className='milestone-value';val.textContent=r.target;div.append(n,track,val);target.append(div)}else{const div=document.createElement('div');div.className='roadmap-row';const icon=document.createElement('span');icon.className='roadmap-step';icon.textContent=best>=r.km?'✓':String(i+1);const mid=document.createElement('div');mid.className='roadmap-copy';const title=document.createElement('div');title.className='roadmap-title';title.textContent=r.name;const desc=document.createElement('div');desc.className='roadmap-desc';desc.textContent=r.desc;mid.append(title,desc);const g=document.createElement('span');g.className='roadmap-goal';g.textContent=r.target;div.append(icon,mid,g);target.append(div)}}}
function weeklySummary(runs, monday){const end=addDays(monday,7);const week=runs.filter(r=>{const d=parseDate(r.date);return d>=monday&&d<end});return {week,km:sumKm(week),count:week.length,longest:maxKm(week)}}
function recentCompletedWeeks(runs,count=4){const mon=weekMonday(new Date());return Array.from({length:count},(_,i)=>{const start=addDays(mon,-7*(count-i));return {...weeklySummary(runs,start),start}})}
function nextDistanceMilestone(runs){const best=maxKm(runs);const targets=[4,6,8,10,12,14,16,18];const next=targets.find(t=>best<t)??21.1;return {best,next,progress:Math.min(100,Math.round((best/next)*100))}}
function progressReadiness(runs){const recent=recentCompletedWeeks(runs);const withData=recent.filter(w=>w.start>=START);const compliant=withData.filter(w=>w.count>=2).length;const best=maxKm(runs);const hasTest=runs.some(r=>r.km>=9.8&&r.km<=10.5&&r.seconds>0);let tag,body;
if(runs.length===0){tag='Noch keine Daten';body='Die Verbindung steht. Ab deinem ersten richtigen Lauf sammeln wir belastbare Werte. Sub 2:30 bleibt vorerst ein Ziel, keine Prognose.'}
else if(runs.length<5){tag='Grundlage sammeln';body='Du hast die ersten Läufe dokumentiert. Für eine Einschätzung brauchen wir mehrere regelmäßige Trainingswochen und längere Läufe.'}
else if(best<10){tag='Routine aufbauen';body='Du sammelst Laufkilometer. Der nächste Schritt ist, Distanz und Erholung stabil aufzubauen – nicht schneller zu werden.'}
else if(best<14){tag='Ausdauer entwickelt sich';body='Du schaffst inzwischen zweistellige Distanzen. Für Sub 2:30 fehlen uns noch längere lockere Läufe und später ein kontrollierter 10-km-Test.'}
else if(!hasTest){tag='Gute Distanzbasis';body='Du hast schon längere Läufe geschafft. Eine realistische Zeit-Einschätzung braucht zusätzlich einen bewusst gelaufenen 10-km-Test und ein Gefühl für die Regeneration.'}
else{tag='Jetzt genauer prüfen';body='Längere Läufe und ein 10-km-Lauf sind dokumentiert. Für eine Zielzeitbewertung müssen wir Testbedingungen, Belastung und die letzten Wochen gemeinsam einordnen.'}
return {tag,body,compliant,observed:withData.length,best,hasTest}}
function weekLabel(date){return `${date.toLocaleDateString('de-AT',{day:'2-digit',month:'2-digit'})} – ${addDays(date,6).toLocaleDateString('de-AT',{day:'2-digit',month:'2-digit'})}`}
function renderWeekBreakdown(target,runs,limit=4,includeCurrent=true){target.replaceChildren();const monday=weekMonday(new Date());const weeks=Array.from({length:limit},(_,i)=>{const start=addDays(monday,-7*(limit-1-i));return {...weeklySummary(runs,start),start,isCurrent:dateStr(start)===dateStr(monday)}}).reverse();for(const w of weeks){const div=document.createElement('div');div.className='week-breakdown-row';const dates=document.createElement('span');dates.className='week-dates';dates.textContent=weekLabel(w.start)+(w.isCurrent?' · laufend':'');const progress=document.createElement('div');progress.className='week-squares';progress.setAttribute('aria-label',`${w.count} Laufeinheiten`);for(let i=0;i<2;i++){const b=document.createElement('span');b.className='week-square'+(w.count>i?' filled':'');progress.append(b)}const km=document.createElement('span');km.className='week-distance';km.textContent=fmtKm(w.km);const count=document.createElement('span');count.className='week-count';count.textContent=`${w.count}×`;div.append(dates,progress,km,count);target.append(div)} }
function renderTrainingInsights(){const runs=allRuns(),r=progressReadiness(runs),m=nextDistanceMilestone(runs);el('readinessTag').textContent=r.tag;el('readinessText').textContent=r.body;el('adherenceMetric').textContent=r.observed?`${r.compliant} / ${r.observed}`:'Noch offen';el('adherenceCaption').textContent='Abgeschlossene Wochen mit 2+ Läufen seit Trainingsstart (max. 4)';el('distanceMetric').textContent=r.best?fmtKm(r.best):'–';el('distanceCaption').textContent='Längster erfasster Lauf';el('testMetric').textContent=r.hasTest?'10 km erfasst':'Noch offen';el('nextMilestoneTitle').textContent=r.best?`Nächste Distanz: ${formatNumber(m.next,1)} km`:'Der erste dokumentierte Lauf';el('nextMilestoneValue').textContent=fmtKm(m.next);el('nextMilestoneText').textContent=r.best?`Bisheriger längster Lauf: ${fmtKm(r.best)}. Steigere nur, wenn sich die letzten Einheiten gut angefühlt haben.`:'Erfasse deinen ersten ruhigen Lauf – wir starten klein und steigern behutsam.';el('nextMilestoneBar').style.width=m.progress+'%';renderWeekBreakdown(el('recentWeeks'),runs,4);renderWeekBreakdown(el('progressWeeks'),runs,8)}
function renderOverview(){const runs=allRuns(),now=new Date(),cutoff=addDays(now,-28),recent=runs.filter(r=>parseDate(r.date)>=cutoff),wk=currentWeekRuns(runs),best=maxKm(runs),p=thisPlan();el('statRuns').textContent=`${Math.min(wk.length,2)} / 2`;el('statRunsSub').textContent=wk.length>=2?'Zwei Läufe geschafft – stark!':'Konstanz schlägt Tempo';el('statKm').innerHTML='';el('statKm').append(document.createTextNode(formatNumber(sumKm(recent),1)+' '));const em=document.createElement('em');em.textContent='km';el('statKm').append(em);el('statKmSub').textContent=recent.length?`${recent.length} Läufe in den letzten 28 Tagen`:'Noch keine Läufe protokolliert';el('statLong').textContent=best?fmtKm(best):'–';el('statLongSub').textContent=best?'Längster dokumentierter Lauf':'Noch kein längerer Lauf dokumentiert';el('phaseText').textContent=phaseText();el('raceText').textContent=displayDate(RACE_DATE);el('coachStatus').textContent=runs.length===0?'Wir starten ganz entspannt. Erst einmal zwei lockere Laufeinheiten pro Woche etablieren – dann sehen wir, wie sich deine Ausdauer entwickelt.':runs.length<5?'Du sammelst gerade die ersten Trainingseinheiten. Bleib bei zwei lockeren Läufen und achte auf ausreichende Regeneration.':best<10?'Deine Routine baut sich auf. Konzentriere dich auf entspannte längere Läufe und regelmäßige Wochen statt auf schnelle Pace.':'Du hast bereits längere Strecken dokumentiert. Für eine Sub-2:30-Einschätzung brauchen wir später einen 10-km-Test und verträgliche lange Läufe.';renderSessions(el('weekSessions'));renderMilestones(el('miniMilestones'),true)}
function renderPlan(){
  const current=weekIdx(),i=inspectedWeek===null?current:Math.max(0,Math.min(PLAN.length-1,inspectedWeek));
  const start=addDays(START,i*7);
  const phase=i<8?'Gewöhnung':i<16?'Grundlage':i<22?'Lange Läufe':i===22?'Taper':'Wettkampf';
  el('planWeekTitle').textContent=`Woche ${i+1} · ${phase}`;
  el('planWeekDates').textContent=`${displayDate(dateStr(start))} – ${displayDate(dateStr(addDays(start,6)))}`;
  el('weekPicker').value=String(i);
  el('weekMeta').textContent=i===current?'Aktuelle Woche · 2 Laufeinheiten':`Vorschau / Rückblick · Woche ${i+1} · kein Pflichtprogramm`;
  renderDetailedSessions(i);
  renderTrainingHorizon(i);
  renderMilestones(el('roadmap'));
  el('planSafetyNote').textContent='Die Kilometer sind Richtwerte. Bei Schmerzen, Krankheit, ungewöhnlicher Atemnot oder anhaltender Erschöpfung nicht nach Plan durchdrücken. Im Zweifel Ruhetag.';
}
function loadTrainingFields(){}
function renderChart(){const target=el('weeklyChart');target.replaceChildren();const runs=allRuns(),start=addDays(weekMonday(new Date()),-49);const v=Array.from({length:8},(_,i)=>{const d=addDays(start,i*7),end=addDays(d,7);return {label:d.toLocaleDateString('de-AT',{day:'2-digit',month:'2-digit'}),km:sumKm(runs.filter(r=>{const t=parseDate(r.date);return t>=d&&t<end}))}});const max=Math.max(1,...v.map(x=>x.km));for(const x of v){const col=document.createElement('div');col.className='chart-column';const val=document.createElement('span');val.className='chart-val';val.textContent=formatNumber(x.km,0);const slot=document.createElement('div');slot.className='chart-barslot';const bar=document.createElement('div');bar.className='chart-bar';bar.style.height=`${Math.max(2,Math.round(x.km/max*140))}px`;bar.title=fmtKm(x.km);slot.append(bar);const lab=document.createElement('span');lab.className='chart-col-label';lab.textContent=x.label;col.append(val,slot,lab);target.append(col)}}
function renderProgress(){const runs=allRuns(),best=maxKm(runs);el('progressAll').textContent=fmtKm(sumKm(runs));el('progressCount').textContent=String(runs.length);el('progressLongest').textContent=best?fmtKm(best):'–';renderChart();const list=el('activityList');list.replaceChildren();if(!runs.length){const empty=document.createElement('div');empty.className='empty';empty.textContent='Noch keine Läufe erfasst. Trage deinen ersten Lauf ein oder verbinde Intervals.icu in den Einstellungen.';list.append(empty);return}for(const r of runs.slice(0,35)){const row=document.createElement('div');row.className='activity-row';const icon=document.createElement('div');icon.className='activity-icon';icon.textContent='↗';const meta=document.createElement('div');meta.className='activity-meta';const h=document.createElement('strong');h.textContent=(r.name||'Lauf')+' · '+displayDate(r.date);const s=document.createElement('small');const f=feedbackFor(r);const note=(f.note||'').slice(0,85);s.textContent=(r.source==='Intervals.icu'?'↻ Garmin / Intervals.icu':'✎ Manuell')+(r.hr?' · Ø '+r.hr+' bpm':'')+(f.rpe?' · RPE '+f.rpe+'/10':'')+(note?' · '+note:'');const fb=document.createElement('button');fb.className='tiny-link';fb.type='button';fb.textContent=f.rpe||f.note?'Feedback bearbeiten →':'Wie war es? Feedback geben →';fb.addEventListener('click',()=>openFeedback(r.id));meta.append(h,s,fb);const metrics=document.createElement('div');metrics.className='activity-metrics';const a=document.createElement('strong');a.textContent=fmtKm(r.km);const b=document.createElement('small');b.textContent=minsPerKm(r.km,r.seconds);metrics.append(a,b);row.append(icon,meta,metrics);list.append(row)}}
function coachingText(){const all=allRuns(),recent=all.slice(0,10),last28=all.filter(r=>parseDate(r.date)>=addDays(new Date(),-28)),last14=all.filter(r=>parseDate(r.date)>=addDays(new Date(),-14)),p=thisPlan();const lines=[
  'Laufcoach-Update · Road to Sub 2:30','',
  state.profile.notes?'Persönlicher Kontext (nur lokal gespeichert): '+state.profile.notes:'Persönlicher Kontext: nicht hinterlegt.',
  'Ziel: Halbmarathon am 04.04.2027 in unter 2:30 Stunden (Zielpace ~7:06 min/km).',
  'Training: 2 Laufeinheiten pro Woche mit ausreichend Regeneration.',
  'Ausgangspunkt: Bitte die erfassten Läufe berücksichtigen; nicht dokumentierte frühere Läufe nicht als Messwert annehmen.',
  `Aktuelle Trainingswoche: ${weekIdx()+1}. Plan mit möglichen Anpassungen: ${sessionPrescription(0).dist} + ${sessionPrescription(1).dist}.`,
  `Einheit 1 (${sessionPrescription(0).date}): ${sessionPrescription(0).dist}, ${sessionPrescription(0).pace}, ${sessionPrescription(0).pulse}, RPE ${sessionPrescription(0).rpe}. Ablauf: ${sessionPrescription(0).structure}`, 
  `Einheit 2 (${sessionPrescription(1).date}): ${sessionPrescription(1).dist}, ${sessionPrescription(1).pace}, ${sessionPrescription(1).pulse}, RPE ${sessionPrescription(1).rpe}. Ablauf: ${sessionPrescription(1).structure}`, 
  `Erfasste Läufe gesamt: ${all.length}. Letzte 14 Tage: ${last14.length} Läufe; letzte 28 Tage: ${fmtKm(sumKm(last28))}. Längster protokollierter Lauf: ${maxKm(all)?fmtKm(maxKm(all)):'noch keiner'}.`,
  `Wochenroutine: ${progressReadiness(all).compliant} von ${progressReadiness(all).observed} abgeschlossenen Trainingswochen mit mindestens zwei Läufen (maximal die letzten vier).`,
  `Nächster Distanzmeilenstein: ${fmtKm(nextDistanceMilestone(all).next)} (Richtwert, nicht zwingend in der nächsten Woche).`,
  `Sub-2:30-Status: ${progressReadiness(all).tag}; ${progressReadiness(all).body}`,
  `Puls-Pace-Vergleich: ${fitnessTrend().message}`,
  `Wettkampfprognose: ${raceForecast()}`,
  `Trainingsanpassungen: ${Object.keys(state.planOverrides).length} individuell geänderte Einheiten.`,
  '', 'Neueste Läufe (Datum | Distanz | Pace | Puls | Belastung | Notiz):'
];if(!recent.length)lines.push('Noch keine Aktivitäten erfasst.');for(const r of recent)lines.push(`${displayDate(r.date)} | ${fmtKm(r.km)} | ${minsPerKm(r.km,r.seconds)} | ${r.hr||'–'} bpm | RPE ${feedbackFor(r).rpe||'–'}${feedbackFor(r).test10k?' [10-km-Test]':''}${feedbackFor(r).warning?' [Warnsignal]':''} | ${(feedbackFor(r).note||'–').replace(/\s+/g,' ').slice(0,180)}`);lines.push('','Bitte gib mir eine kurze, konkrete Einschätzung: Bin ich hinsichtlich gesunder Steigerung und Sub 2:30 auf dem richtigen Weg? Was sollte ich kommende Woche bei zwei Läufen machen? Gib mir Motivation ohne unrealistischen Druck. Bei zu wenig Daten bitte Unsicherheit klar sagen. Wenn du konkrete Planänderungen empfiehlst, hänge zusätzlich einen Maschinenblock an: ROAD230_UPDATE (neue Zeile), JSON mit version:1 und workouts:[{date im Format YYYY-MM-DD, distanceKm als Zahl, paceFrom und paceTo als MM:SS, zone als Zahl 1–5, title, structure, reason}], END_ROAD230_UPDATE. Verwende ausschließlich die unten genannten tatsächlichen Trainingstermine, niemals den Wettkampftag. Ohne Änderungsbedarf keinen Block ausgeben.', '', `Erlaubte Trainingstermine diese Woche: ${sessionPrescription(0).date} und ${sessionPrescription(1).date}. Anpassungen vor dem Training manuell bestätigen.`);return lines.join('\n')}
function fitnessTrend(){
  const runs=allRuns().filter(r=>r.hr>=75&&r.hr<=210&&r.km>=3&&r.km<=12&&r.seconds>0).slice().reverse();
  if(runs.length<3)return {message:'Für einen sinnvollen Puls-Pace-Vergleich benötigen wir mindestens 3 Läufe mit Pulswerten über 3–12 km.',ready:false};
  const latest=runs[runs.length-1];const older=runs.slice(0,-1).filter(r=>Math.abs(r.hr-latest.hr)<=8&&Math.abs(r.km-latest.km)/latest.km<=.2);
  if(!older.length)return {message:'Noch keine vergleichbaren Läufe (ähnliche Distanz und durchschnittliche Herzfrequenz).',ready:false};
  const ref=older[older.length-1];const diff=(ref.seconds/ref.km)-(latest.seconds/latest.km);
  const secs=Math.abs(Math.round(diff));
  return {ready:true,message:`Vergleichbare Läufe (${displayDate(ref.date)} → ${displayDate(latest.date)}): ${diff>10?secs+' Sek./km schneller':diff < -10?secs+' Sek./km langsamer':'Pace ungefähr stabil'} bei ähnlichem Durchschnittspuls. Wetter, Höhenmeter und Erholung beeinflussen den Vergleich.`};
}
function raceForecast(){
  const all=allRuns(),recent=all.filter(r=>parseDate(r.date)>=addDays(new Date(),-70)),long=maxKm(all);
  const test=all.find(r=>r.km>=9.8&&r.km<=10.2&&r.seconds>0&&feedbackFor(r).test10k&&Number(feedbackFor(r).rpe)>=7);
  const weeks=recentCompletedWeeks(all,4),consistent=weeks.filter(w=>w.count>=2).length;
  if(recent.length<8||long<14||consistent<3||!test)return 'Noch keine belastbare Zeitprognose. Dafür brauchen wir u. a. einen ausdrücklich markierten, ausreichend anstrengenden 10-km-Test, einen langen Lauf ab 14 km und mehrere regelmäßige Trainingswochen.';
  const predicted=(test.seconds/60)*Math.pow(21.0975/test.km,1.06),lo=predicted*1.03,hi=predicted*1.15;
  const fmt=m=>{const minutes=Math.round(m);return `${Math.floor(minutes/60)}:${String(minutes%60).padStart(2,'0')} h`};
  return `Sehr grobe Orientierung aus dem 10-km-Test: ${fmt(lo)}–${fmt(hi)}. Keine garantierte Wettkampfzeit: zwei Läufe pro Woche, Streckenprofil und Tagesform schaffen große Unsicherheit. Sub 2:30: ${hi<150?'nach diesen Daten grundsätzlich plausibel':lo>150?'derzeit noch herausfordernd':'weiter offen'}.`;
}
function renderExtras(){
 const runs=allRuns(),trend=fitnessTrend();el('fitnessTrend').textContent=trend.message;el('raceForecast').textContent=raceForecast();
 const last4=recentCompletedWeeks(runs,4),complete=last4.filter(w=>w.count>=2).length;
 el('motivationText').textContent=`${complete} von 4 abgeschlossenen Wochen mit mindestens zwei Läufen. ${complete>=3?'Deine Regelmäßigkeit entwickelt sich gut.':'Keine verpassten Kilometer nachholen – beim nächsten Termin weitermachen.'}`;
 el('planChangesCount').textContent=`${Object.keys(state.planOverrides).length} individuell angepasste Einheiten`;
}
function renderCoach(){el('coachPreview').textContent=coachingText()}
function renderAll(){renderOverview();renderPlan();renderProgress();renderTrainingInsights();renderCoach();renderExtras()}
function showPage(name){for(const p of document.querySelectorAll('.tab-page'))p.classList.toggle('active',p.dataset.page===name);for(const b of document.querySelectorAll('[data-tab]'))b.classList.toggle('active',b.dataset.tab===name);window.scrollTo({top:0,behavior:'instant'});if(name==='coach')renderCoach();if(name==='settings')el('icuKey').focus({preventScroll:true})}
function updateSyncStatus(connected=false){el('topSync').textContent=connected?'Synchronisiert':'Lokal';el('sideSync').textContent=connected?'Daten geladen':'Lokaler Modus'}
function getApiKey(){return el('icuKey').value.trim()||sessionStorage.getItem(KEY_STORE)||localStorage.getItem(KEY_STORE)||''}
async function syncIntervals(showSuccess=true){const key=getApiKey();if(!key){showPage('settings');el('syncMessage').textContent='Bitte zuerst einen persönlichen API-Schlüssel eintragen.';toast('Zuerst Intervals.icu verbinden');return}const btn=el('connectIcu');btn.disabled=true;el('syncMessage').textContent='Verbinde mit Intervals.icu …';try{const oldest='2026-10-01';const url=`https://intervals.icu/api/v1/athlete/0/activities?oldest=${oldest}&limit=500`;const result=await fetch(url,{headers:{Authorization:'Basic '+btoa('API_KEY:'+key),Accept:'application/json'},cache:'no-store'});if(!result.ok)throw new Error(result.status===401||result.status===403?'Zugriff verweigert (API-Schlüssel oder Anbieterbeschränkung).':`HTTP ${result.status}`);const body=await result.json();if(!Array.isArray(body))throw new Error('Die API hat keine Aktivitätenliste geliefert.');const runs=body.filter(a=>['Run','TrailRun','VirtualRun'].includes(a.type)).map(a=>({id:'icu_'+String(a.id),name:String(a.name||'Garmin-Lauf').slice(0,90),date:String(a.start_date_local||a.start_date||'').slice(0,10),km:Number(a.distance||0)/1000,seconds:Number(a.moving_time||a.elapsed_time||0),hr:Number(a.average_heartrate)||null,rpe:Number(a.icu_rpe||a.perceived_exertion)||null,note:'',source:'Intervals.icu'})).filter(a=>/^\d{4}-\d{2}-\d{2}$/.test(a.date)&&a.km>0&&a.km<300);state.synced=runs;state.lastSync=new Date().toISOString();save();if(el('rememberKey').checked){localStorage.setItem(KEY_STORE,key);sessionStorage.removeItem(KEY_STORE)}else{sessionStorage.setItem(KEY_STORE,key);localStorage.removeItem(KEY_STORE)}updateSyncStatus(true);renderAll();el('syncMessage').textContent=`Verbindung erfolgreich: ${runs.length} Laufaktivitäten mit Distanz eingelesen (Tests ohne Distanz zählen nicht). Letzter Abruf: ${new Date().toLocaleString('de-AT')}.` ;el('syncMessage').className='message good';if(showSuccess)toast(`${runs.length} Läufe synchronisiert`)}catch(e){el('syncMessage').className='message error';el('syncMessage').textContent='Synchronisierung fehlgeschlagen: '+e.message+' Prüfe den Schlüssel und mögliche Garmin-API-Einschränkungen. Manuelle Einträge funktionieren weiter.';toast('Synchronisierung nicht möglich')}finally{btn.disabled=false}}
function loadReminders(){for(const [k,v] of Object.entries(state.reminders)){const t=el(k);if(t)t.value=String(v)}}
function dateOfNextDay(day){const now=new Date(),d=(Number(day)-now.getDay()+7)%7;return addDays(now,d===0?7:d)}
function stampLocal(date,hour){return dateStr(date).replace(/-/g,'')+'T'+hour.replace(':','')+'00'}
function generateCalendar(){const easyDay=Number(el('easyDay').value),longDay=Number(el('longDay').value),easyTime=el('easyTime').value,longTime=el('longTime').value;state.reminders={easyDay,easyTime,longDay,longTime};save();const escapeICS=s=>String(s).replace(/\\/g,'\\\\').replace(/,/g,'\\,').replace(/;/g,'\\;').replace(/\n/g,'\\n');const event=(name,day,time,desc)=>{const d=dateOfNextDay(day);const from=stampLocal(d,time);const hh=Number(time.slice(0,2)),mm=Number(time.slice(3));const endTime=`${String((hh+1)%24).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;const ends=stampLocal(addDays(d,hh===23?1:0),endTime);return ['BEGIN:VEVENT','UID:'+Date.now()+'-'+day+'@road230.local','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'').replace(/Z$/,'Z'),'DTSTART;TZID=Europe/Vienna:'+from,'DTEND;TZID=Europe/Vienna:'+ends,'RRULE:FREQ=WEEKLY;UNTIL=20270403T215959Z','SUMMARY:'+escapeICS(name),'DESCRIPTION:'+escapeICS(desc),'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:Lauftraining: Road to 2:30','TRIGGER:-PT30M','END:VALARM','END:VEVENT'].join('\r\n')};const data=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Road to 2:30//DE','CALSCALE:GREGORIAN',event('Road to 2:30 – lockerer Lauf',easyDay,easyTime,'Ruhig laufen. Die 10-Minuten-Regel gilt.'),event('Road to 2:30 – langer Lauf',longDay,longTime,'Locker laufen. Falls nötig erholen, verschieben oder verkürzen.'),'END:VCALENDAR'].join('\r\n');download('road-to-230-erinnerungen.ics',data,'text/calendar;charset=utf-8');toast('Kalenderdatei erstellt – bitte in den iPhone-Kalender importieren')}
function download(name,content,mime){const blob=new Blob([content],{type:mime}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
function openFeedback(id){
 const r=allRuns().find(x=>x.id===id);if(!r)return;editingFeedbackId=id;const f=feedbackFor(r);
 el('feedbackRunTitle').textContent=`${fmtKm(r.km)} · ${displayDate(r.date)}`;
 el('feedbackRpe').value=f.rpe?String(f.rpe):'';el('feedbackNotes').value=f.note||'';
 el('feedbackTest').checked=!!f.test10k;el('feedbackWarning').checked=!!f.warning;
 showPage('progress');el('feedbackCard').classList.remove('hidden');el('feedbackCard').scrollIntoView({behavior:'smooth',block:'start'});
}
function saveFeedback(e){
 e.preventDefault();if(!editingFeedbackId)return;
 const r=allRuns().find(x=>x.id===editingFeedbackId);
 const test=el('feedbackTest').checked;
 if(test&&(!r||r.km<9.8||r.km>10.2)){toast('10-km-Test nur für einen Lauf um 10 km markieren');return}
 state.feedback[editingFeedbackId]={rpe:Number(el('feedbackRpe').value)||null,note:el('feedbackNotes').value.trim().slice(0,1000),test10k:test,warning:el('feedbackWarning').checked};
 save();el('feedbackCard').classList.add('hidden');renderAll();toast('Feedback gespeichert – es erscheint im Coaching-Bericht');
}
let editingWorkout=null;
let pendingImport=null;
function openWorkoutEditor(week,index){
 if(week===PLAN.length-1&&index===1)return;
 const w=workoutData(week,index);editingWorkout={week,index};showPage('plan');inspectedWeek=week;renderPlan();
 el('workoutEditCard').classList.remove('hidden');el('editDate').value=w.date;el('editTitle').value=w.title;el('editDistance').value=w.distanceKm;
 el('editPaceFrom').value=w.paceFrom;el('editPaceTo').value=w.paceTo;el('editZone').value=String(w.zone);
 el('editStructure').value=w.structure;el('editReason').value=w.reason;el('editRpe').value=w.rpe;
 el('workoutEditCard').scrollIntoView({behavior:'smooth',block:'start'});
}
function closeWorkoutEditor(){el('workoutEditCard').classList.add('hidden');editingWorkout=null}
function applyManualWorkout(e){
 e.preventDefault();if(!editingWorkout)return;
 try{
  const {week,index}=editingWorkout;
  const previous=workoutData(week,index),newKm=Number(el('editDistance').value);
  let structure=el('editStructure').value;
  if(structure===previous.structure&&Math.abs(newKm-previous.distanceKm)>.05)structure=structure.replaceAll(formatNumber(previous.distanceKm,1)+' km',formatNumber(newKm,1)+' km');
  const checked=validWorkoutChange({title:el('editTitle').value,distanceKm:newKm,paceFrom:el('editPaceFrom').value,paceTo:el('editPaceTo').value,zone:el('editZone').value,structure,reason:el('editReason').value,rpe:el('editRpe').value});
  saveWorkoutOverride(week,index,checked,'Manuell');closeWorkoutEditor();toast('Training angepasst und lokal gespeichert');
 }catch(err){toast(err.message)}
}
function resetWorkout(week,index){
 if(!confirm('Diese Einheit auf den ursprünglichen Trainingsplan zurücksetzen?'))return;
 const key=workoutKey(week,index),prev=state.planOverrides[key];if(!prev)return;
 delete state.planOverrides[key];trainingHistory('Zurückgesetzt',week,index,prev,null);save();renderAll();closeWorkoutEditor();toast('Ursprüngliche Einheit wiederhergestellt');
}
function readImportedChanges(raw){
 if(typeof raw!=='string'||raw.length>20000)throw new Error('Text ist leer oder zu lang (max. 20.000 Zeichen).');
 let text=raw.trim();const begin='ROAD230_UPDATE',end='END_ROAD230_UPDATE';
 if(text.includes(begin)){
  const from=text.indexOf(begin)+begin.length,to=text.indexOf(end,from);
  if(to<0)throw new Error('Abschlussmarker END_ROAD230_UPDATE fehlt.');text=text.slice(from,to).trim();
 }else if(/^```json\s*/i.test(text))text=text.replace(/^```json\s*/i,'').replace(/```\s*$/,'').trim();
 else if(!text.startsWith('{'))throw new Error('Bitte einen ROAD230_UPDATE-Block aus dem Coaching-Chat einfügen.');
 text=text.replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/,'').trim();
 let parsed;try{parsed=JSON.parse(text)}catch{throw new Error('Der eingefügte Trainingsblock enthält kein gültiges JSON. Bitte den vollständigen Block kopieren.')}
 if(parsed?.version!==1||!Array.isArray(parsed.workouts)||!parsed.workouts.length||parsed.workouts.length>8)throw new Error('Es werden 1 bis 8 Trainingseinheiten mit version:1 erwartet.');
 const seen=new Set();return parsed.workouts.map(item=>{
   if(!/^20\d{2}-\d{2}-\d{2}$/.test(item?.date||''))throw new Error('Ein Trainingsdatum fehlt oder ist ungültig.');
   const target=findWorkoutByDate(item.date);if(!target)throw new Error(`Für ${item.date} gibt es keinen geplanten Trainingstermin. Tage in den Einstellungen prüfen.`);
   if(target.week===PLAN.length-1&&target.index===1)throw new Error('Der Wettkampftag ist gesperrt.');
   const key=workoutKey(target.week,target.index);if(seen.has(key))throw new Error('Derselbe Trainingstermin ist doppelt vorhanden.');seen.add(key);
   const old=workoutData(target.week,target.index),merged={...old,...item};
   return {...target,date:item.date,old,newWorkout:validWorkoutChange(merged)};
 });
}
function previewCoachingImport(){
 const target=el('importPreview');target.replaceChildren();pendingImport=null;el('applyImport').disabled=true;
 try{
   const changes=readImportedChanges(el('importText').value);pendingImport=changes;
   for(const item of changes){
     const row=document.createElement('div');row.className='import-item';
     const title=document.createElement('strong');title.textContent=`${displayDate(item.date)} · ${item.newWorkout.title}`;
     const detail=document.createElement('p');detail.textContent=`Vorher: ${fmtKm(item.old.distanceKm)}, ${item.old.paceFrom}–${item.old.paceTo}, Zone ${item.old.zone} → Neu: ${fmtKm(item.newWorkout.distanceKm)}, ${item.newWorkout.paceFrom}–${item.newWorkout.paceTo}, Zone ${item.newWorkout.zone}`;
     const note=document.createElement('small');note.textContent=item.newWorkout.reason||'Begründung: nicht angegeben';row.append(title,detail,note);target.append(row);
   }
   el('applyImport').disabled=false;toast(`${changes.length} Änderung(en) geprüft – bitte bestätigen`);
 }catch(err){const line=document.createElement('p');line.className='error-text';line.textContent=err.message;target.append(line)}
}
function applyCoachingImport(){
 if(!pendingImport?.length)return;
 // Reparse to ensure the text was not changed after the preview.
 let latest;try{latest=readImportedChanges(el('importText').value)}catch(err){toast(err.message);return}
 if(JSON.stringify(latest.map(i=>i.newWorkout))!==JSON.stringify(pendingImport.map(i=>i.newWorkout))){toast('Text geändert. Bitte Vorschau erneut prüfen.');return}
 for(const item of latest)saveWorkoutOverride(item.week,item.index,item.newWorkout,'Coaching-Import');
 const count=latest.length;pendingImport=null;el('importText').value='';el('importPreview').replaceChildren();el('applyImport').disabled=true;
 inspectedWeek=latest[0].week;renderAll();toast(`${count} Änderung(en) übernommen. Zur Sicherheit ein Backup erstellen.`);
}
function persistTrainingDays(){
 const next={easyDay:Number(el('easyDay').value),easyTime:el('easyTime').value,longDay:Number(el('longDay').value),longTime:el('longTime').value};
 if(next.easyDay===next.longDay){toast('Bitte zwei unterschiedliche Trainingstage wählen.');return}
 state.reminders=next;save();renderAll();toast('Trainingstage und Uhrzeiten gespeichert');
}
function persistProfile(){state.profile.notes=el('profileNotes').value.trim().slice(0,600);save();renderCoach();toast('Privater Coaching-Kontext gespeichert')}
function openEntry(){showPage('progress');el('entryCard').classList.remove('hidden');el('runDate').value=dateStr(new Date());el('entryCard').scrollIntoView({behavior:'smooth',block:'start'})}
function writeRun(e){e.preventDefault();const km=Number(el('runDistance').value),sec=Math.round(Number(el('runMinutes').value)*60),date=el('runDate').value;if(!(km>0&&km<=100&&sec>0&&sec<60000&&/^\d{4}-\d{2}-\d{2}$/.test(date))){toast('Bitte gültige Laufdaten eingeben');return}state.manual.push({id:'manual_'+Date.now()+'_'+Math.floor(Math.random()*10000),name:'Lauf',date,km,seconds:sec,hr:Number(el('runHr').value)||null,rpe:Number(el('runRpe').value)||null,note:el('runNotes').value.trim().slice(0,1000),source:'Manuell'});save();el('manualForm').reset();el('entryCard').classList.add('hidden');renderAll();toast('Lauf gespeichert!');window.scrollTo({top:0,behavior:'smooth'})}
async function copyText(text){try{await navigator.clipboard.writeText(text);toast('Kopiert – jetzt in ChatGPT einfügen')}catch{const a=document.createElement('textarea');a.value=text;document.body.append(a);a.select();document.execCommand('copy');a.remove();toast('Zusammenfassung kopiert')}}
function storeKeyFromInput(){const k=el('icuKey').value.trim();if(!k)return;if(el('rememberKey').checked){localStorage.setItem(KEY_STORE,k);sessionStorage.removeItem(KEY_STORE)}else{sessionStorage.setItem(KEY_STORE,k);localStorage.removeItem(KEY_STORE)}}
function init(){state.raceDate=RACE_DATE;const weekPicker=el('weekPicker');for(let i=0;i<PLAN.length;i++){const op=document.createElement('option');op.value=String(i);op.textContent=`Woche ${i+1} · ${displayDate(dateStr(addDays(START,i*7)))}`;weekPicker.append(op)}weekPicker.addEventListener('change',()=>{inspectedWeek=Number(weekPicker.value);renderPlan()});loadTrainingFields();for(const n of document.querySelectorAll('[data-tab]'))n.addEventListener('click',()=>showPage(n.dataset.tab));for(const n of document.querySelectorAll('[data-show]'))n.addEventListener('click',()=>showPage(n.dataset.show));el('syncNow').addEventListener('click',()=>syncIntervals());el('connectIcu').addEventListener('click',()=>syncIntervals());el('toggleKey').addEventListener('click',()=>{const t=el('icuKey');t.type=t.type==='password'?'text':'password';el('toggleKey').textContent=t.type==='password'?'Anzeigen':'Verbergen'});el('forgetKey').addEventListener('click',()=>{localStorage.removeItem(KEY_STORE);sessionStorage.removeItem(KEY_STORE);el('icuKey').value='';el('rememberKey').checked=false;el('syncMessage').className='message';el('syncMessage').textContent='API-Schlüssel aus diesem Browser entfernt. Bereits geladene Trainingsdaten bleiben erhalten.';updateSyncStatus(false);toast('Schlüssel entfernt')});el('downloadReminders').addEventListener('click',generateCalendar);el('addRunTop').addEventListener('click',openEntry);el('addRunInline').addEventListener('click',openEntry);el('closeEntry').addEventListener('click',()=>el('entryCard').classList.add('hidden'));el('manualForm').addEventListener('submit',writeRun);el('feedbackForm').addEventListener('submit',saveFeedback);el('closeFeedback').addEventListener('click',()=>el('feedbackCard').classList.add('hidden'));el('copyCoaching').addEventListener('click',()=>copyText(coachingText()));el('workoutEditForm').addEventListener('submit',applyManualWorkout);el('closeWorkoutEdit').addEventListener('click',closeWorkoutEditor);el('checkImport').addEventListener('click',previewCoachingImport);el('applyImport').addEventListener('click',applyCoachingImport);el('importText').addEventListener('input',()=>{pendingImport=null;el('applyImport').disabled=true;el('importPreview').replaceChildren()});el('saveProfile').addEventListener('click',persistProfile);for(const id of ['easyDay','easyTime','longDay','longTime'])el(id).addEventListener('change',persistTrainingDays);el('backupData').addEventListener('click',()=>download('road-to-230-backup-'+dateStr(new Date())+'.json',JSON.stringify({app:'road230',version:5,...state},null,2),'application/json'));el('restoreFile').addEventListener('change',async(e)=>{const f=e.target.files&&e.target.files[0];if(!f)return;try{if(f.size>5000000)throw new Error('Datei zu groß');const o=JSON.parse(await f.text());if(o.app!=='road230'||!Array.isArray(o.manual)||!Array.isArray(o.synced))throw new Error('Ungültiges Backup');if(!confirm('Aktuelle lokale Trainingsdaten durch dieses Backup ersetzen?'))return;state={...DEFAULT,...o,raceDate:RACE_DATE,training:{},planOverrides:o.planOverrides&&typeof o.planOverrides==='object'&&!Array.isArray(o.planOverrides)?o.planOverrides:{},changeLog:Array.isArray(o.changeLog)?o.changeLog.slice(-50):[],profile:{notes:typeof o.profile?.notes==='string'?o.profile.notes.slice(0,600):''},reminders:{...DEFAULT.reminders,...(o.reminders||{})}};save();loadReminders();loadTrainingFields();el('profileNotes').value=state.profile.notes;renderAll();toast('Backup importiert')}catch(e){toast('Import fehlgeschlagen: '+e.message)}e.target.value=''});el('resetData').addEventListener('click',()=>{if(!confirm('Wirklich alle lokalen Trainingsdaten löschen? API-Schlüssel bleibt gespeichert und muss separat entfernt werden.'))return;state={...DEFAULT,training:{},reminders:{...DEFAULT.reminders},planOverrides:{},changeLog:[],profile:{notes:''}};save();loadReminders();loadTrainingFields();el('profileNotes').value='';renderAll();toast('Lokale Trainingsdaten gelöscht')});el('rememberKey').addEventListener('change',()=>{if(el('rememberKey').checked&&getApiKey()){localStorage.setItem(KEY_STORE,getApiKey())}else{const k=localStorage.getItem(KEY_STORE);if(k)sessionStorage.setItem(KEY_STORE,k);localStorage.removeItem(KEY_STORE)}});loadReminders();el('profileNotes').value=state.profile.notes;const saved=localStorage.getItem(KEY_STORE),temp=sessionStorage.getItem(KEY_STORE);if(saved){el('icuKey').value=saved;el('rememberKey').checked=true}else if(temp){el('icuKey').value=temp}renderAll();if(state.lastSync)updateSyncStatus(true);if(saved)syncIntervals(false);if('serviceWorker' in navigator && location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{})}
document.addEventListener('DOMContentLoaded',init);
