import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir} from 'node:fs/promises';
import worker from '../dist/server/index.js';
const sql=new DatabaseSync(':memory:');
for(const f of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())sql.exec(await readFile('drizzle/'+f,'utf8'));
const DB={prepare(query){const st=sql.prepare(query);const bound=(args=[])=>({run:async()=>{const r=st.run(...args);return {meta:{changes:Number(r.changes)}}},first:async()=>st.get(...args)||null,all:async()=>({results:st.all(...args)})});return {...bound(),bind:(...args)=>bound(args)}}};
async function call(path,body,role='public',origin){const headers={'Content-Type':'application/json'};if(role!=='public'){headers['oai-authenticated-user-id']=role;headers['oai-authenticated-user-email']=role==='owner'?'kishelraj@gmail.com':role+'@example.com'}if(origin)headers.Origin=origin;const response=await worker.fetch(new Request('https://example.com'+path,{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined}),{DB});return {status:response.status,data:response.headers.get('Content-Type')?.includes('json')?await response.json():await response.text(),headers:response.headers}}
await call('/api/content');
for(const role of ['events','puzzles','viewer'])await call('/api/admin/user',{username:role,email:role+'@example.com',role},'owner');
const draft={title:'Test rapid',venue:'Test venue',start:'2099-01-01T10:00',capacity:2,published:false,registrationOpen:true,details:{fee:'Free',teacher:'Test teacher',teacherBio:'Teaching bio',level:'Beginner',duration:90,outcomes:'Learn the rules'}};
assert.equal((await call('/api/admin/lesson',draft)).status,403);
assert.equal((await call('/api/admin/lesson',draft,'puzzles')).status,403);
assert.equal((await call('/api/admin/lesson',{...draft,details:{...draft.details,map:'javascript:alert(1)'}},'events')).status,400);
const created=await call('/api/admin/lesson',draft,'events');assert.equal(created.status,200);draft.id=created.data.id;
assert.equal((await call('/api/lessons')).data.lessons.some(t=>t.id===draft.id),false);
const entry={lessonId:draft.id,name:'Test Player',email:'test@example.com',consent:true,adult:true,experience:'Beginner'};
assert.equal((await call('/api/lessons/register',entry)).status,409);
draft.published=true;assert.equal((await call('/api/admin/lesson',draft,'events')).status,200);
assert.equal((await call('/api/lessons/register',{...entry,consent:false})).status,400);
assert.equal((await call('/api/lessons/register',{...entry,adult:false})).status,400);
assert.equal((await call('/api/lessons/register',entry,'public','https://evil.example')).status,403);
const registered=await call('/api/lessons/register',entry,'public','https://kishelraj.github.io');assert.equal(registered.status,201);assert.equal(registered.headers.get('Access-Control-Allow-Origin'),'https://kishelraj.github.io');
assert.equal((await call('/api/lessons/register',{...entry,email:'TEST@example.com'})).status,409);
// Contending for the final place must admit exactly one player.
const final=await Promise.all(['two','three'].map(n=>call('/api/lessons/register',{...entry,email:n+'@example.com'})));assert.deepEqual(final.map(r=>r.status).sort(),[201,409]);
const publicData=(await call('/api/lessons')).data;assert.equal(publicData.lessons.find(t=>t.id===draft.id).available,0);assert.equal(publicData.lessons.find(t=>t.id===draft.id).canRegister,false);assert.ok(!JSON.stringify(publicData).includes('test@example.com'));
assert.equal((await call('/api/admin/lesson',{...draft,capacity:1},'events')).status,409);
assert.equal((await call('/api/admin/lesson-entries?id='+draft.id,null,'viewer')).status,403);
const entrants=(await call('/api/admin/lesson-entries?id='+draft.id,null,'events')).data.entries;assert.equal(entrants.length,2);
const check={id:entrants[0].id,lessonId:draft.id,checkedIn:true};assert.equal((await call('/api/admin/lesson-checkin',check,'puzzles')).status,403);
assert.equal((await call('/api/admin/lesson-checkin',check,'events')).status,200);assert.ok((await call('/api/admin/lesson-entries?id='+draft.id,null,'events')).data.entries[0].checked_in);
assert.equal((await call('/api/admin/lesson-checkin',{...check,checkedIn:false},'events')).status,200);
assert.equal((await call('/api/admin/lesson-entries?id='+draft.id,null,'owner','https://kishelraj.github.io')).status,403);
await call('/api/admin/lesson',{...draft,capacity:10,registrationOpen:false},'events');assert.equal((await call('/api/lessons/register',{...entry,email:'closed@example.com'})).status,409);
await call('/api/admin/lesson',{...draft,capacity:10,start:'2020-01-01T10:00',details:{...draft.details,checkIn:''}},'events');assert.equal((await call('/api/lessons/register',{...entry,email:'past@example.com'})).status,409);
console.log('Lesson publishing, privacy, role enforcement, duplicate/capacity protection, closing rules, Pages CORS and check-in passed.');

