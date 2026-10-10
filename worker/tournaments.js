import {db,json,adminRole,rolePermissions,validDate,safeImageURL} from './content.js';

function field(value,label,max,required=false){
  if(value==null&&!required)return '';
  if(typeof value!=='string'||value.trim().length>max||(required&&!value.trim())||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))throw Error('Enter a valid '+label+'.');
  return value.trim();
}
function link(value){const s=field(value,'HTTPS link',2000);if(s&&new URL(s).protocol!=='https:')throw Error('Links must start with https://.');return s}
function malaysiaTime(value){if(typeof value!=='string'||!validDate(value.slice(0,10))||!/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/.test(value))throw Error('Choose a valid tournament date and time.');return Date.parse(value+':00+08:00')}
const select=`SELECT t.*, (SELECT COUNT(*) FROM tournament_entries e WHERE e.tournament_id=t.id) AS registered FROM tournaments t`;
async function seedHalloween(database){
  await database.prepare('INSERT OR IGNORE INTO tournaments (id,title,start_at,venue,capacity,published,registration_open,details,updated) VALUES (?,?,?,?,?,?,?,?,?)').bind('halloween-rapid-2026-sample','Halloween Rapid',Date.parse('2026-10-31T15:00:00+08:00'),'Sideboard',32,1,1,JSON.stringify({fee:'Contribution-based entry; minimum purchase of one drink or meal',format:'Swiss (proposed)',timeControl:'10+5 (proposed)',rounds:5,checkIn:null,eligibility:'All levels welcome (proposed)',rules:'The October poster advertises 31 October, 3pm–midnight, at Sideboard. Exact first-round and check-in times, format and prizes are to be confirmed. The listed Swiss format, rounds and time control remain provisional. Check this page for final playing details.',prizes:'To be confirmed',map:'',pairings:'',results:''}),Date.now()).run();
}
function present(t){const details=JSON.parse(t.details);return {...t,details,available:Math.max(0,t.capacity-t.registered),canRegister:Boolean(t.published&&t.registration_open&&t.start_at>Date.now()&&t.registered<t.capacity&&!details.manuallyFull&&(!details.registrationOpens||details.registrationOpens<=Date.now()))}}

