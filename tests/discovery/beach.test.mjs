import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
const origin=process.env.TEST_DISCOVERY_ORIGIN||'http://127.0.0.1:3117';
const key=process.env.TEST_DISCOVERY_ADMIN_KEY;
let cookie='';const owned=[];
async function call(path,method='GET',data,auth=false,extra={},requestOrigin=origin){const r=await fetch(origin+path,{method,headers:{'Content-Type':'application/json',Origin:requestOrigin,...(auth?{Cookie:cookie}:{}),...extra},...(data?{body:JSON.stringify(data)}:{})});const result=await r.json();return {status:r.status,result,headers:r.headers};}
const endpoint='/api/discovery/beach/orders';
try{
 assert.equal((await call(endpoint)).status,401);
 const login=await call('/api/discovery/session','POST',{key});assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';')[0];
 const baseline=await call('/api/discovery/invitations','GET',null,true);
 const credentials={key:randomBytes(32).toString('base64url'),requestId:randomBytes(16).toString('hex')};
 const payload={...credentials,location:'Guarda-sol TESTE AUTOMATIZADO',items:[{id:'coco',quantity:2,unitPrice:1}],total:1};
 assert.equal((await call(endpoint,'POST',{...payload,location:''})).status,400);
 assert.equal((await call(endpoint,'POST',{...payload,items:[{id:'coco',quantity:0}]})).status,400);
 assert.equal((await call(endpoint,'POST',payload,false,{},'https://untrusted.invalid')).status,403);
 const created=await call(endpoint,'POST',payload);assert.equal(created.status,201);owned.push(created.result.order);
 const o=created.result.order;assert.equal(o.total,2400);assert.equal(o.items[0].unitPrice,1200);assert.equal(o.keyHash,undefined);assert.equal(o._rid,undefined);
 const repeat=await call(endpoint,'POST',payload);assert.equal(repeat.status,200);assert.equal(repeat.result.order.number,o.number);
 assert.equal((await call(endpoint,'POST',{...payload,location:'Outro local'})).status,409);
 const lookup='/api/pedido/'+o.number;
 assert.equal((await call(lookup)).status,404);
 assert.equal((await call(lookup,'GET',null,false,{'x-order-key':randomBytes(32).toString('base64url')})).status,404);
 const opened=await call(lookup,'GET',null,false,{'x-order-key':credentials.key});assert.equal(opened.status,200);assert.equal(opened.result.order.total,2400);
 assert.equal((await call('/api/pedido/000000000000000000000000','GET',null,false,{'x-order-key':credentials.key})).status,404);
 assert.equal((await call(endpoint,'PATCH',{number:o.number,updatedAt:o.updatedAt,status:'em preparo'})).status,401);
 const races=await Promise.all([call(endpoint,'PATCH',{number:o.number,updatedAt:o.updatedAt,status:'em preparo'},true),call(endpoint,'PATCH',{number:o.number,updatedAt:o.updatedAt,status:'em preparo'},true)]);
 assert.deepEqual(races.map(r=>r.status).sort(),[200,409]);
 const state=races.find(r=>r.status===200).result.order;
 if(state.status==='em preparo'){
  const ready=await call(endpoint,'PATCH',{number:o.number,updatedAt:state.updatedAt,status:'pronto'},true);assert.equal(ready.status,200);
  const delivered=await call(endpoint,'PATCH',{number:o.number,updatedAt:ready.result.order.updatedAt,status:'entregue'},true);assert.equal(delivered.status,200);
  assert.equal((await call(endpoint,'PATCH',{number:o.number,updatedAt:delivered.result.order.updatedAt,status:'recebido'},true)).status,400);
 }
 const fetched=await call(lookup,'GET',null,false,{'x-order-key':credentials.key});assert.equal(fetched.status,200);assert.ok(fetched.result.order.history.length>=2);
 const after=await call('/api/discovery/invitations','GET',null,true);assert.deepEqual(after.result.records.map(r=>r.id).sort(),baseline.result.records.map(r=>r.id).sort());
 const parallel=await Promise.all(Array.from({length:3},()=>call(endpoint,'POST',{key:randomBytes(32).toString('base64url'),requestId:randomBytes(16).toString('hex'),location:'TESTE paralelo',items:[{id:'agua',quantity:1}]})));
 for(const p of parallel){if(p.status===201)owned.push(p.result.order);assert.equal(p.status,201);}
 assert.equal(new Set(parallel.map(p=>p.result.order.number)).size,3);
 assert.equal((await call(endpoint,'POST',{...payload,items:[{id:'coco',quantity:1},{id:'coco',quantity:2}]})).status,400);
 console.log('PASS: pedidos reais persistidos, total servidor, consulta privada 200/404, idempotência, autorização, concorrência, transições, histórico, criação paralela e isolamento do Discovery.');
}finally{
 for(const o of owned){const listing=await call(endpoint,'GET',null,true);const current=listing.result.orders?.find(x=>x.number===o.number);if(current)assert.equal((await call(endpoint,'DELETE',{number:o.number,updatedAt:current.updatedAt},true)).status,200);}
 if(cookie)await call('/api/discovery/session','POST',{logout:true},true);
}
