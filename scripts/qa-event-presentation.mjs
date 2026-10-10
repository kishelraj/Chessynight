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

  for(const width of [320,390,760,1440]){
    await page.setViewportSize({width,height:900});
    await page.goto('https://preview.test/');
    await page.locator('.featured-event').waitFor();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.equal(await page.locator('.feature-poster').evaluate(e=>getComputedStyle(e).objectFit),'contain');
    await page.locator('[data-filter="upcoming"]').click();
    await page.locator('.club-feed').scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.locator('.club-card img').evaluateAll(es=>Promise.all(es.map(e=>{e.loading='eager';return e.decode().catch(()=>{})})));
    assert.equal(await page.locator('.club-card img').evaluateAll(es=>es.every(e=>getComputedStyle(e).objectFit==='contain')),true);
    if(width===390)await page.screenshot({path:'../events-fixed-upcoming.png'});
    await page.locator('.upcoming-event-row .text-button').first().click();
    assert.equal(await page.locator('#postDialog .event-dialog-summary').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(27, 27, 27)');
    assert.equal(await page.locator('#postDialog').evaluate(e=>e.scrollWidth<=e.clientWidth),true);
    await page.locator('#rsvpName').fill('Keep my name');
    if(width<=760){
      await page.locator('.mobile-sticky-register button').click();
      assert.equal(await page.locator('#rsvpName').inputValue(),'Keep my name');
      const bar=await page.locator('.mobile-sticky-register').boundingBox();
      assert.ok(Math.abs(bar.y+bar.height-900)<2);
    }
    await page.locator('#postDialog').evaluate(e=>e.scrollTop=0);
    if(width===390)await page.screenshot({path:'../events-fixed-sheet.png'});
    await page.locator('.close-dialog').click();
    await page.locator('[data-filter="past"]').click();
    await page.locator('.club-card img').evaluateAll(es=>Promise.all(es.map(e=>{e.loading='eager';return e.decode().catch(()=>{})})));
    assert.equal(await page.locator('.club-card img').evaluateAll(es=>es.every(e=>getComputedStyle(e).objectFit==='contain')),true);
    if(width===390)await page.screenshot({path:'../events-fixed-past.png'});
  }
  assert.deepEqual(errors,[]);
  console.log('Poster containment, monochrome sheets, layout at 320/390/760/1440 and registration input preservation passed.');
}finally{await browser.close()}
