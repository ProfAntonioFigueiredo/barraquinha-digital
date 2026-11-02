import type { NextConfig } from 'next';
const config:NextConfig={output:'standalone',outputFileTracingExcludes:{'/*':['./docs/**/*','./data/**/*','./.env*','./tests/**/*','./infra/**/*','./scripts/**/*']},async headers(){return ['/barraquinha/:path*','/discovery/:path*'].map(source=>({source,headers:[{key:'Referrer-Policy',value:'no-referrer'},{key:'X-Content-Type-Options',value:'nosniff'},{key:'X-Frame-Options',value:'DENY'}]}));},turbopack:{root:__dirname}};
export default config;
