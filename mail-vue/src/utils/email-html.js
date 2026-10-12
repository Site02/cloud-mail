import DOMPurify from 'dompurify'

// Email is untrusted input. Shadow DOM isolates styles, not executable HTML.
export function sanitizeEmailHtml(html) {
  const safe = DOMPurify.sanitize(html || '', {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['form', 'input', 'button', 'textarea', 'select', 'iframe', 'object', 'embed', 'meta', 'link', 'base'],
    FORBID_ATTR: ['srcdoc', 'autofocus'],
  })
  const template = document.createElement('template')
  template.innerHTML = safe
  for (const anchor of template.content.querySelectorAll('a')) {
    anchor.target = '_blank'
    anchor.rel = 'noopener noreferrer'
  }
  return template.innerHTML
}
