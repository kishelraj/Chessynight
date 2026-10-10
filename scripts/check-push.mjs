import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir} from 'node:fs/promises';
import {generateKeyPairSync} from 'node:crypto';
import assert from 'node:assert/strict';
import worker from '../dist/server/index.js';
const sql=new DatabaseSync(':memory:');for(const name of (await readdir('drizzle')).filter(n=>n.endsWith('.sql')).sort())sql.exec(await readFile('drizzle/'+name,'utf8'));
const DB={prepare(query){const st=sql.prepare(query);const bound=(args=[])=>({run:async()=>{const r=st.run(...args);return {meta:{changes:Number(r.changes)}}},first:async()=>st.get(...args)||null,all:async()=>({results:st.all(...args)})});return {...bound(),bind:(...args)=>bound(args)}}};
const key=generateKeyPairSync('ec',{namedCurve:'prime256v1'}).privateKey.export({format:'jwk'});const env={DB,PUSH_PRIVATE_KEY:key.d,PUSH_PUBLIC_KEY:Buffer.concat([Buffer.from([4]),Buffer.from(key.x,'base64url'),Buffer.from(key.y,'base64url')]).toString('base64url')};
const headers={'oai-authenticated-user-id':'owner','oai-authenticated-user-email':'kishelraj@gmail.com'};
const call=(path,body,extra={})=>worker.fetch(new Request('https://club.test'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...extra},body:body?JSON.stringify(body):undefined}),env);
assert.equal((await call('/api/admin/push',{title:'Hello',body:'Club news'})).status,403);
assert.equal((await call('/api/push/subscribe',{endpoint:'https://localhost/private'})).status,400);
const endpoint='https://fcm.googleapis.com/fcm/send/test-token';assert.equal((await call('/api/push/subscribe',{endpoint},{Origin:'https://kishelraj.github.io'})).status,200);await call('/api/push/subscribe',{endpoint});assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM push_subscriptions').get().n,1);
assert.equal((await call('/api/admin/push',{title:'Hello',body:'Club news',url:'https://evil.test'},headers)).status,400);
const original=globalThis.fetch;globalThis.fetch=async(url,options)=>{assert.equal(url,endpoint);assert.equal(options.body,undefined);const jwt=options.headers.Authorization.match(/vapid t=([^,]+)/)[1];const [head,payload,signature]=jwt.split('.');const claims=JSON.parse(Buffer.from(payload,'base64url'));assert.equal(claims.aud,'https://fcm.googleapis.com');const publicKey=await crypto.subtle.importKey('jwk',{...key,d:undefined},{name:'ECDSA',namedCurve:'P-256'},false,['verify']);assert(await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},publicKey,Buffer.from(signature,'base64url'),new TextEncoder().encode(head+'.'+payload)));return new Response(null,{status:201})};
try{const response=await call('/api/admin/push',{title:'New night',body:'Join the club'},headers);assert.equal(response.status,200);assert.equal((await response.json()).sent,1);assert.equal((await (await call('/api/push/latest',null,{Origin:'https://kishelraj.github.io'})).json()).title,'New night');assert.equal((await call('/api/admin/push',{title:'Again',body:'News'},headers)).status,429)}finally{globalThis.fetch=original}
for(const path of ['/sw.js','/manifest.webmanifest','/app-icon-192.png','/app-icon-512.png'])assert.equal((await call(path)).status,200);
const config=await (await call('/api/push/config')).json();assert.deepEqual(Object.keys(config),['publicKey']);
console.log('Push subscriptions, endpoint restrictions, owner access, signed delivery, public alerts, send cooldown, manifest and app assets passed.');
