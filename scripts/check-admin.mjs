import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {readFile,readdir,writeFile} from 'node:fs/promises';
const module=(await import('data:text/javascript;base64,'+Buffer.from(await readFile('dist/server/index.js','utf8')).toString('base64'))).default;
const sql=new DatabaseSync(':memory:');for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())sql.exec(await readFile('drizzle/'+file,'utf8'));
const DB={prepare(s){return {bind(...a){const st=sql.prepare(s);return {run:async()=>{const r=st.run(...a);return {meta:{changes:Number(r.changes)}}},first:async()=>st.get(...a)||null,all:async()=>({results:st.all(...a)})}},all:async()=>({results:sql.prepare(s).all()})}}};
async function call(path,body,admin=false,extra={}){const req=new Request('https://example.com'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(admin?{'oai-authenticated-user-id':'owner','oai-authenticated-user-email':'kishelraj@gmail.com'}:{}),...extra},body:body?JSON.stringify(body):undefined});const r=await module.fetch(req,{DB});return {status:r.status,...(r.headers.get('Content-Type')?.includes('json')?await r.json():{text:await r.text(),location:r.headers.get('Location')})}}
assert.equal((await call('/admin')).status,302);assert.equal((await call('/api/admin/list')).status,403);assert.equal((await call('/admin',null,true)).status,200);assert.equal((await call('/api/admin/list',null,false,{'oai-authenticated-user-id':'other','oai-authenticated-user-email':'other@example.com'})).status,403);
const content=await call('/api/content');assert.equal(content.set.count,50);assert.equal(content.set.title,'Advanced');const date=content.today;
const puzzle={title:'Back rank',fen:'6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',solution:['e1e8']};
assert.equal((await call('/api/admin/set',{title:'Invalid',date,puzzles:[{...puzzle,solution:['a1a8']}]},true)).status,400);
assert.equal((await call('/api/admin/set',{title:'Cross origin',date,puzzles:[puzzle]},true,{Origin:'https://evil.example'})).status,403);
let set=await call('/api/admin/set',{title:'Daily test',date,published:false,puzzles:[puzzle]},true);assert.equal((await call('/api/content')).set.id,'woodpecker-puzzles');
await call('/api/admin/set',{id:set.id,title:'Daily test',date,published:true,puzzles:[puzzle]},true);assert.equal((await call('/api/content')).set.id,set.id);
await call('/api/admin/set',{title:'Future',date:'2099-01-01',published:true,puzzles:[puzzle]},true);assert.equal((await call('/api/content')).sets.length,3);
const run=await call('/api/start',{nickname:'Tester',challenge:set.id});assert.equal(run.puzzles[0].solution,undefined);
// Editing a set must not rewrite an in-progress puzzle.
await call('/api/admin/set',{id:set.id,title:'Daily revised',date,published:false,puzzles:[{title:'Queen',fen:'7k/6pp/5KQ1/8/8/8/8/8 w - - 0 1',solution:['g6g7']}]},true);
assert.equal((await call('/api/finish',{id:run.id})).status,400);
let move=await call('/api/move',{id:run.id,index:0,move:'e1e8',request:'request-one'});assert.equal(move.score,100);assert.equal(move.solved,true);assert.equal((await call('/api/move',{id:run.id,index:0,move:'e1e8',request:'request-one'})).score,100);
let result=await call('/api/finish',{id:run.id});assert.equal(result.score,100);assert.equal((await call('/api/finish',{id:run.id})).score,100);
const multi={title:'Opening tactic',fen:'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',solution:['e2e4','e7e5','g1f3']};
const mset=await call('/api/admin/set',{title:'Multi',date,published:true,puzzles:[multi]},true);const mr=await call('/api/start',{nickname:'Multi tester',challenge:mset.id});const first=await call('/api/move',{id:mr.id,index:0,move:'e2e4',request:'multi1'});assert.equal(first.done,false);assert.ok(first.fen.includes('4p3'));assert.equal((await call('/api/move',{id:mr.id,index:0,move:'g1f3',request:'multi2'})).solved,true);
let skip=await call('/api/start',{nickname:'Skip',challenge:mset.id});assert.equal((await call('/api/move',{id:skip.id,index:0,skip:true})).failed,true);assert.equal((await call('/api/finish',{id:skip.id})).score,0);
assert.equal((await call('/api/leaderboard?challenge='+mset.id)).rows.length,1); // Multi not finished; only Skip is ranked.
const post=await call('/api/admin/post',{type:'event',title:'Club night',body:'Come play!',date,eventDate:date+'T19:30',venue:'PJ',link:'https://example.com/event',published:true},true);assert.equal(post.status,200);assert.equal((await call('/api/content')).posts.length,content.posts.length+1);
assert.equal((await call('/api/admin/post',{type:'news',title:'Bad link',body:'Test',date,link:'javascript:alert(1)',published:true},true)).status,400);
await call('/api/admin/post',{id:post.id,type:'event',title:'Club night',body:'Draft',date,eventDate:date+'T19:30',published:false},true);assert.equal((await call('/api/content')).posts.length,content.posts.length);
for(const [file,target] of [['page.html','public'],['admin.html','admin']]){const html=await readFile('worker/'+file,'utf8');const {tmpdir}=await import('node:os');const {join}=await import('node:path');await writeFile(join(tmpdir(),'chess-'+target+'.mjs'),html.split('<script type="module">')[1].split('</script>')[0])}
console.log('Owner authorization, drafts, scheduled releases, validation, immutable attempts, multi-move puzzles, safe retries, leaderboards, and event publishing passed.');

