// Pure business rules. No network, model, n8n state or floating-point money arithmetic.
export const POLICY = Object.freeze({version:'deallens-v1',currency:'EUR',minMarginBps:1000,catalogTtlMs:86400000,quoteTtlMs:1800000,deliveryCostCents:25000});
export const money = cents => new Intl.NumberFormat('en-IE',{style:'currency',currency:'EUR'}).format(cents/100);
export const escapeHtml = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function whole(v,min,max,label){if(!Number.isSafeInteger(v)||v<min||v>max)throw new Error('INVALID_'+label);return v;}
function millis(v){const n=Date.parse(v);if(!Number.isFinite(n))throw new Error('INVALID_TIME');return n;}
function normalize(s){return String(s).trim().toLowerCase().replace(/\s+/g,' ');}
function catalogRow(r,now){
 const p={...r};for(const k of ['unit_price_cents','unit_cost_cents','stock'])p[k]=whole(Number(r[k]),k==='stock'?0:1,100000000,k);
 if(p.currency!=='EUR'||!p.sku||!p.version)throw new Error('INVALID_CATALOG');
 const age=millis(now)-millis(p.verified_at);if(age<0||age>POLICY.catalogTtlMs)throw new Error('STALE_CATALOG');
 p.aliases=typeof p.aliases==='string'?JSON.parse(p.aliases):p.aliases;
 if(!Array.isArray(p.aliases))throw new Error('INVALID_ALIASES');return p;
}
export function economics(lines,discountBps,deliveryChargeCents){
 whole(discountBps,0,10000,'DISCOUNT');whole(deliveryChargeCents,0,100000000,'DELIVERY');
 const listCents=lines.reduce((s,l)=>s+l.quantity*l.unit_price_cents,0);
 const procurementCents=lines.reduce((s,l)=>s+l.quantity*l.unit_cost_cents,0);
 whole(listCents,1,1000000000,'TOTAL');whole(procurementCents,1,1000000000,'COST');
 const discountCents=Math.round(listCents*discountBps/10000);
 const goodsCents=listCents-discountCents,revenueCents=goodsCents+deliveryChargeCents;
 const contributionCents=revenueCents-procurementCents-POLICY.deliveryCostCents;
 const marginBps=revenueCents>0?Math.round(contributionCents*10000/revenueCents):null;
 // Compare cross-multiplied integer values; never approve based on rounded displayed margin.
 const passes=revenueCents>0&&contributionCents*10000>=revenueCents*POLICY.minMarginBps;
 return {listCents,procurementCents,discountBps,discountCents,goodsCents,deliveryChargeCents,deliveryCostCents:POLICY.deliveryCostCents,revenueCents,contributionCents,marginBps,passes};
}
export function createQuote({quoteId,requestText,discountBps,extraction,catalog,now}){
 if(!/^DL-[A-Za-z0-9_-]{1,80}$/.test(quoteId))throw new Error('INVALID_QUOTE_ID');
 if(typeof requestText!=='string'||!requestText.trim()||requestText.length>8000)throw new Error('INVALID_REQUEST');
 whole(discountBps,0,10000,'DISCOUNT');
 const createdMs=millis(now),issues=[];
 if(!extraction||!Array.isArray(extraction.items)||extraction.items.length<1||extraction.items.length>20)throw new Error('INVALID_EXTRACTION');
 if(!Array.isArray(extraction.uncertainties))throw new Error('INVALID_UNCERTAINTIES');
 issues.push(...extraction.uncertainties.map(x=>String(x).slice(0,250)));
 const products=catalog.map(r=>catalogRow(r,now));
 if(new Set(products.map(p=>p.sku)).size!==products.length)throw new Error('DUPLICATE_CATALOG_SKU');
 const lines=[];
 for(const item of extraction.items){
  if(typeof item.requested_item!=='string'||typeof item.evidence!=='string'||!item.evidence||!requestText.includes(item.evidence)){issues.push('Requested line has no exact source evidence');continue;}
  if(!normalize(item.evidence).includes(normalize(item.requested_item))){issues.push('Product identity is not grounded in the quoted source');continue;}
  if(!Number.isSafeInteger(item.quantity)||item.quantity<1||item.quantity>10000){issues.push('Quantity needs clarification: '+item.requested_item);continue;}
  const key=normalize(item.requested_item);
  const matches=products.filter(p=>[p.sku,p.name,...p.aliases].some(a=>normalize(a)===key));
  if(matches.length!==1){issues.push('Exact catalog match required: '+item.requested_item);continue;}
  const p=matches[0],existing=lines.find(l=>l.sku===p.sku);
  if(existing)existing.quantity+=item.quantity;
  else lines.push({sku:p.sku,name:p.name,quantity:item.quantity,unit_price_cents:p.unit_price_cents,unit_cost_cents:p.unit_cost_cents,stock:p.stock,version:p.version,verified_at:p.verified_at,evidence:item.evidence});
 }
 for(const l of lines)if(l.quantity>l.stock)issues.push('Insufficient stock: '+l.sku+'; requested '+l.quantity+', available '+l.stock);
 const q={id:quoteId,policyVersion:POLICY.version,createdAt:now,expiresAt:new Date(createdMs+POLICY.quoteTtlMs).toISOString(),requestText,lines,issues,status:issues.length?'NEEDS_CLARIFICATION':'AWAITING_REVIEW'};
 if(issues.length||!lines.length)return q;
 q.requested=economics(lines,discountBps,0);
 q.options=[{id:'LIST_PLUS_DELIVERY',label:'Keep catalog price + charge delivery',...economics(lines,0,POLICY.deliveryCostCents)},{id:'REQUESTED',label:'Requested discount + free delivery',...q.requested}];
 q.approvableOptions=q.options.filter(o=>o.passes);
 q.risk=q.requested.contributionCents<0?'LOSS':q.requested.passes?'WITHIN_POLICY':'BELOW_MARGIN';
 if(!q.approvableOptions.length){q.issues.push('No offered option meets minimum margin. Reprice with the supplier before continuing.');q.status='NEEDS_CLARIFICATION';}
 return q;
}
export function approveQuote(q,{decision,catalog,now}){
 if(q.status!=='AWAITING_REVIEW')throw new Error('QUOTE_NOT_AWAITING_REVIEW');
 if(millis(now)>=millis(q.expiresAt))throw new Error('QUOTE_EXPIRED');
 if(q.policyVersion!==POLICY.version)throw new Error('POLICY_CHANGED');
 if(decision==='REJECT')return {...q,status:'REJECTED',decidedAt:now};
 const chosen=q.approvableOptions.find(o=>o.id===decision);if(!chosen)throw new Error('OPTION_NOT_APPROVABLE');
 const current=catalog.map(r=>catalogRow(r,now));
 for(const l of q.lines){const p=current.filter(x=>x.sku===l.sku);if(p.length!==1||p[0].stock<l.quantity||p[0].version!==l.version||p[0].unit_price_cents!==l.unit_price_cents||p[0].unit_cost_cents!==l.unit_cost_cents)throw new Error('CATALOG_CHANGED_REVIEW_AGAIN');}
 const totals=economics(q.lines,chosen.discountBps,chosen.deliveryChargeCents);if(!totals.passes)throw new Error('MARGIN_GATE_FAILED');
 return {...q,status:'APPROVED_DRAFT',decidedAt:now,selectedOption:chosen.id,totals};
}
export function reviewHtml(q){
 const e=escapeHtml;
 if(q.status==='NEEDS_CLARIFICATION')return '<h2>Clarification required</h2><ul>'+q.issues.map(x=>'<li>'+e(x)+'</li>').join('')+'</ul><p>No customer quote created.</p>';
 const r=q.requested;
 return '<p class="dl-eyebrow">QUOTE PROTECTION / '+e(q.id)+' / EUR EX VAT</p><h2>'+e(q.risk==='LOSS'?money(r.listCents)+' sale. A loss-making discount.':'Review the commercial terms.')+'</h2><p class="dl-muted">Synthetic equipment supplier · contribution before overhead and tax, not net profit.</p><table class="dl-lines"><tr><th>Matched product</th><th>Qty</th><th>Available</th><th>Evidence from request</th></tr>'+q.lines.map(l=>'<tr><td>'+e(l.sku)+'</td><td>'+l.quantity+'</td><td>'+l.stock+'</td><td>'+e(l.evidence)+'</td></tr>').join('')+'</table><div class="dl-summary"><table><tr><td>Catalog sales</td><td>'+money(r.listCents)+'</td></tr><tr><td>Requested discount · '+(r.discountBps/100).toFixed(2)+'%</td><td>−'+money(r.discountCents)+'</td></tr><tr><td>Customer revenue · free delivery requested</td><td>'+money(r.revenueCents)+'</td></tr><tr><td>Procurement</td><td>−'+money(r.procurementCents)+'</td></tr><tr><td>Seller delivery cost</td><td>−'+money(r.deliveryCostCents)+'</td></tr><tr class="dl-result"><td>Contribution before overhead</td><td>'+money(r.contributionCents)+'</td></tr></table></div><h3>Protect the contribution. Keep the decision human.</h3><div class="dl-options">'+q.options.map(o=>'<div class="dl-option '+(o.passes?'dl-pass':'dl-block')+'"><span class="dl-badge">'+(o.passes?'ELIGIBLE FOR APPROVAL':'BLOCKED')+'</span><h3>'+e(o.label)+'</h3><div class="dl-amount">'+money(o.contributionCents)+'</div><p>Contribution before overhead<br>Customer total '+money(o.revenueCents)+' · margin '+(o.marginBps/100).toFixed(2)+'%</p></div>').join('')+'</div><p class="dl-muted">Demo policy: 10% minimum contribution margin. Confirm the matched products and quantities above. Stock and prices are checked again after your decision. No email, order, payment or stock reservation is made.</p>';
}
export function reviewFormFields(q){
 return JSON.stringify([{fieldType:'html',html:reviewHtml(q)},{fieldLabel:'Decision',fieldType:'dropdown',requiredField:true,fieldOptions:{values:[...q.approvableOptions.map(o=>({option:o.id})),{option:'REJECT'}]}},{fieldLabel:'Review note',fieldType:'text',requiredField:true,placeholder:'Why did you choose these terms?'}]);
}
export function customerHtml(q){
 if(q.status!=='APPROVED_DRAFT'||!q.totals?.passes)throw new Error('NO_APPROVED_QUOTE');
 const e=escapeHtml,t=q.totals;
 // Explicit allowlist. Never serialize internal quote object or supplier costs into customer HTML.
 return '<!doctype html><html lang="en"><meta charset="utf-8"><title>DealLens proposal '+e(q.id)+'</title><style>body{font:16px system-ui;background:#eff3f1;color:#172d27;margin:0;padding:40px}main{max-width:850px;margin:auto;background:white;padding:48px;border-radius:20px}small{color:#56746a}h1{font-size:38px}table{width:100%;border-collapse:collapse}td,th{padding:16px 4px;text-align:left;border-bottom:1px solid #dce5df}.total{font-size:28px;font-weight:700}aside{padding:20px;background:#e9f4ed;border-radius:12px;margin-top:24px}</style><main><small>DEALLENS / INDEPENDENT ENGINEERING PROJECT</small><h1>Commercial proposal</h1><p>'+e(q.id)+' · EUR · prices exclude VAT</p><table><tr><th>Equipment</th><th>Qty</th><th>List unit price</th></tr>'+q.lines.map(l=>'<tr><td>'+e(l.name)+'<br><small>'+e(l.sku)+'</small></td><td>'+l.quantity+'</td><td>'+money(l.unit_price_cents)+'</td></tr>').join('')+'</table><p>Catalog subtotal: '+money(t.listCents)+'</p><p>Discount: '+money(t.discountCents)+'</p><p>Delivery charge: '+money(t.deliveryChargeCents)+'</p><p class="total">Total ex VAT: '+money(t.revenueCents)+'</p><aside>Approved draft only. Synthetic demonstration, not a binding offer. No stock reservation, order or payment has been made. Tax and final delivery terms require supplier confirmation.</aside><p><small>Review deadline: '+e(q.expiresAt)+'. Final order requires a fresh price and stock check.</small></p></main></html>';
}
