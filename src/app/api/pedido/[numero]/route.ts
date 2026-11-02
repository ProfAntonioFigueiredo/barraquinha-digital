import { createHash,timingSafeEqual } from 'node:crypto';
import { NextRequest } from 'next/server';
import { failure,HttpError,json } from '@/lib/discovery/security';
import { readOrder } from '@/lib/beach/store';
import { publicOrder } from '@/lib/beach/model';
export const runtime='nodejs';
export async function GET(request:NextRequest,{params}:{params:Promise<{numero:string}>}){try{
 const {numero}=await params;if(!/^([A-F0-9]{24}|DEMO-000[123])$/.test(numero))throw new HttpError(404,'Pedido não encontrado.');
 const stored=await readOrder('beach-'+numero);if(!stored)throw new HttpError(404,'Pedido não encontrado.');
 // Cookie is scoped to /api/discovery; customer lookup always needs its own capability.
 const key=request.headers.get('x-order-key')||'';
 if(!/^[A-Za-z0-9_-]{43}$/.test(key)||!timingSafeEqual(Buffer.from(createHash('sha256').update(key).digest('hex')),Buffer.from(stored.order.keyHash)))throw new HttpError(404,'Pedido não encontrado ou chave privada inválida.');
 return json({order:publicOrder(stored.order)});
}catch(e){return failure(e);}}
