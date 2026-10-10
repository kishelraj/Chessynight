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
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const route=async r=>{const req=r.request();const response=await worker.fetch(new Request(req.url(),{method:req.method(),headers:req.headers()}),{DB});await r.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())})};
  await page.route('https://preview.test/**',route);await page.route('https://chessy-night.kishelraj.chatgpt.site/posters/**',route);
  await page.goto('https://preview.test/');await page.locator('.club-card').first().waitFor();assert.equal(await page.locator('.club-card').count(),9);
  await page.locator('[data-filter=past]').click();assert.equal(await page.locator('.club-card').count(),7);
  await page.locator('[data-open="coffee-jam-2026-08-28"]').first().click();await page.locator('#postDialog').waitFor();assert.equal(await page.locator('#rsvpForm').count(),0);await page.getByRole('button',{name:'Close event details'}).click();
  await page.locator('[data-filter=upcoming]').click();assert.equal(await page.locator('.club-card').count(),3);
  for(const width of [1440,390]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);if(width===390){assert.equal(await page.locator('#clubPosts').evaluate(el=>el.scrollWidth>el.clientWidth),true);await page.locator('#clubPosts').evaluate(el=>el.scrollLeft=el.clientWidth);await page.waitForTimeout(350);assert.equal(await page.locator('#clubPosts').evaluate(el=>el.scrollLeft>0),true)}await page.screenshot({path:'../poster-events-'+width+'.png',fullPage:true})}
  await page.goto('https://preview.test/?tournament=halloween-rapid-2026-sample');await page.getByRole('heading',{name:'Halloween Rapid',exact:true}).waitFor();await page.locator('#playerName').waitFor();
  await page.goto('https://preview.test/');await page.locator('.club-card').first().waitFor();await page.locator('.club-card img').evaluateAll(imgs=>imgs.forEach(img=>img.loading='eager'));
  await page.waitForFunction(()=>[...document.querySelectorAll('.club-card img')].every(img=>img.complete&&img.naturalWidth>0));
  assert.deepEqual(errors,[]);console.log('Browser: all ten events, past/upcoming filters, poster images, closed past events, tournament registration link and mobile/desktop layouts passed.');
}finally{await browser.close()}
