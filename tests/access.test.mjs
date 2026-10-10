import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
test('password protects every private route, prefix assets work and revisions remain enforced',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'cvwide-access-'));
 const child=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'0',CVWIDE_DATA_DIR:dir,NOTES_PASSWORD:'1234',CVWIDE_BASE_PATH:'/cvwide',CVWIDE_PUBLIC_ORIGIN:'https://maratik.fun'},stdio:['ignore','pipe','pipe']});
 try{
  const base=await new Promise((resolve,reject)=>{let output='';child.stdout.on('data',d=>{output+=d;const match=output.match(/http:\/\/localhost:(\d+)/);if(match)resolve(match[0]);});child.once('exit',()=>reject(Error('Server stopped')));});
  const prefix=base+'/cvwide';
  assert.equal((await fetch(base+'/cvwide',{redirect:'manual'})).headers.get('location'),'/cvwide/');
  const login=await(await fetch(prefix+'/')).text();assert.match(login,/password-slots/);assert.match(login,/\/cvwide\/login.js/);
  for(const route of ['/api/state','/api/chat','/api/export','/assets/resume-en.pdf','/data/seed.json','/workspace','/index.html'])assert.equal((await fetch(prefix+route)).status,401,route);
  const headers={'Content-Type':'application/json',Origin:base};
  assert.equal((await fetch(prefix+'/api/session',{method:'POST',headers:{...headers,Origin:'https://evil.example'},body:'{"password":"1234"}'})).status,403);
  const result=await fetch(prefix+'/api/session',{method:'POST',headers,body:'{"password":"1234"}'});assert.equal(result.status,200);
  const cookie=result.headers.get('set-cookie');assert.match(cookie,/HttpOnly; SameSite=Strict; Path=\/cvwide;.*Secure/);
  const auth={Cookie:cookie.split(';')[0]};
  const state=await(await fetch(prefix+'/api/state',{headers:auth})).json();
  const page=await(await fetch(prefix+'/workspace',{headers:auth})).text();assert.match(page,/\/cvwide\/app.js/);
  const app=await(await fetch(prefix+'/app.js',{headers:auth})).text();assert.match(app,/const workspacePrefix='\/cvwide'/);assert.match(app,/fetch\('\/cvwide\/api\/state'/);
  assert.equal((await fetch(prefix+'/api/jobs/'+state.jobs[0].id,{method:'PATCH',headers:{...headers,...auth},body:JSON.stringify({revision:state.revision-1,notes:'stale'})})).status,409);
  const publicWrite=await new Promise((resolve,reject)=>{const req=http.request(prefix+'/api/session',{method:'POST',headers:{Host:'maratik.fun','Content-Type':'application/json'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);req.end('{"password":"1234"}');});assert.equal(publicWrite,403);
  const wrong=await fetch(prefix+'/api/session',{method:'POST',headers,body:'{"password":"0000"}'});assert.equal(wrong.status,401);
  assert.equal((await fetch(prefix+'/api/session',{method:'POST',headers,body:'{"password":"1234"}'})).status,429);
 }finally{if(child.exitCode===null){const exited=new Promise(resolve=>child.once('exit',resolve));child.kill();await exited;}await rm(dir,{recursive:true,force:true});}
});
