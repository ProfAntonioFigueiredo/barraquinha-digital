import { BlobServiceClient } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';
import { promises as fs } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import path from 'node:path';
import type { DiscoveryRecord } from './model';

import { StoreConflict } from './store-errors';
export { StoreConflict } from './store-errors';
import { cosmosRead, cosmosWrite, cosmosList, cosmosDelete, cosmosVerify } from './cosmos-store';
export type Stored = { record: DiscoveryRecord; etag: string };
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export const tokenId = (token: string) => digest(token);
let blobService: BlobServiceClient | undefined;
function container() {
  const url = process.env.DISCOVERY_STORAGE_URL;
  if (!url?.startsWith('https://') || !/^https:\/\/[a-z0-9]+\.blob\.core\.windows\.net\/?$/.test(url)) throw new Error('Storage privado não configurado.');
  blobService ??= new BlobServiceClient(url, new DefaultAzureCredential());
  return blobService.getContainerClient('discovery');
}
function localDirectory() {
  if (process.env.NODE_ENV === 'production' && process.env.DISCOVERY_LOCAL_STORAGE !== 'true') throw new Error('Persistência Azure obrigatória em produção.');
  return process.env.DISCOVERY_DATA_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), 'data', 'discovery');
}
function validId(id: string) { if (!/^[a-f0-9]{64}$/.test(id)) throw new Error('Identificador inválido.'); }
export async function readRecord(id: string): Promise<Stored | null> {
  validId(id);
  if (process.env.DISCOVERY_COSMOS_ENDPOINT) return cosmosRead(id);
  if (process.env.DISCOVERY_STORAGE_URL) {
    try {
      const response = await container().getBlockBlobClient(`${id}.json`).download();
      const text = await response.blobBody?.then(b => b.text()) ?? await streamText(response.readableStreamBody);
      return { record: JSON.parse(text), etag: response.etag! };
    } catch (error) { if ((error as { statusCode?: number }).statusCode === 404) return null; throw error; }
  }
  try {
    const text = await fs.readFile(path.join(localDirectory(), `${id}.json`), 'utf8');
    return { record: JSON.parse(text), etag: digest(text) };
  } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
}
async function streamText(stream?: NodeJS.ReadableStream) {
  if (!stream) throw new Error('Resposta de storage vazia.');
  const parts = [];
  for await (const part of stream) parts.push(Buffer.from(part));
  return Buffer.concat(parts).toString('utf8');
}
export async function writeRecord(record: DiscoveryRecord, etag?: string) {
  validId(record.id);
  if (process.env.DISCOVERY_COSMOS_ENDPOINT) return cosmosWrite(record, etag);
  const text = JSON.stringify(record);
  if (process.env.DISCOVERY_STORAGE_URL) {
    try {
      await container().getBlockBlobClient(`${record.id}.json`).upload(text, Buffer.byteLength(text), {
        conditions: etag ? { ifMatch: etag } : { ifNoneMatch: '*' },
        blobHTTPHeaders: { blobContentType: 'application/json; charset=utf-8', blobCacheControl: 'no-store' },
      });
      return;
    } catch (error) { if ([409, 412].includes((error as { statusCode: number }).statusCode)) throw new StoreConflict(); throw error; }
  }
  const directory = localDirectory();
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  const lock = path.join(directory, record.id + '.lock');
  // Local development only. Never used as a fallback when Azure is configured.
  try { await fs.mkdir(lock); } catch { throw new StoreConflict(); }
  const temporary = path.join(directory, record.id + '.' + randomBytes(6).toString('hex') + '.tmp');
  try {
    const current = await readRecord(record.id);
    if (etag ? current?.etag !== etag : current !== null) throw new StoreConflict();
    await fs.writeFile(temporary, text, { mode: 0o600, flag: 'wx' });
    await fs.rename(temporary, path.join(directory, record.id + '.json'));
  } finally { await fs.rm(temporary, { force: true }); await fs.rmdir(lock); }
}
export async function listRecords() {
  if (process.env.DISCOVERY_COSMOS_ENDPOINT) return cosmosList();
  const ids: string[] = [];
  let truncated = false;
  if (process.env.DISCOVERY_STORAGE_URL) {
    for await (const item of container().listBlobsFlat()) {
      if (!/^[a-f0-9]{64}\.json$/.test(item.name)) continue;
      if (ids.length === 200) { truncated = true; break; }
      ids.push(item.name.slice(0, -5));
    }
  } else {
    try {
      const files = (await fs.readdir(localDirectory())).filter(f => /^[a-f0-9]{64}\.json$/.test(f));
      truncated = files.length > 200;
      ids.push(...files.slice(0, 200).map(f => f.slice(0, -5)));
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
  const records: DiscoveryRecord[] = [];
  for (let i = 0; i < ids.length; i += 10) {
    const batch = await Promise.all(ids.slice(i, i + 10).map(readRecord));
    records.push(...batch.filter((v): v is Stored => v !== null).map(v => v.record));
  }
  records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { records, truncated };
}
export async function deleteRecord(id: string, etag: string) {
  validId(id);
  if (process.env.DISCOVERY_COSMOS_ENDPOINT) return cosmosDelete(id, etag);
  if (process.env.DISCOVERY_STORAGE_URL) {
    try { await container().getBlobClient(`${id}.json`).delete({ conditions: { ifMatch: etag } }); }
    catch (error) { if ((error as { statusCode: number }).statusCode === 412) throw new StoreConflict(); throw error; }
  } else {
    // Revocation and removal share the same record lock as writes.
    const lock = path.join(localDirectory(), id + '.lock');
    try { await fs.mkdir(lock); } catch { throw new StoreConflict(); }
    try {
      if ((await readRecord(id))?.etag !== etag) throw new StoreConflict();
      await fs.unlink(path.join(localDirectory(), id + '.json'));
    } finally { await fs.rmdir(lock); }
  }
}
export async function verifyStorage() {
  if (process.env.DISCOVERY_COSMOS_ENDPOINT) return cosmosVerify();
  if (process.env.DISCOVERY_STORAGE_URL) { await container().getProperties(); return; }
  const directory = localDirectory();
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  await fs.access(directory, fs.constants.W_OK);
}
