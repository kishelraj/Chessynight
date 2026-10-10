import {createRequire} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import worker from '../dist/server/index.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const sql=new DatabaseSync(':memory:');for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())sql.exec(await readFile('drizzle/'+file,'utf8'));
const DB={prepare(query){const st=sql.prepare(query);const bound=(args=[])=>({run:async()=>{const r=st.run(...args);return {meta:{changes:Number(r.changes)}}},first:async()=>st.get(...args)||null,all:async()=>({results:st.all(...args)})});return {...bound(),bind:(...args)=>bound(args)}}};
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const route=async r=>{const req=r.request(),response=await worker.fetch(new Request(req.url(),{method:req.method(),headers:req.headers()}),{DB});await r.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())})};
  await page.route('https://preview.test/**',route);await page.route('https://chessy-night.kishelraj.chatgpt.site/posters/**',route);

  await page.setViewportSize({width:390,height:844});
  await page.goto('https://preview.test/');
  const mobile=await page.locator('header nav button:visible').allTextContents();
  assert.deepEqual(mobile,['Events','Play','Leaderboard','Tourney','Lessons','More']);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.locator('#rankNav').click();
  assert.equal(await page.locator('h1').innerText(),'The leaderboard.');
  assert.equal(await page.locator('.eyebrow').first().innerText(),'CLUB LEADERBOARD');
  await page.locator('#moreNav').click();
  assert.deepEqual(await page.locator('#moreMenu [data-nav-target]').allTextContents(),['◎ About','↗ Contact']);
  await page.locator('#closeMore').click();

  await page.setViewportSize({width:1440,height:900});
  await page.locator('#adminLink').evaluate(el=>el.classList.remove('hidden'));
  const desktop=await page.locator('header nav > button:visible, header nav > a:visible').allTextContents();
  assert.deepEqual(desktop,['Events','Play','Leaderboard','Tourney','About','Contact','Admin']);
  assert.equal(await page.locator('#lessonsNav').isVisible(),false);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);
  console.log('Mobile and desktop navigation labels, order, visibility and leaderboard title passed.');
}finally{await browser.close()}

