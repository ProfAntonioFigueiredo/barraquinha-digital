import {randomBytes} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
const text=`DISCOVERY_ORIGIN=http://127.0.0.1:3000
DISCOVERY_PORTAL=true
DISCOVERY_LOCAL_STORAGE=true
DISCOVERY_SECURE_COOKIE=false
DISCOVERY_ADMIN_KEY=${randomBytes(24).toString('hex')}
DISCOVERY_SESSION_SECRET=${randomBytes(32).toString('hex')}
DISCOVERY_COSMOS_ENDPOINT=
`;
try{await writeFile('.env.local',text,{flag:'wx',mode:0o600});console.log('.env.local criado com credenciais locais únicas. O código de operação é DISCOVERY_ADMIN_KEY nesse arquivo.');}catch(e){if(e.code==='EEXIST'){console.error('.env.local já existe: preservado.');process.exitCode=1;}else throw e;}
