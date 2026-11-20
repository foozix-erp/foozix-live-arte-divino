import {parseCibPages,parseQnbRows} from './parser-core.mjs?v=5.0.113';
let excelPromise;
function excel(){
  if(globalThis.XLSX)return Promise.resolve(globalThis.XLSX);
  if(!excelPromise)excelPromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('./vendor/xlsx.full-0.20.3.min.js',import.meta.url).href;script.onload=()=>resolve(globalThis.XLSX);script.onerror=()=>{excelPromise=null;script.remove();reject(Error('BANK_READER_UNAVAILABLE'));};document.head.append(script);});
  return excelPromise;
}
export async function parseBankFile(file,onProgress=()=>{}){
  if(!file||file.size>5*1024*1024)throw Error('FILE_TOO_LARGE');
  const data=await file.arrayBuffer();
  if(/\.pdf$/i.test(file.name)||file.type==='application/pdf'){
    const pdfjs=await import('./vendor/pdf-6.5.438.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdf.worker-6.5.438.min.mjs',import.meta.url).href;
    const task=pdfjs.getDocument({data:new Uint8Array(data),useSystemFonts:true,isEvalSupported:false});
    try{const pdf=await task.promise;if(pdf.numPages>200)throw Error('BANK_STATEMENT_TOO_MANY_PAGES');const pages=[];for(let n=1;n<=pdf.numPages;n++){const page=await pdf.getPage(n),text=await page.getTextContent();pages.push({height:page.getViewport({scale:1}).height,items:text.items});onProgress(n,pdf.numPages);}return parseCibPages(pages);}finally{await task.destroy();}
  }
  if(/\.(xls|xlsx|csv)$/i.test(file.name)){
    const XLSX=await excel(),book=XLSX.read(data,{type:'array'});let result;
    for(const name of book.SheetNames){const table=XLSX.utils.sheet_to_json(book.Sheets[name],{header:1,raw:true,defval:''});try{const parsed=parseQnbRows(table);if(result)throw Error('MULTIPLE_STATEMENT_SHEETS');result=parsed;}catch(error){if(error.message!=='UNSUPPORTED_QNB_STATEMENT')throw error;}}
    if(!result)throw Error('UNSUPPORTED_QNB_STATEMENT');return result;
  }
  throw Error('UNSUPPORTED_FILE_TYPE');
}
