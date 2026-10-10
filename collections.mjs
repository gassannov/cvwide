import {createHash} from 'node:crypto';
import {validateAssessment} from './assessments.mjs';
const legacyId='ods-maratik-2026-10-07';
export function migrateCollections(input){
 const state=structuredClone(input);
 if((state.schemaVersion||1)>2)throw Error('Unsupported state schema');
 state.schemaVersion=2;
 state.collections??=[{id:legacyId,label:'ODS · Maratik · 7 Oct 2026',source:'ODS / Maratik',collectedAt:'2026-10-10',sourceUrl:'https://ods.ai/jobs',note:'Historical import; exact collection time unknown.'}];
 for(const job of state.jobs)job.collectionIds??=[legacyId];
 return state;
}
const validUrl=s=>{try{return ['http:','https:'].includes(new URL(s).protocol);}catch{return false;}};
export function importCollection(current,input){
 const fail=message=>{const e=Error(message);e.statusCode=400;throw e;};
 if(!input||typeof input!=='object'||Array.isArray(input))fail('JSON object required');
 const c=input.collection;
 if(!c||typeof c!=='object'||Array.isArray(c))fail('Collection required');
 if(typeof c.id!=='string'||!/^[a-z0-9][a-z0-9_-]{2,119}$/.test(c.id))fail('Invalid collection ID');
 for(const key of ['label','source','collectedAt'])if(typeof c[key]!=='string'||!c[key].trim()||c[key].length>500)fail('Invalid collection '+key);
 if(!/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(c.collectedAt)||!Number.isFinite(Date.parse(c.collectedAt)))fail('Invalid collection time');
 if(c.sourceUrl!==undefined&&!validUrl(c.sourceUrl))fail('Invalid collection source URL');
 if(c.note!==undefined&&(typeof c.note!=='string'||c.note.length>10000))fail('Invalid collection note');
 if(!Array.isArray(input.jobs)||!input.jobs.length||input.jobs.length>500)fail('Expected 1–500 jobs');
 const jobs=input.jobs.map(j=>{
  if(!j||typeof j!=='object'||Array.isArray(j))fail('Invalid job');
  const out={};
  for(const key of ['company','role','url','description','fit','location','salary','channel','contact']){
   if(typeof j[key]!=='string'||j[key].length>30000)fail('Invalid job '+key);
   out[key]=j[key];
  }
  if(!out.company.trim()||!out.role.trim()||!validUrl(out.url))fail('Job company, role and source URL required');
  if(j.assessment!==undefined)out.assessment=validateAssessment(j.assessment);
  if(j.research!==undefined){
   if(!j.research||typeof j.research!=='object'||Array.isArray(j.research))fail('Invalid research');
   for(const key of ['preference_grade','technical_fit_grade','seniority_fit_grade'])if(typeof j.research[key]!=='number'||j.research[key]<0||j.research[key]>10)fail('Invalid research grade');
   if(!Array.isArray(j.research.sources)||!j.research.sources.length||j.research.sources.some(s=>!validUrl(s.url)))fail('Invalid research sources');
   out.research=structuredClone(j.research);
  }
  return out;
 });
 const next=migrateCollections(current);
 if(next.collections.some(g=>g.id===c.id)){const e=Error('Collection ID already exists');e.statusCode=409;throw e;}
 next.collections.push(Object.fromEntries(['id','label','source','collectedAt','sourceUrl','note'].filter(k=>c[k]!==undefined).map(k=>[k,c[k]])));
 const canonical=url=>{const u=new URL(url);u.search='';u.hash='';return u.href.replace(/\/$/,'');};
 let added=0,linked=0;
 for(const job of jobs){
  const existing=next.jobs.find(j=>canonical(j.url)===canonical(job.url));
  if(existing){if(!existing.collectionIds.includes(c.id)){existing.collectionIds.push(c.id);linked++;}continue;}
  const id='job-'+createHash('sha256').update(canonical(job.url)).digest('hex').slice(0,24);
  next.jobs.push({...job,id,collectionIds:[c.id],status:'Saved',appliedAt:'',dateNote:'Not submitted',evidenceType:'Collected opportunity',evidence:'Source posting collected; no application sent.',language:'Unknown',notes:'',followUp:'',coverLetter:'',letterTransmission:'No application text transmitted.',history:[{at:c.collectedAt,type:'Collected opportunity',text:'Imported collection '+c.id+'; no submission.'}]});added++;
 }
 next.revision++;
 return {state:next,added,linked};
}
