// Synthetic data only. Never replace real source snapshots when testing locally.
import {mkdir,writeFile,access} from 'node:fs/promises';
try{await access('public/data/seed.json');throw Error('Refusing to replace an existing seed');}catch(e){if(e.code!=='ENOENT')throw e;}
const job=i=>({id:'fixture-'+i,company:'Fixture company '+i,role:'Engineer',url:'https://fixture.invalid/seed/'+i,description:'Test role',fit:'Test fit',language:'English',evidence:'Synthetic fixture',channel:'Unknown',contact:'',location:'Unknown',salary:'Unknown',status:'Saved',appliedAt:'',dateNote:'Unknown',evidenceType:'Fixture',followUp:'',notes:'',coverLetter:'',letterTransmission:'Not sent',history:[]});
const profile={name:'Test person',role:'Engineer',summary:'Synthetic profile',sections:{},jobs:[],education:[],skills:[]};
await mkdir('public/data',{recursive:true});await mkdir('public/assets',{recursive:true});
await writeFile('public/data/seed.json',JSON.stringify({schemaVersion:1,revision:0,importedAt:'2026-10-10',source:'Synthetic CI fixture',profile:{en:profile,ru:profile},contacts:{},assets:[],jobs:Array.from({length:11},(_,i)=>job(i))}));
await writeFile('public/assets/application-report.md','Synthetic test fixture. No applications sent.');
