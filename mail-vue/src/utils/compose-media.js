import {inlineMediaKeys, hasCompleteInlineMedia} from './inline-media.js'

export async function prepareComposeMail(email, {inlineUrls = {}, readInline, forward = false, readAttachment} = {}) {
  const keys = inlineMediaKeys(email.content)
  if (!hasCompleteInlineMedia(keys, inlineUrls)) throw new Error('Incomplete mail images')
  let content = email.content || ''
  for (const key of keys) {
    const image = await readInline(inlineUrls[key])
    if (!/^data:image\/[a-zA-Z0-9.+-]+;base64,[a-zA-Z0-9+/=]+$/.test(image)) throw new Error('Invalid mail image')
    content = content.split('{{domain}}' + key).join(image)
  }
  const attachments = []
  if (forward) for (const att of email.attList || []) {
    const copy = await readAttachment(att)
    attachments.push({filename:att.filename, contentType:att.mimeType || 'application/octet-stream', ...copy})
  }
  return {...email, content, attachments}
}
