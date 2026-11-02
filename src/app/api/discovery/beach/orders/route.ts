import { createHash,randomBytes } from 'node:crypto';
import { NextRequest } from 'next/server';
import { bodyJson,failure,HttpError,json,requireAdmin } from '@/lib/discovery/security';
import { MENU,NEXT,STATUSES,publicOrder,type Order,type Status } from '@/lib/beach/model';
import { readOrder,writeOrder,listOrders,deleteOrder } from '@/lib/beach/store';
export const runtime='nodejs';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
let until=0,count=0;
export async function GET(request:NextRequest){try{requireAdmin(request);const data=await listOrders();return json({orders:data.orders.map(publicOrder),truncated:data.truncated});}catch(e){return failure(e);}}
export async function POST(request:NextRequest){try{
 const b=await bodyJson(request);
 if(b.action==='seed'){
  requireAdmin(request);let created=0;
  for(const [index,status] of (['recebido','em preparo','entregue'] as const).entries()){
   const number='DEMO-000'+(index+1),id='beach-'+number;if(await readOrder(id))continue;
   const now=new Date(Date.now()-(index+1)*60000).toISOString();const m=MENU[index];
   await writeOrder({id,kind:'beach_order',number,keyHash:hash(randomBytes(32).toString('hex')),location:'Guarda-sol '+(index+1),items:[{id:m.id,name:m.name,quantity:1,unitPrice:m.price}],total:m.price,status,createdAt:now,updatedAt:now,history:[{status,at:now}],demo:true});created++;
  }return json({created});
 }
 if(Date.now()>until){until=Date.now()+60000;count=0;}if(++count>30)throw new HttpError(429,'Muitos pedidos. Aguarde um minuto.');
 if(typeof b.location!=='string'||b.location.trim().length<2||b.location.length>100)throw new HttpError(400,'Informe o guarda-sol ou a cadeira (até 100 caracteres).');
 if(typeof b.key!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(b.key)||typeof b.requestId!=='string'||!/^[a-f0-9]{32}$/.test(b.requestId))throw new HttpError(400,'Identificador do pedido inválido.');
 if(!Array.isArray(b.items)||b.items.length<1||b.items.length>8)throw new HttpError(400,'Escolha de um a oito itens.');
 const seen=new Set<string>();const items=b.items.map((v:unknown)=>{const x=v as {id?:unknown;quantity?:unknown};const m=MENU.find(m=>m.id===x?.id);if(!m||!Number.isInteger(x.quantity)||Number(x.quantity)<1||Number(x.quantity)>20||seen.has(m.id))throw new HttpError(400,'Revise itens e quantidades (1 a 20).');seen.add(m.id);return {id:m.id,name:m.name,quantity:Number(x.quantity),unitPrice:m.price};});
 const requestHash=hash(JSON.stringify({location:b.location.trim(),items}));
 const number=hash(b.requestId+':'+b.key).slice(0,24).toUpperCase(),id='beach-'+number;
 const existing=await readOrder(id);
 if(existing){if(existing.order.requestHash!==requestHash)throw new HttpError(409,'Este pedido já foi enviado com outros dados. Inicie um novo pedido.');return json({order:publicOrder(existing.order)},200);}
 if((await listOrders()).orders.length>=200)throw new HttpError(409,'O piloto chegou a 200 pedidos. A operação precisa organizar os registros.');
 const now=new Date().toISOString();const order:Order={id,kind:'beach_order',number,keyHash:hash(b.key),requestHash,location:b.location.trim(),items,total:items.reduce((sum,i)=>sum+i.quantity*i.unitPrice,0),status:'recebido',createdAt:now,updatedAt:now,history:[{status:'recebido',at:now}],demo:true};
 try{await writeOrder(order);}catch(e){const retry=await readOrder(id);if(!retry||retry.order.requestHash!==requestHash)throw e;return json({order:publicOrder(retry.order)},200);}
 return json({order:publicOrder(order)},201);
}catch(e){return failure(e);}}
export async function PATCH(request:NextRequest){try{
 requireAdmin(request);const b=await bodyJson(request);
 if(typeof b.number!=='string'||!/^([A-F0-9]{24}|DEMO-000[123])$/.test(b.number))throw new HttpError(404,'Pedido não encontrado.');
 const stored=await readOrder('beach-'+b.number);if(!stored)throw new HttpError(404,'Pedido não encontrado.');
 if(b.updatedAt!==stored.order.updatedAt)throw new HttpError(409,'Pedido atualizado por outra tela. Atualize a fila.');
 if(!STATUSES.includes(b.status as Status)||!NEXT[stored.order.status].includes(b.status as Status))throw new HttpError(400,'Mudança de status não permitida.');
 stored.order.status=b.status as Status;stored.order.updatedAt=new Date(Math.max(Date.now(),Date.parse(stored.order.updatedAt)+1)).toISOString();stored.order.history.push({status:stored.order.status,at:stored.order.updatedAt});await writeOrder(stored.order,stored.etag);return json({order:publicOrder(stored.order)});
}catch(e){return failure(e);}}
export async function DELETE(request:NextRequest){try{requireAdmin(request);const b=await bodyJson(request);if(typeof b.number!=='string'||!/^([A-F0-9]{24}|DEMO-000[123])$/.test(b.number))throw new HttpError(404,'Pedido não encontrado.');const stored=await readOrder('beach-'+b.number);if(!stored)throw new HttpError(404,'Pedido não encontrado.');if(b.updatedAt!==stored.order.updatedAt)throw new HttpError(409,'Atualize a fila antes de excluir.');await deleteOrder(stored.order.id,stored.etag);return json({deleted:true});}catch(e){return failure(e);}}
