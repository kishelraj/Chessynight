// Only the public club APIs are shared with the GitHub Pages frontend.
const pagesOrigin='https://kishelraj.github.io';
const routes=new Map([
  ['/api/content','GET'],['/api/leaderboard','GET'],
  ['/api/register','POST'],['/api/start','POST'],
  ['/api/move','POST'],['/api/finish','POST'],
]);
export function isPagesRequest(req){
  return req.headers.get('Origin')===pagesOrigin && routes.get(new URL(req.url).pathname)===req.method;
}
export async function withPagesCors(req,env,handler){
  const origin=req.headers.get('Origin'),path=new URL(req.url).pathname;
  if(origin!==pagesOrigin)return handler(req,env);
  const headers={'Access-Control-Allow-Origin':pagesOrigin,'Vary':'Origin','Cache-Control':'no-store'};
  if(req.method==='OPTIONS'){
    const method=req.headers.get('Access-Control-Request-Method');
    const requested=(req.headers.get('Access-Control-Request-Headers')||'').toLowerCase().split(',').map(s=>s.trim()).filter(Boolean);
    if(routes.get(path)!==method||requested.some(h=>h!=='content-type'))return new Response('Not allowed',{status:403});
    return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':method,'Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600'}});
  }
  if(!isPagesRequest(req))return new Response('Not allowed',{status:403});
  // Cross-origin requests never inherit owner authentication or cookies.
  const safeHeaders=new Headers(req.headers);
  for(const key of [...safeHeaders.keys()])if(key.startsWith('oai-')||key==='cookie'||key==='authorization')safeHeaders.delete(key);
  const response=await handler(new Request(req,{headers:safeHeaders}),env);
  const output=new Response(response.body,response);
  for(const [key,value] of Object.entries(headers))output.headers.set(key,value);
  return output;
}

