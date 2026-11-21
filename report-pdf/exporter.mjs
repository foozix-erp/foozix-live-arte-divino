const WIDTH=718,HEIGHT=1046;
let libraries;
function script(name){return new Promise((resolve,reject)=>{const el=document.createElement('script');el.src=new URL('./vendor/'+name,import.meta.url).href;el.onload=resolve;el.onerror=()=>{el.remove();reject(Error('PDF_LIBRARY_LOAD_FAILED'));};document.head.append(el);});}
async function loadLibraries(){
 if(!libraries)libraries=(async()=>{await script('html2canvas-pro-2.6.4.min.js');await script('jspdf-4.2.1.umd.min.js');if(typeof window.html2canvas!=='function'||window.jspdf?.jsPDF?.version!=='4.2.1')throw Error('PDF_LIBRARY_VERSION_CONFLICT');return {capture:window.html2canvas,PDF:window.jspdf.jsPDF};})().catch(error=>{libraries=null;throw error;});return libraries;
}
function shell(document,ancestors,node){let outer=node;for(let i=ancestors.length-1;i>=0;i--){const wrap=ancestors[i].cloneNode(false);wrap.append(outer);outer=wrap;}return outer;}
function unitsOf(root){
 const units=[];
 function visit(node,ancestors=[]){if(node.nodeType!==1)return;if(node.matches('.no-print,.report-footer'))return;
  if(node.matches('table')){units.push({kind:'table',node,ancestors});return;}
  if(node.querySelector('table')||node.matches('.print-record-list')){for(const child of node.children)visit(child,[...ancestors,node]);return;}
  units.push({kind:'block',node,ancestors,heading:/^H[1-6]$/.test(node.tagName)});
 }
 for(const child of root.children)visit(child);return units;
}
export function paginateReport(source,host,{filename='' }={}){
 const document=source.ownerDocument,pages=[],rows=[],units=unitsOf(source);let page,lastHeading=null;
 function newPage(){const p=document.createElement('article');p.className=source.className+' named-pdf-page';p.style.cssText='width:'+WIDTH+'px!important;height:'+HEIGHT+'px!important;min-height:'+HEIGHT+'px!important;margin:0!important;padding:0!important;overflow:hidden!important;display:flow-root!important;background:white!important;';p.dataset.contentUnits='0';if(pages.length){const title=document.createElement('div');title.className='pdf-running-title';title.style.cssText='font:9px Tahoma,Arial,sans-serif;color:#48675f;border-bottom:1px solid #bfd6d0;padding:0 0 7px;margin-bottom:8px;';title.textContent=filename;p.append(title);}host.append(p);pages.push(p);page=p;lastHeading=null;return p;}
 const fits=()=>page.scrollHeight<=HEIGHT+1;
 const count=n=>page.dataset.contentUnits=String(Number(page.dataset.contentUnits)+n);
 function next(){if(!Number(page.dataset.contentUnits))throw Error('PDF_CONTENT_EXCEEDS_ONE_PAGE');newPage();}
 newPage();
 for(const unit of units){
  if(unit.kind==='block'){let wrapper=shell(document,unit.ancestors,unit.node.cloneNode(true));page.append(wrapper);if(!fits()){wrapper.remove();next();page.append(wrapper);if(!fits())throw Error('PDF_CONTENT_EXCEEDS_ONE_PAGE');}count(1);lastHeading=unit.heading?{wrapper,unit}:null;continue;}
  const original=unit.node,headers=original.querySelector('thead'),sourceRows=[...original.querySelectorAll('tbody>tr,tfoot>tr')];let frame,table,body;
  const widths=[...original.querySelectorAll('thead tr:last-child th')].map(c=>c.getBoundingClientRect().width);
  function startTable(){table=original.cloneNode(false);table.style.setProperty('table-layout','fixed','important');if(widths.length){const cols=document.createElement('colgroup');widths.forEach(w=>{const col=document.createElement('col');col.style.width=w+'px';cols.append(col);});table.append(cols);}if(headers)table.append(headers.cloneNode(true));body=document.createElement('tbody');table.append(body);frame=shell(document,unit.ancestors,table);page.append(frame);}
  startTable();
  for(const row of sourceRows){const copy=row.cloneNode(true);body.append(copy);
   if(!fits()){
    copy.remove();const empty=!body.children.length;if(empty)frame.remove();const heading=empty&&lastHeading&&lastHeading.wrapper.parentElement===page&&page.lastElementChild===lastHeading.wrapper?lastHeading.wrapper:null;
    if(heading){heading.remove();count(-1);}next();if(heading){page.append(heading);count(1);}startTable();body.append(copy);if(!fits())throw Error('PDF_TABLE_ROW_EXCEEDS_ONE_PAGE');
   }
   rows.push({sourceRow:row,page:pages.length,renderedRow:copy});count(1);lastHeading=null;
  }
 }
 if(!Number(page.dataset.contentUnits)){page.remove();pages.pop();}
 if(!pages.length)throw Error('PDF_REPORT_EMPTY');
 for(const p of pages){const bounds=p.getBoundingClientRect();if(p.scrollHeight>HEIGHT+1||[...p.querySelectorAll('table,th,td,.print-record-card')].some(el=>{const r=el.getBoundingClientRect();return r.left<bounds.left-1||r.right>bounds.right+1;}))throw Error('PDF_REPORT_OUTSIDE_A4_MARGINS');}
 const expectedRows=units.filter(u=>u.kind==='table').reduce((n,u)=>n+u.node.querySelectorAll('tbody>tr,tfoot>tr').length,0);
 if(rows.length!==expectedRows||new Set(rows.map(r=>r.sourceRow)).size!==expectedRows||rows.some(r=>r.sourceRow.textContent!==r.renderedRow.textContent))throw Error('PDF_SOURCE_ROW_PRESERVATION_FAILED');
 return {pages,rowBindings:rows};
}
export async function downloadReportPdf({reportHtml,cssText,filename,lang='ar',internalCopy=false,onProgress=()=>{},signal}={}){
 if(typeof reportHtml!=='string'||!reportHtml.trim()||typeof cssText!=='string'||!cssText.trim()||typeof filename!=='string'||!filename.trim()||/[\\/:*?"<>|]/.test(filename))throw Error('PDF_EXPORT_INPUT_REQUIRED');
 const {capture,PDF}=await loadLibraries(),frame=document.createElement('iframe');frame.setAttribute('aria-hidden','true');frame.style.cssText='position:fixed;left:-100000px;top:0;width:'+WIDTH+'px;height:'+HEIGHT+'px;pointer-events:none;z-index:-2147483647;border:0;';document.body.append(frame);
 const cancelled=()=>{if(signal?.aborted)throw Error('PDF_EXPORT_CANCELLED');};
 try{
  const doc=frame.contentDocument;doc.open();doc.write('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>');doc.close();doc.documentElement.lang=lang;doc.documentElement.dir=lang==='ar'?'rtl':'ltr';doc.body.className='v5-shell single-report-print foozix-printing'+(internalCopy?' internal-report-copy':'');doc.body.style.margin='0';const style=doc.createElement('style');style.textContent=cssText+'\nbody.foozix-printing > :not(#foozixPrintRoot).html2canvas-container{display:block!important}';doc.head.append(style);
  const host=doc.createElement('div');host.id='foozixPrintRoot';const content=doc.createElement('div');content.innerHTML=reportHtml;const source=content.firstElementChild;if(!source)throw Error('PDF_REPORT_EMPTY');host.append(source);doc.body.append(host);
  await doc.fonts.ready;await Promise.all([...source.querySelectorAll('img')].map(img=>img.decode().catch(()=>{throw Error('PDF_REPORT_IMAGE_LOAD_FAILED');})));cancelled();
  const {pages,rowBindings}=paginateReport(source,host,{filename});source.remove();pages.forEach(page=>page.remove());
  const pdf=new PDF({orientation:'portrait',unit:'mm',format:'a4',compress:true,putOnlyUsedFonts:true});pdf.setProperties({title:filename,author:'Arte Divino',creator:'FOOZIX Live'});
  for(let i=0;i<pages.length;i++){cancelled();onProgress({page:i+1,total:pages.length});host.replaceChildren(pages[i]);const canvas=await capture(pages[i],{scale:2.5,width:WIDTH,height:HEIGHT,windowWidth:WIDTH,windowHeight:HEIGHT,backgroundColor:'#ffffff',logging:false,useCORS:true,allowTaint:false,scrollX:0,scrollY:0});cancelled();const probe=doc.createElement('canvas');probe.width=64;probe.height=64;const probeContext=probe.getContext('2d');probeContext.drawImage(canvas,0,0,64,64);const pixels=probeContext.getImageData(0,0,64,64).data;let ink=0;for(let n=0;n<pixels.length;n+=4)if(Math.min(pixels[n],pixels[n+1],pixels[n+2])<230)ink++;if(ink<4)throw Error('PDF_RENDER_EMPTY_PAGE');if(i)pdf.addPage('a4','portrait');pdf.addImage(canvas.toDataURL('image/jpeg',.94),'JPEG',10,10,190,277,undefined,'FAST');pdf.setFontSize(8);pdf.setTextColor(90);pdf.text((i+1)+' / '+pages.length,105,292,{align:'center'});canvas.width=1;canvas.height=1;await new Promise(resolve=>setTimeout(resolve,0));}
  cancelled();const blob=pdf.output('blob');if(blob.size<1000)throw Error('PDF_EXPORT_EMPTY');const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=filename+'.pdf';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  return {filename:filename+'.pdf',pages:pages.length,rows:rowBindings.length,bytes:blob.size,orientation:'portrait',format:'A4'};
 }finally{frame.remove();}
}
