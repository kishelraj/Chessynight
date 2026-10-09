import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';import {build} from 'esbuild';
import {renderPublic,renderAdmin} from './render-pages.mjs';
const publicPage=await renderPublic();
const adminHtml=await renderAdmin(publicPage);
await writeFile('worker/assets.js','export const posterBase64='+JSON.stringify((await readFile('worker/subak-poster.webp')).toString('base64'))+';\nexport const logoBase64='+JSON.stringify((await readFile('worker/chessynight-logo.png')).toString('base64'))+';\nexport const adminPage='+JSON.stringify(adminHtml)+';\nexport const page='+JSON.stringify(publicPage)+';\nexport const chessSource='+JSON.stringify(await readFile('node_modules/chess.js/dist/esm/chess.js','utf8'))+';');
await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});await build({entryPoints:['worker/main.js'],bundle:true,format:'esm',platform:'browser',outfile:'dist/server/index.js',minify:true});await cp('.openai/hosting.json','dist/.openai/hosting.json');await cp('drizzle','dist/drizzle',{recursive:true});
