import http from 'node:http';
import {createAccess} from './access.mjs';
import {createChat} from './chat.mjs';
import {migrateCollections,importCollection} from './collections.mjs';
import {applyAssessments} from './assessments.mjs';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url));
const dataDir=process.env.CVWIDE_DATA_DIR || path.join(root,'data');
const access=createAccess({password:process.env.NOTES_PASSWORD,basePath:process.env.CVWIDE_BASE_PATH||'',publicOrigin:process.env.CVWIDE_PUBLIC_ORIGIN||''});
const statuses=['Saved','Applied','Under review','Interview','Offer','Rejected','Withdrawn'];
await mkdir(dataDir,{recursive:true});
const stateFile=path.join(dataDir,'state.json');
let state;
try {state=JSON.parse(await readFile(stateFile,'utf8'));} catch(e) {if(e.code!=='ENOENT') throw e;state=JSON.parse(await readFile(path.join(root,'public/data/seed.json'),'utf8'));}
state=migrateCollections(state);
async function persist(next) {
 const temporary=stateFile+'.tmp';
 await writeFile(temporary,JSON.stringify(next,null,2)+'\n',{mode:0o600});
 await writeFile(stateFile+'.bak.tmp',JSON.stringify(state,null,2)+'\n',{mode:0o600});
 await rename(stateFile+'.bak.tmp',stateFile+'.bak');
 await rename(temporary,stateFile);state=next;
}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.pdf':'application/pdf','.md':'text/plain; charset=utf-8','.svg':'image/svg+xml'};
function send(res,code,value){res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
async function body(req){let s='';for await(const part of req){s+=part;if(s.length>2000000)throw Error('Request too large');}return JSON.parse(s);}
let queue=Promise.resolve();
const chat=await createChat({root,dataDir,getState:()=>state});
const server=http.createServer(async(req,res)=>{
 try {
  if(!access.hostAllowed(req))return send(res,403,{error:'Local access only'});
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/healthz'&&req.method==='GET')return send(res,200,{ok:true,revision:state.revision});
  if(access.basePath){
   if(url.pathname===access.basePath){res.writeHead(301,{Location:access.basePath+'/'});res.end();return;}
   if(!url.pathname.startsWith(access.basePath+'/'))return send(res,404,{error:'Not found'});
   url.pathname=url.pathname.slice(access.basePath.length);
  }
  if(!['GET','HEAD'].includes(req.method)&&!access.originAllowed(req))return send(res,403,{error:'Origin rejected'});
  if(access.enabled&&url.pathname==='/api/session'&&req.method==='POST'){
   if(!req.headers['content-type']?.startsWith('application/json'))return send(res,415,{error:'JSON required'});
   let input;try{input=await body(req);}catch{return send(res,400,{error:'Invalid JSON request'});}
   return access.session(req,res,input,send);
  }
  if(access.enabled&&url.pathname==='/'&&['GET','HEAD'].includes(req.method)){access.reset(req,res);url.pathname='/login.html';}
  if(access.enabled&&!['/login.html','/login.js','/login.css'].includes(url.pathname)&&!access.valid(req))return send(res,401,{error:'Sign in required'});
  if(url.pathname==='/workspace')url.pathname='/index.html';
  if(url.pathname==='/api/chat' || url.pathname.startsWith('/api/chat/')){
   if(req.method==='POST'){
    if(!access.originAllowed(req))return send(res,403,{error:'Origin rejected'});
    if(!req.headers['content-type']?.startsWith('application/json'))return send(res,415,{error:'JSON required'});
   }
   let input={};if(req.method==='POST'){try{input=await body(req);}catch{return send(res,400,{error:'Invalid JSON request'});}}
   if(!input || typeof input!=='object' || Array.isArray(input))return send(res,400,{error:'JSON object required'});
   return await chat.handle(req,res,url,input,send);
  }
  if(req.method==='GET' && url.pathname==='/api/state')return send(res,200,state);
  if(['GET','HEAD'].includes(req.method)&&url.pathname==='/docs/job-scoring.md'){
   const content=await readFile(path.join(root,'docs/job-scoring.md'));
   res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:content);return;
  }
  if(req.method==='POST' && url.pathname==='/api/assessments'){
   if(!access.originAllowed(req))return send(res,403,{error:'Origin rejected'});
   if(!req.headers['content-type']?.startsWith('application/json'))return send(res,415,{error:'JSON required'});
   let input;try{input=await body(req);}catch{return send(res,400,{error:'Invalid JSON request'});}
   const action=queue.then(async()=>{
    if(input?.revision!==state.revision)return send(res,409,{error:'Workspace changed. Reload before grading.'});
    const next=applyAssessments(state,input);await persist(next);send(res,200,state);
   });queue=action.catch(()=>{});await action;return;
  }
  if(req.method==='POST' && url.pathname==='/api/collections/import'){
   if(!access.originAllowed(req))return send(res,403,{error:'Origin rejected'});
   if(!req.headers['content-type']?.startsWith('application/json'))return send(res,415,{error:'JSON required'});
   let input;try{input=await body(req);}catch{return send(res,400,{error:'Invalid JSON request'});}
   const action=queue.then(async()=>{
    if(input?.revision!==state.revision)return send(res,409,{error:'Workspace changed. Reload before importing.'});
    const result=importCollection(state,input);await persist(result.state);
    send(res,200,{state,added:result.added,linked:result.linked});
   });queue=action.catch(()=>{});await action;return;
  }
  if(req.method==='GET' && url.pathname==='/api/export'){res.setHeader('Content-Disposition','attachment; filename="cvwide-backup.json"');return send(res,200,state);}
  if(req.method==='PATCH' && url.pathname.startsWith('/api/jobs/')){
   if(!access.originAllowed(req))return send(res,403,{error:'Origin rejected'});
   if(!req.headers['content-type']?.startsWith('application/json'))return send(res,415,{error:'JSON required'});
   const input=await body(req);const id=decodeURIComponent(url.pathname.slice(10));
   const action=queue.then(async()=>{
    if(input.revision!==state.revision)return send(res,409,{error:'This application changed in another tab. Reload before saving.'});
    const job=state.jobs.find(j=>j.id===id);if(!job)return send(res,404,{error:'Job not found'});
    const changes={};
    for(const field of ['status','notes','followUp'])if(Object.hasOwn(input,field)){
     if(typeof input[field]!=='string' || input[field].length>10000)return send(res,400,{error:'Invalid '+field});changes[field]=input[field];
    }
    if(Object.hasOwn(changes,'status') && !statuses.includes(changes.status))return send(res,400,{error:'Invalid status'});
    if(changes.followUp && (!/^\d{4}-\d{2}-\d{2}$/.test(changes.followUp) || !Number.isFinite(Date.parse(changes.followUp)) || new Date(changes.followUp).toISOString().slice(0,10)!==changes.followUp))return send(res,400,{error:'Invalid follow-up date'});
    const next=structuredClone(state), target=next.jobs.find(j=>j.id===id);
    const difference=Object.entries(changes).filter(([key,value])=>job[key]!==value);
    if(difference.length){Object.assign(target,changes);target.history.push({at:new Date().toISOString(),type:'Tracking update',text:difference.map(([k,v])=>k==='notes'?'Notes updated':`${k}: ${job[k]||'None'} → ${v||'None'}`).join(' · ')});next.revision++;await persist(next);}
    send(res,200,state);
   });queue=action.catch(()=>{});await action;return;
  }
  if(!['GET','HEAD'].includes(req.method))return send(res,405,{error:'Method not allowed'});
  let pathname=decodeURIComponent(url.pathname);if(pathname==='/')pathname='/index.html';
  const file=path.resolve(root,'public','.'+pathname);
  if(!file.startsWith(path.join(root,'public')+path.sep))return send(res,403,{error:'Forbidden'});
  let content=await readFile(file);
  if(access.basePath&&['.html','.js','.css'].includes(path.extname(file))){
   content=Buffer.from(content.toString().replace(/(["'`(])\/(assets\/|api\/|data\/|docs\/|app\.js|style\.css|login\.js|login\.css|#)/g,(_,quote,rest)=>quote+access.basePath+'/'+rest).replace("const workspacePrefix='';",`const workspacePrefix='${access.basePath}';`));
  }
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'"});res.end(req.method==='HEAD'?undefined:content);
 }catch(e){send(res,e.statusCode||(e.code==='ENOENT'?404:500),{error:e.statusCode?e.message:e.code==='ENOENT'?'Not found':'Could not complete request'});console.error(e.message);}
});
server.listen(Number(process.env.PORT||4311),'127.0.0.1',()=>console.log(`CV Wide is running at http://localhost:${server.address().port}`));

for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{chat.close();server.close();process.exit(0);});
