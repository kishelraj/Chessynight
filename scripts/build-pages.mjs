import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
const backend='https://chessy-night-rebuilt.kishelraj.chatgpt.site';
await mkdir('docs',{recursive:true});
let html=await readFile('worker/page.html','utf8');
html=html.replaceAll('"/chessynight-logo.png"','"./chessynight-logo.png"')
  .replace("from '/chess.js'","from './chess.js'")
  .replace('href="/admin"','href="'+backend+'/admin"')
  .replace("fetch('/api/'+path,","fetch('"+backend+"/api/'+path,")
  .replace("method:body?'POST':'GET',headers:","credentials:'omit',method:body?'POST':'GET',headers:")
  .replace("location.origin+'/#event='","location.origin+location.pathname+'#event='")
  .replaceAll('esc(photo.url)','esc(assetURL(photo.url))')
  .replaceAll('esc(p.image_url)','esc(assetURL(p.image_url))')
  .replace("const app=document.querySelector", "function assetURL(value){return value?.startsWith('/')?"+JSON.stringify(backend)+"+value:value}\nconst app=document.querySelector");
await writeFile('docs/index.html',html);
await writeFile('docs/.nojekyll','');
await copyFile('worker/chessynight-logo.png','docs/chessynight-logo.png');
await copyFile('node_modules/chess.js/dist/esm/chess.js','docs/chess.js');
await copyFile('worker/PIECE-LICENSE.md','docs/PIECE-LICENSE.md');
console.log('GitHub Pages output ready in docs/');

