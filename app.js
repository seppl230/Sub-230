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
const DEFAULT = {manual:[],synced:[],notes:{},raceDate:RACE_DATE,reminders:{easyDay:2,easyTime:'18:00',longDay:4,longTime:'18:00'},feedback:{},training:{},planOverrides:{},changeLog:[],profile:{notes:''},lastSync:null,weights:[],dismissedFeedback:[],hrZoneSettings:null,planRules:[]};
let state = loadState();
let toastTimer;
let editingFeedbackId=null;
let inspectedWeek=null;
function feedbackFor(r){const f=state.feedback&&state.feedback[r.id];return {rpe:f&&f.rpe!=null?f.rpe:r.rpe,note:f&&typeof f.note==='string'?f.note:(r.note||''),test10k:!!f?.test10k,warning:!!f?.warning}}
function el(id){return document.getElementById(id)}
function loadState(){try{const data=JSON.parse(localStorage.getItem(STORE)||'{}');return {...DEFAULT,...data,manual:Array.isArray(data.manual)?data.manual:[],synced:Array.isArray(data.synced)?data.synced:[],notes:data.notes && typeof data.notes==='object'?data.notes:{},feedback:data.feedback && typeof data.feedback==='object'?data.feedback:{},reminders:{...DEFAULT.reminders,...(data.reminders||{})},training:{},planOverrides:data.planOverrides&&typeof data.planOverrides==='object'&&!Array.isArray(data.planOverrides)?data.planOverrides:{},changeLog:Array.isArray(data.changeLog)?data.changeLog.slice(-50):[],profile:{notes:typeof data.profile?.notes==='string'?data.profile.notes.slice(0,600):''},weights:Array.isArray(data.weights)?data.weights:[],dismissedFeedback:Array.isArray(data.dismissedFeedback)?data.dismissedFeedback:[],hrZoneSettings:data.hrZoneSettings||null,planRules:Array.isArray(data.planRules)?data.planRules.slice(-50):[]}}catch{return {...DEFAULT}}}
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
// Persistente Coach-Vorgaben wirken auf alle zukünftigen Trainings dieses Typs.
// Bestehende Distanzen, Trainingstage und der Wettkampf bleiben unverändert.
function activePlanRule(week,index){
  if(week===PLAN.length-1&&index===1)return null;
  const date=plannedDate(week,index),kind=index===0?'easy':'long';
  const matches=(state.planRules||[]).filter(r=>r&&r.type===kind&&r.fromDate<=date);
  matches.sort((a,b)=>a.fromDate.localeCompare(b.fromDate)||String(a.changedAt||'').localeCompare(String(b.changedAt||'')));
  return matches.length?matches[matches.length-1]:null;
}
function firstUpcomingWorkoutDate(index){
  const today=dateStr(new Date()),current=weekIdx();
  for(let w=current;w<PLAN.length;w++){
    if(w===PLAN.length-1&&index===1)break;
    const d=plannedDate(w,index);
    if(d<today)continue;
    if(d===today&&sessionDoneFlags(w)[index])continue;
    return d;
  }
  return null;
}
function futureRuleCount(type,fromDate){
  let count=0;
  for(let w=0;w<PLAN.length;w++)for(let i=0;i<2;i++){
    if(w===PLAN.length-1&&i===1)continue;
    if((i===0?'easy':'long')===type&&plannedDate(w,i)>=fromDate)count++;
  }
  return count;
}
function validatePlanRule(r){
  if(!r||typeof r!=='object'||Array.isArray(r))throw new Error('Ungültige Planvorgabe.');
  const type=String(r.type||'');
  if(type!=='easy'&&type!=='long')throw new Error('Planvorgabe benötigt type: easy oder long.');
  const lo=String(r.paceFrom||''),hi=String(r.paceTo||''),zone=Number(r.zone);
  if(!Number.isFinite(paceMinutes(lo))||!Number.isFinite(paceMinutes(hi))||paceMinutes(lo)<4||paceMinutes(hi)>13||paceMinutes(lo)>paceMinutes(hi))throw new Error('Globale Pace ist ungültig (z. B. 8:00–9:00).');
  if(!Number.isInteger(zone)||zone<1||zone>5)throw new Error('Pulszone muss zwischen 1 und 5 liegen.');
  const date=String(r.fromDate||'');
  if(!/^20\d{2}-\d{2}-\d{2}$/.test(date)||dateStr(parseDate(date))!==date)throw new Error('Ungültiges Startdatum für Planvorgabe.');
  const today=dateStr(new Date());
  if(date<today)throw new Error('Planvorgaben dürfen nur für kommende Einheiten gelten.');
  const target=findWorkoutByDate(date);
  if(!target||(target.index===0?'easy':'long')!==type||(target.week===PLAN.length-1&&target.index===1))throw new Error('Das Startdatum muss ein geplanter Trainingstag des richtigen Typs sein.');
  if(date===today&&sessionDoneFlags(target.week)[target.index])throw new Error('Das Startdatum ist bereits absolviert. Bitte das nächste Training wählen.');
  return {type,fromDate:date,paceFrom:lo,paceTo:hi,zone,guidance:String(r.guidance||'').trim().slice(0,250),reason:String(r.reason||'').trim().slice(0,350)};
}
function workoutData(week,index){
  const raw=baseSessionPrescription(index,week);
  const race=week===PLAN.length-1&&index===1;
  const defaultKm=race?21.1:Number(PLAN[week][index]);
  const defaults={week,index,date:plannedDate(week,index),title:raw.title,distanceKm:defaultKm,
    paceFrom:index===0?'7:15':'7:25',paceTo:index===0?'8:15':'8:40',zone:2,
    structure:raw.structure,reason:raw.why,rpe:raw.rpe,icon:raw.icon,race};
  const override=state.planOverrides[workoutKey(week,index)];
  const rule=race?null:activePlanRule(week,index);
  const custom=!race&&override&&typeof override==='object'?override:null;
  let result={...defaults,...(custom||{})};
  if(rule){
    const coachIsNewer=!custom||custom.source!=='Manuell'&&String(custom.changedAt||'')<=String(rule.changedAt||'');
    if(coachIsNewer){
      result.paceFrom=rule.paceFrom;result.paceTo=rule.paceTo;result.zone=rule.zone;
      result.reason=rule.reason||result.reason;
      if(index===0&&week>=16&&week<=21){
        result.structure=`5–8 Min. locker starten → ${fmtKm(result.distanceKm)} entspannt in Zone ${rule.zone} → 5 Min. gehen. Keine flotteren Abschnitte erzwingen.`;
      }
      if(rule.guidance)result.structure=result.structure+' '+rule.guidance;
    }
  }
  return {...result,date:plannedDate(week,index),race,ruleActive:!!rule};
}
function paceMinutes(p){if(!/^\d{1,2}:\d{2}$/.test(String(p)))return NaN;const [m,s]=p.split(':').map(Number);return s<60?m+s/60:NaN}
function workoutResult(week,index){
  const w=workoutData(week,index);
  const pace=w.race?'Ziel 7:06 min/km':`${w.paceFrom}–${w.paceTo} min/km`;
  const duration=w.race?'Ziel unter 2:30 h':`ca. ${Math.round(w.distanceKm*paceMinutes(w.paceFrom))}–${Math.round(w.distanceKm*paceMinutes(w.paceTo))} Min. Laufzeit`;
  const raw=baseSessionPrescription(index,week);
  const overridden=Boolean(state.planOverrides[workoutKey(week,index)])&&!w.race;
  return {...raw,...w,dist:fmtKm(w.distanceKm),pace,pulse:w.race?'Zone 2–3 (nach Gefühl)':`Zone ${w.zone}`,duration,why:w.reason,overridden,ruleActive:!!w.ruleActive};
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
  const monday=addDays(START,week*7),end=addDays(monday,7);
  const runs=allRuns().filter(r=>parseDate(r.date)>=monday&&parseDate(r.date)<end).slice().sort((a,b)=>a.date.localeCompare(b.date));
  const days=[plannedDate(week,0),plannedDate(week,1)],done=[false,false];
  const remaining=[];
  for(const r of runs){const exact=days.indexOf(r.date);if(exact>=0&&!done[exact])done[exact]=true;else remaining.push(r)}
  for(const r of remaining){let candidates=[0,1].filter(i=>!done[i]);if(!candidates.length)break;
    const d=parseDate(r.date),i=candidates.reduce((a,b)=>Math.abs(d-parseDate(days[a]))<=Math.abs(d-parseDate(days[b]))?a:b);
    done[i]=true;
  }
  return done;
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
    name.append(title,note);const tag=document.createElement('span');tag.className='session-tag'+(done[i]?' done':'');tag.textContent=done[i]?'✓ Erledigt':s.overridden?'✎ Angepasst':s.ruleActive?'↻ Planvorgabe':s.dist;
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
function renderTrainingInsights(){const runs=allRuns(),r=progressReadiness(runs),m=nextDistanceMilestone(runs);el('readinessTag').textContent=r.tag;el('readinessText').textContent=r.body;el('adherenceMetric').textContent=r.observed?`${r.compliant} / ${r.observed}`:'Noch offen';el('adherenceCaption').textContent='Abgeschlossene Wochen mit 2+ Läufen seit Trainingsstart (max. 4)';el('distanceMetric').textContent=r.best?fmtKm(r.best):'–';el('distanceCaption').textContent='Längster erfasster Lauf';el('testMetric').textContent=r.hasTest?'10 km erfasst':'Noch offen';el('nextMilestoneTitle').textContent=r.best?`Nächste Distanz: ${formatNumber(m.next,1)} km`:'Der erste dokumentierte Lauf';el('nextMilestoneValue').textContent=fmtKm(m.next);el('nextMilestoneText').textContent=r.best?`Bisheriger längster Lauf: ${fmtKm(r.best)}. Steigere nur, wenn sich die letzten Einheiten gut angefühlt haben.`:'Erfasse deinen ersten ruhigen Lauf – wir starten klein und steigern behutsam.';el('nextMilestoneBar').style.width=m.progress+'%';renderWeekBreakdown(el('recentWeeks'),runs,4)}
function nextPlannedWorkout(){
  const current=weekIdx(),today=dateStr(new Date());
  for(let w=current;w<PLAN.length;w++){
    const done=sessionDoneFlags(w);
    for(let i=0;i<2;i++){
      const session=sessionPrescription(i,w);
      if(!done[i]&&(session.date>=today||w===current)) return {session,week:w};
    }
  }
  return {session:sessionPrescription(1,PLAN.length-1),week:PLAN.length-1};
}
function renderOverview(){const runs=allRuns(),now=new Date(),wk=currentWeekRuns(runs),best=maxKm(runs),next=nextPlannedWorkout();el('statRuns').textContent=`${Math.min(wk.length,2)} / 2`;el('statRunsSub').textContent=wk.length>=2?'Zwei Läufe geschafft – stark!':'Konstanz schlägt Tempo';el('statKm').innerHTML='';el('statKm').append(document.createTextNode(formatNumber(sumKm(runs),1)+' '));const em=document.createElement('em');em.textContent='km';el('statKm').append(em);el('statKmSub').textContent=runs.length?`${runs.length} Läufe insgesamt`:'Noch keine Läufe protokolliert';el('statLong').textContent=best?fmtKm(best):'–';el('statLongSub').textContent=best?'Längster dokumentierter Lauf':'Noch kein längerer Lauf dokumentiert';el('phaseText').textContent=phaseText();el('raceText').textContent=displayDate(RACE_DATE);el('raceCountdown').textContent=Math.max(0,Math.ceil((parseDate(RACE_DATE)-parseDate(dateStr(new Date())))/86400000))+' Tage';el('nextWorkoutTitle').textContent=next.session.title;el('nextWorkoutDate').textContent=`${displayDate(next.session.date)} · ${next.session.dist}`;el('nextWorkoutPace').textContent=next.session.pace;el('nextWorkoutZone').textContent=next.session.pulse;el('nextWorkoutHint').textContent=next.session.structure;el('nextWorkoutFooter').textContent=next.week===weekIdx()?'Das ist deine nächste geplante Einheit dieser Woche.':'Die aktuelle Woche ist erledigt – das ist die nächste geplante Einheit.';renderSessions(el('weekSessions'));renderMilestones(el('miniMilestones'),true)}
function renderPlan(){
  const current=weekIdx(),i=inspectedWeek===null?current:Math.max(0,Math.min(PLAN.length-1,inspectedWeek));
  const start=addDays(START,i*7);
  const phase=i<8?'Gewöhnung':i<16?'Grundlage':i<22?'Lange Läufe':i===22?'Taper':'Wettkampf';
  el('planWeekTitle').textContent=`Woche ${i+1} · ${phase}`;
  el('planWeekDates').textContent=`${displayDate(dateStr(start))} – ${displayDate(dateStr(addDays(start,6)))}`;
  el('weekPicker').value=String(i);
  el('weekMeta').textContent=i===current?'Aktuelle Woche · 2 Laufeinheiten':`Vorschau / Rückblick · Woche ${i+1} · kein Pflichtprogramm`;
  renderDetailedSessions(i);
  el('easyPaceGuide').textContent=sessionPrescription(0,i).pace;el('longPaceGuide').textContent=sessionPrescription(1,i).race?'Lauf 2: Wettkampf':sessionPrescription(1,i).pace;
  renderTrainingHorizon(i);
  renderMilestones(el('roadmap'));
  el('planSafetyNote').textContent='Änderungen bleiben lokal gespeichert. Dauerhafte Vorgaben findest du unter Coach → Vom Coach übernehmen.';
}
function loadTrainingFields(){}
function renderChart(){const target=el('weeklyChart');target.replaceChildren();const runs=allRuns(),start=addDays(weekMonday(new Date()),-49);const v=Array.from({length:8},(_,i)=>{const d=addDays(start,i*7),end=addDays(d,7);return {label:'KW '+isoWeek(d),km:sumKm(runs.filter(r=>{const t=parseDate(r.date);return t>=d&&t<end}))}});const max=Math.max(1,...v.map(x=>x.km));for(const x of v){const col=document.createElement('div');col.className='chart-column';const val=document.createElement('span');val.className='chart-val';val.textContent=formatNumber(x.km,0);const slot=document.createElement('div');slot.className='chart-barslot';const bar=document.createElement('div');bar.className='chart-bar';bar.style.height=`${Math.max(2,Math.round(x.km/max*140))}px`;bar.title=fmtKm(x.km);slot.append(bar);const lab=document.createElement('span');lab.className='chart-col-label';lab.textContent=x.label;col.append(val,slot,lab);target.append(col)}}
function renderProgress(){
 const runs=allRuns(),best=maxKm(runs);el('progressAll').textContent=fmtKm(sumKm(runs));el('progressCount').textContent=String(runs.length);el('progressLongest').textContent=best?fmtKm(best):'–';renderChart();
 const picker=el('trainingWeekFilter'),was=picker.value,weeks=[...new Set(runs.map(r=>dateStr(weekMonday(parseDate(r.date)))))];picker.replaceChildren();
 const allOpt=document.createElement('option');allOpt.value='all';allOpt.textContent='Alle Wochen';picker.append(allOpt);
 for(const w of weeks){const opt=document.createElement('option');opt.value=w;opt.textContent=`KW ${isoWeek(parseDate(w))} · ${displayDate(w)}`;picker.append(opt)}
 picker.value=weeks.includes(was)?was:'all';const view=picker.value==='all'?runs:runs.filter(r=>dateStr(weekMonday(parseDate(r.date)))===picker.value);
 const list=el('activityList');list.replaceChildren();
 if(!view.length){const empty=document.createElement('div');empty.className='empty';empty.textContent=runs.length?'Keine Läufe in dieser Woche.':'Noch keine Läufe erfasst. Trage einen Lauf ein oder verbinde Intervals.icu in den Einstellungen.';list.append(empty);return}
 for(const r of view.slice(0,100)){
  const row=document.createElement('div');row.className='activity-row';const icon=document.createElement('div');icon.className='activity-icon';icon.textContent='↗';
  const meta=document.createElement('div');meta.className='activity-meta';const h=document.createElement('strong');h.textContent=(r.name||'Lauf')+' · '+displayDate(r.date);
  const s=document.createElement('small');const f=feedbackFor(r);s.textContent=(r.source==='Intervals.icu'?'Garmin':'Manuell')+(r.hr?' · Ø '+r.hr+' bpm':'')+(f.rpe?' · RPE '+f.rpe+'/10':'');
  const detail=document.createElement('button');detail.className='tiny-link';detail.type='button';detail.textContent='Trainingsdetails ansehen →';detail.addEventListener('click',()=>showRunDetails(r.id));
  const fb=document.createElement('button');fb.className='tiny-link';fb.type='button';fb.textContent=f.rpe||f.note?' · Feedback bearbeiten':' · Feedback geben';fb.addEventListener('click',()=>openFeedback(r.id));
  meta.append(h,s,detail,fb);const metrics=document.createElement('div');metrics.className='activity-metrics';const a=document.createElement('strong');a.textContent=fmtKm(r.km);const b=document.createElement('small');b.textContent=minsPerKm(r.km,r.seconds);metrics.append(a,b);row.append(icon,meta,metrics);list.append(row);
 }
}
function coachingText(){const all=allRuns(),recent=all.slice(0,10),last28=all.filter(r=>parseDate(r.date)>=addDays(new Date(),-28)),last14=all.filter(r=>parseDate(r.date)>=addDays(new Date(),-14)),p=thisPlan();const lines=[
  'Laufcoach-Update · SUB 230','',
  'Körpergewicht (falls vorhanden): '+(weightEntries().length?formatNumber(weightEntries().at(-1).kg,1)+' kg':'nicht hinterlegt'),
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
  `Trainingsanpassungen: ${Object.keys(state.planOverrides).length} individuell geänderte Einheiten; ${(state.planRules||[]).length} langfristige Pace-/Zonenvorgaben.`,
  ...((state.planRules||[]).map(r=>`Dauerhafte Vorgabe ${r.type==='easy'?'Locker':'Länger'} ab ${r.fromDate}: ${r.paceFrom}–${r.paceTo} min/km, Zone ${r.zone}, ${r.reason||''}`)),
  '', 'Neueste Läufe (Datum | Distanz | Pace | Puls | Belastung | Notiz):'
];if(!recent.length)lines.push('Noch keine Aktivitäten erfasst.');for(const r of recent)lines.push(`${displayDate(r.date)} | ${fmtKm(r.km)} | ${minsPerKm(r.km,r.seconds)} | ${r.hr||'–'} bpm | RPE ${feedbackFor(r).rpe||'–'}${feedbackFor(r).test10k?' [10-km-Test]':''}${feedbackFor(r).warning?' [Warnsignal]':''} | ${(feedbackFor(r).note||'–').replace(/\s+/g,' ').slice(0,3000)}`);lines.push('',...recent.flatMap(r=>detailReport(r)),'','Bitte gib mir eine kurze, konkrete Einschätzung meines Trainings (ohne Bla-Bla). Bei Bedarf: Unterscheide einmalige Änderungen (Distanz/Termin) von dauerhaften Vorgaben (Pace/Zone bei allen folgenden lockeren bzw. langen Läufen). Wenn dauerhafte Änderungen begründet sind, hänge ROAD230_UPDATE, eine neue Zeile mit JSON {"version":2,"planRules":[{"type":"easy","fromDate":"YYYY-MM-DD","paceFrom":"MM:SS","paceTo":"MM:SS","zone":2,"guidance":"kurzer Praxistipp","reason":"Begründung"}],"workouts":[]} und END_ROAD230_UPDATE an. Für die zweite Laufart type:"long" verwenden. Für beide Laufarten bitte zwei Regeln angeben, wenn beide betroffen sind. Startdatum jeweils der nächste noch nicht absolvierte geplante Trainingstag der Laufart. Wenn nur eine einzelne Einheit angepasst werden soll, verwende wie bisher version:1 mit workouts. Nichts ohne nachvollziehbaren Änderungsbedarf ändern. Die langfristigen Distanzen und den Wettkampftag nicht pauschal wegen eines einzigen Laufs umschreiben. Bei zu hohem Puls den Gesprächstest, langsamere Pace und nötigenfalls Gehpausen priorisieren.', '', `Geplante Laufdaten der nächsten vier Wochen: ${Array.from({length:4},(_,n)=>Math.min(PLAN.length-1,weekIdx()+n)).map(w=>`${sessionPrescription(0,w).date} (easy) / ${sessionPrescription(1,w).date} (long)`).join("; ")}. Den Wettkampftag nicht ändern. Anpassungen vor dem Training manuell bestätigen.`);return lines.join('\n')}
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
 el('planChangesCount').textContent=`${Object.keys(state.planOverrides).length} Einzeländerungen · ${(state.planRules||[]).length} Planregeln`;renderPlanRuleStatus();
}
function renderCoach(){el('coachPreview').textContent=coachingText()}
function renderAll(){renderOverview();renderPlan();renderProgress();renderTrainingInsights();renderCoach();renderExtras();renderWeight()}
function showPage(name){for(const p of document.querySelectorAll('.tab-page'))p.classList.toggle('active',p.dataset.page===name);for(const b of document.querySelectorAll('[data-tab]'))b.classList.toggle('active',b.dataset.tab===name);window.scrollTo({top:0,behavior:'instant'});if(name==='coach')renderCoach()}
function updateSyncStatus(connected=false){el('topSync').textContent=connected?'Synchronisiert':'Lokal';el('sideSync').textContent=connected?'Daten geladen':'Lokaler Modus'}
function getApiKey(){return el('icuKey').value.trim()||sessionStorage.getItem(KEY_STORE)||localStorage.getItem(KEY_STORE)||''}
async function icuGet(path,key,required=false){
  const result=await fetch('https://intervals.icu/api/v1'+path,{headers:{Authorization:'Basic '+btoa('API_KEY:'+key),Accept:'application/json'},cache:'no-store'});
  if(!result.ok){if(required)throw new Error(result.status===401||result.status===403?'Zugriff verweigert. Prüfe deinen API-Schlüssel.':'HTTP '+result.status);return null}
  return result.json();
}
function parseIcuZoneTimes(raw){
 if(!Array.isArray(raw))return null;
 const vals=raw.slice(0,10).map(x=>{
   const v=typeof x==='number'?x:(x&&typeof x==='object'?Number(x.secs??x.seconds??x.time):NaN);
   return Number.isFinite(v)&&v>=0?Math.round(v):0;
 });
 return vals.length?vals:null;
}
function getArrayStream(body,type){
 if(!Array.isArray(body))return null;
 const found=body.find(x=>x&&x.type===type&&Array.isArray(x.data));return found?found.data:null;
}
function calculateRunStreams(streams){
 const time=getArrayStream(streams,'time'),dist=getArrayStream(streams,'distance'),hr=getArrayStream(streams,'heartrate');
 if(!time||!dist||time.length!==dist.length||time.length<4)return {splits:[],halves:null};
 const splits=[],n=time.length;let startTime=Number(time[0]),startDist=Number(dist[0]),kmTarget=startDist+1000;
 let hrSum=0,hrN=0,prevDist=startDist;
 const halfD=(Number(dist[n-1])-startDist)/2,halfStats=[{hr:0,count:0},{hr:0,count:0}];
 for(let i=1;i<n;i++){
   const d=Number(dist[i]),prevD=Number(dist[i-1]),t=Number(time[i]),prevT=Number(time[i-1]),h=hr?Number(hr[i]):NaN;
   if(!Number.isFinite(d)||!Number.isFinite(prevD)||!Number.isFinite(t)||!Number.isFinite(prevT)||d<prevD)continue;
   if(Number.isFinite(h)&&h>55&&h<230){hrSum+=h;hrN++;const half=d-startDist<halfD?0:1;halfStats[half].hr+=h;halfStats[half].count++}
   while(d>=kmTarget&&splits.length<25&&d>prevD){
     const ratio=(kmTarget-prevD)/(d-prevD),crossTime=prevT+(t-prevT)*ratio,seconds=Math.round(crossTime-startTime);
     if(seconds>90&&seconds<1800)splits.push({km:splits.length+1,seconds,hr:hrN?Math.round(hrSum/hrN):null});
     startTime=crossTime;kmTarget+=1000;hrSum=0;hrN=0;
   }
 }
 let halves=null;
 if(halfStats[0].count>5&&halfStats[1].count>5){halves=[0,1].map(i=>Math.round(halfStats[i].hr/halfStats[i].count))}
 return {splits,halves};
}
function mapIcuActivity(a,prev,zoneSettings){
 const basic={id:'icu_'+String(a.id),name:String(a.name||'Garmin-Lauf').slice(0,90),date:String(a.start_date_local||a.start_date||'').slice(0,10),km:Number(a.distance||0)/1000,seconds:Number(a.moving_time||a.elapsed_time||0),hr:Number(a.average_heartrate)||null,maxHr:Number(a.max_heartrate)||null,elevation:a.total_elevation_gain!=null&&Number.isFinite(Number(a.total_elevation_gain))?Number(a.total_elevation_gain):null,rpe:Number(a.icu_rpe||a.perceived_exertion)||null,note:'',source:'Intervals.icu'};
 return {...basic,detail:prev?.detail||null};
}
async function syncIntervals(showSuccess=true){
 const key=getApiKey();if(!key){showPage('settings');el('syncMessage').textContent='Bitte zuerst einen persönlichen API-Schlüssel eintragen.';toast('Zuerst Intervals.icu verbinden');return}
 const btn=el('connectIcu');btn.disabled=true;el('syncMessage').className='message';el('syncMessage').textContent='Läufe und zusätzliche Trainingsdaten laden …';
 try{
  const body=await icuGet('/athlete/0/activities?oldest=2026-10-01&limit=500',key,true);
  if(!Array.isArray(body))throw new Error('Die API hat keine Aktivitätenliste geliefert.');
  const previous=new Map(state.synced.map(r=>[r.id,r]));
  const runs=body.filter(a=>['Run','TrailRun','VirtualRun'].includes(a.type)).map(a=>mapIcuActivity(a,previous.get('icu_'+String(a.id)))).filter(a=>/^\d{4}-\d{2}-\d{2}$/.test(a.date)&&a.km>0&&a.km<300);
  // A manual sync must offer feedback for the latest recent run immediately,
  // even when "Später" was previously selected. Never interrupt an automatic sync.
  const now=new Date();
  const pendingRun=showSuccess ? runs
    .filter(r=>{const d=parseDate(r.date);return d>=addDays(now,-7)&&d<=now&&!((state.feedback[r.id]?.note||'').trim()||state.feedback[r.id]?.rpe)})
    .sort((a,b)=>b.date.localeCompare(a.date))[0] : null;
  if(pendingRun){
    // Persist basic Garmin data before slow optional split/HR-zone requests.
    state.synced=runs;save();renderAll();openFeedbackModal(pendingRun.id);
  }
  let zoneSettings=state.hrZoneSettings;
  try{const settings=await icuGet('/athlete/0/sport-settings/Run',key);if(settings&&Array.isArray(settings.hr_zones))zoneSettings={limits:settings.hr_zones.map(Number),names:settings.hr_zone_names||[],maxHr:settings.max_hr||null,lthr:settings.lthr||null}}catch{}
  state.hrZoneSettings=zoneSettings;
  // Request detailed data for recent runs, including activities already synced in V6.
  const recent=runs.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,12).filter(r=>!r.detail?.lastChecked||Date.now()-r.detail.lastChecked>86400000);
  for(let k=0;k<recent.length;k+=3){
   await Promise.all(recent.slice(k,k+3).map(async run=>{
     const activityId=encodeURIComponent(run.id.slice(4));
     try{
       const detail=await icuGet('/activity/'+activityId,key);
       if(!detail)return;
       let series=null;
       try{series=await icuGet('/activity/'+activityId+'/streams.json?types=time,distance,heartrate',key)}catch{}
       const computed=calculateRunStreams(series);
       run.maxHr=Number(detail.max_heartrate)||run.maxHr;
       run.elevation=detail.total_elevation_gain!=null&&Number.isFinite(Number(detail.total_elevation_gain))?Number(detail.total_elevation_gain):run.elevation;
       run.detail={zoneTimes:parseIcuZoneTimes(detail.icu_hr_zone_times??run.detail?.zoneTimes),zones:zoneSettings||run.detail?.zones||null,
        splits:computed.splits.length?computed.splits:run.detail?.splits||[],halves:computed.halves||run.detail?.halves||null,
        elevation:run.elevation,lastChecked:Date.now()};
     }catch{} // Keep ordinary runs and existing detail data if the optional API data is unavailable.
   }));
  }
  // Wellness weight is optional; manual values remain local and take priority on matching dates.
  try{const wellness=await icuGet('/athlete/0/wellness?oldest=2026-10-01',key);if(Array.isArray(wellness)){
    const manual=state.weights.filter(w=>w.source!=='Intervals.icu');const has=new Set(manual.map(w=>w.date));
    state.weights=[...manual,...wellness.filter(w=>w&&/\d{4}-\d{2}-\d{2}/.test(w.id||w.date)&&Number(w.weight)>25&&Number(w.weight)<300&&!has.has((w.id||w.date).slice(0,10))).map(w=>({date:(w.id||w.date).slice(0,10),kg:Number(w.weight),source:'Intervals.icu'}))];
  }}catch{}
  // Do not replace local feedback: it is keyed by stable Intervals activity IDs.
  state.synced=runs;state.lastSync=new Date().toISOString();save();
  if(el('rememberKey').checked){localStorage.setItem(KEY_STORE,key);sessionStorage.removeItem(KEY_STORE)}else{sessionStorage.setItem(KEY_STORE,key);localStorage.removeItem(KEY_STORE)}
  updateSyncStatus(true);renderAll();
  el('syncMessage').textContent=`${runs.length} Laufaktivitäten geladen. Zusätzliche Puls- und Splitdaten werden übernommen, sofern Intervals.icu sie bereitstellt. Letzter Abruf: ${new Date().toLocaleString('de-AT')}.`;
  el('syncMessage').className='message good';if(showSuccess)toast(`${runs.length} Läufe synchronisiert`);
 }catch(e){el('syncMessage').className='message error';el('syncMessage').textContent='Synchronisierung fehlgeschlagen: '+e.message;toast('Synchronisierung nicht möglich')}
 finally{btn.disabled=false}
}
function loadReminders(){for(const [k,v] of Object.entries(state.reminders)){const t=el(k);if(t)t.value=String(v)}}
function dateOfNextDay(day){const now=new Date(),d=(Number(day)-now.getDay()+7)%7;return addDays(now,d===0?7:d)}
function stampLocal(date,hour){return dateStr(date).replace(/-/g,'')+'T'+hour.replace(':','')+'00'}
function generateCalendar(){const easyDay=Number(el('easyDay').value),longDay=Number(el('longDay').value),easyTime=el('easyTime').value,longTime=el('longTime').value;state.reminders={easyDay,easyTime,longDay,longTime};save();const escapeICS=s=>String(s).replace(/\\/g,'\\\\').replace(/,/g,'\\,').replace(/;/g,'\\;').replace(/\n/g,'\\n');const event=(name,day,time,desc)=>{const d=dateOfNextDay(day);const from=stampLocal(d,time);const hh=Number(time.slice(0,2)),mm=Number(time.slice(3));const endTime=`${String((hh+1)%24).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;const ends=stampLocal(addDays(d,hh===23?1:0),endTime);return ['BEGIN:VEVENT','UID:'+Date.now()+'-'+day+'@road230.local','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'').replace(/Z$/,'Z'),'DTSTART;TZID=Europe/Vienna:'+from,'DTEND;TZID=Europe/Vienna:'+ends,'RRULE:FREQ=WEEKLY;UNTIL=20270403T215959Z','SUMMARY:'+escapeICS(name),'DESCRIPTION:'+escapeICS(desc),'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:Lauftraining: SUB 230','TRIGGER:-PT30M','END:VALARM','END:VEVENT'].join('\r\n')};const data=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//SUB 230//DE','CALSCALE:GREGORIAN',event('SUB 230 – lockerer Lauf',easyDay,easyTime,'Ruhig laufen. Die 10-Minuten-Regel gilt.'),event('SUB 230 – langer Lauf',longDay,longTime,'Locker laufen. Falls nötig erholen, verschieben oder verkürzen.'),'END:VCALENDAR'].join('\r\n');download('sub-230-erinnerungen.ics',data,'text/calendar;charset=utf-8');toast('Kalenderdatei erstellt – bitte in den iPhone-Kalender importieren')}
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
 state.feedback[editingFeedbackId]={rpe:Number(el('feedbackRpe').value)||null,note:el('feedbackNotes').value.trim().slice(0,3000),test10k:test,warning:el('feedbackWarning').checked};
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
 if(typeof raw!=='string'||!raw.trim()||raw.length>24000)throw new Error('Text ist leer oder zu lang (max. 24.000 Zeichen).');
 let text=raw.trim();const begin='ROAD230_UPDATE',end='END_ROAD230_UPDATE';
 if(text.includes(begin)){
  const from=text.indexOf(begin)+begin.length,to=text.indexOf(end,from);
  if(to<0)throw new Error('Abschlussmarker END_ROAD230_UPDATE fehlt.');text=text.slice(from,to).trim();
 }else if(/^```json\s*/i.test(text))text=text.replace(/^```json\s*/i,'').replace(/```\s*$/,'').trim();
 else if(!text.startsWith('{'))throw new Error('Bitte einen ROAD230_UPDATE-Block einfügen.');
 text=text.replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/,'').trim();
 let parsed;try{parsed=JSON.parse(text)}catch{throw new Error('Der Coaching-Block enthält kein gültiges JSON.')}
 if(![1,2].includes(parsed?.version))throw new Error('Nur version:1 oder version:2 wird unterstützt.');
 const workouts=parsed.workouts||[],ruleData=parsed.version===2?(parsed.planRules||[]):[];
 if(!Array.isArray(workouts)||workouts.length>8||!Array.isArray(ruleData)||ruleData.length>2||(!workouts.length&&!ruleData.length))throw new Error('Erwartet: bis zu 8 einzelne Einheiten und/oder 2 dauerhafte Regeln.');
 const seen=new Set(),changes=workouts.map(item=>{
   if(!/^20\d{2}-\d{2}-\d{2}$/.test(item?.date||''))throw new Error('Ein Trainingsdatum fehlt oder ist ungültig.');
   const target=findWorkoutByDate(item.date);if(!target)throw new Error(`Für ${item.date} gibt es keinen geplanten Trainingstermin. Tage in den Einstellungen prüfen.`);
   if(target.week===PLAN.length-1&&target.index===1)throw new Error('Der Wettkampftag ist gesperrt.');
   const key=workoutKey(target.week,target.index);if(seen.has(key))throw new Error('Derselbe Trainingstermin ist doppelt vorhanden.');seen.add(key);
   const old=workoutData(target.week,target.index),merged={...old,...item};
   return {...target,date:item.date,old,newWorkout:validWorkoutChange(merged)};
 });
 const seenTypes=new Set(),rules=ruleData.map(r=>{
   const rule=validatePlanRule(r);
   if(seenTypes.has(rule.type))throw new Error('Je Laufart nur eine dauerhafte Regel pro Import.');
   seenTypes.add(rule.type);
   return {...rule,affected:futureRuleCount(rule.type,rule.fromDate)};
 });
 return {changes,rules};
}
function renderPlanRuleStatus(){
 const box=el('planRulesStatus');if(!box)return;box.replaceChildren();
 const rules=state.planRules||[];
 if(!rules.length){const p=document.createElement('p');p.className='hint';p.textContent='Noch keine dauerhaften Planvorgaben. Der bisherige Trainingsplan gilt unverändert.';box.append(p);el('clearPlanRules').classList.add('hidden');return;}
 el('clearPlanRules').classList.remove('hidden');
 for(const type of ['easy','long']){
  const found=rules.filter(r=>r.type===type).sort((a,b)=>a.fromDate.localeCompare(b.fromDate));
  if(!found.length)continue;
  const rule=found[found.length-1],p=document.createElement('p');p.className='plan-rule-item';
  p.textContent=`${type==='easy'?'Lauf 1 · Locker':'Lauf 2 · Länger'}: ab ${displayDate(rule.fromDate)} · ${rule.paceFrom}–${rule.paceTo} min/km · Zone ${rule.zone}`;
  box.append(p);
 }
}
function previewCoachingImport(){
 const target=el('importPreview');target.replaceChildren();pendingImport=null;el('applyImport').disabled=true;
 try{
   const data=readImportedChanges(el('importText').value);pendingImport=data;
   for(const r of data.rules){
     const row=document.createElement('div');row.className='import-item';
     const title=document.createElement('strong');title.textContent=`Dauerhaft · ${r.type==='easy'?'Lauf 1 (locker)':'Lauf 2 (länger)'}`;
     const detail=document.createElement('p');detail.textContent=`Ab ${displayDate(r.fromDate)}: ${r.paceFrom}–${r.paceTo} min/km, Zone ${r.zone} · ${r.affected} zukünftige Einheiten`;
     const note=document.createElement('small');note.textContent=r.reason||'Keine Begründung angegeben';row.append(title,detail,note);target.append(row);
   }
   for(const item of data.changes){
     const row=document.createElement('div');row.className='import-item';
     const title=document.createElement('strong');title.textContent=`Einmalig · ${displayDate(item.date)} · ${item.newWorkout.title}`;
     const detail=document.createElement('p');detail.textContent=`Vorher: ${fmtKm(item.old.distanceKm)}, ${item.old.paceFrom}–${item.old.paceTo}, Zone ${item.old.zone} → Neu: ${fmtKm(item.newWorkout.distanceKm)}, ${item.newWorkout.paceFrom}–${item.newWorkout.paceTo}, Zone ${item.newWorkout.zone}`;
     const note=document.createElement('small');note.textContent=item.newWorkout.reason||'Begründung: nicht angegeben';row.append(title,detail,note);target.append(row);
   }
   el('applyImport').disabled=false;toast('Vorschau bereit – Änderungen erst nach Bestätigung aktiv');
 }catch(err){const line=document.createElement('p');line.className='error-text';line.textContent=err.message;target.append(line)}
}
function applyCoachingImport(){
 if(!pendingImport)return;
 let latest;try{latest=readImportedChanges(el('importText').value)}catch(err){toast(err.message);return}
 if(JSON.stringify(latest)!==JSON.stringify(pendingImport)){toast('Änderungen bitte erneut prüfen.');return}
 const rules=latest.rules.map(r=>{const {affected,...rest}=r;return {...rest,changedAt:new Date().toISOString()}});
 const oldRules=(state.planRules||[]).slice();
 state.planRules=[...oldRules,...rules].slice(-50);
 for(const item of latest.changes){
   const k=workoutKey(item.week,item.index),previous=state.planOverrides[k]||null;
   state.planOverrides[k]={...item.newWorkout,source:'Coaching-Import',changedAt:new Date().toISOString()};
   trainingHistory('Coaching-Import',item.week,item.index,previous,state.planOverrides[k]);
 }
 save();const count=latest.changes.length,ruleCount=latest.rules.length;
 pendingImport=null;el('importText').value='';el('importPreview').replaceChildren();el('applyImport').disabled=true;
 renderAll();toast(`${ruleCount} dauerhafte Vorgabe(n), ${count} Einzelanpassung(en) übernommen.`);
}
function resetPlanRules(){
 if(!(state.planRules||[]).length)return;
 if(!confirm('Alle dauerhaften Pace- und Pulszonen-Vorgaben entfernen? Einzelne Trainingseinheiten bleiben angepasst.'))return;
 state.planRules=[];save();renderAll();toast('Dauerhafte Vorgaben entfernt');
}
function previewGlobalPlanForm(){
 try{
  const dateEasy=firstUpcomingWorkoutDate(0),dateLong=firstUpcomingWorkoutDate(1);
  if(!dateEasy||!dateLong)throw new Error('Keine kommenden Trainingseinheiten für beide Laufarten vorhanden.');
  const zone=Number(el('globalZone').value),why=el('globalReason').value.trim();
  const rules=[{type:'easy',fromDate:dateEasy,paceFrom:el('globalEasyFrom').value.trim(),paceTo:el('globalEasyTo').value.trim(),zone,guidance:'Gesprächstest und Belastungsgefühl priorisieren; bei Bedarf langsamer laufen oder Gehpausen machen.',reason:why||'Vorgaben aus dem Training angepasst.'},
  {type:'long',fromDate:dateLong,paceFrom:el('globalLongFrom').value.trim(),paceTo:el('globalLongTo').value.trim(),zone,guidance:'Locker laufen; bei zu hohem Puls langsamer werden oder Gehpausen machen.',reason:why||'Vorgaben aus dem Training angepasst.'}];
  rules.forEach(validatePlanRule);
  el('importText').value='ROAD230_UPDATE\n'+JSON.stringify({version:2,planRules:rules,workouts:[]},null,2)+'\nEND_ROAD230_UPDATE';
  previewCoachingImport();el('importPreview').scrollIntoView({behavior:'smooth',block:'nearest'});
 }catch(e){toast(e.message)}
}
function persistTrainingDays(){
 const next={easyDay:Number(el('easyDay').value),easyTime:el('easyTime').value,longDay:Number(el('longDay').value),longTime:el('longTime').value};
 if(next.easyDay===next.longDay){toast('Bitte zwei unterschiedliche Trainingstage wählen.');return}
 state.reminders=next;save();renderAll();toast('Trainingstage und Uhrzeiten gespeichert');
}

