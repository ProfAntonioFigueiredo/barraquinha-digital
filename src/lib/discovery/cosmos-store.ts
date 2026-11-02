import { CosmosClient, type ItemDefinition } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';
import type { DiscoveryRecord } from './model';
import { StoreConflict } from './store-errors';
let client: CosmosClient | undefined;
function interviews() {
  const endpoint = process.env.DISCOVERY_COSMOS_ENDPOINT;
  if (!endpoint || !/^https:\/\/[a-z0-9-]+\.documents\.azure\.com:443\/$/.test(endpoint)) throw new Error('Banco gratuito não configurado.');
  client ??= new CosmosClient({ endpoint, aadCredentials: new DefaultAzureCredential() });
  return client.database('discovery').container('interviews');
}
function recordFrom(resource: ItemDefinition): DiscoveryRecord {
  const result = { ...resource };
  for (const key of ['_rid', '_self', '_etag', '_attachments', '_ts', 'ttl']) delete result[key];
  return result as DiscoveryRecord;
}
export async function cosmosRead(id: string) {
  try {
    const response = await interviews().item(id, id).read();
    return response.resource ? { record: recordFrom(response.resource), etag: response.resource._etag as string } : null;
  } catch (error) { if ((error as { code?: number }).code === 404) return null; throw error; }
}
export async function cosmosWrite(record: DiscoveryRecord, etag?: string) {
  try {
    const body = { ...record, ttl: 90 * 86400 };
    if (etag) await interviews().item(record.id, record.id).replace(body, { accessCondition: { type: 'IfMatch', condition: etag } });
    else await interviews().items.create(body);
  } catch (error) { if ([409,412].includes(Number((error as { code?: number }).code))) throw new StoreConflict(); throw error; }
}
export async function cosmosList() {
  const { resources } = await interviews().items.query('SELECT TOP 201 * FROM c WHERE NOT IS_DEFINED(c.kind) ORDER BY c.createdAt DESC').fetchAll();
  return { records: resources.slice(0,200).map(recordFrom), truncated: resources.length > 200 };
}
export async function cosmosDelete(id: string, etag: string) {
  try { await interviews().item(id,id).delete({ accessCondition: { type: 'IfMatch', condition: etag } }); }
  catch (error) { if (Number((error as { code?: number }).code) === 412) throw new StoreConflict(); throw error; }
}
export async function cosmosVerify() { await interviews().read(); }
