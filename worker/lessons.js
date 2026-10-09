import {db,json,adminRole,rolePermissions,validDate,safeImageURL} from './content.js';

function field(value,label,max,required=false){
  if(value==null&&!required)return '';
  if(typeof value!=='string'||value.trim().length>max||(required&&!value.trim())||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))throw Error('Enter a valid '+label+'.');
  return value.trim();
}
function link(value){const s=field(value,'HTTPS link',2000);if(s&&new URL(s).protocol!=='https:')throw Error('Links must start with https://.');return s}
function malaysiaTime(value){if(typeof value!=='string'||!validDate(value.slice(0,10))||!/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/.test(value))throw Error('Choose a valid lesson date and time.');return Date.parse(value+':00+08:00')}
const select=`SELECT t.*, (SELECT COUNT(*) FROM lesson_entries e WHERE e.lesson_id=t.id) AS registered FROM lessons t`;
function present(t){return {...t,details:JSON.parse(t.details),available:Math.max(0,t.capacity-t.registered),canRegister:Boolean(t.published&&t.registration_open&&t.start_at>Date.now()&&t.registered<t.capacity)}}

export async function lessonAPI(req,env,path){
  const url=new URL(req.url),database=db(env);
  if(path==='/api/lessons'&&req.method==='GET')return json({lessons:(await database.prepare(select+' WHERE t.published=1 ORDER BY t.start_at ASC').all()).results.map(present)});
  if(path==='/api/lessons/register'&&req.method==='POST'){
    let b,name,email,phone,experience;
    try{b=await req.json();name=field(b.name,'student name',80,true);email=field(b.email,'email',254,true).toLowerCase();phone=field(b.phone,'phone number',30);experience=field(b.experience,'chess experience',500,true);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||name.length<2)throw Error('Enter your name and a valid email address.');if(b.adult!==true)throw Error('These lessons are for adults aged 18 and over.');if(b.consent!==true)throw Error('Please agree to share your details with the lesson organisers.');if(typeof b.lessonId!=='string')throw Error('Choose a lesson.')}catch(e){return json({error:e.message},400)}
    // One atomic INSERT SELECT enforces capacity even when registrations arrive together.
    const now=Date.now();
    const result=await database.prepare(`INSERT OR IGNORE INTO lesson_entries (id,lesson_id,name,email,phone,experience,created)
      SELECT ?,t.id,?,?,?,?,? FROM lessons t WHERE t.id=? AND t.published=1 AND t.registration_open=1 AND t.start_at>?
      AND (SELECT COUNT(*) FROM lesson_entries e WHERE e.lesson_id=t.id)<t.capacity`).bind(crypto.randomUUID(),name,email,phone||null,experience,now,b.lessonId,now).run();
    if(!result.meta?.changes)return json({error:'Registration was not added. Places may be full, registration may have closed, or this email may already be registered. Contact the club if you need help.'},409);
    return json({message:'Your place is booked. Keep the class details below for your visit. Any lesson fee is handled by the organiser; no payment was taken here.'},201);
  }
  if(!path.startsWith('/api/admin/lesson'))return json({error:'Not found.'},404);
  const role=await adminRole(req,env);if(!role)return json({error:'Admin access required.'},403);
  const permissions=rolePermissions[role];
  if(path==='/api/admin/lessons'&&req.method==='GET')return json({lessons:(await database.prepare(select+' ORDER BY t.start_at DESC').all()).results.map(present),canEdit:permissions.includes('events'),canCheckIn:permissions.includes('registrations')});
  if(path==='/api/admin/lesson-entries'&&req.method==='GET'){
    if(!permissions.includes('registrations'))return json({error:'Your role cannot view registrations.'},403);
    return json({entries:(await database.prepare('SELECT id,name,email,phone,experience,checked_in,created FROM lesson_entries WHERE lesson_id=? ORDER BY created ASC').bind(url.searchParams.get('id')||'').all()).results});
  }
  if(req.method!=='POST')return json({error:'Method not allowed.'},405);
  if(path==='/api/admin/lesson-checkin'){
    if(!permissions.includes('registrations'))return json({error:'Your role cannot manage check-in.'},403);
    const b=await req.json();if(typeof b.id!=='string'||typeof b.checkedIn!=='boolean')return json({error:'Choose a student and check-in status.'},400);
    const result=await database.prepare('UPDATE lesson_entries SET checked_in=? WHERE id=? AND lesson_id=?').bind(b.checkedIn?Date.now():null,b.id,b.lessonId||'').run();
    return result.meta?.changes?json({message:b.checkedIn?'Student checked in.':'Check-in undone.'}):json({error:'Registration not found.'},404);
  }
  if(path!=='/api/admin/lesson')return json({error:'Not found.'},404);
  if(!permissions.includes('events'))return json({error:'Your role cannot edit lessons.'},403);
  let b,title,venue,startAt,capacity,details;
  try{
    b=await req.json();title=field(b.title,'title',120,true);venue=field(b.venue,'venue',200,true);startAt=malaysiaTime(b.start);capacity=Number(b.capacity);
    if(!Number.isInteger(capacity)||capacity<1||capacity>1000)throw Error('Capacity must be between 1 and 1,000.');
    const d=b.details||{};details={classPhoto:field(d.classPhoto,'class photo',2000),provisional:d.provisional===true,fee:field(d.fee,'lesson fee',120,true),teacher:field(d.teacher,'teacher name',120,true),teacherBio:field(d.teacherBio,'teacher introduction',1500),teacherPhoto:field(d.teacherPhoto,'teacher photo',2000),level:field(d.level,'level',30,true),duration:Number(d.duration),outcomes:field(d.outcomes,'learning outcomes',2000,true),outline:field(d.outline,'lesson outline',3000),prerequisites:field(d.prerequisites,'prerequisites',1000),bring:field(d.bring,'what to bring',1000),map:link(d.map)};
    if(!['Beginner','Intermediate','Advanced'].includes(details.level))throw Error('Choose a class level.');
    if(!Number.isInteger(details.duration)||details.duration<15||details.duration>480)throw Error('Duration must be 15–480 minutes.');
    if(details.classPhoto&&!safeImageURL(details.classPhoto))throw Error('Use an uploaded photo or HTTPS image URL.');
    if(details.teacherPhoto&&!safeImageURL(details.teacherPhoto))throw Error('Use an uploaded photo or HTTPS image URL.');
    if(b.id&&(!/^[a-zA-Z0-9-]{1,80}$/.test(b.id)))throw Error('Invalid lesson.');
  }catch(e){return json({error:e.message},400)}
  const id=b.id||crypto.randomUUID();
  // Preserve existing registrations and refuse to shrink capacity below their count.
  const result=await database.prepare(`INSERT INTO lessons (id,title,start_at,venue,capacity,published,registration_open,details,updated)
    SELECT ?,?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM lesson_entries WHERE lesson_id=?)<=?
    ON CONFLICT(id) DO UPDATE SET title=excluded.title,start_at=excluded.start_at,venue=excluded.venue,capacity=excluded.capacity,published=excluded.published,registration_open=excluded.registration_open,details=excluded.details,updated=excluded.updated`).bind(id,title,startAt,venue,capacity,b.published===true?1:0,b.registrationOpen===true?1:0,JSON.stringify(details),Date.now(),id,capacity).run();
  return result.meta?.changes?json({id,message:b.published?'Lesson published.':'Draft saved.'}):json({error:'Capacity cannot be smaller than the number of registered students.'},409);
}
