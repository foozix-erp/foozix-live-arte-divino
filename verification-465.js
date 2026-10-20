// Opt-in admin-only acceptance controls; no credentials are embedded or logged.
(()=>{
  const endpoint='https://script.google.com/macros/s/AKfycbzoIvlpj0H7etuAYKVXazFKEQevbskOSEHmuER4V6hy9YlUUERX5bfg4WfdwKvU3b6tCw/exec';
  const init=()=>{
    const panel=document.createElement('section');panel.dir='rtl';panel.style.cssText='position:fixed;inset:12px 12px auto 12px;z-index:200000;background:white;border:2px solid #177c6d;border-radius:12px;padding:16px;max-height:75vh;overflow:auto;color:#143e35';
    panel.innerHTML='<h2>اختبار تصحيح معزول — للإدارة فقط</h2><p>يعمل على نسخة مؤقتة، ولا يسجل حركات تجريبية في الشيت الأصلي.</p><button id="acceptanceRun465" type="button">تشغيل الاختبار المعزول</button> <button id="acceptanceStatus465" type="button">عرض نتيجة الاختبار</button><pre id="acceptanceResult465" dir="ltr" style="white-space:pre-wrap"></pre>';
    document.body.append(panel);
    const output=panel.querySelector('pre');
    const call=async action=>{
      if(typeof sessionToken_!=='function'||!sessionToken_())throw new Error('سجّل الدخول إلى التطبيق بحساب الإدارة أولًا');
      const response=await fetch(endpoint,{method:'POST',credentials:'omit',redirect:'follow',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({action,payload:{},sessionToken:sessionToken_()})});
      if(!response.ok)throw new Error('HTTP '+response.status);const result=await response.json();if(!result.ok)throw new Error(result.messageAr||result.code);output.textContent=JSON.stringify(result.data,null,2);
    };
    panel.querySelector('#acceptanceRun465').onclick=async event=>{event.target.disabled=true;output.textContent='جارٍ الاختبار على النسخة المنفصلة…';try{await call('system.acceptance465')}catch(error){output.textContent=String(error.message)+'\nاستخدم عرض النتيجة قبل إعادة تشغيل الاختبار.'}finally{event.target.disabled=false}};
    panel.querySelector('#acceptanceStatus465').onclick=()=>call('system.acceptance465.status').catch(error=>output.textContent=String(error.message));
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
