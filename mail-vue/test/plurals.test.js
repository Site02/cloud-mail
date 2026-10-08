import test from 'node:test'
import assert from 'node:assert/strict'

import {formatMailboxCount, mailboxPluralCategory} from '../src/i18n/plurals.js'
import {mailboxCountForms as englishForms} from '../src/i18n/en.js'
import {mailboxCountForms as russianForms} from '../src/i18n/ru.js'
import {mailboxCountForms as arabicForms} from '../src/i18n/ar.js'

const counts = [0, 1, 2, 3, 5, 11, 21, 101]
const categories = {
  en: ['other', 'one', 'other', 'other', 'other', 'other', 'other', 'other'],
  ru: ['many', 'one', 'few', 'few', 'many', 'many', 'one', 'one'],
  ar: ['zero', 'one', 'two', 'few', 'few', 'many', 'many', 'other'],
}

test('mailbox counts use the cardinal categories for English, Russian and Arabic', () => {
  for (const [lang, expected] of Object.entries(categories)) {
    assert.deepEqual(counts.map(count => mailboxPluralCategory(lang, count)), expected, lang)
  }
  assert.equal(mailboxPluralCategory('ar-SA', 101), 'other')
  assert.equal(mailboxPluralCategory('ru-RU', 21), 'one')
})

test('every specialized form keeps the count and covers its language categories', () => {
  for (const [lang, dictionary] of Object.entries({en: englishForms, ru: russianForms, ar: arabicForms})) {
    for (const kind of ['saved', 'email', 'attachment']) {
      const forms = dictionary[kind]
      assert.deepEqual(Object.keys(forms).sort(), [...new Set([...categories[lang], 'other'])].sort(), `${lang}.${kind}`)
      for (const [category, template] of Object.entries(forms)) {
        assert.equal(template.split('{count}').length - 1, 1, `${lang}.${kind}.${category}`)
      }
    }
  }
})

test('English mailbox counts distinguish one from all other counts', () => {
  const unavailable = () => { throw new Error('unexpected dictionary fallback') }
  assert.equal(formatMailboxCount(unavailable, 'en-US', 'saved', 0), '0 emails saved')
  assert.equal(formatMailboxCount(unavailable, 'en-US', 'saved', 1), '1 email saved')
  assert.equal(formatMailboxCount(unavailable, 'en-US', 'email', 21), '21 emails')
  assert.equal(formatMailboxCount(unavailable, 'en-US', 'attachment', 1), '1 attachment')
  assert.equal(formatMailboxCount(unavailable, 'en-US', 'attachment', 101), '101 attachments')
})

test('Russian mailbox nouns agree with 0, 1, 2, 3, 5, 11, 21 and 101', () => {
  const unavailable = () => { throw new Error('unexpected dictionary fallback') }
  const endings = {
    saved: ['писем', 'письмо', 'письма', 'письма', 'писем', 'писем', 'письмо', 'письмо'],
    email: ['писем', 'письмо', 'письма', 'письма', 'писем', 'писем', 'письмо', 'письмо'],
    attachment: ['вложений', 'вложение', 'вложения', 'вложения', 'вложений', 'вложений', 'вложение', 'вложение'],
  }
  for (const kind of Object.keys(endings)) {
    for (const [index, count] of counts.entries()) {
      const result = formatMailboxCount(unavailable, 'ru-RU', kind, count)
      assert.match(result, new RegExp(`\\b${count} ${endings[kind][index]}$`, 'u'), `${kind}:${count}`)
    }
  }
})

test('Arabic mailbox forms preserve count and distinguish zero, dual, few and many', () => {
  const unavailable = () => { throw new Error('unexpected dictionary fallback') }
  const examples = {
    saved: [
      'لا توجد رسائل محفوظة (0)', 'رسالة محفوظة (1)', 'رسالتان محفوظتان (2)',
      '3 رسائل محفوظة', '5 رسائل محفوظة', '11 رسالة محفوظة',
      '21 رسالة محفوظة', '101 رسالة محفوظة',
    ],
    email: [
      'لا توجد رسائل بريد إلكتروني (0)', 'رسالة بريد إلكتروني (1)',
      'رسالتا بريد إلكتروني (2)', '3 رسائل بريد إلكتروني',
      '5 رسائل بريد إلكتروني', '11 رسالة بريد إلكتروني',
      '21 رسالة بريد إلكتروني', '101 رسالة بريد إلكتروني',
    ],
    attachment: [
      'لا توجد مرفقات (0)', 'مرفق (1)', 'مرفقان (2)', '3 مرفقات',
      '5 مرفقات', '11 مرفقًا', '21 مرفقًا', '101 مرفق',
    ],
  }
  for (const [kind, expected] of Object.entries(examples)) {
    assert.deepEqual(counts.map(count => formatMailboxCount(unavailable, 'ar-SA', kind, count)), expected)
  }
})

test('other languages continue using their existing count keys', () => {
  const translate = (key, values) => `${key}:${values.count}`
  assert.equal(formatMailboxCount(translate, 'fr', 'saved', 1), 'temporaryInbox.savedCount:1')
  assert.equal(formatMailboxCount(translate, 'fr', 'email', 1), 'temporaryInbox.oneEmail:1')
  assert.equal(formatMailboxCount(translate, 'fr', 'email', 2), 'temporaryInbox.emailCount:2')
  assert.equal(formatMailboxCount(translate, 'fr', 'attachment', 1), 'temporaryInbox.oneAttachment:1')
  assert.equal(formatMailboxCount(translate, 'fr', 'attachment', 2), 'temporaryInbox.attachmentCount:2')
  assert.throws(() => formatMailboxCount(translate, 'en', 'email', -1), RangeError)
  assert.throws(() => formatMailboxCount(translate, 'en', 'email', 1.5), RangeError)
  assert.throws(() => formatMailboxCount(translate, 'en', 'unknown', 1), RangeError)
})
