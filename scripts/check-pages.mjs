import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {withPagesCors,isPagesRequest} from '../worker/pages-cors.js';
const origin='https://kishelraj.github.io';
const request=(path,method='GET',headers={})=>new Request('https://example.com'+path,{method,headers:{Origin:origin,...headers}});
let response=await withPagesCors(request('/api/start','OPTIONS',{'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'}),{},()=>{throw Error('Preflight reached app')});
assert.equal(response.status,204);
assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin);
for(const path of ['/admin','/api/admin/list','/api/admin/photo']){
  assert.equal((await withPagesCors(request(path),{},()=>{throw Error('Admin exposed')})).status,403);
}
assert.equal((await withPagesCors(request('/api/start','OPTIONS',{'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization'}),{},()=>{})).status,403);
response=await withPagesCors(request('/api/content','GET',{'oai-authenticated-user-id':'owner',Cookie:'test=1'}),{},req=>{
  assert.equal(req.headers.get('oai-authenticated-user-id'),null);
  assert.equal(req.headers.get('Cookie'),null);
  return new Response('{}',{status:503});
});
assert.equal(response.status,503);
assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin);
assert.equal(response.headers.get('Access-Control-Allow-Credentials'),null);
assert.equal(isPagesRequest(new Request('https://example.com/api/start',{method:'POST',headers:{Origin:'https://evil.example'}})),false);
const html=await readFile('docs/index.html','utf8');
assert.ok(html.includes("from './chess.js'"));
assert.ok(html.includes("location.origin+location.pathname+'#event='"));
assert.ok(html.includes("credentials:'omit'"));
assert.ok(!html.includes("fetch('/api/"));
assert.ok(!html.includes('src="/chessynight-logo.png"'));
console.log('Pages paths, public API CORS, preflight, credential isolation and admin restrictions passed.');

