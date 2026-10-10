const backend='https://chessy-night.kishelraj.chatgpt.site';
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
// Never cache admin pages, registrations or live content.
self.addEventListener('fetch',()=>{});
self.addEventListener('push',event=>event.waitUntil((async()=>{let alert={title:'chessynight',body:'Catch up with the club’s latest news and events.',url:'https://kishelraj.github.io/Chessynight/'};try{const response=await fetch(backend+'/api/push/latest',{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(5000)});if(response.ok)alert=await response.json()}catch{}await self.registration.showNotification(alert.title,{body:alert.body,icon:new URL('./chessynight-logo.png',self.registration.scope).href,tag:alert.id||'club-update',data:{url:alert.url}})})()));
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil((async()=>{const url=event.notification.data?.url||'https://kishelraj.github.io/Chessynight/';const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});const existing=clients.find(c=>c.url.startsWith(self.registration.scope));if(existing){await existing.navigate(url);return existing.focus()}return self.clients.openWindow(url)})())});
