// End-to-end smoke check against the running local Worker, using only local credentials.
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { randomUUID } = require('crypto');
const { chromium } = require(process.env.CLOUDMAIL_PLAYWRIGHT || 'playwright');
const root = path.resolve(__dirname, '..');
const credentials = JSON.parse(fs.readFileSync(path.join(root, '.local/credentials.json'), 'utf8'));
const base = 'http://127.0.0.1:8787';
(async()=>{
  const login = await fetch(base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:credentials.admin,password:credentials.adminPassword})});
  const loginBody=await login.json();
  assert.equal(loginBody.code,200,'Administrator login failed');
  assert.match(login.headers.get('set-cookie')||'',/HttpOnly/i);
  const token=loginBody.data.token;
  async function api(url) { const body=await (await fetch(base+'/api'+url,{headers:{Authorization:token}})).json(); assert.equal(body.code,200,url);return body.data; }
  const accounts=await api('/account/list');
  const account=accounts.find(a=>a.email===credentials.admin);
  assert.ok(account,'Default mailbox missing');
  const id=randomUUID();
  const raw=`From: Local Test <sender@example.com>\r\nTo: ${credentials.admin}\r\nSubject: Local attachment test ${id}\r\nMessage-ID: <${id}@example.com>\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary="local-boundary"\r\n\r\n--local-boundary\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n<h2>本地中文邮件和附件</h2><p>原版界面，本地模拟收信。</p>\r\n--local-boundary\r\nContent-Type: text/plain; name="local-test.txt"\r\nContent-Disposition: attachment; filename="local-test.txt"\r\nContent-Transfer-Encoding: base64\r\n\r\n${Buffer.from('本地测试附件').toString('base64')}\r\n--local-boundary--\r\n`;
  const received=await fetch(base+`/__local/email?from=sender%40example.com&to=${encodeURIComponent(credentials.admin)}`,{method:'POST',headers:{Authorization:`Bearer ${credentials.bootstrap_secret}`},body:raw});
  assert.equal(received.status,200,await received.text());
  const inbox=await api(`/email/list?accountId=${account.accountId}&size=10&type=0&timeSort=0&allReceive=0&full=1`);
  const row=inbox.list.find(e=>e.subject.includes(id));
  assert.ok(row,'Simulated message missing from inbox');
  assert.match(row.content,/本地中文邮件/);
  const attachments=await api(`/email/attList?emailId=${row.emailId}`);
  assert.ok(attachments.length,'Missing attachment metadata');
  const key=attachments[0].key;
  const unauthorized=await fetch(base+'/'+key);
  const unauthorizedBody=await unauthorized.json();
  assert.equal(unauthorizedBody.code,401,'Anonymous attachment was not rejected');
  const file=await fetch(base+'/'+key,{headers:{Authorization:token}});
  assert.equal(file.status,200);
  assert.equal(await file.text(),'本地测试附件');
  assert.match(file.headers.get('Cache-Control'),/no-store/);
  const browser=await chromium.launch({headless:true,...(process.env.CLOUDMAIL_BROWSER ? {executablePath:process.env.CLOUDMAIL_BROWSER}:{})});
  try {
    for (const port of [8787,3001]) {
      const context=await browser.newContext();
      const page=await context.newPage();
      const failures=[];
      page.on('pageerror',e=>failures.push(e.message));
      await page.goto(`http://127.0.0.1:${port}/login`);
      await page.locator('input[type="text"]:visible').first().fill('admin');
      await page.locator('input[type="password"]:visible').first().fill(credentials.adminPassword);
      await page.getByRole('button',{name:/^(登录|Login|Sign in)$/}).click();
      await page.waitForURL(url=>!url.pathname.includes('/login'),{timeout:20000});
      await page.getByText(row.subject,{exact:false}).first().waitFor({timeout:20000});
      assert.equal(failures.length,0,failures.join('\n'));
      await page.screenshot({path:path.join(root,`reports/local-inbox-${port}.png`)});
      await context.close();
    }
  } finally { await browser.close(); }
  console.log('PASS: admin login, local MIME receipt, Chinese content, private R2 attachment, built UI and Vite UI');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
