const {chromium} = require(process.env.MAIL_BROWSER_MODULE || 'playwright')
const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const root = path.resolve(__dirname, '../../mail-worker/dist')
const output = process.env.MAIL_CHECK_OUTPUT || fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'mail-check-'))
fs.mkdirSync(output, {recursive:true})
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=', 'base64')
const key = 'attachments/audit.png'
const media = '/api/media/' + 'A'.repeat(43)
const externalImage = 'https://mail-images.example.test/history.png'
const email = {emailId: 12, name: 'Test sender', sendEmail: 'sender@example.test', toEmail: 'mail@example.test', userEmail:'owner@example.test', recipient:'[{"address":"mail@example.test"}]', subject:'Audit message', content:`<p>Complete message body</p><img src="{{domain}}${key}"><img class="external-image" src="${externalImage}" alt="Historical external image"><script src="https://mail-images.example.test/blocked.js"></script>`, text:'Complete message body', type:0, status:99, unread:0, isDel:0, createTime:'2026-10-08 12:00:00', attList:[{attId:4,filename:'audit.pdf',size:10,mimeType:'application/pdf'}]}
const server = http.createServer((req,res)=>{
  const name = decodeURIComponent(new URL(req.url,'http://localhost').pathname)
  const file = path.join(root, name === '/' || !path.extname(name) ? 'index.html' : name)
  const type = {'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.json':'application/json','.webmanifest':'application/manifest+json'}[path.extname(file)] || 'application/octet-stream'
  fs.readFile(file,(error,data)=>{res.writeHead(error?404:200,{'Content-Type':type});res.end(error?'missing':data)})
})
;(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
  const origin = `http://127.0.0.1:${server.address().port}`
  const browser = await chromium.launch({headless:true})
  const results=[]
  for (const [width,lang,dark] of [[1440,'zh',false],[375,'en',false],[768,'de',true],[320,'ar',true]]) {
    const context = await browser.newContext({viewport:{width,height:900},acceptDownloads:true})
    await context.addInitScript(({lang,dark})=>{
      if (window.top !== window) return; localStorage.setItem('token','test-session')
      localStorage.setItem('setting',JSON.stringify({lang,publicMailboxLanguage:lang}))
      if(dark) document.addEventListener('DOMContentLoaded',()=>document.documentElement.classList.add('dark'),{once:true})
    },{lang,dark})
    const page = await context.newPage()
    await page.route(externalImage,route=>route.fulfill({contentType:'image/png',body:png}))
    let scriptRequests=0
    await page.route('**/blocked.js',route=>{scriptRequests++;return route.fulfill({body:'throw new Error("unsafe script")'})})
    const errors=[]; const requests=[]
    let listCalls = 0
    let attachmentDenied = false
    page.on('pageerror',error=>errors.push(error.message))
    await page.route('**/api/**',async route=>{
      const url=new URL(route.request().url()); requests.push(url.pathname+url.search)
      if(url.pathname.startsWith('/api/media/')) return route.fulfill({contentType:'image/png',body:png})
      if(url.pathname.endsWith('/attachment')) return attachmentDenied
        ? route.fulfill({contentType:'application/json',body:JSON.stringify({code:403,message:'Unauthorized'})})
        : route.fulfill({contentType:'application/pdf',body:Buffer.from('%PDF-audit')})
      let data={}
      if(url.pathname==='/api/setting/websiteConfig') data={title:'Mail',domainList:['example.test'],autoRefresh:3,manyEmail:1,notice:1,noticeDuration:0,loginOpacity:1,register:0}
      else if(url.pathname==='/api/my/loginUserInfo') data={userId:1,email:'admin@example.test',name:'Admin',permKeys:['*'],account:{accountId:1,email:'admin@example.test',name:'Admin',allReceive:1},role:{sendType:'all'}}
      else if(url.pathname==='/api/account/list') data={list:[],total:0}
      else if(url.pathname.endsWith('/list')) {
        const call = ++listCalls
        if(call===1) await new Promise(resolve=>setTimeout(resolve,1500))
        data={list:[call===1 ? {...email,emailId:99,subject:'Old request'} : email],total:1,latestEmail:{emailId:12,accountId:1,userId:1,allReceive:1}}
      }
      else if(url.pathname.endsWith('/latest')) data=[]
      else if(url.pathname.endsWith('/contentMedia')) data={[key]:media}
      return route.fulfill({contentType:'application/json',body:JSON.stringify({code:200,data})})
    })
    await page.goto(origin+'/all-mail')
    await page.locator('.icon-button.reload').click()
    await page.waitForTimeout(1800)
    assert.equal(await page.locator('.row-open-action[data-email-id="99"]').count(),0)
    if(width===1440) {
      await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,value:true}));
      const before=requests.filter(url=>url.includes('/latest')).length;
      await page.waitForTimeout(3500);
      assert.equal(requests.filter(url=>url.includes('/latest')).length,before);
      await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,value:false}));
    }
    await page.locator('.row-open-action[data-email-id="12"]').click({timeout:15000})
    await page.frameLocator('.mail-frame').locator('p').waitFor()
    await page.waitForTimeout(250)
    const image=await page.frameLocator('.mail-frame').locator('img').first().evaluate(el=>el.naturalWidth)
    assert.equal(image,1)
    await page.frameLocator('.mail-frame').locator('.external-image').evaluate(el=>el.decode())
    assert.equal(scriptRequests,0)
    assert.equal(await page.locator('.mail-frame').getAttribute('sandbox'),'allow-popups allow-popups-to-escape-sandbox')
    const downloadPromise=page.waitForEvent('download')
    await page.locator('.att-item .opt-icon button').click()
    const download=await downloadPromise
    assert.equal(download.suggestedFilename(),'audit.pdf')
    assert.equal(fs.readFileSync(await download.path()).toString(),'%PDF-audit')
    assert.ok(requests.some(url=>url.startsWith('/api/allEmail/attachment?')))
    if(width===1440) {
      attachmentDenied = true
      let bogusDownload = false
      page.once('download',()=>{bogusDownload=true})
      await page.locator('.att-item .opt-icon button').click()
      await page.waitForTimeout(350)
      assert.equal(bogusDownload,false)
    }
    assert.ok(requests.filter(url=>url.startsWith('/api/allEmail/list?')).every(url=>url.includes('full=1')))
    attachmentDenied = false
    await page.goto(origin+'/inbox')
    await page.locator('.row-open-action[data-email-id="12"]').click()
    await page.getByRole('button',{name:({zh:'回复',en:'Reply',de:'Antworten',ar:'الرد'})[lang],exact:true}).click()
    const quoteImage=page.frameLocator('.write-box iframe').locator('img').first()
    await quoteImage.waitFor()
    assert.ok(await page.evaluate(()=>window.tinymce.activeEditor.getContent().includes('data:image/png;base64,')))
    await quoteImage.evaluate(el=>el.decode())
    await page.frameLocator('.write-box iframe').locator('body').press('Escape')
    await page.locator('.write-box').waitFor({state:'hidden'})
    await page.getByRole('button',{name:({zh:'转发',en:'Forward',de:'Weiterleiten',ar:'إعادة توجيه'})[lang],exact:true}).click()
    await page.locator('.write-box .att-filename').waitFor()
    assert.equal(await page.locator('.write-box .att-filename').textContent(),'audit.pdf')
    assert.ok(await page.evaluate(()=>window.tinymce.activeEditor.getContent().includes('data:image/png;base64,')))
    await page.getByRole('button',{name:({zh:'删除',en:'Delete',de:'Löschen',ar:'حذف'})[lang]+': audit.pdf',exact:true}).click()
    await page.frameLocator('.write-box iframe').locator('body').press('Escape')
    await page.getByRole('dialog').waitFor()
    await page.getByRole('dialog').getByRole('button',{name:({zh:'取消',en:'Cancel',de:'Abbrechen',ar:'إلغاء'})[lang],exact:true}).click()
    await page.locator('.write-box').waitFor({state:'hidden'})
    assert.deepEqual(errors,[])
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth)
    assert.equal(overflow,false)
    await page.screenshot({path:path.join(output, `${width}-${lang}.png`)})
    results.push({width,lang,dark,body:true,image:true,externalImage:true,scriptsBlocked:true,attachment:true,replyImage:true,forwardImageAndAttachment:true,overflow,errors})
    await context.close()
  }
  const failedContext = await browser.newContext()
  await failedContext.addInitScript(()=>{
    if(window.top!==window) return
    localStorage.setItem('token','test-session')
    localStorage.setItem('setting',JSON.stringify({lang:'en'}))
  })
  const failedPage = await failedContext.newPage()
  let failedListCalls = 0
  await failedPage.route('**/api/**',async route=>{
    const url=new URL(route.request().url())
    let data={}
    if(url.pathname==='/api/my/loginUserInfo') data={userId:1,email:'admin@example.test',name:'Admin',permKeys:['*'],account:{accountId:1,email:'admin@example.test',allReceive:1},role:{sendType:'all'}}
    if(url.pathname==='/api/setting/websiteConfig') data={title:'Mail',domainList:['example.test'],autoRefresh:0,manyEmail:1,notice:1}
    if(url.pathname==='/api/account/list') data={list:[],total:0}
    if(url.pathname==='/api/email/list') data={list:[email],total:1,latestEmail:{emailId:12,allReceive:1}}
    if(url.pathname==='/api/allEmail/list') {
      if(++failedListCalls===1) return route.fulfill({status:403,body:'blocked'})
      data={list:[email],total:1,latestEmail:{emailId:12}}
    }
    return route.fulfill({contentType:'application/json',body:JSON.stringify({code:200,data})})
  })
  await failedPage.goto(origin+'/all-mail')
  await failedPage.locator('.load-error').waitFor()
  await failedPage.waitForTimeout(500)
  assert.equal(failedListCalls,1)
  await failedPage.locator('.load-error button').click()
  await failedPage.locator('.row-open-action[data-email-id="12"]').waitFor()
  await failedPage.goto(origin+'/mail')
  await failedPage.waitForURL('**/inbox')
  results.push({http403Recovery:true,noAutomaticReload:true,noBogusAttachment:true,emptyDetailRecovery:true})
  await failedContext.close()
  const publicContext = await browser.newContext({viewport:{width:375,height:900}})
  await publicContext.addInitScript(()=>{
    if(window.top!==window) return
    localStorage.setItem('setting',JSON.stringify({lang:'en',publicMailboxLanguage:'en'}))
  })
  const publicPage = await publicContext.newPage()
  await publicPage.route(externalImage,route=>route.fulfill({contentType:'image/png',body:png}))
  let mediaWorks = false
  let contentCalls = 0
  const publicErrors=[]
  publicPage.on('pageerror',error=>publicErrors.push(error.message))
  await publicPage.route('**/api/**',async route=>{
    const url=new URL(route.request().url())
    if(url.pathname.startsWith('/api/media/')) return route.fulfill({status:mediaWorks?200:503,contentType:'image/png',body:mediaWorks?png:Buffer.from('unavailable')})
    let data={}
    const mailbox=url.searchParams.get('address') || 'a@example.test'
    const mail={...email,emailId:mailbox.startsWith('b@')?13:12,toEmail:mailbox,subject:mailbox.startsWith('b@')?'Mailbox B':'Mailbox A',attList:[],status:0}
    if(url.pathname==='/api/open/domains') data=['example.test']
    if(url.pathname==='/api/open/inbox') data={address:'a@example.test'}
    if(url.pathname==='/api/open/recentMails') data=[{...mail,content:undefined,inlineMedia:undefined}]
    if(url.pathname==='/api/open/mailContent') {contentCalls++;data={...mail,inlineMedia:{[key]:media}}}
    return route.fulfill({contentType:'application/json',body:JSON.stringify({code:200,data})})
  })
  await publicPage.goto(origin+'/find#address=a%40example.test')
  await publicPage.locator('.tm-mail-open').waitFor()
  await publicPage.waitForTimeout(700)
  await publicPage.locator('.tm-mail-open').click()
  await publicPage.frameLocator('.tm-view-frame').locator('p').waitFor()
  await publicPage.locator('.tm-view-close').click()
  mediaWorks=true
  await publicPage.locator('.tm-mail-open').click()
  await publicPage.waitForTimeout(900)
  assert.ok(contentCalls>=2)
  await publicPage.frameLocator('.tm-view-frame').locator('.external-image').evaluate(el=>el.decode())
  assert.equal(await publicPage.frameLocator('.tm-view-frame').locator('img').first().evaluate(el=>el.naturalWidth),1)
  await publicPage.locator('.tm-view-close').click()
  await publicPage.locator('.tm-manual input').fill('b@example.test')
  await publicPage.locator('.tm-manual button[type="submit"]').click()
  await publicPage.getByText('Mailbox B',{exact:true}).waitFor()
  await publicPage.getByText('Mailbox A',{exact:true}).waitFor({state:'hidden'})
  assert.equal(await publicPage.getByText('Mailbox A',{exact:true}).count(),0)
  await publicContext.setOffline(true)
  await publicPage.locator('.tm-history-item').filter({hasText:'a@example.test'}).click()
  await publicPage.getByText('Mailbox A',{exact:true}).waitFor()
  await publicPage.getByText('Mailbox B',{exact:true}).waitFor({state:'hidden'})
  const beforeOffline=contentCalls
  await publicPage.locator('.tm-mail-open').click()
  await publicPage.waitForTimeout(250)
  assert.equal(await publicPage.frameLocator('.tm-view-frame').locator('img').first().evaluate(el=>el.naturalWidth),1)
  assert.equal(contentCalls,beforeOffline)
  assert.deepEqual(publicErrors,[])
  results.push({publicCacheRecovery:true,publicExternalImage:true,addressIsolation:true,offlineImage:true,errors:publicErrors})
  await publicContext.close()
  console.log(JSON.stringify({output, results}))
  await browser.close(); server.close()
})().catch(error=>{console.error(error);server.close();process.exit(1)})
