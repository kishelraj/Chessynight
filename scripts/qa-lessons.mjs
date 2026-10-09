import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import worker from '../dist/server/index.js';
const sql=new DatabaseSync(':memory:');for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())sql.exec(await readFile('drizzle/'+file,'utf8'));
const DB={prepare(query){const st=sql.prepare(query);const bound=(a=[])=>({run:async()=>{const r=st.run(...a);return {meta:{changes:Number(r.changes)}}},first:async()=>st.get(...a)||null,all:async()=>({results:st.all(...a)})});return {...bound(),bind:(...a)=>bound(a)}}};
const photoStore=new Map();const PHOTOS={put:async(k,v)=>photoStore.set(k,v),get:async k=>photoStore.has(k)?{body:photoStore.get(k)}:null};
const browser=await chromium.launch({channel:'msedge',headless:true});const errors=[];
async function page(owner=false){const p=await browser.newPage();p.on('pageerror',e=>errors.push(e.message));await p.route('https://preview.test/**',async route=>{const r=route.request();const headers={...r.headers(),...(owner?{'oai-authenticated-user-id':'test-owner','oai-authenticated-user-email':'kishelraj@gmail.com'}:{})};const response=await worker.fetch(new Request(r.url(),{method:r.method(),headers,...(r.postData()?{body:r.postData()}:{})}),{DB,PHOTOS});await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())})});return p}
try{
  const admin=await page(true);await admin.goto('https://preview.test/admin');await admin.getByRole('button',{name:'Lessons',exact:true}).click();await admin.getByRole('button',{name:'New lesson',exact:true}).click();
  const values={title:'Preview Rapid Lesson',venue:'Preview venue, Kuala Lumpur',start:'2099-01-01T10:00',fee:'RM 25',capacity:'12',duration:'90',teacher:'Preview Teacher',teacherBio:'An experienced teacher.',outcomes:'Learn chess rules.',outline:'Guided games.',prerequisites:'None',bring:'Notebook'};for(const [k,v] of Object.entries(values))await admin.locator('#l-'+k).fill(v);
  await admin.locator('#l-teacherUpload').setInputFiles('worker/chessynight-logo.png');await admin.getByText('Photo uploaded. Save the lesson to publish it.',{exact:true}).waitFor();await admin.locator('#l-published').check();await admin.locator('#l-open').check();await admin.getByRole('button',{name:'Save lesson',exact:true}).click();await admin.getByText('Lesson published.',{exact:true}).waitFor();
  const publicPage=await page();await publicPage.goto('https://preview.test/');await publicPage.locator('#lessonsNav').click();await publicPage.locator('article').filter({hasText:'Preview Rapid Lesson'}).getByRole('button',{name:'View class'}).click();await publicPage.locator('#studentName').fill('Preview Player');await publicPage.locator('#studentEmail').fill('preview@example.com');await publicPage.locator('[name=consent]').check();await publicPage.locator('[name=adult]').check();await publicPage.locator('#studentExperience').selectOption('Complete beginner');await publicPage.getByRole('button',{name:'Book a place'}).click();await publicPage.getByRole('heading',{name:'Your place is booked.'}).waitFor();
  await admin.getByRole('button',{name:'Refresh students'}).click();await admin.getByRole('button',{name:'Mark present',exact:true}).click();await admin.getByText('1 booked · 1 present',{exact:true}).waitFor();
  for(const width of [1440,390]){for(const [name,p] of [['public',publicPage],['admin',admin]]){await p.setViewportSize({width,height:1000});await p.waitForTimeout(350);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,name+' overflow at '+width);await p.screenshot({path:'../lesson-'+name+'-'+width+'.png',fullPage:true})}}
  await publicPage.locator('#lessonsNav').click();for(const width of [1440,390]){await publicPage.setViewportSize({width,height:1000});await publicPage.locator('.lesson-card').first().waitFor();assert.equal(await publicPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await publicPage.screenshot({path:'../lessons-list-'+width+'.png',fullPage:true})}
  // Puzzle selector and existing admin tabs still work after leaving lessons.
  await admin.locator('#tabPuzzles').click();assert.equal(await admin.locator('#lessonArea').isVisible(),false);
  await publicPage.locator('#playNav').click();await publicPage.locator('#nickname').waitFor();
  assert.deepEqual(errors,[]);console.log('Browser: create, publish, register, check-in, navigation and 390/1440px layouts passed. Preview data exists only in memory.');
}finally{await browser.close()}
