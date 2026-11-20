// Pure extraction rules. No network, approvals, ledger writes or balance plugs.
export function moneyMinor(value,{blankIsZero=false}={}){
  const s=String(value??'').replace(/[\s,]/g,'');
  if(!s||s==='--')return blankIsZero?0:null;
  if(!/^-?\d+(?:\.\d{1,2})?$/.test(s))throw Error('INVALID_SOURCE_AMOUNT');
  const n=Math.round(Number(s)*100);if(!Number.isSafeInteger(n))throw Error('INVALID_SOURCE_AMOUNT');return n;
}
export function sourceDate(value){
  const s=String(value??'').trim();let m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/),iso;
  if(m)iso=s;else if((m=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/)))iso=`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  if(!iso||!Number.isFinite(Date.parse(iso+'T00:00:00Z'))||new Date(iso+'T00:00:00Z').toISOString().slice(0,10)!==iso)return null;
  return iso;
}
export function auditSourceRows(rows,openingMinor,closingMinor){
  const issues=[];let balance=openingMinor;
  rows.forEach((r,index)=>{
    if(r.balanceMinor===null)issues.push({code:'SOURCE_BALANCE_MISSING',index});
    const expected=balance+r.creditMinor-r.debitMinor;
    if(r.balanceMinor!==null&&expected!==r.balanceMinor)issues.push({code:'SOURCE_RUNNING_BALANCE',index,differenceMinor:r.balanceMinor-expected});
    balance=r.balanceMinor===null?expected:r.balanceMinor;
  });
  const total=openingMinor+rows.reduce((s,r)=>s+r.creditMinor-r.debitMinor,0);
  if(total!==closingMinor)issues.push({code:'SOURCE_BALANCE_EQUATION',differenceMinor:closingMinor-total});
  return issues;
}
const months={Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};
function englishDate(s){const m=s.match(/(\d{1,2})\s+([A-Za-z]{3})\w*\s+(\d{4})/);return m&&months[m[2]]?sourceDate(`${m[3]}-${String(months[m[2]]).padStart(2,'0')}-${m[1].padStart(2,'0')}`):null;}

export function parseCibPages(pages){
  const rows=[],extractionErrors=[];let period=null,printedTotals=null;
  for(const [pageIndex,page] of pages.entries()){
    const words=page.items.filter(i=>String(i.str||'').trim()).map(i=>({text:i.str.trim(),x:i.transform[4],right:i.transform[4]+i.width,top:page.height-i.transform[5]}));
    const fullText=words.map(w=>w.text).join(' '),periodMatch=fullText.match(/Movement Details\s*-\s*From:\s*(\d{1,2}\s+\w+\s+\d{4})\s+To:\s*(\d{1,2}\s+\w+\s+\d{4})/i);
    if(periodMatch)period={fromDate:englishDate(periodMatch[1]),toDate:englishDate(periodMatch[2])};
    const totalMatch=fullText.match(/Total in Account Currency\s+([\d,]+\.\s*\d{2})\s+([\d,]+\.\s*\d{2})/i);
    if(totalMatch)printedTotals={debitMinor:moneyMinor(totalMatch[1]),creditMinor:moneyMinor(totalMatch[2])};
    const headings=Object.fromEntries(['Withdrawal','Deposit','Balance'].map(label=>[label,words.find(w=>w.text===label)]));
    if(Object.values(headings).some(w=>!w)){if(/Movement Details/.test(fullText))extractionErrors.push({page:pageIndex+1,code:'COLUMN_HEADINGS_UNREADABLE'});continue;}
    const starts=words.filter(w=>w.x<65&&/^\d{2}\/\d{2}\/\d{2,4}$/.test(w.text)&&w.top>headings.Balance.top).sort((a,b)=>a.top-b.top);
    for(const [index,start] of starts.entries()){
      const same=words.filter(w=>Math.abs(w.top-start.top)<3);let date=start.text;
      if(date.length===8){const suffix=words.find(w=>w.x>=start.x&&w.x<start.right&&w.top-start.top>0&&w.top-start.top<16&&/^\d{2}$/.test(w.text));if(suffix)date+=suffix.text;}
      const numerics=same.filter(w=>/^-?[\d,]+\.\d{2}$/.test(w.text.replace(/\s/g,'')));
      const amount=(column,next)=>{const values=numerics.filter(w=>w.right>=headings[column].x&&(!next||w.right<headings[next].x));return values.length===1?moneyMinor(values[0].text):null;};
      const debit=amount('Withdrawal','Deposit'),credit=amount('Deposit','Balance'),balance=amount('Balance');
      if(balance===null||(debit===null&&credit===null)){if(same.length===1)continue;extractionErrors.push({page:pageIndex+1,code:'ROW_AMOUNTS_UNREADABLE',raw:same.map(w=>w.text).join(' ')});continue;}
      const parsed=sourceDate(date);if(!parsed){extractionErrors.push({page:pageIndex+1,code:'DATE_UNREADABLE',raw:date});continue;}
      const bottom=starts[index+1]?.top??page.height-20;
      const description=words.filter(w=>w.top>=start.top&&w.top<bottom&&w.x>=120&&w.x<headings.Withdrawal.x-5).map(w=>w.text).join(' ');
      const referenceParts=words.filter(w=>w.top>=start.top&&w.top<bottom&&w.x>=120&&w.x<175);
      const reference=referenceParts.slice(0,2).map(w=>w.text).join('').replace(/\s/g,'');
      rows.push({date:parsed,debitMinor:debit||0,creditMinor:credit||0,balanceMinor:balance,description,reference,page:pageIndex+1});
    }
  }
  if(!rows.length||!period?.fromDate||!period?.toDate)throw Error('UNSUPPORTED_OR_UNREADABLE_CIB_STATEMENT');
  const debit=rows.reduce((s,r)=>s+r.debitMinor,0),credit=rows.reduce((s,r)=>s+r.creditMinor,0);
  if(!printedTotals)extractionErrors.push({code:'PRINTED_TOTALS_REQUIRED'});
  else if(debit!==printedTotals.debitMinor||credit!==printedTotals.creditMinor)extractionErrors.push({code:'PRINTED_TOTALS_MISMATCH',expected:printedTotals,actual:{debitMinor:debit,creditMinor:credit}});
  const first=rows[0],last=rows.at(-1),openingMinor=first.balanceMinor+first.debitMinor-first.creditMinor;
  return {bank:'CIB',extractor:'CIB_GEOMETRY_V1',...period,coverageIsInferred:false,openingMinor,closingMinor:last.balanceMinor,rows,printedTotals,extractionErrors,sourceIssues:auditSourceRows(rows,openingMinor,last.balanceMinor)};
}

export function parseQnbRows(table){
  const headerIndex=table.findIndex(row=>row.includes('Transaction Date')&&row.includes('Transaction Reference'));
  if(headerIndex<0)throw Error('UNSUPPORTED_QNB_STATEMENT');
  const headers=table[headerIndex],rows=[],extractionErrors=[];
  table.slice(headerIndex+1).forEach((cells,index)=>{
    const r=Object.fromEntries(headers.map((h,i)=>[h,cells[i]]));if(!r['Transaction Date'])return;
    const date=sourceDate(r['Transaction Date']);if(!date){extractionErrors.push({sourceRow:headerIndex+index+2,code:'DATE_UNREADABLE'});return;}
    try{rows.push({date,valueDate:sourceDate(r['Value Date']),description:String(r['Transaction Description']||'').trim(),reference:String(r['Transaction Reference']||'').trim(),debitMinor:moneyMinor(r.Debit,{blankIsZero:true}),creditMinor:moneyMinor(r.Credit,{blankIsZero:true}),balanceMinor:moneyMinor(r.Balance),sourceRow:headerIndex+index+2});}catch(error){extractionErrors.push({sourceRow:headerIndex+index+2,code:error.message});}
  });
  const summary=table.slice(0,headerIndex).flat().join(' ').match(/Total Search Results:\s*(\d+)/i);
  if(!summary||Number(summary[1])!==rows.length)extractionErrors.push({code:'PRINTED_ROW_COUNT_MISMATCH'});
  rows.reverse(); // Preserve the bank's reverse chronological within-day order.
  if(!rows.length)throw Error('EMPTY_BANK_STATEMENT');
  const first=rows[0],last=rows.at(-1),openingMinor=first.balanceMinor===null?null:first.balanceMinor+first.debitMinor-first.creditMinor;
  if(openingMinor===null||last.balanceMinor===null)extractionErrors.push({code:'SOURCE_BOUNDARY_BALANCE_MISSING'});
  return {bank:'QNB',extractor:'QNB_XLS_V1',fromDate:first.date,toDate:last.date,coverageIsInferred:true,openingMinor,closingMinor:last.balanceMinor,rows,extractionErrors,sourceIssues:openingMinor===null?[]:auditSourceRows(rows,openingMinor,last.balanceMinor)};
}
