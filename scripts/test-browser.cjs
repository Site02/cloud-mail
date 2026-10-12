const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.CLOUDMAIL_PLAYWRIGHT || 'playwright');
const root = path.resolve(__dirname, '..');
(async()=>{
  const browser = await chromium.launch({headless:true,...(process.env.CLOUDMAIL_BROWSER ? {executablePath:process.env.CLOUDMAIL_BROWSER} : {})});
  try {
    const page = await browser.newPage();
    await page.route('**/*',r=>r.abort());
    await page.setContent('<div id="fixture"></div>');
    await page.addScriptTag({path:path.join(root,'mail-vue/node_modules/dompurify/dist/purify.min.js')});
    const helper = fs.readFileSync(path.join(root,'mail-vue/src/utils/email-html.js'),'utf8').replace(/^import .*\n/,'').replace('export function','function');
    const component = fs.readFileSync(path.join(root,'mail-vue/src/components/shadow-html/index.vue'),'utf8');
    const render = component.slice(component.indexOf('function updateContent()'),component.indexOf('function autoScale()'));
    const payload='<body><h2>Safe subject</h2><p>中文正文</p><img src="data:image/png;base64,invalid" onerror="window.__mailProbe=1"><svg onload="window.__mailProbe=2"></svg><a href="javascript:window.__mailProbe=3">Bad link</a><a href="https://example.com">Normal link</a><form action="https://example.com"><input name="password"></form></body>';
    const result = await page.evaluate(({helper,render,payload})=>{
      const shadowRoot=document.querySelector('#fixture').attachShadow({mode:'open'});
      const props={html:payload};
      eval(helper+'\n'+render+'\nupdateContent();');
      const link=[...shadowRoot.querySelectorAll('a')].find(a=>a.textContent==='Normal link');
      return {text:shadowRoot.textContent,form:!!shadowRoot.querySelector('form'),events:shadowRoot.querySelectorAll('[onerror],[onload]').length,hrefs:[...shadowRoot.querySelectorAll('a')].map(a=>a.getAttribute('href')),target:link.target,rel:link.rel};
    },{helper,render,payload});
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(()=>window.__mailProbe||0),0);
    assert.match(result.text,/中文正文/);assert.match(result.text,/Safe subject/);
    assert.equal(result.events,0);assert.equal(result.form,false);
    assert.ok(!result.hrefs.some(h=>h?.startsWith('javascript:')));
    assert.equal(result.target,'_blank');assert.match(result.rel,/noopener/);
    console.log('PASS: malicious HTML blocked; text and normal links preserved');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