export async function tournamentAPI(req,env,path){
  const url=new URL(req.url),database=db(env);
  if(req.method==='GET'&&(path==='/api/tournaments'||path==='/api/admin/tournaments'))await seedHalloween(database);
  if(path==='/api/tournaments'&&req.method==='GET')return json({tournaments:(await database.prepare(select+' WHERE t.published=1 ORDER BY t.start_at ASC').all()).results.map(present)});
  if(path==='/api/tournaments/register'&&req.method==='POST'){
    let b,name,email,phone,rating;
    try{b=await req.json();name=field(b.name,'player name',80,true);email=field(b.email,'email',254,true).toLowerCase();phone=field(b.phone,'phone number',30);rating=b.rating===''||b.rating==null?null:Number(b.rating);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||name.length<2)throw Error('Enter your name and a valid email address.');if(rating!==null&&(!Number.isInteger(rating)||rating<0||rating>3500))throw Error('Enter a rating between 0 and 3500, or leave it blank.');if(b.consent!==true)throw Error('Please agree to share your details with the tournament organisers.');if(typeof b.tournamentId!=='string')throw Error('Choose a tournament.')}catch(e){return json({error:e.message},400)}
    // One atomic INSERT SELECT enforces capacity even when registrations arrive together.
    const now=Date.now();
    const result=await database.prepare(`INSERT OR IGNORE INTO tournament_entries (id,tournament_id,name,email,phone,rating,created)
      SELECT ?,t.id,?,?,?,?,? FROM tournaments t WHERE t.id=? AND t.published=1 AND t.registration_open=1 AND t.start_at>?
      AND COALESCE(json_extract(t.details,'$.manuallyFull'),0)=0 AND COALESCE(json_extract(t.details,'$.registrationOpens'),0)<=?
      AND (SELECT COUNT(*) FROM tournament_entries e WHERE e.tournament_id=t.id)<t.capacity`).bind(crypto.randomUUID(),name,email,phone||null,rating,now,b.tournamentId,now,now).run();
    if(!result.meta?.changes)return json({error:'Registration was not added. Places may be full, registration may have closed, or this email may already be registered. Contact the club if you need help.'},409);
    return json({message:'Your place is registered. Please arrive at the listed check-in time. Any entry fee is handled by the organiser; no payment was taken here.'},201);
  }
  if(!path.startsWith('/api/admin/tournament'))return json({error:'Not found.'},404);
  const role=await adminRole(req,env);if(!role)return json({error:'Admin access required.'},403);
  const permissions=rolePermissions[role];
  if(path==='/api/admin/tournaments'&&req.method==='GET')return json({tournaments:(await database.prepare(select+' ORDER BY t.start_at DESC').all()).results.map(present),canEdit:permissions.includes('events'),canCheckIn:permissions.includes('registrations')});
  if(path==='/api/admin/tournament-entries'&&req.method==='GET'){
    if(!permissions.includes('registrations'))return json({error:'Your role cannot view registrations.'},403);
    return json({entries:(await database.prepare('SELECT id,name,email,phone,rating,checked_in,created FROM tournament_entries WHERE tournament_id=? ORDER BY created ASC').bind(url.searchParams.get('id')||'').all()).results});
  }
  if(req.method!=='POST')return json({error:'Method not allowed.'},405);
  if(path==='/api/admin/tournament-checkin'){
    if(!permissions.includes('registrations'))return json({error:'Your role cannot manage check-in.'},403);
    const b=await req.json();if(typeof b.id!=='string'||typeof b.checkedIn!=='boolean')return json({error:'Choose a player and check-in status.'},400);
    const result=await database.prepare('UPDATE tournament_entries SET checked_in=? WHERE id=? AND tournament_id=?').bind(b.checkedIn?Date.now():null,b.id,b.tournamentId||'').run();
    return result.meta?.changes?json({message:b.checkedIn?'Player checked in.':'Check-in undone.'}):json({error:'Registration not found.'},404);
  }
  if(path!=='/api/admin/tournament')return json({error:'Not found.'},404);
  if(!permissions.includes('events'))return json({error:'Your role cannot edit tournaments.'},403);
  let b,title,venue,startAt,capacity,details;
  try{
    b=await req.json();title=field(b.title,'title',120,true);venue=field(b.venue,'venue',200,true);startAt=malaysiaTime(b.start);capacity=Number(b.capacity);
    if(!Number.isInteger(capacity)||capacity<1||capacity>1000)throw Error('Capacity must be between 1 and 1,000.');
    const d=b.details||{};details={fee:field(d.fee,'entry fee',120,true),format:field(d.format,'format',120,true),timeControl:field(d.timeControl,'time control',120,true),rounds:Number(d.rounds),checkIn:d.checkIn?malaysiaTime(d.checkIn):null,eligibility:field(d.eligibility,'eligibility',500),rules:field(d.rules,'rules',5000),prizes:field(d.prizes,'prizes',1000),map:link(d.map),pairings:link(d.pairings),results:link(d.results)};
    details.manuallyFull=d.manuallyFull===true;details.registrationOpens=d.registrationOpens?malaysiaTime(d.registrationOpens):null;if(details.registrationOpens&&details.registrationOpens>=startAt)throw Error('Registration must open before the tournament starts.');
    details.winner=field(d.winner,'winner name',120);details.runnerUp=field(d.runnerUp,'runner-up name',120);details.thirdPlace=field(d.thirdPlace,'third-place name',120);details.news=field(d.news,'tournament news',3000);
    if(d.photos!==undefined&&!Array.isArray(d.photos))throw Error('Choose up to eight tournament photos.');
    details.photos=(d.photos||[]).map(p=>{if(!p||!safeImageURL(p.url))throw Error('Use an uploaded photo or HTTPS image URL.');return {url:p.url,caption:field(p.caption,'photo caption',200)}});
    if(details.photos.length>8)throw Error('Choose up to eight tournament photos.');
    if(!Number.isInteger(details.rounds)||details.rounds<1||details.rounds>30)throw Error('Enter between 1 and 30 rounds.');
    if(details.checkIn&&details.checkIn>startAt)throw Error('Check-in must be at or before the first round.');
    if(b.id&&(!/^[a-zA-Z0-9-]{1,80}$/.test(b.id)))throw Error('Invalid tournament.');
  }catch(e){return json({error:e.message},400)}
  const id=b.id||crypto.randomUUID();
  // Preserve existing registrations and refuse to shrink capacity below their count.
  const result=await database.prepare(`INSERT INTO tournaments (id,title,start_at,venue,capacity,published,registration_open,details,updated)
    SELECT ?,?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM tournament_entries WHERE tournament_id=?)<=?
    ON CONFLICT(id) DO UPDATE SET title=excluded.title,start_at=excluded.start_at,venue=excluded.venue,capacity=excluded.capacity,published=excluded.published,registration_open=excluded.registration_open,details=excluded.details,updated=excluded.updated`).bind(id,title,startAt,venue,capacity,b.published===true?1:0,b.registrationOpen===true?1:0,JSON.stringify(details),Date.now(),id,capacity).run();
  return result.meta?.changes?json({id,message:b.published?'Tournament published.':'Draft saved.'}):json({error:'Capacity cannot be smaller than the number of registered players.'},409);
}
