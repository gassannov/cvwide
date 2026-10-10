import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {rubric,validateAssessment,applyAssessments} from '../assessments.mjs';
const valid=()=>({rubricVersion:rubric.version,criteria:Object.fromEntries(rubric.criteria.map((c,i)=>[c.id,{score:[10,8,6,4,2][i],reason:'Source-supported reason for '+c.id}])),evaluatedAt:'2026-10-10T10:00:00Z',basis:'Stored CV and descriptions; not refreshed',sourceRefs:['https://example.com/job','public/data/seed.json#profile.en'],unknowns:['Work eligibility unknown'],total:999});
test('assessment total follows versioned weighted rubric and requires complete rationales',()=>{
 assert.equal(rubric.criteria.reduce((s,c)=>s+c.weight,0),1);
 assert.equal(validateAssessment(valid()).total,7.3);
 assert.equal(validateAssessment({...valid(),evaluatedAt:'2026-10-10T01:00:00+03:00'}).total,7.3);
 for(const modify of [a=>a.rubricVersion='bad',a=>delete a.criteria.seniority,a=>a.criteria.technical.score=11,a=>a.criteria.technical.score=1.1,a=>a.criteria.evidence.reason='',a=>a.sourceRefs=[],a=>a.sourceRefs=['http://'],a=>a.evaluatedAt='2026-02-30T12:00:00Z',a=>a.evaluatedAt='1',a=>a.unknowns=5]){const a=valid();modify(a);assert.throws(()=>validateAssessment(a));}
});
test('assessment updates are additive, preserve tracking and retain prior assessments',async()=>{
 const seed=JSON.parse(await readFile('public/data/seed.json','utf8'));
 const original=structuredClone(seed);
 const next=applyAssessments(seed,{assessments:[{jobId:seed.jobs[0].id,assessment:valid()}]});
 assert.deepEqual(seed,original);assert.equal(next.revision,seed.revision+1);
 for(const [key,value] of Object.entries(seed.jobs[0]))if(key!=='history')assert.deepEqual(next.jobs[0][key],value);
 assert.deepEqual(next.jobs[0].history.slice(0,-1),seed.jobs[0].history);
 const later=applyAssessments(next,{assessments:[{jobId:seed.jobs[0].id,assessment:valid()}]});assert.deepEqual(later.jobs[0].assessmentHistory,[next.jobs[0].assessment]);
 assert.throws(()=>applyAssessments(seed,{assessments:[{jobId:seed.jobs[0].id,assessment:valid()},{jobId:'missing',assessment:valid()}]}));assert.deepEqual(seed,original);
 assert.throws(()=>applyAssessments(seed,{assessments:[{jobId:seed.jobs[0].id,assessment:valid()},{jobId:seed.jobs[0].id,assessment:valid()}]}));
});
