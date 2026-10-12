#!/usr/bin/env node
import assert from 'node:assert/strict';
const args=process.argv.slice(2);let prompt='';for await(const chunk of process.stdin)prompt+=chunk;
assert(args.includes('--dangerously-bypass-approvals-and-sandbox'));assert(!args.includes('--ignore-user-config'));
assert(!prompt.includes('read-only project access'));assert(prompt.includes('scripts/update-job.mjs'));
assert(prompt.includes('Complete current database'));assert(prompt.includes('"jobs":['));assert(prompt.includes('profile'));assert(prompt.includes('assets'));assert(prompt.includes('coverLetter'));
const event=value=>process.stdout.write(JSON.stringify(value)+'\n');
if(!args.includes('resume'))event({type:'thread.started',thread_id:'fake-thread-123'});else assert.equal(args[args.indexOf('resume')+1],'fake-thread-123');
event({type:'turn.started'});
if(prompt.endsWith('Checkpoint test')){await new Promise(r=>setTimeout(r,80));event({type:'item.started',item:{id:'partial',type:'command_execution',command:'read source',status:'in_progress'}});event({type:'item.updated',item:{id:'partial',type:'command_execution',aggregated_output:'Partial source output',status:'in_progress'}});setInterval(()=>{},1000);await new Promise(()=>{});}
else if(prompt.endsWith('Wait forever')){setInterval(()=>{},1000);await new Promise(()=>{});}
else if(prompt.endsWith('Fail this turn')){event({type:'turn.failed',error:{message:'Fixture failure'}});process.exitCode=1;}
else{event({type:'item.started',item:{type:'command_execution',id:'c1',command:'cat public/data/seed.json',status:'in_progress'}});await new Promise(r=>setTimeout(r,100));event({type:'item.completed',item:{type:'command_execution',id:'c1',aggregated_output:'Workspace source read <script>unsafe</script>',exit_code:0,status:'completed'}});event({type:'item.completed',item:{type:'agent_message',id:'a1',text:args.includes('resume')?'Continued the same session.':'Grounded in the full database.'}});event({type:'turn.completed'});}
