import {createServer} from 'node:http';
import {readFile,readdir} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import worker from '../dist/server/index.js';
const sql=new DatabaseSync(':memory:');
for(const name of (await readdir('drizzle')).filter(n=>n.endsWith('.sql')).sort())sql.exec(await readFile('drizzle/'+name,'utf8'));
const DB={prepare(query){const st=sql.prepare(query);const bound=(args=[])=>({run:async()=>{const r=st.run(...args);return {meta:{changes:Number(r.changes)}}},first:async()=>st.get(...args)||null,all:async()=>({results:st.all(...args)})});return {...bound(),bind:(...args)=>bound(args)}}};
createServer(async(req,res)=>{try{const parts=[];for await(const chunk of req)parts.push(chunk);const data=Buffer.concat(parts);const result=await worker.fetch(new Request('http://localhost:4173'+req.url,{method:req.method,headers:req.headers,...(data.length?{body:data}: {})}),{DB});res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()))}catch(e){console.error(e);res.writeHead(500);res.end('Preview error')}}).listen(4173,'127.0.0.1',()=>console.log('Local: http://localhost:4173'));
