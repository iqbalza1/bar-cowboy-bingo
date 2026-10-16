import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {freshGame,draw,strip} from './game.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const password=process.env.HOST_PASSWORD;
if(!password||password.length<12)throw Error('Set HOST_PASSWORD to at least 12 characters.');
const dir=process.env.DATA_DIR||path.join(root,'data');fs.mkdirSync(dir,{recursive:true});
const file=path.join(dir,'game.json');let game=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):freshGame();
function save(){game.updatedAt=new Date().toISOString();fs.writeFileSync(file+'.tmp',JSON.stringify(game));fs.renameSync(file+'.tmp',file);}
save();const sessions=new Map();
function send(res,status,data){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
function authed(req){const token=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('bingo_session='))?.slice(14);const expiry=sessions.get(token);return expiry>Date.now();}
async function body(req){let value='';for await(const chunk of req){value+=chunk;if(value.length>8192)throw Error('Request too large.');}return JSON.parse(value||'{}');}
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');
 if(req.method==='GET'&&url.pathname==='/api/state')return send(res,200,game);
 if(req.method==='GET'&&url.pathname==='/api/session')return send(res,200,{authenticated:authed(req)});
 if(req.method==='POST'&&url.pathname.startsWith('/api/')){
  if(req.headers['sec-fetch-site']==='cross-site')return send(res,403,{error:'Cross-site request rejected.'});
  if(!String(req.headers['content-type']).startsWith('application/json'))return send(res,415,{error:'JSON required.'});
  const data=await body(req);
  if(url.pathname==='/api/login'){
   const a=Buffer.from(String(data.password||'')),b=Buffer.from(password);
   if(a.length!==b.length||!timingSafeEqual(a,b))return send(res,401,{error:'Incorrect host password.'});
   for(const [key,expiry]of sessions)if(expiry<Date.now())sessions.delete(key);
   const token=randomBytes(32).toString('hex');sessions.set(token,Date.now()+12*60*60*1000);
   res.setHeader('Set-Cookie',`bingo_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${process.env.COOKIE_SECURE==='true'?'; Secure':''}`);return send(res,200,{ok:true});
  }
  if(!authed(req))return send(res,401,{error:'Please sign in as host.'});
  if(url.pathname==='/api/cards'){
   const count=Number(data.count);if(!Number.isInteger(count)||count<1||count>100)return send(res,400,{error:'Choose 1–100 strips.'});
   const batch=randomBytes(5).toString('hex').toUpperCase();return send(res,200,{batch,strips:Array.from({length:count},()=>strip())});
  }
  if(data.gameId!==game.id||data.revision!==game.updatedAt)return send(res,409,{error:'Game changed. Review the updated board and try again.'});
  const previous=JSON.stringify(game);
  try{
   switch(url.pathname){
    case '/api/draw':if(game.stage>=3)throw Error('All prizes have been awarded. Start a new game.');draw(game);break;
    case '/api/pause':game.paused=!game.paused;break;
    case '/api/winner':if(game.stage>=3)throw Error('All prizes have been recorded.');if(!game.draws.length)throw Error('Draw a number first.');game.winners.push({stage:game.stage,name:String(data.name||'Winner').trim().slice(0,80),draw:game.draws.length});game.stage++;break;
    case '/api/reset':game=freshGame();break;
    default:return send(res,404,{error:'Unknown action.'});
   }
   save();
  }catch(error){game=JSON.parse(previous);throw error;}
  return send(res,200,game);
 }
 if(req.method!=='GET')return send(res,405,{error:'Method not allowed.'});
 const assets={'/':'index.html','/tv':'index.html','/app.js':'app.js','/style.css':'style.css'};
 const asset=assets[url.pathname];if(!asset)return send(res,404,{error:'Not found.'});
 res.writeHead(200,{'Content-Type':asset.endsWith('.js')?'text/javascript':asset.endsWith('.css')?'text/css':'text/html','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; style-src 'self'; script-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"});res.end(fs.readFileSync(path.join(root,'public',asset)));
 }catch(error){send(res,400,{error:error.message});}});
server.listen(Number(process.env.PORT||3000),process.env.BIND_ADDRESS||'127.0.0.1',()=>console.log(`Bingo listening on port ${process.env.PORT||3000}`));

