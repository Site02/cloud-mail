const {chromium}=require(process.env.MAIL_BROWSER_MODULE||'playwright')
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path')
const root=path.resolve(__dirname,'../../mail-worker/dist'),out=process.env.MAIL_CHECK_OUTPUT||'/tmp/mail-domain-choice'
fs.mkdirSync(out,{recursive:true})
let failurePage
const domains=['okkmail.cc','qtmail.click','qtgmail.click']
const server=http.createServer((req,res)=>{let n=new URL(req.url,'http://localhost').pathname;const f=path.join(root,n==='/'||!path.extname(n)?'index.html':n);fs.readFile(f,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':({'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.webmanifest':'application/manifest+json'})[path.extname(f)]||'application/octet-stream'});res.end(e?'missing':b)})})
;(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port
 const browser=await chromium.launch({headless:true}),results=[]
 for(const [width,lang,dark] of [[1440,'zh',false],[390,'en',false],[375,'ru',false],[768,'de',true],[320,'ar',true],[375,'hi',false]]){
  const c=await browser.newContext({viewport:{width,height:1050}})
  await c.addInitScript(({lang,dark})=>{if(window.top!==window)return;if(!localStorage.getItem('setting'))localStorage.setItem('setting',JSON.stringify({lang,publicMailboxLanguage:lang}));localStorage.setItem('ui',JSON.stringify({dark}))},{lang,dark})
  const p=await c.newPage(),errors=[],requests=[];let serial=0,deny=0,holdCreate,releaseCreate,holdDomain,releaseDomain,failDomains=false
  failurePage=p
  p.on('pageerror',e=>errors.push(e.message))
  await p.route('**/api/**',async r=>{
   const u=new URL(r.request().url());requests.push(u.pathname+u.search);let data={}
   if(u.pathname==='/api/open/domains'){if(failDomains)return r.fulfill({status:503,body:'unavailable'});data=domains}
   if(u.pathname==='/api/open/inbox'){
    const body=r.request().postDataJSON()||{};const domain=body.domain||domains[serial%3];data={address:`t1234567890abcdef${String(++serial).padStart(4,'0')}@${domain}`}
    if(holdCreate){releaseCreate();await holdCreate;holdCreate=null}
   }
   if(u.pathname==='/api/open/recentMails'){
    const a=u.searchParams.get('address');if(deny&&a.endsWith('@qtgmail.click'))return r.fulfill({contentType:'application/json',body:JSON.stringify({code:deny,message:'Denied'})})
    if(holdDomain&&a.endsWith('@qtgmail.click')){releaseDomain();await holdDomain;holdDomain=null}
    const id=a.endsWith('@qtmail.click')?2:a.endsWith('@qtgmail.click')?3:1
    data=[{emailId:id,sendName:'Sample sender',subject:'Mail @'+a.split('@')[1],createTime:'2026-10-20 12:00:00',text:'Sample mail'}]
   }
   if(u.pathname==='/api/open/mailContent')data={emailId:Number(u.searchParams.get('emailId')),content:'<p>Complete sample message</p>',attList:[],inlineMedia:{}}
   return r.fulfill({contentType:'application/json',body:JSON.stringify({code:200,data})})
  })
  await p.goto(origin+'/find');await p.locator('.tm-address-copy').waitFor();await p.getByText('Mail @okkmail.cc',{exact:true}).waitFor()
  assert.equal(await p.locator('#tm-domain').inputValue(),'okkmail.cc')
  const first=(await p.locator('.tm-address-copy').textContent()).trim(),prefix=first.split('@')[0]
  await p.locator('#tm-domain').selectOption('qtmail.click');await p.getByText('Mail @qtmail.click',{exact:true}).waitFor()
  assert.equal((await p.locator('.tm-address-copy').textContent()).trim(),prefix+'@qtmail.click');await p.getByText('Mail @okkmail.cc',{exact:true}).waitFor({state:'hidden'});assert.equal(await p.getByText('Mail @okkmail.cc',{exact:true}).count(),0)
  await p.locator('.tm-new-username').click();await p.waitForFunction(a=>document.querySelector('.tm-address-copy').textContent.trim()!==a,prefix+'@qtmail.click')
  const second=(await p.locator('.tm-address-copy').textContent()).trim();assert.ok(second.endsWith('@qtmail.click'));assert.notEqual(second.split('@')[0],prefix)
  await p.reload();await p.locator('.tm-address-copy').waitFor();assert.equal((await p.locator('.tm-address-copy').textContent()).trim(),second);assert.equal(await p.locator('#tm-domain').inputValue(),'qtmail.click')
  await p.evaluate(()=>localStorage.setItem('findDomainChoice','okkmail.cc'));await p.reload();await p.locator('.tm-address-copy').waitFor();assert.equal(await p.locator('#tm-domain').inputValue(),'qtmail.click')
  await p.locator('#tm-domain').selectOption('random');assert.equal((await p.locator('.tm-address-copy').textContent()).trim(),second)
  await p.reload();await p.locator('.tm-address-copy').waitFor();assert.equal(await p.locator('#tm-domain').inputValue(),'random')
  await p.locator('.tm-new-username').click();await p.waitForFunction(a=>document.querySelector('.tm-address-copy').textContent.trim()!==a,second);await p.locator('.tm-new-username:not(:disabled)').waitFor()
  await p.locator('.tm-history-item').filter({hasText:first}).click();await p.getByText('Mail @okkmail.cc',{exact:true}).waitFor();assert.equal(await p.locator('#tm-domain').inputValue(),'okkmail.cc')
  for(const code of [403,501]){
   deny=code;await p.locator('#tm-domain').selectOption('qtgmail.click');await p.locator('.tm-address-error').waitFor();assert.equal((await p.locator('.tm-address-copy').textContent()).trim(),first);assert.equal(await p.locator('#tm-domain').inputValue(),'okkmail.cc')
  }
  deny=0
  let finish;holdCreate=new Promise(r=>finish=r);let began=new Promise(r=>releaseCreate=r);await p.locator('.tm-new-username').click();await began
  await p.locator('.tm-history-item').filter({hasText:second}).click();finish();await p.waitForTimeout(150);assert.equal((await p.locator('.tm-address-copy').textContent()).trim(),second)
  let finishSwitch;holdDomain=new Promise(r=>finishSwitch=r);let beganSwitch=new Promise(r=>releaseDomain=r);await p.locator('#tm-domain').selectOption('qtgmail.click');await beganSwitch
  await p.locator('.tm-history-item').filter({hasText:first}).click();finishSwitch();await p.waitForTimeout(150);assert.equal((await p.locator('.tm-address-copy').textContent()).trim(),first);assert.equal(await p.locator('#tm-domain').inputValue(),'okkmail.cc')
  holdDomain=new Promise(r=>finishSwitch=r);beganSwitch=new Promise(r=>releaseDomain=r);await p.locator('#tm-domain').selectOption('qtgmail.click');await beganSwitch
  p.once('dialog',d=>d.dismiss());await p.locator('#tm-manual-address').fill('check@unsupported.test');await p.locator('.tm-manual button').click();assert.equal(await p.locator('#tm-domain').inputValue(),'okkmail.cc');finishSwitch();await p.waitForTimeout(150);assert.equal((await p.locator('.tm-address-copy').textContent()).trim(),first)
  await c.setOffline(true);await p.locator('#tm-domain').selectOption('qtgmail.click');await p.locator('.tm-address-error').waitFor();assert.equal((await p.locator('.tm-address-copy').textContent()).trim(),first)
  await p.locator('.tm-history-item').filter({hasText:second}).click();assert.equal((await p.locator('.tm-address-copy').textContent()).trim(),second)
  await c.setOffline(false);await p.locator('.tm-new-username:not(:disabled)').waitFor()
  await p.locator('.tm-pulse:not(.is-busy)').waitFor();await p.waitForFunction(()=>[...document.querySelectorAll('.tm-mail')].length>0&&[...document.querySelectorAll('.tm-mail')].every(e=>getComputedStyle(e).opacity==='1'&&!e.classList.contains('tm-fade-enter-active')));await p.mouse.move(0,0);await p.locator('#tm-domain').focus();await p.screenshot({path:path.join(out,`${width}-${lang}-${dark?'dark':'light'}.png`),fullPage:true})
  const measured=await p.evaluate(()=>{
   const selectors=['#tm-domain','.tm-domain-control label','.tm-domain-hint','.tm-new-username','.tm-address-copy','.tm-history-item.is-active'];return {overflow:document.documentElement.scrollWidth>innerWidth,dark:document.documentElement.classList.contains('dark'),direction:document.documentElement.dir,styles:selectors.map(selector=>{const e=document.querySelector(selector),s=getComputedStyle(e);return {selector,color:s.color,background:s.backgroundColor,font:s.fontSize,outline:s.outlineColor,height:e.getBoundingClientRect().height}})}
  })
  assert.equal(await p.locator('.tm-history-address').first().evaluate(e=>e.scrollWidth>e.clientWidth),false);assert.ok(await p.locator('.tm-workspace').evaluate(e=>Boolean(e.compareDocumentPosition(document.querySelector('.tm-manual'))&Node.DOCUMENT_POSITION_FOLLOWING)));assert.equal(measured.overflow,false);assert.equal(measured.dark,dark);assert.ok(measured.styles[0].height>=44);assert.deepEqual(errors,[])
  if(width<=390){assert.ok(await p.locator('.tm-workspace').evaluate(e=>e.getBoundingClientRect().top)<await p.locator('.tm-manual').evaluate(e=>e.getBoundingClientRect().top))}
  results.push({width,lang,dark,initial:true,domainChange:true,prefixPreserved:true,newUsername:true,preferenceReload:true,randomMode:true,historyIsolation:true,errorsRecover:true,staleCreateDiscarded:true,staleSwitchDiscarded:true,offline:true,measured,errors})
  if(width===1440){
   await c.clearCookies();await p.evaluate(()=>{localStorage.removeItem('findAddress');localStorage.removeItem('findDomainChoice')});
   const c2=await browser.newContext();const p2=await c2.newPage();await p2.route('**/api/**',async r=>{const u=new URL(r.request().url());return r.fulfill({status:503,body:'unavailable'})});await p2.goto(origin+'/find');await p2.locator('.tm-domain-retry').waitFor();assert.equal(await p2.locator('.tm-address-copy').count(),0);await c2.close();results.push({domainListFailureVisible:true})
  }
  await c.close()
 }
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({output:out,results:results.map(({measured,...r})=>r)}));await browser.close();server.close()
})().catch(async e=>{if(failurePage&&!failurePage.isClosed()){await failurePage.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});fs.writeFileSync(path.join(out,'failure.html'),await failurePage.content().catch(()=>''))}console.error(e);server.close();process.exit(1)})
