import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,rm,mkdir} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
let dir,child,base;
async function start(bin=path.resolve('tests/fixtures/codex.mjs')){child=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'0',CVWIDE_DATA_DIR:dir,CVWIDE_CODEX_BIN:bin},stdio:['ignore','pipe','pipe']});base=await new Promise((resolve,reject)=>{let output='';child.stdout.on('data',d=>{output+=d;const m=output.match(/localhost:(\d+)/);if(m)resolve('http://localhost:'+m[1]);});child.on('error',reject);child.on('exit',c=>reject(Error('Server exited '+c)));});}
async function stop(){const p=child;await new Promise(r=>{p.once('exit',r);p.kill();});}
const get=async()=> (await fetch(base+'/api/chat')).json();
async function post(url,input={},headers={}){return fetch(base+url,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(input)});}
async function session(id){return (await get()).sessions.find(s=>s.id===id);}
async function done(id){for(let i=0;i<100;i++){const s=await session(id);if(!['running','stopping'].includes(s.status))return s;await new Promise(r=>setTimeout(r,20));}throw Error('Reply did not finish');}
before(async()=>{dir=await mkdtemp(path.join(os.tmpdir(),'cvwide-chat-'));await start();});
after(async()=>{await stop();await rm(dir,{recursive:true,force:true});});
test('streams database-grounded Codex replies, resumes exact thread, persists after restart',async()=>{
 const original=await (await fetch(base+'/api/state')).json();
 const s=await (await post('/api/chat')).json();const controller=new AbortController();const events=await fetch(base+`/api/chat/${s.id}/events`,{signal:controller.signal});assert.match(events.headers.get('content-type'),/event-stream/);const reader=events.body.getReader();assert.match(new TextDecoder().decode((await reader.read()).value),/New conversation/);
 const url=`/api/chat/${s.id}/messages`;const r=await post(url,{revision:0,message:'Prioritize my applications'});assert.equal(r.status,202);
 assert.equal((await post(url,{revision:0,message:'Stale'})).status,409);
 let final=await done(s.id);assert.equal(final.status,'idle');assert.equal(final.threadId,'fake-thread-123');assert.equal(final.messages[1].text,'Grounded in the full database.');
 assert.equal(final.turns.length,1);assert.equal(final.turns[0].id,final.messages[0].id);assert.equal(final.turns[0].status,'idle');const command=final.turns[0].entries.find(e=>e.kind==='command_execution');assert.equal(command.status,'completed');assert.match(command.detail,/cat public\/data\/seed.json/);assert.match(command.detail,/Workspace source read/);assert.ok(final.turns[0].entries.some(e=>e.kind==='turn.completed'));
 const stream=new TextDecoder().decode((await reader.read()).value);assert.match(stream,/running/);controller.abort();
 assert.equal((await post(url,{revision:final.revision,message:'Continue'})).status,202);final=await done(s.id);assert.equal(final.messages[3].text,'Continued the same session.');assert.equal(final.turns.length,2);assert.equal(final.turns[1].id,final.messages[2].id);
 await stop();await start();assert.deepEqual(await session(s.id),final);
 const backup=JSON.parse(await readFile(path.join(dir,'chat.json.bak'),'utf8'));assert.equal(backup.sessions[0].id,s.id);
 assert.deepEqual(await (await fetch(base+'/api/state')).json(),original);
});
test('validates input and origin, rejects concurrent turns, stops and recovers interrupted sessions',async()=>{
 const s=await (await post('/api/chat')).json(),url=`/api/chat/${s.id}/messages`;
 for(const message of ['',42,'a'.repeat(20001)])assert.equal((await post(url,{revision:0,message})).status,400);
 assert.equal((await post('/api/chat',{}, {Origin:'https://example.com'})).status,403);
 for(const body of ['null','[]','{'])assert.equal((await fetch(base+url,{method:'POST',headers:{'Content-Type':'application/json'},body})).status,400);
 assert.equal((await post(url,{revision:0,message:'Wait forever'})).status,202);let running=await session(s.id);
 assert.equal((await post(url,{revision:running.revision,message:'Concurrent'})).status,409);
 assert.equal((await post(`/api/chat/${s.id}/stop`,{revision:running.revision})).status,200);assert.equal((await done(s.id)).status,'stopped');
 let stopped=await session(s.id);assert.equal((await post(url,{revision:stopped.revision,message:'Wait forever'})).status,202);await stop();await start();assert.equal((await session(s.id)).status,'interrupted');assert.equal((await session(s.id)).turns.at(-1).status,'interrupted');
});
test('reports turn failure and missing Codex executable without hanging',async()=>{
 const s=await (await post('/api/chat')).json();await post(`/api/chat/${s.id}/messages`,{revision:0,message:'Fail this turn'});assert.equal((await done(s.id)).error,'Fixture failure');assert.ok((await session(s.id)).turns[0].entries.some(e=>e.label==='Turn failed'));
 await stop();await start('/missing/codex');const fresh=await (await post('/api/chat')).json();await post(`/api/chat/${fresh.id}/messages`,{revision:0,message:'Hello'});assert.equal((await done(fresh.id)).status,'error');assert.match((await session(fresh.id)).error,/ENOENT/);
});

