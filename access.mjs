import {randomBytes,timingSafeEqual,createHash} from 'node:crypto';
export function createAccess({password,basePath='',publicOrigin=''}) {
 const sessions=new Map(),attempts=new Map();
 if(basePath&&!/^\/[a-z0-9-]+$/.test(basePath))throw Error('Invalid base path');
 const origin=publicOrigin?new URL(publicOrigin).origin:'';
 if(origin&&!password)throw Error('Public service requires a password');
 const cookieName='cvwide_session',hash=value=>createHash('sha256').update(value).digest();
 const cookies=req=>Object.fromEntries((req.headers.cookie||'').split(';').map(s=>s.trim().split('=')));
 const valid=req=>{const token=cookies(req)[cookieName],expires=sessions.get(token);if(expires>Date.now())return true;if(token)sessions.delete(token);return false;};
 const hostAllowed=req=>{const host=new URL('http://'+(req.headers.host||'invalid')).hostname;return ['localhost','127.0.0.1',...(origin?[new URL(origin).hostname]:[])].includes(host);};
 const originAllowed=req=>{
  const hostOrigin='http://'+req.headers.host;
  if(!req.headers.origin)return !origin||!req.headers.host?.startsWith(new URL(origin).hostname);
  return (['localhost','127.0.0.1'].includes(new URL(hostOrigin).hostname)&&req.headers.origin===hostOrigin)||Boolean(origin&&req.headers.origin===origin);
 };
 function session(req,res,input,send){
  const ip=['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)&&origin&&req.headers.host===new URL(origin).host?req.headers['x-real-ip']||req.socket.remoteAddress:req.socket.remoteAddress;
  if((attempts.get(ip)?.until||0)>Date.now())return send(res,429,{error:'Try again later'});
  if(typeof input?.password!=='string'||!timingSafeEqual(hash(input.password),hash(password))){
   attempts.set(ip,{until:Date.now()+5000});return send(res,401,{error:'Wrong password'});
  }
  attempts.delete(ip);const token=randomBytes(32).toString('hex');sessions.set(token,Date.now()+30*86400000);
  for(const [key,expires]of sessions)if(expires<=Date.now())sessions.delete(key);
  for(const [key,value]of attempts)if(value.until<=Date.now())attempts.delete(key);
  res.setHeader('Set-Cookie',`${cookieName}=${token}; HttpOnly; SameSite=Strict; Path=${basePath||'/'}; Max-Age=2592000${origin.startsWith('https:')?'; Secure':''}`);
  send(res,200,{ok:true});
 }
 function reset(req,res){
  sessions.delete(cookies(req)[cookieName]);
  res.setHeader('Set-Cookie',`${cookieName}=; HttpOnly; SameSite=Strict; Path=${basePath||'/'}; Max-Age=0${origin.startsWith('https:')?'; Secure':''}`);
 }
 return {enabled:Boolean(password),basePath,hostAllowed,originAllowed,valid,session,reset};
}
