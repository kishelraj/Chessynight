import {readFile,writeFile,mkdir,cp,readdir,appendFile} from 'node:fs/promises';import {build} from 'esbuild';
import {renderPublic,renderAdmin} from './render-pages.mjs';
const publicPage=await renderPublic();
const adminHtml=await renderAdmin(publicPage);
await writeFile('worker/assets.js','export const posterBase64='+JSON.stringify((await readFile('worker/subak-poster.webp')).toString('base64'))+';\nexport const logoBase64='+JSON.stringify((await readFile('worker/chessynight-logo.png')).toString('base64'))+';\nexport const ladiesPosterBase64='+JSON.stringify((await readFile('worker/ladies-chessy-vol-2.png')).toString('base64'))+';\nexport const adminPage='+JSON.stringify(adminHtml)+';\nexport const page='+JSON.stringify(publicPage)+';\nexport const chessSource='+JSON.stringify(await readFile('node_modules/chess.js/dist/esm/chess.js','utf8'))+';');
const eventPosters={};for(const name of await readdir('worker/posters'))eventPosters[name]={mime:name.endsWith('.png')?'image/png':'image/jpeg',data:(await readFile('worker/posters/'+name)).toString('base64')};
await appendFile('worker/assets.js','\nexport const eventPosters='+JSON.stringify(eventPosters)+';');
const pwaFiles={};for(const [name,mime,binary] of [['sw.js','text/javascript',false],['manifest.webmanifest','application/manifest+json',false],['app-icon-192.png','image/png',true],['app-icon-512.png','image/png',true]])pwaFiles['/'+name]={mime,binary,data:await readFile('worker/'+name,binary?'base64':'utf8')};await appendFile('worker/assets.js','\nexport const pwaFiles='+JSON.stringify(pwaFiles)+';');
await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});await build({entryPoints:['worker/main.js'],bundle:true,format:'esm',platform:'browser',outfile:'dist/server/index.js',minify:true});await cp('.openai/hosting.json','dist/.openai/hosting.json');await cp('drizzle','dist/drizzle',{recursive:true});

