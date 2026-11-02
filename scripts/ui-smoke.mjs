import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {randomBytes} from 'node:crypto';
import path from 'node:path';
const temp=await mkdtemp(path.join(tmpdir(),'wise-beach-ui-'));const origin='http://127.0.0.1:3118',debug='http://127.0.0.1:9224';const admin=randomBytes(24).toString('hex');
const server=spawn(process.execPath,['build/discovery-runtime/server.js'],{env:{...process.env,PORT:'3118',HOSTNAME:'127.0.0.1',DISCOVERY_PORTAL:'true',DISCOVERY_LOCAL_STORAGE:'true',DISCOVERY_DATA_DIR:path.join(temp,'data'),DISCOVERY_COSMOS_ENDPOINT:'',DISCOVERY_STORAGE_URL:'',DISCOVERY_ORIGIN:origin,DISCOVERY_ADDITIONAL_ORIGIN:'',DISCOVERY_SECURE_COOKIE:'false',DISCOVERY_ADMIN_KEY:admin,DISCOVERY_SESSION_SECRET:randomBytes(32).toString('hex')},stdio:'ignore'});
let chrome;const sockets=[];
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function ready(url){for(let i=0;i<80;i++){try{const r=await fetch(url);if(r.ok)return;}catch{}await pause(250);}throw new Error('Timeout: '+url);}
async function tab(url){const info=await(await fetch(debug+'/json/new?'+encodeURIComponent(url),{method:'PUT'})).json();const ws=new WebSocket(info.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true});});sockets.push(ws);let next=0;const pending=new Map();ws.addEventListener('message',e=>{const d=JSON.parse(e.data);const waiter=pending.get(d.id);if(waiter){pending.delete(d.id);if(d.error)waiter.reject(new Error(d.error.message));else waiter.resolve(d.result);}});const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});await send('Runtime.enable');return{send,eval:async(expression)=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.text);return r.result.value;}};}
async function wait(page,expression){for(let i=0;i<80;i++){if(await page.eval(expression))return;await pause(150);}throw new Error('UI condition failed: '+expression);}
async function shot(page,name){await page.eval('document.fonts.ready.then(()=>true)');const image=await page.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile('build/'+name,Buffer.from(image.data,'base64'));}
try{
 await ready(origin+'/api/discovery/health');
 chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=9224','--remote-debugging-address=127.0.0.1','--user-data-dir='+path.join(temp,'chrome'),'about:blank'],{stdio:'ignore'});await ready(debug+'/json/version');
 const customer=await tab(origin+'/barraquinha');await customer.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await wait(customer,"!!document.querySelector('button[aria-label=\"Adicionar Água de coco\"]')");await pause(600);
 await shot(customer,'beach-mobile-menu.png');
 await customer.eval(`document.querySelector('button[aria-label="Adicionar Água de coco"]').click();`);await pause(150);
 await customer.eval(`const input=document.getElementById('location');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Guarda-sol UI 15');input.dispatchEvent(new Event('input',{bubbles:true}));`);await pause(150);
 await customer.eval("document.querySelector('form').requestSubmit()");
 await wait(customer,"document.body.innerText.includes('Agora é com a barraca.')");
 await shot(customer,'beach-mobile-receipt.png');
 const receipt=await customer.eval("JSON.parse(localStorage.getItem('wise-beach-receipt'))");if(!receipt?.number)throw new Error('UI order not saved.');
 const login=await fetch(origin+'/api/discovery/session',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({key:admin})});const cookie=login.headers.get('set-cookie').split(';')[0];
 const operator=await tab('about:blank');await operator.send('Network.setCookie',{name:cookie.split('=')[0],value:cookie.slice(cookie.indexOf('=')+1),url:origin,path:'/api/discovery',httpOnly:true,sameSite:'Strict'});await operator.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});await operator.send('Page.navigate',{url:origin+'/barraquinha/operacao'});
 await wait(operator,`document.body.innerText.includes(${JSON.stringify(receipt.number)})`);
 await shot(operator,'beach-operation.png');
 await operator.eval("Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Iniciar preparo').click()");
 await wait(operator,"document.body.innerText.includes('Marcar pronto')");
 const check=await(await fetch(origin+'/api/pedido/'+receipt.number,{headers:{'x-order-key':receipt.key}})).json();if(check.order.status!=='em preparo')throw new Error('UI transition not persisted.');
 for(const page of [customer,operator]){if(!await page.eval('document.documentElement.scrollWidth <= window.innerWidth'))throw new Error('Horizontal overflow.');}
 const apiTab=await tab(origin+'/barraquinha/api');await apiTab.send('Emulation.setDeviceMetricsOverride',{width:1200,height:1000,deviceScaleFactor:1,mobile:false});await wait(apiTab,"!!document.getElementById('api-number')");await pause(400);await apiTab.eval("document.querySelector('form').requestSubmit()");await wait(apiTab,"document.body.innerText.includes('HTTP 200')");await shot(apiTab,'beach-api.png');
 const headers={'Content-Type':'application/json',Origin:origin,Cookie:cookie};
 const project=await(await fetch(origin+'/api/discovery/projects',{method:'POST',headers,body:JSON.stringify({project:'barraquinha'})})).json();
 const before=await(await fetch(origin+'/api/discovery/records/'+project.id,{headers})).json();
 await fetch(origin+'/api/discovery/projects',{method:'POST',headers,body:JSON.stringify({project:'barraquinha',action:'complete-test-model',etag:before.etag})});
 const adminTab=await tab(origin+'/discovery/admin');await adminTab.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});await wait(adminTab,"Array.from(document.querySelectorAll('button')).some(b=>b.textContent.includes('Abrir projeto Barraquinha'))");await adminTab.eval("Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Abrir projeto Barraquinha')).click()");await wait(adminTab,"Array.from(document.querySelectorAll('button')).some(b=>b.textContent.includes('Abrir documentos e prompts'))");await adminTab.eval("Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Abrir documentos e prompts')).click()");await wait(adminTab,"!!document.querySelector('select[id^=stage-]')");await adminTab.eval("document.querySelector('select[id^=stage-]').closest('section').scrollIntoView()");await shot(adminTab,'beach-studio.png');
 console.log('PASS: Chrome isolado, pedido pela interface mobile, persistência, fila da operação e transição pela interface; sem overflow horizontal a 390px/1440px. Capturas em build/beach-*.png.');
}finally{for(const s of sockets)s.close();if(chrome)chrome.kill('SIGTERM');server.kill('SIGTERM');await pause(500);await rm(temp,{recursive:true,force:true});}
