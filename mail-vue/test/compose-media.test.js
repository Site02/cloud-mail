import test from 'node:test'
import assert from 'node:assert/strict'
import {prepareComposeMail} from '../src/utils/compose-media.js'

const source = {emailId: 7, content:'<img src="{{domain}}attachments/a.png"><img src="{{domain}}attachments/a.png">', attList:[{attId:3,filename:'sample.pdf',mimeType:'application/pdf'}]}
test('reply embeds a durable image copy without forwarding ordinary attachments', async () => {
  let reads = 0
  const copy = await prepareComposeMail(source, {inlineUrls:{'attachments/a.png':'/api/media/'+'A'.repeat(43)}, readInline:async () => {reads++;return 'data:image/png;base64,YQ=='}})
  assert.equal(reads,1)
  assert.equal((copy.content.match(/data:image\/png/g)||[]).length,2)
  assert.equal(copy.content.includes('{{domain}}'),false)
  assert.deepEqual(copy.attachments,[])
  assert.equal(source.content.includes('{{domain}}'),true)
})
test('forward copies ordinary attachments with their original name and media type', async () => {
  const copy = await prepareComposeMail({...source,content:'<p>text</p>'}, {forward:true, readAttachment:async att => ({content:'YQ==',size:1})})
  assert.deepEqual(copy.attachments,[{filename:'sample.pdf',contentType:'application/pdf',content:'YQ==',size:1}])
})
test('failed or missing protected image stops opening an incomplete compose draft', async () => {
  await assert.rejects(prepareComposeMail(source,{inlineUrls:{}}))
  await assert.rejects(prepareComposeMail(source,{inlineUrls:{'attachments/a.png':'/api/media/'+'A'.repeat(43)},readInline:async()=>{throw Error('unavailable')}}))
})
