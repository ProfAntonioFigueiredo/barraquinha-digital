import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomBytes,createHash } from 'node:crypto';
import { StoreConflict } from '@/lib/discovery/store-errors';
import type { Order } from './model';
let client:CosmosClient|undefined;
function container() {
 const endpoint=process.env.DISCOVERY_COSMOS_ENDPOINT;
 if(!endpoint || !/^https:\/\/[a-z0-9-]+\.documents.azure.com:443\/$/.test(endpoint)) throw new Error('Cosmos não configurado.');
 client??=new CosmosClient({endpoint,aadCredentials:new DefaultAzureCredential()});
 return client.database('discovery').container('interviews');
}
function directory(){if(process.env.NODE_ENV==='production' && process.env.DISCOVERY_LOCAL_STORAGE!=='true')throw new Error('Cosmos obrigatório.');return path.join(process.env.DISCOVERY_DATA_DIR || path.join(process.cwd(),'data/discovery'),'beach');}
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
function check(id:string){if(!/^beach-[A-Z0-9-]{6,50}$/.test(id))throw new Error('Pedido inválido.');}
export async function readOrder(id:string):Promise<{order:Order;etag:string}|null>{
 check(id);
 if(process.env.DISCOVERY_COSMOS_ENDPOINT){try{const r=await container().item(id,id).read();return r.resource?.kind==='beach_order'?{order:r.resource as Order,etag:r.resource._etag}:null;}catch(e){if(Number((e as {code?:number}).code)===404)return null;throw e;}}
 try{const text=await fs.readFile(path.join(directory(),id+'.json'),'utf8');return {order:JSON.parse(text),etag:hash(text)};}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return null;throw e;}
}
export async function writeOrder(order:Order,etag?:string){
 check(order.id);
 if(process.env.DISCOVERY_COSMOS_ENDPOINT){try{const body={...order,ttl:7*86400};if(etag)await container().item(order.id,order.id).replace(body,{accessCondition:{type:'IfMatch',condition:etag}});else await container().items.create(body);return;}catch(e){if([409,412].includes(Number((e as {code?:number}).code)))throw new StoreConflict();throw e;}}
 const dir=directory();await fs.mkdir(dir,{recursive:true,mode:0o700});const lock=path.join(dir,order.id+'.lock');
 try{await fs.mkdir(lock);}catch{throw new StoreConflict();}
 const tmp=path.join(dir,order.id+'.'+randomBytes(6).toString('hex')+'.tmp');
 try{const current=await readOrder(order.id);if(etag?current?.etag!==etag:!!current)throw new StoreConflict();await fs.writeFile(tmp,JSON.stringify(order),{mode:0o600});await fs.rename(tmp,path.join(dir,order.id+'.json'));}finally{await fs.rm(tmp,{force:true});await fs.rmdir(lock);}
}
export async function listOrders(){
 if(process.env.DISCOVERY_COSMOS_ENDPOINT){const {resources}=await container().items.query("SELECT TOP 201 * FROM c WHERE c.kind = 'beach_order' ORDER BY c.createdAt DESC").fetchAll();return {orders:resources.slice(0,200) as Order[],truncated:resources.length>200};}
 let files:string[];try{files=(await fs.readdir(directory())).filter(f=>/^beach-[A-Z0-9-]+\.json$/.test(f));}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return {orders:[],truncated:false};throw e;}
 const orders=await Promise.all(files.map(async f=>(await readOrder(f.slice(0,-5)))!.order));orders.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));return {orders:orders.slice(0,200),truncated:orders.length>200};
}
export async function deleteOrder(id:string,etag:string){
 if(process.env.DISCOVERY_COSMOS_ENDPOINT){try{await container().item(id,id).delete({accessCondition:{type:'IfMatch',condition:etag}});}catch(e){if(Number((e as {code?:number}).code)===412)throw new StoreConflict();throw e;}}else{const current=await readOrder(id);if(current?.etag!==etag)throw new StoreConflict();await fs.unlink(path.join(directory(),id+'.json'));}
}
