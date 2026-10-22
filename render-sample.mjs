import {createQuote,approveQuote} from './engine.mjs';
import {proposalPdf} from './proposal-pdf.mjs';
import {writeFileSync,mkdirSync} from 'node:fs';
const catalog=[{sku:'AIR-75',name:'Workshop compressor AIR-75',aliases:['AIR-75'],unit_price_cents:250000,unit_cost_cents:215000,stock:8,currency:'EUR',version:'demo-v1',verified_at:'2026-10-21T00:00:00.000Z'}];
let q=createQuote({quoteId:'DL-SAMPLE-R1',requestText:'2 AIR-75 compressors',discountBps:1000,extraction:{items:[{requested_item:'AIR-75',quantity:2,evidence:'2 AIR-75 compressors'}],uncertainties:[]},catalog,now:'2026-10-21T12:00:00Z'});
q=approveQuote(q,{decision:'LIST_PLUS_DELIVERY',catalog,now:'2026-10-21T12:01:00Z'});
mkdirSync('examples',{recursive:true});writeFileSync('examples/approved-proposal-sample.pdf',proposalPdf(q),'ascii');
console.log('Created sample PDF from approved customer-field allowlist.');
