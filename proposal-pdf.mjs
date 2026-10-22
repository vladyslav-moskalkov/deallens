// Dependency-free, ASCII-only PDF writer for the English equipment catalog.
// Serializes an explicit customer-field allowlist. Never serialize the quote object.
export function proposalPdf(q){
 if(q.status!=='APPROVED_DRAFT'||q.totals?.passes!==true)throw new Error('PDF_REQUIRES_APPROVED_QUOTE');
 const ascii=v=>{const s=String(v);if(!/^[\x20-\x7E\n\r]*$/.test(s))throw new Error('PDF_UNSUPPORTED_CHARACTER');return s;};
 const literal=v=>ascii(v).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)').replace(/[\r\n]/g,' ');
 const amount=c=>'EUR '+((c===0?0:c)/100).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
 const wrap=(s,max)=>{const words=ascii(s).split(/\s+/),lines=[];let line='';for(let w of words){if(w.length>max)throw new Error('PDF_UNBREAKABLE_TEXT');if((line+' '+w).trim().length>max){lines.push(line);line=w;}else line=(line+' '+w).trim();}if(line)lines.push(line);return lines;};
 const pages=[];let ops=[],y=0;
 const color=(rgb,stroke=false)=>rgb.map(v=>v.toFixed(3)).join(' ')+(stroke?' RG':' rg');
 const text=(x,yy,s,size=10,bold=false,rgb=[.11,.20,.16])=>ops.push(color(rgb)+` BT /${bold?'F2':'F1'} ${size} Tf 1 0 0 1 ${x} ${yy} Tm (${literal(s)}) Tj ET`);
 const rect=(x,yy,w,h,rgb)=>ops.push(color(rgb)+` ${x} ${yy} ${w} ${h} re f`);
 const line=(yy)=>ops.push(color([.82,.87,.84],true)+` 0.5 w 48 ${yy} m 547 ${yy} l S`);
 const begin=()=>{ops=[];rect(0,818,595,24,[.08,.22,.16]);text(48,780,'DEALLENS',15,true);text(366,781,'COMMERCIAL PROPOSAL',10,true);text(48,752,'APPROVED DRAFT / '+ascii(q.id),10);text(48,734,'EUR - prices exclude VAT',9,false,[.38,.46,.41]);line(718);y=680;};
 const finish=()=>{line(84);text(48,65,'INDEPENDENT ENGINEERING PROJECT - SYNTHETIC DEMONSTRATION',7,true,[.38,.46,.41]);text(48,50,'Not a binding offer. No order, stock reservation, payment or email send.',7,false,[.38,.46,.41]);text(508,50,'Page '+(pages.length+1),7,false,[.38,.46,.41]);pages.push(ops.join('\n'));};
 const ensure=h=>{if(y-h<120){finish();begin();}};
 const header=()=>{text(48,y,'EQUIPMENT',8,true);text(330,y,'QTY',8,true);text(375,y,'LIST UNIT PRICE',8,true);text(475,y,'LIST TOTAL',8,true);y-=14;line(y);y-=20;};
 begin();header();
 for(const l of q.lines){const lines=wrap(l.name,42);const h=lines.length*14+30;if(y-h<130){finish();begin();header();}for(const [i,s]of lines.entries())text(48,y-i*14,s,10,i===0);text(48,y-lines.length*14,l.sku,8,false,[.38,.46,.41]);text(335,y,String(l.quantity));text(375,y,amount(l.unit_price_cents),9);text(475,y,amount(l.quantity*l.unit_price_cents),9);y-=h;line(y+10);}
 ensure(235);y-=15;const totals=q.totals;
 for(const [label,value]of [['Catalog subtotal',totals.listCents],['Discount ('+(totals.discountBps/100).toFixed(2)+'%)',-totals.discountCents],['Delivery charge',totals.deliveryChargeCents]]){text(310,y,label,10);text(465,y,amount(value),10);y-=24;}
 rect(292,y-24,255,47,[.90,.95,.92]);text(307,y-7,'TOTAL EX VAT',10,true);text(423,y-8,amount(totals.revenueCents),16,true);y-=65;
 for(const s of wrap('Approved terms: '+(q.selectedOption==='LIST_PLUS_DELIVERY'?'catalog equipment prices with delivery charged separately.':'requested discount and stated delivery charge.'),83)){text(48,y,s,9);y-=14;}
 for(const s of wrap('Final tax and delivery terms require supplier confirmation. Prices and availability must be checked again before an order is accepted.',83)){text(48,y,s,9);y-=14;}
 text(48,y-10,'Review deadline (UTC): '+ascii(q.expiresAt),8,false,[.38,.46,.41]);finish();
 const objects=['','<< /Type /Catalog /Pages 2 0 R >>','', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'];
 const kids=[];
 for(const stream of pages){const p=objects.length,c=p+1;kids.push(p+' 0 R');objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${c} 0 R >>`);objects.push('<< /Length '+stream.length+' >>\nstream\n'+stream+'\nendstream');}
 objects[2]='<< /Type /Pages /Kids ['+kids.join(' ')+'] /Count '+pages.length+' >>';
 let pdf='%PDF-1.4\n%DEALLENS\n';const offsets=[0];for(let i=1;i<objects.length;i++){offsets[i]=pdf.length;pdf+=i+' 0 obj\n'+objects[i]+'\nendobj\n';}const xref=pdf.length;pdf+='xref\n0 '+objects.length+'\n0000000000 65535 f \n';for(let i=1;i<objects.length;i++)pdf+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';pdf+='trailer\n<< /Size '+objects.length+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n';return pdf;
}
