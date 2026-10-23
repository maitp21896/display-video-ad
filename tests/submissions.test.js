const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const vm = require('node:vm');
const { createHandler } = require('../api/submissions');
const { callSheets, validateSubmission } = require('../lib/sheets');
const valid = { submissionId:'case-test-0123456789', name:'  Nguyễn An  ', answers:[{id:'reach',label:'untrusted label',answer:'Câu trả lời\n=1+2'}] };
async function api(t, upstream) {
 const handler=createHandler(upstream);
 const server=http.createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(()=>new Promise(r=>server.close(r)));
 return 'http://127.0.0.1:'+server.address().port;
}
test('partial submission is normalized, preserving answer text',()=>{
 const data=validateSubmission(valid);assert.equal(data.name,'Nguyễn An');assert.equal(data.answers.length,1);
 assert.equal(data.answers[0].label,'Case 1: Chọn cách mua quảng cáo thời trang');assert.equal(data.answers[0].answer,valid.answers[0].answer);
});
test('invalid and duplicate case submissions are rejected',()=>{
 for(const data of [{...valid,name:' '},{...valid,answers:[]},{...valid,answers:[{id:'unknown',answer:'x'}]},{...valid,answers:[valid.answers[0],valid.answers[0]]}])assert.throws(()=>validateSubmission(data));
});
test('API confirms only a matching saved submission ID',async t=>{
 const url=await api(t,async data=>({ok:true,submissionId:data.submissionId}));
 const r=await fetch(url,{method:'POST',body:JSON.stringify(valid)});assert.equal(r.status,200);assert.deepEqual(await r.json(),{ok:true,submissionId:valid.submissionId});
 const mismatch=await api(t,async()=>({ok:true,submissionId:'wrong-id'}));
 const bad=await fetch(mismatch,{method:'POST',body:JSON.stringify(valid)});assert.equal(bad.status,502);assert.equal((await bad.json()).ok,false);
});
test('public trainer API reads submissions without login or caching',async t=>{
 let request;const url=await api(t,async data=>{request=data;return {ok:true,submissions:[{id:'x',name:'An',answers:[]}]}});
 const response=await fetch(url);assert.equal(response.status,200);assert.deepEqual(request,{action:'list'});assert.equal(response.headers.get('cache-control'),'no-store');assert.equal((await response.json()).submissions[0].name,'An');
});
test('invalid JSON, cross-site writes and unsupported methods never reach Sheets',async t=>{
 let calls=0;const url=await api(t,async()=>{calls++;throw Error('Unexpected call')});
 assert.equal((await fetch(url,{method:'POST',body:'{'})).status,400);
 assert.equal((await fetch(url,{method:'POST',headers:{Origin:'https://other.example'},body:JSON.stringify(valid)})).status,403);
 assert.equal((await fetch(url,{method:'DELETE'})).status,405);assert.equal(calls,0);
});
test('upstream HTTP/auth/HTML/rejection/timeouts never become success',async()=>{
 for(const response of [new Response('error',{status:401}),new Response('<html>Login</html>'),Response.json({ok:false})]){
  await assert.rejects(callSheets(valid,async()=>response));
 }
 await assert.rejects(callSheets(valid,async()=>{throw new Error('offline')}));
 const accepted=await callSheets(valid,async(url,options)=>{assert.equal(options.method,'POST');assert.equal(JSON.parse(options.body).name,valid.name);return Response.json({ok:true,submissionId:valid.submissionId})});assert.equal(accepted.ok,true);
});
test('Apps Script supports public HTTP reads and idempotent writes',()=>{
 const rows=[];const sheet={getLastRow:()=>rows.length+1,getRange:()=>({createTextFinder:id=>({matchEntireCell:()=>({findNext:()=>rows.find(r=>r[0]===id)||null})}),setValues:r=>rows.push(...r),getDisplayValues:()=>rows.map(r=>r.map(String))})};
 const context={LockService:{getScriptLock:()=>({waitLock(){},hasLock:()=>true,releaseLock(){}})},SpreadsheetApp:{openById:()=>({getSheetByName:()=>sheet}),flush(){}},ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({setMimeType:()=>JSON.parse(text)})}};
 vm.createContext(context);vm.runInContext(fs.readFileSync('google-apps-script/Code.gs','utf8'),context);
 const data=validateSubmission(valid);const post=body=>context.doPost({postData:{contents:JSON.stringify(body)}});
 assert.equal(post(data).ok,true);assert.equal(post(data).ok,true);assert.equal(rows.length,1);
 assert.equal(rows[0][5],"'"+valid.answers[0].answer);
 const result=post({action:'list'});assert.equal(result.ok,true);assert.equal(result.submissions.length,1);
 assert.equal(result.submissions[0].answers[0].id,'reach');
});
test('website pages use same-origin API and no Google browser calls',()=>{
 for(const file of ['index.html','trainer.html']){
  const html=fs.readFileSync(file,'utf8');assert.ok(html.includes("fetch('/api/submissions'"));assert.ok(!html.includes('script.google.com'));assert.ok(!html.includes('google.script.run'));
 }
});

test('development server returns complete student and trainer HTML',async t=>{
 const server=require('../scripts/dev-server');
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const base='http://127.0.0.1:'+server.address().port;
 for(const [route,marker] of [['/','id="workspace"'],['/trainer','id="students"']]){
  const response=await fetch(base+route,{signal:AbortSignal.timeout(2000)});
  const body=await response.text();
  assert.equal(response.status,200);assert.ok(body.includes(marker));
  assert.equal(Number(response.headers.get('content-length')),Buffer.byteLength(body));
 }
 assert.equal((await fetch(base+'/missing')).status,404);
});
