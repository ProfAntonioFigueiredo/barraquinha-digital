// Packages only runtime output. Never ships local secrets, research files or data.
import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const root = process.cwd();
const destination = path.join(root, 'build/discovery-runtime');
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
for (const entry of ['server.js', 'package.json', 'node_modules', '.next']) {
  await cp(path.join(root, '.next/standalone', entry), path.join(destination, entry), {
    recursive: true,
    filter: source => !path.basename(source).startsWith('.env') && !['data', 'wallet'].includes(path.basename(source)),
  });
}
await cp(path.join(root, '.next/static'), path.join(destination, '.next/static'), { recursive: true });
await cp(path.join(root, 'public'), path.join(destination, 'public'), { recursive: true });
async function verify(directory) {
  for (const entry of await readdir(directory)) {
    if (entry.startsWith('.env') || entry.endsWith('.db') || entry.endsWith('.pem')) throw new Error('Arquivo sensível no pacote: ' + entry);
    const filename = path.join(directory, entry);
    if ((await stat(filename)).isDirectory()) await verify(filename);
  }
}
await verify(destination);
const zip = path.join(root, 'build/discovery-azure.zip');
await rm(zip, { force: true });
const result = spawnSync('zip', ['-q', '-r', zip, '.'], { cwd: destination, stdio: 'inherit' });
if (result.status !== 0) throw new Error('Falha ao criar o ZIP de implantação.');
console.log('Pacote verificado: build/discovery-azure.zip');
