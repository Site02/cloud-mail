import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync, readdirSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {dirname, resolve} from 'node:path'

import frontEn from '../src/i18n/en.js'
import frontZh from '../src/i18n/zh.js'
import frontEs from '../src/i18n/es.js'
import frontFr from '../src/i18n/fr.js'
import frontJa from '../src/i18n/ja.js'
import frontKo from '../src/i18n/ko.js'
import frontDe from '../src/i18n/de.js'
import frontPt from '../src/i18n/pt.js'
import frontRu from '../src/i18n/ru.js'
import frontIt from '../src/i18n/it.js'
import frontId from '../src/i18n/id.js'
import frontVi from '../src/i18n/vi.js'
import frontTr from '../src/i18n/tr.js'
import frontAr from '../src/i18n/ar.js'
import frontHi from '../src/i18n/hi.js'
import workerEn from '../../mail-worker/src/i18n/en.js'
import workerZh from '../../mail-worker/src/i18n/zh.js'
import workerEs from '../../mail-worker/src/i18n/es.js'
import workerFr from '../../mail-worker/src/i18n/fr.js'
import workerJa from '../../mail-worker/src/i18n/ja.js'
import workerKo from '../../mail-worker/src/i18n/ko.js'
import workerDe from '../../mail-worker/src/i18n/de.js'
import workerPt from '../../mail-worker/src/i18n/pt.js'
import workerRu from '../../mail-worker/src/i18n/ru.js'
import workerIt from '../../mail-worker/src/i18n/it.js'
import workerId from '../../mail-worker/src/i18n/id.js'
import workerVi from '../../mail-worker/src/i18n/vi.js'
import workerTr from '../../mail-worker/src/i18n/tr.js'
import workerAr from '../../mail-worker/src/i18n/ar.js'
import workerHi from '../../mail-worker/src/i18n/hi.js'
import expandedBackend from '../../mail-worker/src/i18n/expanded.js'
import {dateLocale, getBrowserLanguage, intlLanguage, languageDirection, languageInfo, languages, manifestPath, matchLanguageTag, normalizeLanguage, resolveLanguage} from '../src/i18n/languages.js'
import {requestLanguage, t} from '../../mail-worker/src/i18n/i18n.js'
import {checkCandidate} from '../tools/check-locale-candidate.mjs'

const expandedFrontend = Object.fromEntries(
  languages.filter(language => language.delivery === 'lazy').map(({code}) => [
    code,
    JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), `../src/i18n/locales/${code}.json`), 'utf8')),
  ]),
)
const frontend = {...expandedFrontend, en: frontEn, zh: frontZh, es: frontEs, fr: frontFr, ja: frontJa, ko: frontKo, de: frontDe, pt: frontPt, ru: frontRu, it: frontIt, id: frontId, vi: frontVi, tr: frontTr, ar: frontAr, hi: frontHi}
const backend = {...Object.fromEntries(languages.filter(language => language.delivery === 'lazy').map(({code}) => [code, expandedBackend[code]])), en: workerEn, zh: workerZh, es: workerEs, fr: workerFr, ja: workerJa, ko: workerKo, de: workerDe, pt: workerPt, ru: workerRu, it: workerIt, id: workerId, vi: workerVi, tr: workerTr, ar: workerAr, hi: workerHi}
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../src')
const workerRoot = resolve(root, '../../mail-worker/src')

function flatten(tree, prefix = '', result = {}) {
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix + key
    if (typeof value === 'string') result[path] = value
    else flatten(value, path + '.', result)
  }
  return result
}

function files(path) {
  return readdirSync(path, {withFileTypes: true}).flatMap(entry =>
    entry.isDirectory() ? files(resolve(path, entry.name)) : [resolve(path, entry.name)])
}

test('all selectable languages have complete keys and matching placeholders', () => {
  const bundledExtraLocales = readdirSync(resolve(root, 'i18n/locales'))
    .filter(filename => filename.endsWith('.json'))
    .map(filename => filename.slice(0, -5)).sort()
  assert.deepEqual(bundledExtraLocales,
    languages.filter(language => language.delivery === 'lazy').map(language => language.code).sort())
  assert.deepEqual(Object.keys(frontend).sort(), languages.map(language => language.code).sort())
  assert.deepEqual(Object.keys(backend).sort(), languages.map(language => language.code).sort())
  for (const [surface, locales] of Object.entries({frontend, backend})) {
    const reference = flatten(locales.en)
    for (const [language, tree] of Object.entries(locales)) {
      const current = flatten(tree)
      assert.deepEqual(Object.keys(current).sort(), Object.keys(reference).sort(), surface + ':' + language)
      for (const [key, value] of Object.entries(current)) {
        assert.ok(value.trim(), surface + ':' + language + ':' + key)
        const slots = text => [...text.matchAll(/\{\{?\w+\}?\}/g)].map(match => match[0]).sort()
        assert.deepEqual(slots(value), slots(reference[key]), surface + ':' + language + ':' + key)
      }
    }
  }
})

