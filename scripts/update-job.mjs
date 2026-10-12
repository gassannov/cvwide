import {pathToFileURL} from 'node:url';

export async function updateJob({base,password,id,changes}) {
 const url=new URL(base);
 if(url.protocol!=='http:'||!['127.0.0.1','localhost'].includes(url.hostname))throw Error('Tracking API must be loopback HTTP');
 if(typeof id!=='string'||!id)throw Error('Job ID required');
 if(!changes||typeof changes!=='object'||Array.isArray(changes)||!Object.keys(changes).length||Object.keys(changes).some(key=>!['status','notes','followUp'].includes(key)))throw Error('Only status, notes and followUp may be updated');
 let cookie='';
 if(password){
  const login=await fetch(new URL('api/session',url),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});
  if(!login.ok)throw Error(`Tracking login failed (${login.status})`);
  cookie=login.headers.get('set-cookie')?.split(';')[0]||'';
  if(!cookie)throw Error('Tracking login did not return a session');
 }
 const headers=cookie?{Cookie:cookie}:{};
 const snapshot=await fetch(new URL('api/state',url),{headers});
 if(!snapshot.ok)throw Error(`Could not read tracking state (${snapshot.status})`);
 const state=await snapshot.json();
 if(!state.jobs.some(job=>job.id===id))throw Error('Job not found');
 const result=await fetch(new URL('api/jobs/'+encodeURIComponent(id),url),{method:'PATCH',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({...changes,revision:state.revision})});
 const body=await result.json();
 if(!result.ok)throw Error(body.error||`Tracking update failed (${result.status})`);
 const job=body.jobs.find(job=>job.id===id);
 const changed=body.revision!==state.revision;
 return {changed,revision:body.revision,id:job.id,company:job.company,role:job.role,status:job.status,notes:job.notes,followUp:job.followUp,history:changed?job.history.at(-1):null};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const [id,changesJSON]=process.argv.slice(2);
  const base=`http://127.0.0.1:${process.env.PORT||4311}${process.env.CVWIDE_BASE_PATH||''}/`;
  const result=await updateJob({base,password:process.env.NOTES_PASSWORD,id,changes:JSON.parse(changesJSON)});
  console.log(JSON.stringify(result,null,2));
 }catch(error){console.error(error.message);process.exitCode=1;}
}
