import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import http from 'node:http';
import path from 'node:path';
import {rubric} from '../assessments.mjs';
let child,dir,base;
async function start(){child=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'0',CVWIDE_DATA_DIR:dir},stdio:['ignore','pipe','pipe']});base=await new Promise((resolve,reject)=>{let output='';child.stdout.on('data',d=>{output+=d;const m=output.match(/http:\/\/localhost:(\d+)/);if(m)resolve(`http://localhost:${m[1]}`);});child.on('error',reject);child.on('exit',code=>reject(Error(`Server exited: ${code}`)));});}
async function stop(){const c=child;await new Promise(resolve=>{c.once('exit',resolve);c.kill();});}
before(async()=>{dir=await mkdtemp(path.join(os.tmpdir(),'cvwide-test-'));await start();});
after(async()=>{await stop();await rm(dir,{recursive:true,force:true});});
const get=async()=> (await fetch(base+'/api/state')).json();
const patch=async(id,body,headers={})=>fetch(base+'/api/jobs/'+id,{method:'PATCH',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
test('imports exactly the 11 source URLs with latest evidence and current CV bytes',{skip:process.env.CVWIDE_SYNTHETIC_TESTS==='1'?'Requires private Maratik source snapshots':false},async()=>{
 const state=await get();const report=await readFile('../maratik/output/job-applications/ods-2026-10-07.md','utf8');
 const urls=[...report.matchAll(/^\| \[.*?\]\((https:\/\/ods.ai\/jobs\/[^)]+)\)/gm)].map(x=>x[1]);
 assert.equal(state.jobs.length,11);assert.deepEqual(state.jobs.map(j=>j.url),urls);assert.equal(new Set(state.jobs.map(j=>j.id)).size,11);
 assert.equal(state.jobs.filter(j=>j.status==='Applied').length,10);assert.equal(state.jobs.find(j=>j.company==='KitIngen').status,'Under review');
 for(const company of ['Beeline','Sobolev Research Center']){const j=state.jobs.find(j=>j.company===company);assert.equal(j.appliedAt,'');assert.equal(j.channel,'Unknown');assert.equal(j.evidenceType,'User-confirmed');}
 assert.match(state.jobs.find(j=>j.company==='GetTransfer').letterTransmission,/Not transmitted/);
 for(const lang of ['en','ru']){const r=await fetch(base+`/assets/resume-${lang}.pdf`);assert.equal(r.status,200);assert.deepEqual(Buffer.from(await r.arrayBuffer()),await readFile(`../maratik/assets/resume-${lang}.pdf`));}
});
test('saves tracking updates atomically, blocks stale revisions and survives restart',async()=>{
 const state=await get();const id=state.jobs[0].id;
 const update=await patch(id,{revision:state.revision,status:'Interview',notes:'Recruiter call booked',followUp:'2026-10-15'});assert.equal(update.status,200);
 const updated=await update.json();assert.equal(updated.revision,state.revision+1);assert.equal(updated.jobs[0].history.at(-1).type,'Tracking update');
 const stale=await patch(id,{revision:state.revision,status:'Rejected'});assert.equal(stale.status,409);
 await stop();await start();const persisted=await get();assert.equal(persisted.jobs[0].status,'Interview');assert.equal(persisted.jobs[0].notes,'Recruiter call booked');assert.equal(persisted.jobs[0].followUp,'2026-10-15');
 const exportResponse=await fetch(base+'/api/export');assert.deepEqual(await exportResponse.json(),persisted);
});
test('concurrent edits preserve the first successful write and reject the conflicting one',async()=>{
 const s=await get();const r=await Promise.all([patch(s.jobs[1].id,{revision:s.revision,notes:'First'}),patch(s.jobs[2].id,{revision:s.revision,notes:'Second'})]);assert.deepEqual(r.map(x=>x.status).sort(),[200,409]);
 const backup=JSON.parse(await readFile(path.join(dir,'state.json.bak'),'utf8'));assert.equal(backup.revision,s.revision);
});
test('rejects invalid changes and cross-origin writes',async()=>{
 const s=await get(),id=s.jobs[0].id;
 for(const extra of [{status:'Fake'},{status:''},{followUp:'2026-02-30'},{notes:5}])assert.equal((await patch(id,{revision:s.revision,...extra})).status,400);
 assert.equal((await patch(id,{revision:s.revision,notes:'Bad'},{Origin:'https://other.example'})).status,403);
 const badHost=await new Promise((resolve,reject)=>{http.get(base+'/api/state',{headers:{Host:'other.example'}},r=>{r.resume();resolve(r.statusCode);}).on('error',reject);});assert.equal(badHost,403);
 assert.equal((await patch('missing',{revision:s.revision,status:'Applied'})).status,404);
 assert.equal((await get()).revision,s.revision);
});
test('serves main UI and assets with no external dependencies',async()=>{
 for(const file of ['/','/app.js','/style.css','/assets/font.css','/assets/application-report.md'])assert.equal((await fetch(base+file)).status,200,file);
 assert.equal((await fetch(base+'/server.mjs')).status,404);
 const html=await (await fetch(base+'/')).text();assert.match(html,/<dialog/);assert.match(html,/Career assets/);
});
test('collection import preserves tracking, deduplicates sources, validates and survives restart',async()=>{
 const original=await get();
 const collection={id:'linkedin-test-2026-10-10',label:'LinkedIn test',source:'LinkedIn + employer pages',collectedAt:'2026-10-10T10:00:00Z'};
 const job={company:'Test company',role:'ML Engineer',url:'https://example.com/jobs/1',description:'Production ML',fit:'Good',location:'Unknown',salary:'Unknown',channel:'Source posting',contact:'',research:{preference_grade:8,technical_fit_grade:9,seniority_fit_grade:7,sources:[{url:'https://example.com/jobs/1'}]}};
 const post=input=>fetch(base+'/api/collections/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
 for(const change of [{collection:{...collection,id:'../bad'}},{jobs:[{...job,research:{...job.research,preference_grade:20}}]},{jobs:[{...job,url:'javascript:alert(1)'}]}])assert.equal((await post({revision:original.revision,collection,jobs:[job],...change})).status,400);
 assert.deepEqual((await get()).jobs,original.jobs);
 const r=await post({revision:original.revision,collection,jobs:[job,job]});assert.equal(r.status,200);
 const result=await r.json();assert.equal(result.added,1);assert.deepEqual(result.state.jobs.slice(0,original.jobs.length),original.jobs);
 const saved=result.state.jobs.at(-1);assert.equal(saved.status,'Saved');assert.equal(saved.appliedAt,'');assert.deepEqual(saved.collectionIds,[collection.id]);
 assert.equal((await post({revision:original.revision,collection:{...collection,id:'stale-collection'},jobs:[job]})).status,409);
 assert.equal((await post({revision:result.state.revision,collection,jobs:[job]})).status,409);
 await patch(saved.id,{revision:result.state.revision,notes:'Retain this',status:'Interview',followUp:'2026-10-20'});
 const before=await get();const second=await post({revision:before.revision,collection:{...collection,id:'telegram-next-group',source:'Telegram'},jobs:[{...job,url:job.url+'?tracking=next'}]});assert.equal(second.status,200);
 const linked=await second.json();assert.equal(linked.added,0);assert.equal(linked.linked,1);assert.equal(linked.state.jobs.at(-1).notes,'Retain this');assert.equal(linked.state.jobs.at(-1).status,'Interview');assert.equal(linked.state.jobs.at(-1).followUp,'2026-10-20');
 const current=await get();const responses=await Promise.all(['group-a','group-b'].map(id=>post({revision:current.revision,collection:{...collection,id},jobs:[{...job,url:'https://example.com/jobs/'+id}]})));assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);
 const expected=await get();await stop();await start();assert.deepEqual(await get(),expected);
 const backup=JSON.parse(await readFile(path.join(dir,'state.json.bak'),'utf8'));assert.equal(backup.revision,current.revision);
});
test('bulk assessments validate atomically, serialize conflicts and persist after restart',async()=>{
 const initial=await get();const id=initial.jobs[0].id;
 const assessment={rubricVersion:rubric.version,criteria:Object.fromEntries(rubric.criteria.map(c=>[c.id,{score:7,reason:'Stored-source test rationale'}])),evaluatedAt:'2026-10-10T11:00:00Z',basis:'Frozen test profile and role',sourceRefs:[initial.jobs[0].url],unknowns:['Language unknown']};
 const post=(input,extra={})=>fetch(base+'/api/assessments',{method:'POST',headers:{'Content-Type':'application/json',...extra},body:JSON.stringify(input)});
 const input={revision:initial.revision,assessments:[{jobId:id,assessment}]};
 assert.equal((await post(input,{Origin:'https://other.example'})).status,403);
 assert.equal((await post({...input,assessments:[...input.assessments,{jobId:'missing',assessment}]})).status,400);
 assert.deepEqual(await get(),initial);
 const responses=await Promise.all([post(input),post(input)]);assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);
 const expected=await get();assert.equal(expected.jobs[0].assessment.total,7);
 for(const [key,value] of Object.entries(initial.jobs[0]))if(key!=='history')assert.deepEqual(expected.jobs[0][key],value);
 assert.deepEqual(expected.jobs[0].history.slice(0,-1),initial.jobs[0].history);
 assert.equal((await fetch(base+'/docs/job-scoring.md')).status,200);
 await stop();await start();assert.deepEqual(await get(),expected);
 assert.deepEqual(JSON.parse(await readFile(path.join(dir,'state.json.bak'),'utf8')),initial);
});
