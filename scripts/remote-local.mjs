import http from 'node:http';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
const config=JSON.parse(await readFile(new URL('../.local/remote.json',import.meta.url),'utf8'));
if(config.host!=='worksquad')throw Error('Unexpected SSH target');
const localPort=Number(process.env.PORT||4311),tunnelPort=4313;
let ssh,closing=false,retry;
function connect(){
 ssh=spawn('/usr/bin/ssh',['-N','-o','BatchMode=yes','-o','ExitOnForwardFailure=yes','-o','ConnectTimeout=10','-o','ServerAliveInterval=15','-o','ServerAliveCountMax=3','-L',`127.0.0.1:${tunnelPort}:127.0.0.1:4312`,config.host],{stdio:['ignore','ignore','pipe']});
 ssh.stderr.on('data',data=>process.stderr.write(data));
 ssh.on('error',e=>console.error(e.message));
 ssh.on('exit',()=>{if(!closing)retry=setTimeout(connect,3000);});
}
connect();
const server=http.createServer((req,res)=>{
 if(!['localhost','127.0.0.1'].includes(new URL('http://'+req.headers.host).hostname)){res.writeHead(403);res.end();return;}
 if(req.url==='/'){res.writeHead(302,{Location:'/cvwide/'});res.end();return;}
 const pathname=req.url.startsWith('/cvwide/')||req.url==='/cvwide'?req.url:'/cvwide'+req.url;
 const upstream=http.request({host:'127.0.0.1',port:tunnelPort,path:pathname,method:req.method,headers:req.headers},response=>{
  res.writeHead(response.statusCode,response.headers);response.pipe(res);
 });
 upstream.on('error',()=>{if(!res.headersSent)res.writeHead(503,{'Content-Type':'text/plain; charset=utf-8'});res.end('SSH connection unavailable. Retrying automatically.');});
 req.pipe(upstream);res.on('close',()=>upstream.destroy());
});
server.listen(localPort,'127.0.0.1',()=>console.log(`Shared CV Wide: http://localhost:${localPort}/cvwide/`));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{closing=true;clearTimeout(retry);ssh?.kill();server.close();setTimeout(()=>process.exit(0),100).unref();});
