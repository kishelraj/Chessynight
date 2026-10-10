(()=>{
 if(!/Android/i.test(navigator.userAgent)||!('serviceWorker' in navigator))return;
 const manifest=document.createElement('link');manifest.rel='manifest';manifest.href='./manifest.webmanifest';document.head.append(manifest);
 const banner=document.createElement('aside');banner.className='android-app-banner';banner.setAttribute('aria-label','CHESSYNIGHT Android app');banner.innerHTML='<div><strong>Keep CHESSYNIGHT close.</strong><p>Install the app. Get club news and event alerts.</p></div><div class="actions"><button class="primary" id="installClubApp">Install app</button><button class="secondary" id="enableClubAlerts">Enable notifications</button><button class="text-button" id="dismissClubApp">Maybe later</button></div><p id="clubAppStatus" role="status"></p>';
 document.querySelector('header').after(banner);
 let deferred=null,registration=null;
 const install=banner.querySelector('#installClubApp'),alerts=banner.querySelector('#enableClubAlerts'),status=banner.querySelector('#clubAppStatus');
 const say=text=>{status.textContent=text};
 const standalone=matchMedia('(display-mode: standalone)').matches;if(standalone)install.hidden=true;
 try{if(Number(localStorage.getItem('clubAppDismissed'))>Date.now()-7*86400000)banner.hidden=true}catch{}
 banner.querySelector('#dismissClubApp').onclick=()=>{banner.hidden=true;try{localStorage.setItem('clubAppDismissed',Date.now())}catch{}};
 const settings=document.createElement('button');settings.className='text-button';settings.textContent='App & notifications';settings.onclick=()=>{banner.hidden=false;banner.scrollIntoView({behavior:'smooth',block:'center'})};document.querySelector('footer')?.append(settings);
 addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferred=event});
 addEventListener('appinstalled',()=>{install.hidden=true;deferred=null;say('Installed. Enable notifications to hear from the club.')});
 install.onclick=async()=>{if(!deferred){say('In Chrome, open the ⋮ menu and choose “Install app” or “Add to Home screen”.');return}const event=deferred;deferred=null;await event.prompt();const choice=await event.userChoice;if(choice.outcome==='accepted')install.hidden=true;else say('You can install the app whenever you’re ready.')};
 if(!('PushManager' in window)||!('Notification' in window)){alerts.hidden=true;return}
 const update=async()=>{const sub=await registration.pushManager.getSubscription();alerts.textContent=sub?'Turn off notifications':'Enable notifications';if(Notification.permission==='denied'){alerts.disabled=true;say('Notifications are blocked. You can change this in your browser’s site settings.')}};
 navigator.serviceWorker.register('./sw.js',{scope:'./'}).then(async reg=>{registration=reg;await navigator.serviceWorker.ready;await update()}).catch(()=>{alerts.disabled=true;say('App setup failed. Reload to try again.')});
 alerts.onclick=async()=>{if(!registration){say('App is getting ready. Please try again in a moment.');return}alerts.disabled=true;try{const existing=await registration.pushManager.getSubscription();if(existing){await existing.unsubscribe();say('Notifications turned off.');await update();return}const permission=await Notification.requestPermission();if(permission!=='granted'){say('Notifications are off. You can enable them in browser settings.');return}const config=await api('push/config');if(!config.publicKey)throw Error('Notifications are not ready yet.');const key=Uint8Array.from(atob(config.publicKey.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));const sub=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});try{await api('push/subscribe',{endpoint:sub.endpoint})}catch(error){await sub.unsubscribe();throw error}say('You’re subscribed to CHESSYNIGHT club alerts.');await update()}catch(error){say(error.message||'Could not enable notifications. Try again.')}finally{alerts.disabled=Notification.permission==='denied'}};
})();
