import {mailboxCountForms as englishForms} from './en.js'
import {mailboxCountForms as russianForms} from './ru.js'
import {mailboxCountForms as arabicForms} from './ar.js'
import {normalizeLanguage} from './languages.js'

const forms = {en: englishForms, ru: russianForms, ar: arabicForms}
const legacyKeys = {
  saved: {one: 'temporaryInbox.savedCount', other: 'temporaryInbox.savedCount'},
  email: {one: 'temporaryInbox.oneEmail', other: 'temporaryInbox.emailCount'},
  attachment: {one: 'temporaryInbox.oneAttachment', other: 'temporaryInbox.attachmentCount'},
}
const rules = new Map()

function validateCount(count) {
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new RangeError('Mailbox count must be a non-negative safe integer')
  }
}

export function mailboxPluralCategory(lang, count) {
  validateCount(count)
  const normalized = normalizeLanguage(lang)
  const locale = normalized || (typeof lang === 'string' && lang !== 'auto' ? lang : 'en')
  if (!rules.has(locale)) {
    try { rules.set(locale, new Intl.PluralRules(locale, {type: 'cardinal'})) }
    catch { rules.set(locale, new Intl.PluralRules('en', {type: 'cardinal'})) }
  }
  return rules.get(locale).select(count)
}

export function formatMailboxCount(t, lang, kind, count) {
  validateCount(count)
  if (!Object.hasOwn(legacyKeys, kind)) throw new RangeError(`Unknown mailbox count kind: ${kind}`)

  const code = normalizeLanguage(lang)
  const category = mailboxPluralCategory(lang, count)
  const templates = forms[code]?.[kind]
  if (templates) {
    return (templates[category] || templates.other).replaceAll('{count}', String(count))
  }

  const key = count === 1 ? legacyKeys[kind].one : legacyKeys[kind].other
  return t(key, {count})
}