test('selectable dictionaries reject mass repetition and English carryover', () => {
  const reference = {frontend: flatten(frontEn), backend: flatten(workerEn)}
  for (const [surface, locales] of Object.entries({frontend, backend})) {
    for (const [language, tree] of Object.entries(locales)) {
      if (language === 'en') continue
      const entries = Object.entries(flatten(tree))
      const frequency = new Map()
      let unchanged = 0
      for (const [key, value] of entries) {
        frequency.set(value, (frequency.get(value) || 0) + 1)
        if (value === reference[surface][key]) unchanged += 1
      }
      // These bounds catch repeated filler and mostly untranslated imports.
      // Human review still determines whether individual translations are right.
      assert.ok(Math.max(...frequency.values()) <= 10, `${surface}:${language}: repeated text`)
      assert.ok(unchanged <= (surface === 'frontend' ? 40 : 15), `${surface}:${language}: English carryover`)
    }
  }
})

test('published translations pass the candidate safety gate', () => {
  for (const {code} of languages) {
    if (code === 'en') continue
    assert.deepEqual(checkCandidate(frontend[code], backend[code]), [], code)
  }
})

test('candidate gate rejects untranslated deletion decisions and policy errors', () => {
  const frontCandidate = structuredClone(frontFr)
  const workerCandidate = structuredClone(workerFr)
  for (const key of ['delAccountMsg', 'delAccountConfirm', 'delAccountSoftMsg', 'delAccountSoftConfirm']) {
    frontCandidate[key] = frontEn[key]
  }
  workerCandidate.deletionPolicyChanged = workerEn.deletionPolicyChanged
  const findings = checkCandidate(frontCandidate, workerCandidate)
  for (const key of ['delAccountMsg', 'delAccountConfirm', 'delAccountSoftMsg', 'delAccountSoftConfirm', 'deletionPolicyChanged']) {
    assert.ok(findings.some(item => item.includes(key)), key)
  }
})