// Native event registration must remain private, deduplicated and date gated.
const featured=(await call('/api/content')).posts.find(p=>p.id==='subak-2026-10-09');assert.equal(featured.image_url,'https://chessy-night.kishelraj.chatgpt.site/posters/subak.jpg');assert.equal(featured.end_date,'2026-10-10T00:00');
const upcoming=await call('/api/admin/post',{type:'event',title:'Upcoming signup test',body:'An event',date,eventDate:'2099-10-09T19:30',endDate:'2099-10-09T22:00',venue:'PJ',imageUrl:'https://example.com/poster.jpg',published:true},true);
const signup={eventId:upcoming.id,name:'Chess Player',email:'player@example.com',consent:true};
assert.equal((await call('/api/register',{...signup,consent:false})).status,400);
assert.equal((await call('/api/register',{...signup,email:'bad-email'})).status,400);
assert.equal((await call('/api/register',signup)).status,200);assert.equal((await call('/api/register',signup)).status,200);
assert.equal((await call('/api/admin/registrations?event='+upcoming.id)).status,403);
const attendees=await call('/api/admin/registrations?event='+upcoming.id,null,true);assert.equal(attendees.rows.length,1);assert.equal(attendees.rows[0].email,'player@example.com');
const closed=await call('/api/admin/post',{type:'event',title:'Past signup test',body:'Past event',date,eventDate:'2020-10-09T19:30',venue:'PJ',published:true},true);
assert.equal((await call('/api/register',{...signup,eventId:closed.id})).status,409);
assert.equal((await call('/api/admin/post',{type:'event',title:'Bad image',body:'Event',date,eventDate:'2099-10-09T19:30',imageUrl:'javascript:alert(1)',published:true},true)).status,400);
assert.equal((await call('/api/admin/post',{type:'event',title:'Bad time',body:'Event',date,eventDate:'2099-10-09T19:30',endDate:'2099-10-09T18:00',published:true},true)).status,400);
assert.equal((await call('/api/register',{...signup,eventId:'nonexistent'})).status,404);
assert.equal((await call('/api/content')).posts.some(p=>'email' in p||'registrations' in p),false);
const poster=await module.fetch(new Request('https://example.com/club-poster.webp'),{DB});assert.equal(poster.status,200);assert.equal(poster.headers.get('Content-Type'),'image/webp');assert.ok((await poster.arrayBuffer()).byteLength>10000);
const html=await readFile('worker/page.html','utf8');assert.ok(html.indexOf('id="updatesNav"')<html.indexOf('id="playNav"'));assert.ok(html.includes("onclick=updates;updates();"));
console.log('Featured event, private sign-ups, duplicate prevention, closed-event checks and news-first navigation passed.');
// Photo uploads are owner-only, persisted separately and served as images.
const storedPhotos=new Map();const PHOTOS={async put(key,bytes){storedPhotos.set(key,new Uint8Array(bytes))},async get(key){const bytes=storedPhotos.get(key);return bytes?{body:bytes}:null}};
async function photoCall(path,body,admin=false){const r=await module.fetch(new Request('https://example.com'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(admin?{'oai-authenticated-user-id':'owner','oai-authenticated-user-email':'kishelraj@gmail.com'}:{})},body:body?JSON.stringify(body):undefined}),{DB,PHOTOS});return {status:r.status,...await r.json()}}
const encoded=(await readFile('worker/subak-poster.webp')).toString('base64');
assert.equal((await photoCall('/api/admin/photo',{data:encoded})).status,403);
assert.equal((await photoCall('/api/admin/photo',{data:btoa('<svg>bad</svg>')},true)).status,400);
const upload=await photoCall('/api/admin/photo',{data:encoded},true);assert.equal(upload.status,200);assert.match(upload.url,/^\/media\/[a-f0-9-]{36}\.webp$/);
const served=await module.fetch(new Request('https://example.com'+upload.url),{DB,PHOTOS});assert.equal(served.status,200);assert.equal(served.headers.get('Content-Type'),'image/webp');assert.deepEqual(Buffer.from(await served.arrayBuffer()),await readFile('worker/subak-poster.webp'));
assert.equal((await module.fetch(new Request('https://example.com/media/nope.webp'),{DB,PHOTOS})).status,404);
const details={fee:'RM 10',format:'Casual games',levels:'All levels',equipment:'Bring a board',arrival:'Ask at the counter',map:'https://maps.google.com/'};
const photos=[{url:upload.url,caption:'Club night'}];
const detailed=await call('/api/admin/post',{type:'event',title:'Event information test',body:'Test',date,eventDate:'2099-10-09T19:30',venue:'PJ',published:true,details,photos},true);assert.equal(detailed.status,200);
const savedPost=(await call('/api/content')).posts.find(p=>p.id===detailed.id);assert.deepEqual(JSON.parse(savedPost.details),details);assert.deepEqual(JSON.parse(savedPost.photos),photos);
assert.equal((await call('/api/admin/post',{type:'event',title:'Unsafe photo',body:'Test',date,eventDate:'2099-10-09T19:30',photos:[{url:'javascript:alert(1)',caption:'bad'}]},true)).status,400);
assert.equal((await call('/api/admin/post',{type:'event',title:'Unsafe map',body:'Test',date,eventDate:'2099-10-09T19:30',details:{map:'javascript:alert(1)'}},true)).status,400);
assert.ok(html.includes('beginnerWelcome()+'));assert.ok(html.includes('photoGallery(content.posts)'));
console.log('Event information, beginner section, image upload authorization, photo storage and safe galleries passed.');






