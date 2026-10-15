import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.BIANJING_PORT||4187);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');let file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(file!==root&&!file.startsWith(root+path.sep))throw Error('path');if((await stat(file)).isDirectory())file=path.join(file,'index.html');res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(await readFile(file));}catch{res.writeHead(404);res.end('Not found');}});
server.listen(port,'127.0.0.1',async()=>{
 console.log('Local: http://127.0.0.1:'+port);
 try{const response=await fetch('http://127.0.0.1:'+port+'/',{signal:AbortSignal.timeout(4000)});await response.arrayBuffer();console.log('Local readiness: HTTP '+response.status);}catch{console.log('Local readiness: unavailable');}
 if(process.argv.includes('--check'))server.close();
});
