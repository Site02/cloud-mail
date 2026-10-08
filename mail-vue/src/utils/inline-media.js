export function inlineMediaKeys(content) {
  return [...new Set(
    [...String(content || '').matchAll(/\{\{domain\}\}(attachments\/[A-Za-z0-9._-]+)/g)]
      .map(match => match[1])
  )]
}

export function hasCompleteInlineMedia(keys, urls) {
  return keys.every(key => /^\/api\/media\/[A-Za-z0-9_-]{43}$/.test(urls?.[key] || ''))
}

export function needsInlineRecovery(content, urls) {
  return inlineMediaKeys(content).some(key => !urls?.[key])
}
