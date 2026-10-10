import {readFile} from 'node:fs/promises';
export const rubric=JSON.parse(await readFile(new URL('./public/data/scoring-rubric.json',import.meta.url),'utf8'));
const sourceRef=s=>{if(s==='public/data/seed.json#profile.en')return true;try{return ['http:','https:'].includes(new URL(s).protocol);}catch{return false;}};
export function validateAssessment(input){
 const fail=message=>{const e=Error(message);e.statusCode=400;throw e;};
 if(!input||input.rubricVersion!==rubric.version)fail('Unsupported assessment rubric');
 if(!input.criteria||typeof input.criteria!=='object'||Array.isArray(input.criteria)||Object.keys(input.criteria).length!==rubric.criteria.length)fail('All five assessment criteria required');
 if(typeof input.evaluatedAt!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(input.evaluatedAt)||!Number.isFinite(Date.parse(input.evaluatedAt))||new Date(input.evaluatedAt.slice(0,10)+'T00:00:00Z').toISOString().slice(0,10)!==input.evaluatedAt.slice(0,10))fail('Invalid assessment date');
 if(typeof input.basis!=='string'||!input.basis.trim()||input.basis.length>10000)fail('Assessment basis required');
 if(!Array.isArray(input.sourceRefs)||!input.sourceRefs.length||input.sourceRefs.length>50||input.sourceRefs.some(s=>typeof s!=='string'||s.length>3000||!sourceRef(s)))fail('Assessment sources required');
 const criteria={};let total=0;
 for(const c of rubric.criteria){
  const value=input.criteria[c.id];
  if(!value||!Number.isFinite(value.score)||value.score<0||value.score>10||!Number.isInteger(value.score*2))fail('Criterion scores must be 0–10 in half-point steps');
  if(typeof value.reason!=='string'||!value.reason.trim()||value.reason.length>10000)fail('Criterion explanation required');
  criteria[c.id]={score:value.score,reason:value.reason};total+=value.score*c.weight;
 }
 if(!Array.isArray(input.unknowns)||input.unknowns.length>50||input.unknowns.some(s=>typeof s!=='string'||s.length>10000))fail('Invalid assessment uncertainties');
 return {rubricVersion:rubric.version,criteria,total:Math.round((total+Number.EPSILON)*10)/10,evaluatedAt:input.evaluatedAt,basis:input.basis,sourceRefs:[...new Set(input.sourceRefs)],unknowns:input.unknowns};
}
export function applyAssessments(state,input){
 const fail=message=>{const e=Error(message);e.statusCode=400;throw e;};
 if(!Array.isArray(input?.assessments)||!input.assessments.length||input.assessments.length>500)fail('Expected 1–500 assessments');
 const seen=new Set();
 const entries=input.assessments.map(entry=>{
  if(typeof entry?.jobId!=='string'||seen.has(entry.jobId)||!state.jobs.some(j=>j.id===entry.jobId))fail('Invalid or duplicate assessment job ID');
  seen.add(entry.jobId);return {jobId:entry.jobId,assessment:validateAssessment(entry.assessment)};
 });
 const next=structuredClone(state);
 for(const entry of entries){
  const job=next.jobs.find(j=>j.id===entry.jobId);
  if(job.assessment){job.assessmentHistory??=[];job.assessmentHistory.push(job.assessment);}
  job.assessment=entry.assessment;
  job.history.push({at:entry.assessment.evaluatedAt,type:'Assessment',text:`${rubric.version}: ${entry.assessment.total}/10; tracking status unchanged.`});
 }
 next.revision++;return next;
}