test('literal translation keys used by the interface exist', () => {
  const messages = flatten(frontEn)
  for (const path of files(root)) {
    if (!/\.(vue|js)$/.test(path) || path.includes('/i18n/')) continue
    const source = readFileSync(path, 'utf8')
    for (const match of source.matchAll(/(?:\$t|(?<![\w.])t)\(['"]([a-zA-Z][\w.-]*)['"]/g)) {
      assert.ok(match[1] in messages, path + ':' + match[1])
    }
  }
})

test('literal server translation keys exist', () => {
  const messages = flatten(workerEn)
  for (const path of files(workerRoot)) {
    if (!path.endsWith('.js') || path.includes('/i18n/')) continue
    const source = readFileSync(path, 'utf8')
    for (const match of source.matchAll(/\bt\(c,\s*['"]([a-zA-Z][\w.-]*)['"]\s*(?=[,)])/g)) {
      assert.ok(match[1] in messages, path + ':' + match[1])
    }
  }
})

test('browser preference and manual selection resolve all supported languages', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  try {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {languages: ['zh-TW', 'pt-PT', 'it-IT', 'ru-RU'], language: 'zh-TW'},
    })
    assert.equal(getBrowserLanguage(), 'zh-Hant')
    assert.equal(resolveLanguage('auto'), 'zh-Hant')
    assert.equal(resolveLanguage('ja'), 'ja')
    assert.equal(normalizeLanguage('pt-BR'), 'pt')
    assert.equal(normalizeLanguage('zh-Hant'), 'zh-Hant')
    assert.equal(normalizeLanguage('zh-HK'), 'zh-Hant')
    assert.equal(normalizeLanguage('zh-MO'), 'zh-Hant')
    assert.equal(normalizeLanguage('zh-Hant-CN'), 'zh-Hant')
    assert.equal(normalizeLanguage('zh-Hans-TW'), 'zh')
    assert.equal(normalizeLanguage('zh-SG'), 'zh')
    assert.equal(normalizeLanguage('pt-PT'), 'pt')
    assert.equal(normalizeLanguage('en-US-u-nu-arab'), 'en')
    assert.equal(normalizeLanguage('ar-Latn'), null)
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {languages: ['ar-Latn', 'ja-JP'], language: 'ar-Latn'},
    })
    assert.equal(getBrowserLanguage(), 'ja')
    assert.equal(normalizeLanguage('he-IL'), null)
    assert.equal(normalizeLanguage('nl-NL'), null)
    assert.equal(normalizeLanguage('xx-XX'), null)
  } finally {
    if (previous) Object.defineProperty(globalThis, 'navigator', previous)
    else delete globalThis.navigator
  }
})

test('script and regional matching never substitutes a different writing system', () => {
  const catalog = [
    {code: 'az', intl: 'az-AZ', dir: 'ltr'},
    {code: 'az-Arab', intl: 'az-Arab-IR', dir: 'rtl'},
    {code: 'sr', intl: 'sr-RS', dir: 'ltr'},
    {code: 'sr-Latn', intl: 'sr-Latn-RS', dir: 'ltr'},
    {code: 'pa', intl: 'pa-IN', dir: 'ltr'},
    {code: 'pa-Arab', intl: 'pa-Arab-PK', dir: 'rtl'},
    {code: 'he', intl: 'he-IL', dir: 'rtl'},
  ]
  assert.equal(matchLanguageTag('az-Arab', catalog), 'az-Arab')
  assert.equal(matchLanguageTag('az-IR', catalog), 'az-Arab')
  assert.equal(matchLanguageTag('az-AZ', catalog), 'az')
  assert.equal(matchLanguageTag('sr-Latn', catalog), 'sr-Latn')
  assert.equal(matchLanguageTag('sr-RS', catalog), 'sr')
  assert.equal(matchLanguageTag('pa-PK', catalog), 'pa-Arab')
  assert.equal(matchLanguageTag('pa-IN', catalog), 'pa')
  assert.equal(matchLanguageTag('iw-IL', catalog), 'he')
  assert.equal(matchLanguageTag('az-Arab', [catalog[0]]), null)
  assert.equal(matchLanguageTag('sr-Latn', [catalog[2]]), null)
  assert.equal(matchLanguageTag('pa-Arab', [catalog[4]]), null)
  assert.equal(matchLanguageTag('invalid tag', catalog), null)
})

test('published languages declare the date locale and page direction', () => {
  assert.equal(dateLocale('zh-HK'), 'zh-tw')
  assert.equal(dateLocale('pt-PT'), 'pt-br')
  assert.equal(languageDirection('ar-SA'), 'rtl')
  for (const language of languages) {
    assert.equal(languageInfo(language.code), language)
    assert.ok(['ltr', 'rtl'].includes(language.dir), language.code)
    assert.ok(language.dateLocale, language.code)
    assert.ok(['bundled', 'lazy'].includes(language.delivery), language.code)
    assert.equal(language.status, 'published', language.code)
  }
})

test('both home screen apps have a localized manifest for every language', () => {
  for (const {code} of languages) {
    for (const temporary of [false, true]) {
      const path = resolve(root, '../public' + manifestPath(code, temporary))
      const manifest = JSON.parse(readFileSync(path, 'utf8'))
      assert.equal(manifest.lang, intlLanguage(code), path)
      assert.equal(manifest.dir, languageDirection(code), path)
      assert.equal(manifest.id, temporary ? '/temporary-mail-app' : '/mail-app', path)
      assert.ok(manifest.name.trim() && manifest.description.trim(), path)
    }
  }
})

test('server translations stay bound to each request', async () => {
  const context = value => ({req: {header: () => value}})
  const spanish = context('es-ES,ru;q=0.7')
  const russian = context('ru-RU,es;q=0.7')
  assert.equal(requestLanguage(context('nl-NL,fr-FR;q=0.9,ru;q=0.8')), 'fr')
  assert.equal(requestLanguage(context('de;q=0,ja;q=0.8')), 'ja')
  const results = await Promise.all(Array.from({length: 20}, (_, index) =>
    Promise.resolve().then(() => t(index % 2 ? russian : spanish, 'IncorrectPwd'))))
  assert.deepEqual(new Set(results.filter((_, index) => index % 2 === 0)), new Set([workerEs.IncorrectPwd]))
  assert.deepEqual(new Set(results.filter((_, index) => index % 2 === 1)), new Set([workerRu.IncorrectPwd]))
  assert.match(t(spanish, 'minEmailPrefix', {msg: 6}), /6/)
})
