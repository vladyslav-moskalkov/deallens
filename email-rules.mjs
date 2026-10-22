import {approveQuote,escapeHtml,reviewHtml} from './engine.mjs';
export function normalizeTestEmail(mail,{discount,revision,operatorReference}){
 if(!/^[a-f0-9]{8,64}$/i.test(String(mail.id||'')))throw new Error('NO_TEST_EMAIL');
 if(typeof mail.subject!=='string'||!mail.subject.startsWith('[DEALLENS-DEMO]'))throw new Error('EMAIL_NOT_MARKED_AS_DEMO');
 if(typeof mail.text!=='string'||!mail.text.trim()||mail.text.length>8000)throw new Error('PLAIN_TEXT_REQUEST_REQUIRED');
 if(!/^(?:\d{1,2}(?:\.\d{1,2})?|100(?:\.0{1,2})?)$/.test(String(discount)))throw new Error('INVALID_DISCOUNT');
 if(!Number.isInteger(Number(revision))||Number(revision)<1||Number(revision)>99)throw new Error('INVALID_REVISION');
 return {quoteId:'DL-M'+mail.id+'-R'+Number(revision),messageId:mail.id,requestText:mail.text.trim(),subject:mail.subject,discountBps:Math.round(Number(discount)*100),revision:Number(revision),operatorReference:String(operatorReference||'').slice(0,100)};
}
export function decideOrBlock(q,ctx){
 try{return approveQuote(q,ctx);}catch(err){
  const known=['CATALOG_CHANGED_REVIEW_AGAIN','STALE_CATALOG','QUOTE_EXPIRED','POLICY_CHANGED','MARGIN_GATE_FAILED'];
  if(!known.includes(err.message))throw err;
  return {...q,status:'REQUOTE_REQUIRED',decidedAt:ctx.now,blockedReason:err.message};
 }
}
export function reviewFieldsV2(q){
 const source='<p><strong>Source:</strong> '+escapeHtml(q.source?.subject||'')+'</p>';
 return JSON.stringify([{fieldType:'html',html:source+reviewHtmlV2(q)},{fieldLabel:'Decision',fieldType:'dropdown',requiredField:true,fieldOptions:{values:[...q.approvableOptions.map(o=>({option:o.id})),{option:'REJECT'}]}},{fieldLabel:'Review note',fieldType:'text',requiredField:true,placeholder:'Confirm products, quantity and commercial terms.'}]);
}
export function reviewHtmlV2(q){
 if(q.status!=='AWAITING_REVIEW')return reviewHtml(q);
 const fmt=c=>new Intl.NumberFormat('en-IE',{style:'currency',currency:'EUR'}).format(c/100),e=escapeHtml,r=q.requested;
 return '<h2>'+fmt(r.listCents)+' sale. Check what remains.</h2><p>Internal commercial review · synthetic supplier · EUR ex VAT</p><table><thead><tr><th>Product / evidence</th><th>Qty</th><th>Stock</th></tr></thead><tbody>'+q.lines.map(l=>'<tr><td>'+e(l.sku)+'<br>'+e(l.evidence)+'</td><td>'+l.quantity+'</td><td>'+l.stock+'</td></tr>').join('')+'</tbody></table><h3>Requested terms: '+(r.discountBps/100)+'% off + free delivery</h3><table><tbody>'+[['Catalog sale',r.listCents],['Discount',-r.discountCents],['Procurement',-r.procurementCents],['Seller delivery cost',-r.deliveryCostCents]].map(([label,v])=>'<tr><td>'+label+'</td><td>'+fmt(v)+'</td></tr>').join('')+'</tbody><tfoot><tr><td>Contribution before overhead</td><td><strong>'+fmt(r.contributionCents)+'</strong></td></tr></tfoot></table><h3>Choose terms, not a risky discount.</h3><table><thead><tr>'+q.options.map(o=>'<th>'+(o.passes?'ELIGIBLE FOR APPROVAL':'BLOCKED')+'</th>').join('')+'</tr></thead><tbody><tr>'+q.options.map(o=>'<td><h3>'+e(o.label)+'</h3><h2>'+fmt(o.contributionCents)+'</h2><p>Contribution before overhead<br>Total '+fmt(o.revenueCents)+'<br>Margin '+(o.marginBps/100).toFixed(2)+'%</p></td>').join('')+'</tr></tbody></table><p>Demo policy: minimum 10% contribution margin. Confirm products and quantity. Current costs, prices and stock are checked again after your decision. No customer email, order, stock reservation or payment.</p>';
}
export function blockedHtml(q){
 const reason=q.status==='REJECTED'?'The manager rejected this proposal.':'Price, cost, stock, policy or validity changed while the quote was being reviewed.';
 return '<h1>'+escapeHtml(q.status==='REJECTED'?'Proposal rejected':'Recalculation required')+'</h1><p>'+escapeHtml(reason)+'</p><p><strong>No PDF or Gmail draft was created.</strong></p><p>'+escapeHtml(q.blockedReason||'')+'</p><p>Start a new explicitly numbered revision after reviewing the current catalog. No email has been sent.</p>';
}
