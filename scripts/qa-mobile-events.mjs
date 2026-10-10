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

await page.setViewportSize({width:390,height:844});await page.goto('https://preview.test/');await page.locator('.press-card').waitFor();
for(const width of [390,320]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await page.locator('header nav button:visible').count(),5);assert.ok(await page.locator('.featured-event').evaluate(e=>e.offsetHeight)<650)}
await page.setViewportSize({width:390,height:844});await page.locator('#upcomingShortcut').click();assert.match(await page.locator('.club-card h3').first().innerText(),/Ladies/);await page.locator('#eventNext').click();await page.waitForTimeout(500);assert.equal(await page.locator('#eventPosition').innerText(),'2 of 3');await page.locator('#eventPrev').click();await page.waitForTimeout(500);assert.equal(await page.locator('#eventPosition').innerText(),'1 of 3');await page.locator('[data-register]').first().click();await page.locator('#rsvpName').waitFor();assert.equal(await page.locator('#rsvpName').evaluate(e=>e===document.activeElement),true);await page.locator('.close-dialog').click();await page.locator('#moreNav').click();await page.locator('[data-nav-target="aboutNav"]').click();await page.locator('.founder-about').waitFor();await page.locator('#updatesNav').click();await page.locator('.featured-event').waitFor();await page.screenshot({path:'../mobile-events-improved.png',fullPage:true});await page.setViewportSize({width:1440,height:1000});assert.equal(await page.locator('#moreNav').isVisible(),false);assert.equal(await page.locator('#aboutNav').isVisible(),true);assert.deepEqual(errors,[]);console.log('Mobile event ordering, carousel, registration focus, More navigation and 320/390px layout passed');
}finally{await browser.close()}
