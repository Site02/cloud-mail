import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import zh from '../mail-vue/src/i18n/zh.js';
import zhTW from '../mail-vue/src/i18n/zh-TW.js';
import en from '../mail-vue/src/i18n/en.js';
import frontend from '../mail-vue/src/i18n/index.js';
import {detectLocale, dayjsLocales, editorLanguages, htmlLanguages} from '../mail-vue/src/i18n/locale.js';
import backendZh from '../mail-worker/src/i18n/zh.js';
import backendZhTW from '../mail-worker/src/i18n/zh-TW.js';
import backendEn from '../mail-worker/src/i18n/en.js';
import backend from '../mail-worker/src/i18n/resources.js';
import {resolveLanguage} from '../mail-worker/src/i18n/language.js';
import backendApp from '../mail-worker/src/hono/hono.js';
import '../mail-worker/src/i18n/i18n.js';

function leaves(value, prefix = '') {
    return Object.fromEntries(Object.entries(value).flatMap(([key, entry]) => {
        const name = prefix + key
        return typeof entry === 'object' ? Object.entries(leaves(entry, name + '.')) : [[name, entry]]
    }))
}

function assertCompatible(original, translated, allowEmpty = false) {
    const before = leaves(original)
    const after = leaves(translated)
    assert.deepEqual(Object.keys(after).sort(), Object.keys(before).sort())
    for (const [key, value] of Object.entries(before)) {
        assert.equal(typeof after[key], 'string', key)
        if (!allowEmpty) assert.ok(after[key].length, key)
        const placeholders = text => (text.match(/\{\{?\s*\w+\s*\}?\}/g) || []).sort()
        assert.deepEqual(placeholders(after[key]), placeholders(value), key)
    }
}

test('all three languages preserve dictionary keys and interpolation parameters', () => {
    assertCompatible(zh, zhTW)
    assertCompatible(zh, en, true)
    assertCompatible(backendZh, backendZhTW)
    assertCompatible(backendZh, backendEn)
    // Permission keys are database identifiers and must retain their original spelling.
    assert.equal(backendZhTW.perms['邮件发送'], '郵件傳送')
    assert.equal(backendZhTW.perms['权限控制'], '權限控制')
})

test('browser detection distinguishes Chinese regions and scripts', () => {
    for (const tag of ['zh-TW', 'zh-HK', 'zh-MO', 'zh-Hant', 'zh-Hant-HK', 'ZH_tw']) {
        assert.equal(detectLocale(tag), 'zh-TW', tag)
    }
    for (const tag of ['zh', 'zh-CN', 'zh-SG', 'zh-Hans', 'zh-Hans-TW']) {
        assert.equal(detectLocale(tag), 'zh', tag)
    }
    for (const tag of ['en', 'en-US', 'ja-JP', '']) assert.equal(detectLocale(tag), 'en', tag)
})

test('API language negotiation respects quality weights, aliases, and fallback', () => {
    for (const tag of ['zh-TW', 'zh-HK', 'zh-MO', 'zh-Hant', 'zh-Hant-TW']) {
        assert.equal(resolveLanguage(tag), 'zh-TW', tag)
    }
    assert.equal(resolveLanguage('en;q=0.5, zh-TW;q=0.9'), 'zh-TW')
    assert.equal(resolveLanguage('zh-TW;q=0, en-US;q=0.8'), 'en')
    assert.equal(resolveLanguage('zh-Hans-HK, en;q=0.5'), 'zh')
    assert.equal(resolveLanguage('fr-FR, en;q=0.8'), 'en')
    assert.equal(resolveLanguage('zh-TW;q=invalid, en;q=0.8'), 'en')
    assert.equal(resolveLanguage('zh-TW;q=2, en;q=0.8'), 'en')
    assert.equal(resolveLanguage(), 'zh')
    assert.equal(resolveLanguage('*'), 'zh')
})

test('frontend language switching renders Traditional Chinese and preserves existing languages', () => {
    for (const [lang, login] of [['zh-TW', '登入'], ['zh', '登录'], ['en', 'Sign in']]) {
        frontend.global.locale.value = lang
        assert.equal(frontend.global.t('loginBtn'), login)
    }
    frontend.global.locale.value = 'zh-TW'
    assert.equal(frontend.global.t('minEmailPrefix', {msg: 6}), '信箱名至少6位')
    assert.equal(frontend.global.t('minutesAgo', {count: 3}), '3分鐘前')
    assert.equal(frontend.global.t('bindEmail'), '綁定')
})

test('API translations include Traditional Chinese errors, permissions, and interpolation', () => {
    for (const [header, expected] of [['zh-TW', '密碼輸入錯誤'], ['zh-CN', '密码输入错误'], ['en', 'Incorrect password']]) {
        backend.changeLanguage(resolveLanguage(header))
        assert.equal(backend.t('IncorrectPwd'), expected)
    }
    backend.changeLanguage(resolveLanguage('zh-Hant'))
    assert.equal(backend.t('minEmailPrefix', {msg: 6}), '信箱名至少6位')
    assert.equal(backend.t('oauthEmailAlreadyBound'), '使用者已綁定信箱')
    assert.match(backend.t('kvNotBound'), /資料庫未綁定/)
    assert.equal(backend.t('perms.邮件发送'), '郵件傳送')
})

test('API middleware and global errors honor Accept-Language on real requests', async context => {
    backendApp.get('/__locale_test', c => c.json({message: backend.t('IncorrectPwd')}))
    backendApp.get('/__error_test', () => {
        throw new Error("Cannot read properties of undefined (reading 'get')")
    })
    for (const [language, expected] of [['zh-TW', '密碼輸入錯誤'], ['zh-Hant', '密碼輸入錯誤'], ['zh', '密码输入错误'], ['en', 'Incorrect password']]) {
        const response = await backendApp.request('/__locale_test', {headers: {'accept-language': language}})
        assert.equal(response.status, 200)
        assert.equal((await response.json()).message, expected)
    }
    context.mock.method(console, 'error', () => {})
    const response = await backendApp.request('/__error_test', {headers: {'accept-language': 'zh-TW'}})
    const body = await response.json()
    assert.equal(body.code, 502)
    assert.match(body.message, /KV資料庫未綁定/)
})

test('component, date, document, and editor locale identifiers map to shipped language packs', () => {
    assert.deepEqual(dayjsLocales, {zh: 'zh-cn', 'zh-TW': 'zh-tw', en: 'en'})
    assert.deepEqual(editorLanguages, {zh: 'zh_CN', 'zh-TW': 'zh_TW', en: 'en'})
    assert.equal(htmlLanguages['zh-TW'], 'zh-Hant')
    const packs = {}
    for (const lang of ['zh_CN', 'zh_TW']) {
        const source = fs.readFileSync(new URL(`../mail-vue/public/tinymce/langs/${lang}.js`, import.meta.url), 'utf8')
        vm.runInNewContext(source, {tinymce: {addI18n: (locale, messages) => {packs[locale] = messages}}})
    }
    assert.equal(packs.zh_TW.Cancel, '取消')
    assert.ok(packs.zh_TW.Redo)
    assert.ok(packs.zh_CN.Redo)
})
