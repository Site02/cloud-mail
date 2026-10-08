import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {dirname, resolve} from 'node:path'
import vm from 'node:vm'
import {languages} from '../src/i18n/languages.js'
import {editorLocale, hasEditorLocale} from '../src/ui/editor-locales.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../public/tinymce/langs')

test('editor uses a complete local pack where available and English otherwise', () => {
  assert.equal(new Set(languages.map(language => language.code)).size, languages.length)
  let localized = 0
  let fallback = 0
  for (const {code} of languages) {
    const pack = editorLocale(code)
    assert.equal(hasEditorLocale(code), pack !== 'en', code)
    if (pack === 'en') {
      fallback++
      continue
    }
    localized++
    let registration
    const source = readFileSync(resolve(root, `${pack}.js`), 'utf8')
    vm.runInNewContext(source, {tinymce: {addI18n: (name, values) => { registration = {name, values} }}})
    assert.equal(registration?.name, pack, code)
    assert.ok(Object.keys(registration.values).length >= 400, code)
    assert.ok(registration.values.Bold && registration.values.Bold !== 'Bold', code)
    assert.ok(registration.values.Cancel && registration.values.Cancel !== 'Cancel', code)
  }
  assert.ok(localized > 0)
  assert.ok(fallback > 0)
})
