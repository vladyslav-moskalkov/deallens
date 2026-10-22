import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {aiParameters} from './extraction-config.mjs';
const root=dirname(fileURLToPath(import.meta.url)),out=join(root,'workflows');mkdirSync(out,{recursive:true});
const core=readFileSync(join(root,'engine.mjs'),'utf8').replace(/^export /gm,'');
const rules=readFileSync(join(root,'email-rules.mjs'),'utf8').replace(/^import .*;\n/gm,'').replace(/^export /gm,'');
const pdf=readFileSync(join(root,'proposal-pdf.mjs'),'utf8').replace(/^export /gm,'');
const catalogId=process.env.DEALLENS_CATALOG_ID||'REPLACE_CATALOG_TABLE_ID',journalId=process.env.DEALLENS_JOURNAL_ID||'REPLACE_QUOTES_TABLE_ID';
const ns=[],connections={};let seq=0;
const add=(name,type,parameters,position,v=1,extra={})=>{ns.push({id:'dl2_'+(++seq),name,type:type.startsWith('@')?type:'n8n-nodes-base.'+type,typeVersion:v,position,parameters,...extra});return name;};
const edge=(a,b,output=0,input=0)=>{connections[a]??={main:[]};connections[a].main[output]??=[];connections[a].main[output].push({node:b,type:'main',index:input});};
const field=(fieldLabel,fieldType,extra={})=>({fieldLabel,fieldType,...extra});
const table=id=>({__rl:true,value:id,mode:'id'});
const schema=['quote_id','status','snapshot_json','draft_id'].map(id=>({id,displayName:id,required:false,defaultMatch:false,display:true,type:'string',canBeUsedToMatch:true}));
const mapping=value=>({mappingMode:'defineBelow',value,matchingColumns:[],schema});
const get=(id,conditions)=>({resource:'row',operation:'get',dataTableId:table(id),...(conditions?{matchType:'allConditions',filters:{conditions}}:{}),returnAll:true});
const filter=(keyName,keyValue)=>({keyName,condition:'eq',keyValue});
const expr=name=>'$("'+name+'")';
const iff=(name,leftValue,pos)=>add(name,'if',{conditions:{options:{caseSensitive:true,leftValue:'',typeValidation:'strict',version:2},conditions:[{id:name,leftValue,rightValue:true,operator:{type:'boolean',operation:'true',singleValue:true}}],combinator:'and'},options:{}},pos,2.2);
const end=(name,html,pos)=>add(name,'form',{operation:'completion',respondWith:'showText',responseText:html,options:{}},pos);
const code=(name,body,pos,includeRules=false)=>add(name,'code',{jsCode:core+(includeRules?'\n'+rules:'')+'\n'+body},pos,2);
const css=':root{--font-family:system-ui,sans-serif;--container-width:900px;--color-background:#edf3ef;--color-header:#17382b;--color-html-text:#253d31;--color-submit-btn-bg:#1b6446;--color-card-border:#d6e4da;--font-size-header:28px;--border-radius-card:18px;--padding-card:32px}table{width:100%;border-collapse:collapse;margin:20px 0;font-size:13px}td,th{padding:12px;text-align:left;border-bottom:1px solid #dce7df;vertical-align:top}thead{background:#e9f2ec}th{font-size:11px;letter-spacing:.6px}tfoot{background:#f8e9e7;color:#963e38}tfoot strong{font-size:24px}h2{font-size:29px!important;line-height:1.15!important}h3{font-size:18px!important}p{line-height:1.5!important}table:last-of-type td{width:50%;background:#f3f7f4}table:last-of-type h2{color:#185a3b;font-size:38px!important}@media(max-width:600px){td,th{padding:7px}h2{font-size:24px!important}table:last-of-type h2{font-size:29px!important}}';
const start=add('01 · Manager launches labelled email review','formTrigger',{formTitle:'DealLens | Email to approved proposal',formDescription:'Closed test. Reads one email only from DealLens-Test with [DEALLENS-DEMO] subject. No background inbox processing. Verify the requested discount. Start a NEW revision only when intentionally recalculating.',formFields:{values:[field('Manager-verified discount (%)','number',{requiredField:true,defaultValue:10}),field('Revision','number',{requiredField:true,defaultValue:1}),field('Operator reference','text',{requiredField:true,placeholder:'Internal synthetic test'})]},responseMode:'onReceived',options:{buttonLabel:'Load test email',appendAttribution:false,customCss:css}},[0,220],2.3,{webhookId:'deallens-email-v2-test'});
const gmail=add('02 · Gmail — read one labelled test request','gmail',{authentication:'oAuth2',resource:'message',operation:'getAll',returnAll:false,limit:1,simple:false,filters:{q:'label:"DealLens-Test" subject:"[DEALLENS-DEMO]" -in:drafts',readStatus:'both',includeSpamTrash:false},options:{downloadAttachments:false}},[240,220],2.1,{alwaysOutputData:true});
const found=iff('03 · Test email found','={{ typeof $json.id === "string" }}',[480,220]);
const noemail=end('No test email — stop','<h2>No labelled test email found</h2><p>Apply DealLens-Test to the [DEALLENS-DEMO] request in the connected Gmail account. Nothing was sent or drafted.</p>',[700,650]);
const normalize=code('04 · Bound email scope and explicit revision',`const launch=$('${start}').first().json;return [{json:normalizeTestEmail($json,{discount:launch['Manager-verified discount (%)'],revision:launch.Revision,operatorReference:launch['Operator reference']})}];`,[720,120],true);
const preflight=add('05 · Journal — check message revision', 'dataTable',get(journalId,[filter('quote_id','={{ $json.quoteId }}')]),[960,120],1,{alwaysOutputData:true});
const unseen=iff('06 · New revision only','={{ !$json.quote_id }}',[1200,120]);
const duplicate=end('Existing revision — do not duplicate','<h2>This email revision already exists</h2><p>No model call, PDF or draft was created. Review its journal state. Use a new revision number only for an intentional new calculation. Do not automatically retry failed artifact creation.</p>',[1440,650]);
const ai=add('07 · OpenAI — extract items with evidence','@n8n/n8n-nodes-langchain.openAi',{...aiParameters,responses:{values:[{role:'user',content:'={{ '+expr(normalize)+'.first().json.requestText }}',type:'text'}]}},[1440,20],2);
const read=add('08 · Read current supplier catalog','dataTable',get(catalogId),[1680,20],1,{alwaysOutputData:true});
const calc=code('09 · Deterministic quote and source snapshot',`const raw=$('${ai}').first().json;if(raw.status!=='completed')throw new Error('AI_RESPONSE_NOT_COMPLETE');const msg=raw.output?.find(x=>x.type==='message'),content=msg?.content?.find(x=>x.type==='output_text');if(!content||msg?.content?.some(x=>x.type==='refusal'))throw new Error('AI_EXTRACTION_REFUSED');const extraction=typeof content.text==='string'?JSON.parse(content.text):content.text;const input=$('${normalize}').first().json;const q=createQuote({quoteId:input.quoteId,requestText:input.requestText,discountBps:input.discountBps,extraction,catalog:$input.all().map(x=>x.json),now:$now.toUTC().toISO()});q.source={messageId:input.messageId,subject:input.subject,revision:input.revision};q.operatorReference=input.operatorReference;q.aiAudit={purpose:'requested_items_and_quantities',promptVersion:'deallens-extraction-v1',model:raw.model,responseId:raw.id,status:raw.status,usage:raw.usage,extraction};return [{json:{quote_id:q.id,status:q.status,snapshot_json:JSON.stringify(q),reviewHtml:reviewHtmlV2(q),reviewFields:q.status==='AWAITING_REVIEW'?reviewFieldsV2(q):'[]'}}];`,[1920,20],true);
const persist=add('10 · Journal — store pending quote','dataTable',{resource:'row',operation:'insert',dataTableId:table(journalId),columns:mapping({quote_id:'={{ $json.quote_id }}',status:'={{ $json.status }}',snapshot_json:'={{ $json.snapshot_json }}',draft_id:''}),options:{}},[2160,20]);
const eligible=iff('11 · Complete grounded request','={{ $json.status === "AWAITING_REVIEW" }}',[2400,20]);
const clarify=end('Clarification — no proposal','={{ '+expr(calc)+'.first().json.reviewHtml }}',[2640,650]);
const review=add('12 · Manager approves commercial terms','form',{operation:'page',defineForm:'json',jsonOutput:'={{ '+expr(calc)+'.first().json.reviewFields }}',options:{formTitle:'DealLens | Commercial review',formDescription:'Internal screen. Verify products, quantity and commercial terms. Supplier costs must not reach customers.',buttonLabel:'Confirm and recheck catalog',customCss:css},limitWaitTime:true,resumeAmount:30,resumeUnit:'minutes'},[2640,-80],1,{webhookId:'deallens-email-review-v2'});
const reload=add('13 · Reload pending approval state','dataTable',get(journalId,[filter('quote_id','={{ '+expr(calc)+'.first().json.quote_id }}')]),[2880,-80],1,{alwaysOutputData:true});
const fresh=add('14 · Recheck current cost price and stock','dataTable',get(catalogId),[3120,-80],1,{alwaysOutputData:true});
const decide=code('15 · Reject stale terms or approve safely',`const rows=$('${reload}').all().map(x=>x.json);if(rows.length!==1||rows[0].status!=='AWAITING_REVIEW')throw new Error('QUOTE_ALREADY_HANDLED_OR_MISSING');const form=$('${review}').first().json;const q=decideOrBlock(JSON.parse(rows[0].snapshot_json),{decision:form.Decision,catalog:$input.all().map(x=>x.json),now:$now.toUTC().toISO()});q.reviewNote=String(form['Review note']||'').slice(0,500);q.auditBoundary='Single closed-test operator; not authenticated multi-role approval';return [{json:{quote_id:q.id,status:q.status,snapshot_json:JSON.stringify(q),blockedHtml:q.status==='APPROVED_DRAFT'?'':blockedHtml(q),rowId:rows[0].id}}];`,[3360,-80],true);
const commit=add('16 · Journal — conditional decision commit','dataTable',{resource:'row',operation:'update',dataTableId:table(journalId),matchType:'allConditions',filters:{conditions:[filter('id','={{ $json.rowId }}'),filter('status','AWAITING_REVIEW')]},columns:mapping({status:'={{ $json.status }}',snapshot_json:'={{ $json.snapshot_json }}'}),options:{}},[3600,-80],1,{alwaysOutputData:true});
const verified=iff('17 · Verify durable decision','={{ $json.quote_id === '+expr(decide)+'.first().json.quote_id && $json.status === '+expr(decide)+'.first().json.status && $json.snapshot_json === '+expr(decide)+'.first().json.snapshot_json }}',[3840,-80]);
const conflict=add('Conflict — release no artifact','stopAndError',{errorMessage:'Decision was not persisted. No PDF or draft released. Inspect journal before retry.'},[4080,650]);
const artifactConflict=add('Artifact conflict — inspect existing draft','stopAndError',{errorMessage:'Gmail draft may already exist, but its journal reference was not verified. Do not retry automatically. Inspect the draft output and journal; no email was sent.'},[5280,200]);
const approved=iff('18 · Only approved terms reach PDF','={{ $json.status === "APPROVED_DRAFT" }}',[4080,-180]);
const blocked=end('Requote required — no PDF or draft','={{ '+expr(decide)+'.first().json.blockedHtml }}',[4320,420]);
const makepdf=add('19 · Generate customer-safe PDF','code',{jsCode:pdf+`\nconst q=JSON.parse($json.snapshot_json);const data=await this.helpers.prepareBinaryData(Buffer.from(proposalPdf(q),'ascii'),'DealLens-'+q.id+'.pdf','application/pdf');return [{json:{quote_id:q.id,quoteRowId:$json.id,approved_snapshot_json:$json.snapshot_json},binary:{proposal:data}}];`},[4320,-280],2);
const draft=add('20 · Gmail — save draft with PDF NO SEND','gmail',{authentication:'oAuth2',resource:'draft',operation:'create',subject:'={{ "[DRAFT-DEMO] Proposal " + $json.quote_id }}',emailType:'text',message:'Synthetic demonstration — approved draft only. Please review the attached equipment proposal. Prices exclude VAT. Final tax, delivery, stock and order terms require supplier confirmation. No order, reservation or payment has been made. This draft has no recipient and has not been sent.',options:{attachmentsUi:{attachmentsBinary:[{property:'proposal'}]}}},[4560,-280],2.1);
const record=add('21 · Journal — record draft ID','dataTable',{resource:'row',operation:'update',dataTableId:table(journalId),matchType:'allConditions',filters:{conditions:[filter('id','={{ '+expr(makepdf)+'.first().json.quoteRowId }}'),filter('status','APPROVED_DRAFT')]},columns:mapping({status:'DRAFT_READY',draft_id:'={{ $json.id }}'}),options:{}},[4800,-280],1,{alwaysOutputData:true});
const saved=iff('22 · Verify draft reference stored','={{ $json.status === "DRAFT_READY" && typeof $json.draft_id === "string" && $json.draft_id === '+expr(draft)+'.first().json.id }}',[5040,-280]);
const merge=add('23 · Restore verified PDF binary','merge',{mode:'combine',combineBy:'combineByPosition',options:{}},[5280,-380],3.2);
const done=add('24 · PDF ready — saved only as draft','form',{operation:'completion',respondWith:'returnBinary',inputDataFieldName:'proposal',completionTitle:'PDF ready. Gmail draft saved.',completionMessage:'The PDF is attached to a Gmail draft with no recipient. Nothing has been sent. Synthetic demonstration, not a binding offer.',options:{}},[5520,-380]);
for(const [a,b]of [[start,gmail],[gmail,found],[found,normalize],[normalize,preflight],[preflight,unseen],[unseen,ai],[ai,read],[read,calc],[calc,persist],[persist,eligible],[eligible,review],[review,reload],[reload,fresh],[fresh,decide],[decide,commit],[commit,verified],[verified,approved],[approved,makepdf],[makepdf,draft],[draft,record],[record,saved],[saved,merge],[merge,done]])edge(a,b);
edge(found,noemail,1);edge(unseen,duplicate,1);edge(eligible,clarify,1);edge(verified,conflict,1);edge(approved,blocked,1);edge(saved,artifactConflict,1);edge(makepdf,merge,0,1);
add('Guide · labelled email to evidence','stickyNote',{content:'# DEALLENS / EMAIL → EVIDENCE\nManager starts a closed test. One labelled [DEALLENS-DEMO] email only.\nNew revision guard → structured extraction → current catalog.\nAI extracts items; code calculates cents. No background inbox polling.',width:1650,height:200,color:5},[-20,-220]);
add('Guide · fresh cost before approval','stickyNote',{content:'# THE €5,000 SALE THAT LOSES €50\n10% discount + free delivery: €4,500 − €4,300 procurement − €250 delivery = −€50.\nList + delivery: €700 contribution BEFORE overhead. Demo policy: 10%.\nChange cost during review → REQUOTE_REQUIRED, not a stale PDF.',width:1650,height:200,color:3},[1740,-420]);
add('Guide · approved PDF not an email send','stickyNote',{content:'# HUMAN APPROVAL → RECHECK → PDF → GMAIL DRAFT\nSeparate catalog & journal. Conditional decision write + verification.\nPDF allowlist excludes supplier cost, margin, request and internal note.\nNo recipient / NO SEND node. Single-operator prototype, not ERP reservation.\nDo not publish the unauthenticated operator form.',width:1650,height:200,color:4},[3500,-660]);
// Presentation-only two-row layout. Expressions and connections retain their original names.
const branches={
 'No test email - stop':[-5264,752],
 'Existing revision - do not duplicate':[-4496,752],
 'Clarification - no proposal':[-3072,752],
 'Conflict - release no artifact':[-4368,1488],
 'Requote required - no PDF or draft':[-4112,1488],
 'Artifact conflict - inspect existing draft':[-3088,1488],
};
let noteIndex=0;
for(const node of ns){
 const k=Number.parseInt(node.name.slice(0,2),10);
 if(k>=1&&k<=11)node.position=[-5776+(k-1)*256+(k>=8?144:0),480];
 else if(k>=12&&k<=24)node.position=[-5776+(k-12)*256,1200];
 else if(node.type.endsWith('.stickyNote')){
  node.position=[-5776+(noteIndex++)*1088,48];
  node.parameters.width=1010;node.parameters.height=328;
  node.parameters.content=node.parameters.content.split('\n').map((s,i)=>i===0?s:'## '+s).join('\n\n');
 }else node.position=branches[node.name.replaceAll('—','-')];
 if(!Array.isArray(node.position))throw new Error('Missing layout for '+node.name);
 // Form webhook IDs are generated in the importing instance, never copied from the author's server.
 delete node.webhookId;
}
writeFileSync(join(out,'deallens-email-to-approved-pdf.json'),JSON.stringify({name:'DealLens | B2B quote margin guard (PROTOTYPE)',nodes:ns,connections,settings:{executionOrder:'v1',timezone:'Europe/Madrid'},active:false,pinData:{},meta:{templateCredsSetupCompleted:false}},null,2));
console.log(JSON.stringify({nodes:ns.length,codeNodes:ns.filter(n=>n.type.endsWith('.code')).length,catalogId,journalId}));
