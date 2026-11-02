import {readFile,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
async function walk(dir){const result=[];for(const name of await readdir(dir)){if(['node_modules','.git','.next','build','data'].includes(name))continue;const file=path.join(dir,name);if((await stat(file)).isDirectory())result.push(...await walk(file));else result.push(file);}return result;}
let links=0;
for(const file of (await walk('.')).filter(f=>f.endsWith('.md'))){const text=await readFile(file,'utf8');for(const m of text.matchAll(/\]\(([^)]+)\)/g)){const target=m[1].split('#')[0];if(!target||/^(https?:|mailto:|\/)/.test(target))continue;await stat(path.resolve(path.dirname(file),target));links++;}}
const spec=JSON.parse(await readFile('docs/openapi.json','utf8'));
function refs(value){if(!value||typeof value!=='object')return;for(const [key,item] of Object.entries(value)){if(key==='$ref'&&item.startsWith('#/')){let found=spec;for(const part of item.slice(2).split('/'))found=found?.[part.replaceAll('~1','/').replaceAll('~0','~')];if(!found)throw new Error('Missing reference '+item);}else refs(item);}}
refs(spec);if(spec.openapi!=='3.1.0')throw new Error('OpenAPI version');console.log(`PASS: ${links} links locais; OpenAPI JSON e referências internas válidos; ${Object.keys(spec.paths).length} rotas.`);
