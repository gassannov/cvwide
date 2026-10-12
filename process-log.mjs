import {randomUUID} from 'node:crypto';

// Retain public CLI activity, never private reasoning payloads or encrypted state.
const clip=value=>{const text=typeof value==='string'?value:JSON.stringify(value,null,2);return text.length>24000?text.slice(0,24000)+'\n[Output clipped after 24,000 characters]':text;};
export function recordProcess(turn,event){
 const at=new Date().toISOString(),item=event.item;
 if(item){
  if(item.type==='agent_message')return; // The reply is rendered as a chat message below the process log.
  let entry=turn.entries.find(e=>e.id===item.id);
  if(!entry){entry={id:item.id||randomUUID(),kind:item.type,label:item.type.replaceAll('_',' '),at,status:'running',detail:''};turn.entries.push(entry);}
  entry.status=event.type==='item.completed'?(item.status==='failed'?'failed':'completed'):item.status==='in_progress'?'running':item.status||'running';
  const fields={};
  if(item.type==='command_execution'){
   entry.label='Run command';fields.command=item.command;fields.output=item.aggregated_output;fields.exitCode=item.exit_code;
   if(item.exit_code!=null && item.exit_code!==0)entry.status='failed';
  }else if(item.type==='reasoning'){
   entry.label='Working';entry.detail='Codex is processing the request.';return;
  }else if(item.type==='agent_message'){
   entry.label='Codex message';fields.message=item.text;
  }else{
   const labels={mcp_tool_call:'Call tool',web_search:'Search the web',file_change:'File changes',todo_list:'Plan',error:'Error'};
   entry.label=labels[item.type]||entry.label;
   for(const key of ['server','tool','arguments','result','error','query','action','changes','items','text'])if(item[key]!=null)fields[key]=item[key];
  }
  entry.fields={...entry.fields,...Object.fromEntries(Object.entries(fields).filter(([,v])=>v!=null).map(([k,v])=>[k,clip(v)]))};
  entry.detail=Object.entries(entry.fields).filter(([,v])=>v!=null).map(([k,v])=>`${k}: ${v}`).join('\n\n');
  if(event.type==='item.completed')entry.finishedAt=at;
  return;
 }
 const labels={'thread.started':'Session connected','turn.started':'Turn started','turn.completed':'Turn completed','turn.failed':'Turn failed','error':'Error'};
 if(!labels[event.type])return;
 const fields={};if(event.thread_id)fields.session=event.thread_id;
 if(event.usage){
  const usage=event.usage;
  const parts=[['input_tokens','Input'],['cached_input_tokens','Cached'],['cache_write_input_tokens','Cache write'],['output_tokens','Output'],['reasoning_output_tokens','Reasoning']]
   .filter(([key])=>Number.isFinite(usage[key])).map(([key,label])=>`${label}: ${usage[key].toLocaleString('en-US')}`);
  fields.usage=parts.length?parts.join(' · '):usage;
 }
 if(event.error?.message||event.message)fields.error=event.error?.message||event.message;
 turn.entries.push({id:randomUUID(),kind:event.type,label:labels[event.type],at,status:['error','turn.failed'].includes(event.type)?'failed':'completed',detail:Object.entries(fields).map(([k,v])=>`${k}: ${clip(v)}`).join('\n\n')});
}
