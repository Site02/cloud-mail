const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHmac } = require('node:crypto');
const { Hono } = require('hono');
const { getCookie } = require('hono/cookie');
const { Resend } = require('resend');
const root = path.resolve(__dirname, '../src');
const source = p => fs.readFileSync(path.join(root, p), 'utf8').replace(/^import .*?;?\r?\n/gm, '');
function load(file, bindings, exported) {
  const context = { console, Headers, Request, Response, URL, Date, ...bindings };
  vm.createContext(context);
  let code = source(file);
  if (exported === 'worker') code = code.replace('export default', 'globalThis.value =');
  else if (exported) code = code.replace(`export default ${exported}`, `globalThis.value = ${exported}`);
  vm.runInContext(code, context, { filename: file });
  return exported ? context.value : context;
}
const statuses = { SENT: 1, DELIVERED: 2, BOUNCED: 3, COMPLAINED: 4, DELAYED: 5, FAILED: 8 };
test('settings refresh normalizes prefix filters and domain strings before bootstrap', async()=>{
  let cached;
  const values = new Map();
  const raw = { resendTokens:'{}', emailPrefixFilter:'spam,test' };
  const service = load('service/setting-service.js', { orm:()=>({select:()=>({from:()=>({get:async()=>({...raw})})})}), setting:{}, KvConst:{SETTING:'setting'} }, 'settingService');
  const c = { env:{domain:'["haoxi1688.com"]',kv:{put:async(k,v)=>{cached=v},get:async()=>JSON.parse(cached)}}, get:k=>values.get(k),set:(k,v)=>values.set(k,v) };
  await service.refresh(c);
  const config = await service.query(c);
  assert.equal(config.emailPrefixFilter.some(x=>x==='spam'),true);
  assert.equal(config.domainList[0],'@haoxi1688.com');
  assert.equal(typeof config.resendTokens,'object');
  assert.equal((await service.query(c)).emailPrefixFilter.length,2);
});
test('storage proxy serves KV, R2 and S3 bodies and preserves metadata', async () => {
  for (const kind of ['KV', 'R2', 'S3']) {
    const response = new Response('document', { headers: { 'Content-Type': 'text/plain' } });
    const obj = kind === 'R2' ? { body: response.body, writeHttpMetadata: h => h.set('Content-Type', 'text/plain') } : response;
    const service = load('service/r2-service.js', { settingService: { query: async () => kind === 'S3' ? { bucket:'b',endpoint:'e',s3AccessKey:'a',s3SecretKey:'s' } : {} }, kvObjService: { getObj: async () => obj }, s3Service: { getObj: async () => obj } }, 'r2Service');
    const result = await service.toObjResp({ env: kind === 'R2' ? { r2: { get: async () => obj } } : {} }, 'attachments/file.txt');
    assert.equal(await result.text(), 'document');
    assert.equal(result.headers.get('Content-Type'), 'text/plain');
    assert.equal(result.headers.get('Cache-Control'), 'private, no-store');
    assert.equal(result.headers.get('Content-Disposition'), 'attachment');
    assert.match(result.headers.get('Content-Security-Policy'), /sandbox/);
  }
});
test('missing objects return 404, including S3 NoSuchKey', async () => {
  const service = load('service/r2-service.js', { settingService:{query:async()=>({})},kvObjService:{getObj:async()=>null},s3Service:{} }, 'r2Service');
  assert.equal((await service.toObjResp({env:{}}, 'attachments/missing')).status,404);
  service.getObj=async()=>{const error=new Error();error.name='NoSuchKey';throw error;};
  assert.equal((await service.toObjResp({env:{}}, 'attachments/missing')).status,404);
});
function webhookFixture(row) {
  const updates=[];
  const service=load('service/resend-service.js',{emailConst:{status:statuses},emailService:{updateEmailStatus:async(c,p)=>{updates.push(p);return row;}}},'resendService');
  const app=new Hono();
  load('api/resend-api.js',{app,Resend,resendService:service});
  const secret=Buffer.from('local-signing-secret-only').toString('base64');
  function request(event, valid=true, timestamp=String(Math.floor(Date.now()/1000))) {
    const body=JSON.stringify(event),id='msg_local_test';
    const signature=createHmac('sha256',Buffer.from(secret,'base64')).update(`${id}.${timestamp}.${body}`).digest('base64');
    return app.request('/webhooks',{method:'POST',body,headers:{'svix-id':id,'svix-timestamp':timestamp,'svix-signature':valid ? `v1,${signature}`:'v1,invalid'}},{resend_webhook_secret:`whsec_${secret}`,db:{prepare:()=>({bind:()=>({first:async()=>null})})}});
  }
  return { app,request,updates };
}
test('valid webhook signatures update status; forged and expired signatures do not', async () => {
  const f=webhookFixture({emailId:1});
  const event={type:'email.delivered',data:{email_id:'email_local'}};
  assert.equal((await f.request(event)).status,200);
  assert.equal(f.updates.length,1);assert.equal(f.updates[0].status,statuses.DELIVERED);
  assert.equal((await f.request(event,false)).status,400);
  assert.equal((await f.request(event,true,'1')).status,400);
  assert.equal(f.updates.length,1);
});
test('unrelated events are ignored; fresh unmatched records get bounded retries', async () => {
  const f=webhookFixture(null);
  assert.equal((await f.request({type:'email.delivered',created_at:'2020-01-01T00:00:00Z',data:{email_id:'external'}})).status,200);
  assert.equal((await f.request({type:'email.delivered',created_at:new Date().toISOString(),data:{email_id:'pending'}})).status,503);
  const before=f.updates.length;
  assert.equal((await f.request({type:'email.opened',data:{email_id:'external'}})).status,200);
  assert.equal(f.updates.length,before);
  assert.equal((await f.request({type:'email.failed',data:{email_id:'external'}})).status,200);
});
test('database errors still cause retry, rather than discarding webhook events', async()=>{
  const service=load('service/resend-service.js',{emailConst:{status:statuses},emailService:{updateEmailStatus:async()=>{throw new Error('fixture database failure')}}},'resendService');
  await assert.rejects(service.webhooks({}, {type:'email.delivered',data:{email_id:'id'}}),/fixture database failure/);
});
test('late delayed or delivered events cannot overwrite bounced or complained states', async()=>{
  let row={resendEmailId:'fixture',status:statuses.SENT};
  const service=load('service/email-service.js',{
    emailConst:{status:statuses},email:{resendEmailId:'resendEmailId',status:'status'},
    eq:(key,value)=>r=>r[key]===value,inArray:(key,values)=>r=>values.includes(r[key]),and:(...conditions)=>r=>conditions.every(p=>p(r)),
    orm:()=>({update:()=>({set:params=>({where:condition=>({returning:()=>({get:async()=>{if(!condition(row))return;row={...row,...params};return row;}})})})})})
  },'emailService');
  for (const status of [statuses.DELIVERED,statuses.DELAYED,statuses.BOUNCED,statuses.DELIVERED,statuses.COMPLAINED,statuses.DELAYED]) {
    await service.updateEmailStatus({}, {resendEmailId:'fixture',status});
    if (status===statuses.DELAYED) assert.notEqual(row.status,statuses.DELAYED);
  }
  assert.equal(row.status,statuses.COMPLAINED);
});
function attachmentApp() {
  const app=new Hono();
  app.onError((e,c)=>c.text(e.message,e.code||500));
  const fixtureUsers={alice:{userId:1,email:'alice@haoxi1688.com'},bob:{userId:2,email:'bob@haoxi1688.com'},admin:{userId:3,email:'admin@haoxi1688.com'}};
  const constant={TOKEN_HEADER:'Authorization'};
  const dayjs=()=>({startOf(){return this},isSame(){return true}});
  class BizError extends Error { constructor(message,code){super(message);this.code=code;} }
  load('security/security.js',{app,BizError,constant,getCookie,attachmentCookieOptions:()=>({name:'__Host-cloudmail-attachment'}),jwtUtils:{verifyToken:async(c,t)=>fixtureUsers[t]?{userId:fixtureUsers[t].userId,token:t}:null},KvConst:{AUTH_INFO:'auth:',PUBLIC_KEY:'public'},dayjs,userService:{},permService:{userPermKeys:async()=>[]},t:k=>k});
  load('api/r2-api.js',{app,userContext:{getUser:c=>c.get('user')},r2Service:{toObjResp:async()=>new Response('owned file')}});
  const env={admin:'admin@haoxi1688.com',kv:{get:async key=>{const entry=Object.entries(fixtureUsers).find(([,u])=>key===`auth:${u.userId}`);return entry?{user:entry[1],tokens:[entry[0]],refreshTime:new Date().toISOString()}:null;}},db:{prepare:()=>({bind:(key,userId)=>({first:async()=>key==='attachments/alice.txt'&&(userId===undefined||userId===1)?{att_id:1}:null})})}};
  return { app,env };
}
test('private attachments reject anonymous and other users, including cookie access',async()=>{
  const {app,env}=attachmentApp();
  assert.equal((await app.request('/oss/attachments/alice.txt',{},env)).status,401);
  assert.equal((await app.request('/oss/attachments/alice.txt',{headers:{Authorization:'bob'}},env)).status,404);
  assert.equal((await app.request('/oss/attachments/alice.txt',{headers:{Cookie:'__Host-cloudmail-attachment=alice'}},env)).status,200);
  assert.equal((await app.request('/oss/attachments/alice.txt',{headers:{Authorization:'admin'}},env)).status,200);
});
test('root attachment route enters authentication rather than accessing KV directly',async()=>{
  let pathname;
  const worker=load('index.js',{app:{fetch:async req=>{pathname=new URL(req.url).pathname;return new Response('auth route')}},email:()=>{},userService:{},verifyRecordService:{},emailService:{},kvObjService:{toObjResp:()=>{throw new Error('wrong store')}},oauthService:{},analysisService:{},r2Service:{}},'worker');
  await worker.fetch(new Request('https://fixture.invalid/attachments/alice.txt'),{},{});
  assert.equal(pathname,'/oss/attachments/alice.txt');
});
test('local receipt simulator is unavailable in production and requires a local secret',async()=>{
  let calls=0;
  const worker=load('index.js',{app:{},email:async()=>{calls++},userService:{},verifyRecordService:{},emailService:{},kvObjService:{},oauthService:{},analysisService:{},r2Service:{}},'worker');
  const req=()=>new Request('http://127.0.0.1:8787/__local/email?from=a@b.com&to=admin@haoxi1688.com',{method:'POST',headers:{Authorization:'Bearer local'},body:'fixture'});
  assert.equal((await worker.fetch(req(),{bootstrap_secret:'local'},{})).status,404);
  assert.equal((await worker.fetch(req(),{local_dev:true,bootstrap_secret:'other'},{})).status,401);
  assert.equal((await worker.fetch(req(),{local_dev:true,bootstrap_secret:'local'},{})).status,200);
  assert.equal(calls,1);
});