function openEntry(){showPage('progress');el('entryCard').classList.remove('hidden');el('runDate').value=dateStr(new Date());el('entryCard').scrollIntoView({behavior:'smooth',block:'start'})}
function writeRun(e){e.preventDefault();const km=Number(el('runDistance').value),sec=Math.round(Number(el('runMinutes').value)*60),date=el('runDate').value;if(!(km>0&&km<=100&&sec>0&&sec<60000&&/^\d{4}-\d{2}-\d{2}$/.test(date))){toast('Bitte gültige Laufdaten eingeben');return}state.manual.push({id:'manual_'+Date.now()+'_'+Math.floor(Math.random()*10000),name:'Lauf',date,km,seconds:sec,hr:Number(el('runHr').value)||null,rpe:Number(el('runRpe').value)||null,note:el('runNotes').value.trim().slice(0,3000),source:'Manuell'});save();el('manualForm').reset();el('entryCard').classList.add('hidden');renderAll();toast('Lauf gespeichert!');window.scrollTo({top:0,behavior:'smooth'})}
async function copyText(text){try{await navigator.clipboard.writeText(text);toast('Kopiert – jetzt in ChatGPT einfügen')}catch{const a=document.createElement('textarea');a.value=text;document.body.append(a);a.select();document.execCommand('copy');a.remove();toast('Zusammenfassung kopiert')}}
function storeKeyFromInput(){const k=el('icuKey').value.trim();if(!k)return;if(el('rememberKey').checked){localStorage.setItem(KEY_STORE,k);sessionStorage.removeItem(KEY_STORE)}else{sessionStorage.setItem(KEY_STORE,k);localStorage.removeItem(KEY_STORE)}}
function isoWeek(d){
 const v=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));v.setUTCDate(v.getUTCDate()+4-(v.getUTCDay()||7));
 const yearStart=new Date(Date.UTC(v.getUTCFullYear(),0,1));return 1+Math.floor((v-yearStart)/604800000);
}
function weightEntries(){
 const map=new Map();for(const w of state.weights||[]){if(w&&/^\d{4}-\d{2}-\d{2}$/.test(w.date)&&Number(w.kg)>=25&&Number(w.kg)<=300)map.set(w.date,{date:w.date,kg:Number(w.kg),source:w.source||'Manuell'})}
 return [...map.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
function renderWeight(){
 const entries=weightEntries(),last=entries.at(-1);el('weightCurrent').textContent=last?formatNumber(last.kg,1)+' kg':'Noch kein Wert';
 const history=el('weightHistory');history.replaceChildren();for(const w of entries.slice(-5).reverse()){
  const span=document.createElement('span');span.className='weight-item';span.textContent=`${displayDate(w.date)} · ${formatNumber(w.kg,1)} kg`;history.append(span)
 }
 const target=el('weightChart');target.replaceChildren();
 if(!entries.length){const p=document.createElement('p');p.className='muted';p.textContent='Noch keine Gewichtswerte vorhanden.';target.append(p);return}
 const ns='http://www.w3.org/2000/svg';const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 600 180');svg.setAttribute('role','img');svg.setAttribute('aria-label','Verlauf der letzten Gewichtswerte');
 const points=entries.slice(-30),values=points.map(x=>x.kg),min=Math.floor(Math.min(...values)-1),max=Math.ceil(Math.max(...values)+1),span=Math.max(2,max-min);
 const x=i=>points.length===1?300:40+i*510/(points.length-1),y=v=>147-(v-min)/span*115;
 for(let i=0;i<=3;i++){const line=document.createElementNS(ns,'line');const yy=147-i*115/3;for(const [k,v] of Object.entries({x1:'35',x2:'565',y1:String(yy),y2:String(yy),stroke:'#294c58','stroke-width':'1'}))line.setAttribute(k,v);svg.append(line)}
 const text=document.createElementNS(ns,'text');text.setAttribute('x','38');text.setAttribute('y','17');text.setAttribute('fill','#a9becb');text.setAttribute('font-size','13');text.textContent=`${formatNumber(min,1)}–${formatNumber(max,1)} kg`;svg.append(text);
 if(points.length>1){const path=document.createElementNS(ns,'polyline');path.setAttribute('points',points.map((p,i)=>`${x(i)},${y(p.kg)}`).join(' '));path.setAttribute('fill','none');path.setAttribute('stroke','#6de0b3');path.setAttribute('stroke-width','3');path.setAttribute('stroke-linecap','round');path.setAttribute('stroke-linejoin','round');svg.append(path)}
 points.forEach((p,i)=>{const dot=document.createElementNS(ns,'circle');dot.setAttribute('cx',x(i));dot.setAttribute('cy',y(p.kg));dot.setAttribute('r','4');dot.setAttribute('fill','#b0ffdb');svg.append(dot)});
 target.append(svg);
}
function saveWeight(){const date=el('weightDate').value,kg=Number(String(el('weightValue').value).replace(',','.'));
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!(kg>=25&&kg<=300)){toast('Bitte gültiges Datum und Gewicht angeben');return}
 state.weights=state.weights.filter(w=>w.date!==date);state.weights.push({date,kg,source:'Manuell'});save();renderWeight();renderCoach();toast('Gewicht gespeichert')
}
let activeModalRun=null;
function openFeedbackModal(id){const r=allRuns().find(x=>x.id===id);if(!r)return;
 activeModalRun=id;el('modalTitle').textContent='Wie war dein Lauf?';el('modalRunSummary').textContent=`${displayDate(r.date)} · ${fmtKm(r.km)} · ${minsPerKm(r.km,r.seconds)}`;
 const f=feedbackFor(r);el('modalRpe').value=f.rpe?String(f.rpe):'';el('modalNotes').value=f.note||'';el('modalWarning').checked=!!f.warning;
 el('feedbackModal').classList.remove('hidden');document.body.classList.add('has-modal');
}
function closeFeedbackModal(dismiss=false){if(dismiss&&activeModalRun&&!state.dismissedFeedback.includes(activeModalRun)){state.dismissedFeedback.push(activeModalRun);save()}
 activeModalRun=null;el('feedbackModal').classList.add('hidden');document.body.classList.remove('has-modal')
}
function saveModalFeedback(e){e.preventDefault();if(!activeModalRun)return;
 const prior=state.feedback[activeModalRun]||{};
 state.feedback[activeModalRun]={...prior,rpe:Number(el('modalRpe').value)||null,note:el('modalNotes').value.trim().slice(0,3000),warning:el('modalWarning').checked};
 if(!state.dismissedFeedback.includes(activeModalRun))state.dismissedFeedback.push(activeModalRun);
 closeFeedbackModal(false);save();renderAll();toast('Feedback gespeichert – im Coaching-Bericht enthalten')
}
function createDetailsTable(headers,rows){const table=document.createElement('table');table.className='detail-table';const head=document.createElement('tr');for(const h of headers){const th=document.createElement('th');th.textContent=h;head.append(th)}table.append(head);for(const row of rows){const tr=document.createElement('tr');for(const v of row){const td=document.createElement('td');td.textContent=String(v);tr.append(td)}table.append(tr)}return table}
function zoneDetail(r){const d=r.detail||{},z=d.zones||state.hrZoneSettings||null,t=d.zoneTimes;
 if(!z&&!Array.isArray(t))return [];
 const limits=z?.limits||[],names=z?.names||[];
 const n=Math.max(Array.isArray(t)?t.length:0,limits.length);const total=Array.isArray(t)?t.reduce((s,x)=>s+x,0):0;
 const rows=[];for(let i=0;i<Math.min(n,10);i++){
  const lo=i===0?'':String(limits[i-1]+1||'–'),hi=limits[i]!=null?String(limits[i]):'–';
  const secs=t?.[i];rows.push([`Z${i+1}${names[i]?' · '+names[i]:''}`,i===0?`bis ${hi} bpm`:hi==='–'?`ab ${lo} bpm`:`${lo}–${hi} bpm`,Number.isFinite(secs)?`${Math.floor(secs/60)}:${String(secs%60).padStart(2,'0')} min${total?' · '+Math.round(100*secs/total)+'%':''}`:'nicht verfügbar']);
 }return rows;
}
function showRunDetails(id){const r=allRuns().find(x=>x.id===id),target=el('runDetails');if(!r)return;target.replaceChildren();target.classList.remove('hidden');const h=document.createElement('h3');h.textContent=`${displayDate(r.date)} · ${r.name||'Lauf'}`;target.append(h);
 for(const value of [`${fmtKm(r.km)}`,`${minsPerKm(r.km,r.seconds)}`,r.hr?`Ø ${r.hr} bpm`:null,r.maxHr?`Max ${r.maxHr} bpm`:null,r.elevation!=null?`↗ ${Math.round(r.elevation)} hm`:null].filter(Boolean)){
  const span=document.createElement('span');span.className='detail-chip';span.textContent=value;target.append(span)
 }
 const f=feedbackFor(r);if(f.note){const p=document.createElement('p');p.textContent=`Dein Feedback: ${f.note}`;target.append(p)}
 const zones=zoneDetail(r);if(zones.length){const h=document.createElement('h3');h.textContent='Pulszonen';target.append(h,createDetailsTable(['Zone','Pulsbereich','Zeit'],zones))}
 else{const p=document.createElement('p');p.textContent='Keine Pulszonendaten von Intervals.icu verfügbar.';target.append(p)}
 if(r.detail?.halves){const p=document.createElement('p');p.textContent=`Ø Puls in den Streckenhälften: ${r.detail.halves[0]} / ${r.detail.halves[1]} bpm`;target.append(p)}
 if(r.detail?.splits?.length){const h=document.createElement('h3');h.textContent='Kilometer-Splits';target.append(h,createDetailsTable(['Kilometer','Zeit','Ø Puls'],r.detail.splits.map(x=>[String(x.km),`${Math.floor(x.seconds/60)}:${String(x.seconds%60).padStart(2,'0')}`,x.hr?x.hr+' bpm':'–'])))}
 else{const p=document.createElement('p');p.textContent='Keine detaillierten Splits vorhanden.';target.append(p)}
 target.scrollIntoView({block:'nearest',behavior:'smooth'});
}
function detailReport(r){const d=r.detail||{},parts=[`Zusatzdaten zu ${displayDate(r.date)}:`];
 if(r.maxHr)parts.push(`Maximalpuls: ${r.maxHr} bpm.`);
 if(r.elevation!=null)parts.push(`Höhenmeter bergauf: ${Math.round(r.elevation)} m.`);
 const zones=zoneDetail(r);parts.push(zones.length?'Herzfrequenzzonen (Intervalle / Zeit): '+zones.map(x=>x.join(' / ')).join('; '):'Pulszonendaten: nicht verfügbar.');
 if(d.halves)parts.push(`Ø Puls Streckenhälften: ${d.halves[0]} → ${d.halves[1]} bpm (kein isolierter Beweis für kardiale Drift).`);
 if(d.splits?.length)parts.push('Kilometer-Splits: '+d.splits.map(x=>`km${x.km} ${Math.floor(x.seconds/60)}:${String(x.seconds%60).padStart(2,'0')} ${x.hr?x.hr+'bpm':''}`).join(' | '));
 const w=findWorkoutByDate(r.date);if(w){const planned=workoutData(w.week,w.index);parts.push(`Soll/Ist am ${r.date}: geplante Einheit ${planned.title}, ${planned.distanceKm} km, ${planned.paceFrom}–${planned.paceTo} min/km, Zone ${planned.zone}; tatsächlich ${fmtKm(r.km)}, ${minsPerKm(r.km,r.seconds)}.`)}
 return parts;
}
function init(){state.raceDate=RACE_DATE;const weekPicker=el('weekPicker');for(let i=0;i<PLAN.length;i++){const op=document.createElement('option');op.value=String(i);op.textContent=`Woche ${i+1} · ${displayDate(dateStr(addDays(START,i*7)))}`;weekPicker.append(op)}weekPicker.addEventListener('change',()=>{inspectedWeek=Number(weekPicker.value);renderPlan()});loadTrainingFields();for(const n of document.querySelectorAll('[data-tab]'))n.addEventListener('click',()=>showPage(n.dataset.tab));for(const n of document.querySelectorAll('[data-show]'))n.addEventListener('click',()=>showPage(n.dataset.show));el('syncNow').addEventListener('click',()=>syncIntervals());el('connectIcu').addEventListener('click',()=>syncIntervals());el('toggleKey').addEventListener('click',()=>{const t=el('icuKey');t.type=t.type==='password'?'text':'password';el('toggleKey').textContent=t.type==='password'?'Anzeigen':'Verbergen'});el('forgetKey').addEventListener('click',()=>{localStorage.removeItem(KEY_STORE);sessionStorage.removeItem(KEY_STORE);el('icuKey').value='';el('rememberKey').checked=false;el('syncMessage').className='message';el('syncMessage').textContent='API-Schlüssel aus diesem Browser entfernt. Bereits geladene Trainingsdaten bleiben erhalten.';updateSyncStatus(false);toast('Schlüssel entfernt')});el('downloadReminders').addEventListener('click',generateCalendar);el('addRunTop').addEventListener('click',openEntry);el('addRunInline').addEventListener('click',openEntry);el('closeEntry').addEventListener('click',()=>el('entryCard').classList.add('hidden'));el('manualForm').addEventListener('submit',writeRun);el('feedbackForm').addEventListener('submit',saveFeedback);el('closeFeedback').addEventListener('click',()=>el('feedbackCard').classList.add('hidden'));el('copyCoaching').addEventListener('click',()=>copyText(coachingText()));el('workoutEditForm').addEventListener('submit',applyManualWorkout);el('closeWorkoutEdit').addEventListener('click',closeWorkoutEditor);el('checkImport').addEventListener('click',previewCoachingImport);el('applyImport').addEventListener('click',applyCoachingImport);el('jumpCoachImport').addEventListener('click',()=>el('coachImportCard').scrollIntoView({behavior:'smooth',block:'start'}));el('makeGlobalPlan').addEventListener('click',previewGlobalPlanForm);el('clearPlanRules').addEventListener('click',resetPlanRules);el('importText').addEventListener('input',()=>{pendingImport=null;el('applyImport').disabled=true;el('importPreview').replaceChildren()});el('weightSave').addEventListener('click',saveWeight);el('weightDate').value=dateStr(new Date());el('trainingWeekFilter').addEventListener('change',()=>{el('runDetails').classList.add('hidden');renderProgress()});el('modalFeedbackForm').addEventListener('submit',saveModalFeedback);el('modalLater').addEventListener('click',()=>closeFeedbackModal());el('modalSkip').addEventListener('click',()=>closeFeedbackModal());for(const id of ['easyDay','easyTime','longDay','longTime'])el(id).addEventListener('change',persistTrainingDays);el('backupData').addEventListener('click',()=>download('sub-230-backup-'+dateStr(new Date())+'.json',JSON.stringify({app:'road230',version:'8',...state},null,2),'application/json'));el('restoreFile').addEventListener('change',async(e)=>{const f=e.target.files&&e.target.files[0];if(!f)return;try{if(f.size>5000000)throw new Error('Datei zu groß');const o=JSON.parse(await f.text());if(o.app!=='road230'||!Array.isArray(o.manual)||!Array.isArray(o.synced))throw new Error('Ungültiges Backup');if(!confirm('Aktuelle lokale Trainingsdaten durch dieses Backup ersetzen?'))return;state={...DEFAULT,...o,raceDate:RACE_DATE,training:{},planOverrides:o.planOverrides&&typeof o.planOverrides==='object'&&!Array.isArray(o.planOverrides)?o.planOverrides:{},changeLog:Array.isArray(o.changeLog)?o.changeLog.slice(-50):[],profile:{notes:typeof o.profile?.notes==='string'?o.profile.notes.slice(0,600):''},weights:Array.isArray(o.weights)?o.weights:[],dismissedFeedback:Array.isArray(o.dismissedFeedback)?o.dismissedFeedback:[],hrZoneSettings:o.hrZoneSettings||null,planRules:Array.isArray(o.planRules)?o.planRules.slice(-50):[],reminders:{...DEFAULT.reminders,...(o.reminders||{})}};save();loadReminders();loadTrainingFields();renderAll();toast('Backup importiert')}catch(e){toast('Import fehlgeschlagen: '+e.message)}e.target.value=''});el('resetData').addEventListener('click',()=>{if(!confirm('Wirklich alle lokalen Trainingsdaten löschen? API-Schlüssel bleibt gespeichert und muss separat entfernt werden.'))return;state={...DEFAULT,training:{},reminders:{...DEFAULT.reminders},planOverrides:{},changeLog:[],profile:{notes:''},weights:[],dismissedFeedback:[],hrZoneSettings:null,planRules:[]};save();loadReminders();loadTrainingFields();renderAll();toast('Lokale Trainingsdaten gelöscht')});el('rememberKey').addEventListener('change',()=>{if(el('rememberKey').checked&&getApiKey()){localStorage.setItem(KEY_STORE,getApiKey())}else{const k=localStorage.getItem(KEY_STORE);if(k)sessionStorage.setItem(KEY_STORE,k);localStorage.removeItem(KEY_STORE)}});loadReminders();const saved=localStorage.getItem(KEY_STORE),temp=sessionStorage.getItem(KEY_STORE);if(saved){el('icuKey').value=saved;el('rememberKey').checked=true}else if(temp){el('icuKey').value=temp}renderAll();if(state.lastSync)updateSyncStatus(true);if(saved)syncIntervals(false);if('serviceWorker' in navigator && location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{})}
document.addEventListener('DOMContentLoaded',init);
