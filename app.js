const ERP_URL='https://script.google.com/macros/s/AKfycbz8Ju6yAIhckZQflQ6gdBX3fg_86PDSDreBC0ZtOxyLxRyY8tozV6CHyWNudkOKVNN-/exec';
const TRUST_KEY='foozix.trusted.session.v1',YEAR_MS=365*24*60*60*1000;
const offline=document.querySelector('#offline'),install=document.querySelector('#install'),installHelp=document.querySelector('#installHelp'),openSystem=document.querySelector('#openSystem'),copySystem=document.querySelector('#copySystem'),openStatus=document.querySelector('#openStatus'),brandSplash=document.querySelector('#brandSplash'),launcher=document.querySelector('#launcher'),erpFrame=document.querySelector('#erpFrame');
const hash=new URLSearchParams(location.hash.replace(/^#/,''));
if(hash.has('logout')||hash.has('expired'))localStorage.removeItem(TRUST_KEY);
if(hash.get('session'))localStorage.setItem(TRUST_KEY,JSON.stringify({token:hash.get('session'),expiresAt:Date.now()+YEAR_MS}));
if(location.hash)history.replaceState(null,'',location.pathname+location.search);
function trusted(){try{const v=JSON.parse(localStorage.getItem(TRUST_KEY)||'null');if(!v?.token||Number(v.expiresAt)<=Date.now()){localStorage.removeItem(TRUST_KEY);return null}return v}catch(_){localStorage.removeItem(TRUST_KEY);return null}}
function systemUrl(token=''){return ERP_URL+'?source=pwa'+(token?'#session='+encodeURIComponent(token):'')}
function showLauncher(){brandSplash.classList.add('hidden');launcher.classList.remove('hidden')}
function enterSystem(){
  brandSplash.classList.add('hidden');
  launcher.classList.add('hidden');
  erpFrame.src=ERP_URL+'?source=pwa&embedded=1&build=3220';
  erpFrame.classList.remove('hidden');
}
openSystem.href=systemUrl();
openSystem.addEventListener('click',event=>{event.preventDefault();enterSystem()});
const saved=trusted();
setTimeout(()=>enterSystem(),1100);
copySystem.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(systemUrl());openStatus.textContent='تم نسخ رابط النظام.'}catch(_){openStatus.textContent=systemUrl()}});
let installPrompt=null;
function connectivity(){offline.classList.toggle('hidden',navigator.onLine)}
window.addEventListener('online',connectivity);window.addEventListener('offline',connectivity);
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;install.classList.remove('hidden');installHelp.classList.add('hidden')});
install.addEventListener('click',async()=>{if(!installPrompt){installHelp.classList.remove('hidden');return}await installPrompt.prompt();const choice=await installPrompt.userChoice;if(choice.outcome==='accepted')installHelp.classList.add('hidden');installPrompt=null;install.classList.add('hidden')});
window.addEventListener('appinstalled',()=>{install.classList.add('hidden');installHelp.classList.add('hidden')});
if('serviceWorker'in navigator)navigator.serviceWorker.register('./service-worker.js',{scope:'./'}).then(reg=>reg.update()).catch(()=>installHelp.classList.remove('hidden'));
setTimeout(()=>{if(!installPrompt&&!matchMedia('(display-mode: standalone)').matches)installHelp.classList.remove('hidden')},2500);
connectivity();
