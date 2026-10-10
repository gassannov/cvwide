import {test} from 'node:test';
import assert from 'node:assert/strict';
import {recordProcess} from '../process-log.mjs';
test('public process items update in place, expose tool details and clip large output',()=>{
 const turn={entries:[]};
 recordProcess(turn,{type:'item.started',item:{id:'cmd',type:'command_execution',command:'cat source.json',status:'in_progress'}});
 assert.equal(turn.entries[0].status,'running');
 recordProcess(turn,{type:'item.completed',item:{id:'cmd',type:'command_execution',exit_code:1,aggregated_output:'x'.repeat(25000)}});
 assert.equal(turn.entries.length,1);assert.equal(turn.entries[0].status,'failed');assert.match(turn.entries[0].detail,/cat source.json/);assert.match(turn.entries[0].detail,/Output clipped/);
 recordProcess(turn,{type:'item.completed',item:{id:'tool',type:'mcp_tool_call',server:'database',tool:'lookup',arguments:{company:'KitIngen'},result:{answer:'Found'}}});
 assert.match(turn.entries[1].detail,/KitIngen/);assert.match(turn.entries[1].detail,/Found/);
 recordProcess(turn,{type:'item.completed',item:{id:'reason',type:'reasoning',text:'PRIVATE REASONING',encrypted_content:'ENCRYPTED'}});
 assert.doesNotMatch(JSON.stringify(turn),/PRIVATE REASONING|ENCRYPTED/);
 recordProcess(turn,{type:'turn.completed',usage:{input_tokens:123,output_tokens:45}});
 assert.match(turn.entries.at(-1).detail,/123/);
});
