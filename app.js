const ERP_URL='https://script.google.com/macros/s/AKfycbxber7tQoUqWmeC_RoY2vPgtao-69Hrl6AU5-GkgN79qbKDtasHiEGDjtmYt5azmLgF/exec';
const offline=document.querySelector('#offline'),install=document.querySelector('#install'),installHelp=document.querySelector('#installHelp'),openSystem=document.querySelector('#openSystem');
openSystem.href=ERP_URL;
let installPrompt=null;
function connectivity(){offline.classList.toggle('hidden',navigator.onLine)}
window.addEventListener('online',connectivity);window.addEventListener('offline',connectivity);
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;install.classList.remove('hidden');installHelp.classList.add('hidden')});
install.addEventListener('click',async()=>{if(!installPrompt){installHelp.classList.remove('hidden');return}await installPrompt.prompt();const choice=await installPrompt.userChoice;if(choice.outcome==='accepted')installHelp.classList.add('hidden');installPrompt=null;install.classList.add('hidden')});
window.addEventListener('appinstalled',()=>{install.classList.add('hidden');installHelp.classList.add('hidden')});
if('serviceWorker'in navigator)navigator.serviceWorker.register('./service-worker.js',{scope:'./'}).then(reg=>reg.update()).catch(()=>installHelp.classList.remove('hidden'));
setTimeout(()=>{if(!installPrompt&&!matchMedia('(display-mode: standalone)').matches)installHelp.classList.remove('hidden')},2500);
connectivity();