test('failed chat writes preserve live revisions and allow retry including Stop',async()=>{
 await stop();await start();
 const before=await get();await mkdir(path.join(dir,'chat.json.tmp'));
 assert.equal((await post('/api/chat')).status,500);assert.deepEqual(await get(),before);
 await rm(path.join(dir,'chat.json.tmp'),{recursive:true});
 const s=await (await post('/api/chat')).json(),url=`/api/chat/${s.id}/messages`;
 await mkdir(path.join(dir,'chat.json.tmp'));
 assert.equal((await post(url,{revision:0,message:'Hello'})).status,500);assert.deepEqual(await session(s.id),s);
 await rm(path.join(dir,'chat.json.tmp'),{recursive:true});
 await post(url,{revision:0,message:'Wait forever'});
 for(let i=0;i<100 && !(await session(s.id)).threadId;i++)await new Promise(r=>setTimeout(r,20));
 await new Promise(r=>setTimeout(r,50));
 const running=await session(s.id);await mkdir(path.join(dir,'chat.json.tmp'));
 assert.equal((await post(`/api/chat/${s.id}/stop`,{revision:running.revision})).status,500);assert.equal((await session(s.id)).status,'running');assert.equal((await session(s.id)).revision,running.revision);
 await rm(path.join(dir,'chat.json.tmp'),{recursive:true});
 assert.equal((await post(`/api/chat/${s.id}/stop`,{revision:running.revision})).status,200);assert.equal((await done(s.id)).status,'stopped');
});

test('checkpoints partial process output during a running turn and retains it across restart',async()=>{
 const s=await (await post('/api/chat')).json();
 await post(`/api/chat/${s.id}/messages`,{revision:0,message:'Checkpoint test'});
 let saved;
 for(let i=0;i<100;i++){
  saved=JSON.parse(await readFile(path.join(dir,'chat.json'),'utf8')).sessions.find(t=>t.id===s.id);
  if(saved?.turns[0].entries.some(e=>e.id==='partial'))break;
  await new Promise(r=>setTimeout(r,30));
 }
 const entry=saved.turns[0].entries.find(e=>e.id==='partial');assert.ok(entry,'partial activity checkpointed before process finishes');assert.match(entry.detail,/Partial source output/);assert.equal(entry.status,'running');
 await stop();await start();const recovered=await session(s.id);assert.equal(recovered.turns[0].status,'interrupted');assert.equal(recovered.turns[0].entries.find(e=>e.id==='partial').status,'interrupted');assert.match(recovered.turns[0].entries.find(e=>e.id==='partial').detail,/Partial source output/);
});
