import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir} from 'node:fs/promises';
import worker from '../dist/server/index.js';
const sql=new DatabaseSync(':memory:');
for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())sql.exec(await readFile('drizzle/'+file,'utf8'));
const DB={prepare(query){const st=sql.prepare(query);const bound=(args=[])=>({run:async()=>{const r=st.run(...args);return {meta:{changes:Number(r.changes)}}},first:async()=>st.get(...args)||null,all:async()=>({results:st.all(...args)})});return {...bound(),bind:(...args)=>bound(args)}}};
const content=await (await worker.fetch(new Request('https://preview.test/api/content'),{DB})).json();
assert.equal(content.posts.filter(p=>p.type==='event').length,10);
assert.equal(new Set(content.posts.map(p=>p.id)).size,10);
assert.equal(content.posts.filter(p=>Date.parse(p.end_date+':00+08:00')<Date.parse('2026-10-10T12:00:00+08:00')).length,7);
const names=new Set(content.posts.map(p=>p.image_url.split('/').pop()));
assert.equal(names.size,8);
for(const name of names){const response=await worker.fetch(new Request('https://preview.test/posters/'+name),{DB});assert.equal(response.status,200);assert.deepEqual(Buffer.from(await response.arrayBuffer()),await readFile('worker/posters/'+name))}
assert.equal((await worker.fetch(new Request('https://preview.test/posters/toString'),{DB})).status,404);
const coffee=content.posts.find(p=>p.id==='coffee-jam-2026-08-28');assert.equal(coffee.event_date,'2026-08-28T20:30');assert.equal(coffee.end_date,'2026-08-29T00:00');
const tournament=(await (await worker.fetch(new Request('https://preview.test/api/tournaments'),{DB})).json()).tournaments.find(t=>t.id==='halloween-rapid-2026-sample');assert.equal(tournament.venue,'Sideboard');assert.equal(tournament.start_at,Date.parse('2026-10-31T15:00:00+08:00'));assert.ok(tournament.details.fee.includes('Contribution-based'));
// A subsequent feed refresh must preserve an organiser's edits.
sql.prepare('UPDATE posts SET body=? WHERE id=?').run('Edited by organiser',coffee.id);
const refreshed=await (await worker.fetch(new Request('https://preview.test/api/content'),{DB})).json();assert.equal(refreshed.posts.find(p=>p.id===coffee.id).body,'Edited by organiser');
const closed=await worker.fetch(new Request('https://preview.test/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({eventId:coffee.id,name:'Test player',email:'test@example.com',consent:true})}),{DB});assert.equal(closed.status,409);
console.log('Ten unique events, all eight original posters, midnight dates, past sign-ups, organiser edits and Halloween details verified.');
