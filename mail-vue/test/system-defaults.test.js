import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {languages} from '../src/i18n/languages.js'
import {displayRoleName, displayRoleDescription, displayNoticeContent} from '../src/i18n/system-defaults.js'

const originalNotice = '本项目仅供学习交流，禁止用于违法业务\n<br>\n请遵守当地法规，作者不承担任何法律责任'

test('built-in role and notice values display in every published language', async () => {
  for (const {code} of languages) {
    const messages = code === 'zh-Hant'
      ? JSON.parse(readFileSync(new URL('../src/i18n/locales/zh-Hant.json', import.meta.url), 'utf8'))
      : (await import(`../src/i18n/${code}.js`)).default
    const t = key => key.split('.').reduce((value, part) => value?.[part], messages)
    const defaultRole = {roleId: 1, name: '普通用户', description: '只有普通使用权限'}

    assert.equal(displayRoleName(defaultRole, t), messages.systemDefaults.roleName, code)
    assert.equal(displayRoleDescription(defaultRole, t), messages.systemDefaults.roleDescription, code)
    assert.equal(displayNoticeContent(originalNotice, t), messages.systemDefaults.noticeContent, code)
    assert.ok(messages.systemDefaults.noticeContent.trim(), code)
  }
})

test('custom role and notice content keep their exact stored text', () => {
  const t = () => 'translated'
  assert.equal(displayRoleName({roleId: 1, name: 'Custom'}, t), 'Custom')
  assert.equal(displayRoleDescription({roleId: 1, description: 'Custom description'}, t), 'Custom description')
  assert.equal(displayRoleName({roleId: 2, name: '普通用户'}, t), '普通用户')
  assert.equal(displayRoleDescription({roleId: 2, description: '只有普通使用权限'}, t), '只有普通使用权限')
  assert.equal(displayNoticeContent('Administrator notice', t), 'Administrator notice')
  assert.equal(displayNoticeContent('<b>Administrator notice</b>', t), '<b>Administrator notice</b>')
  assert.equal(displayNoticeContent('', t), '')
})

test('display matching remains aligned with stored initial values', () => {
  const source = readFileSync(new URL('../../mail-worker/src/init/init.js', import.meta.url), 'utf8')
  assert.match(source, /1, '普通用户'.*'只有普通使用权限'/)
  assert.ok(source.includes("'本项目仅供学习交流，禁止用于违法业务\\n'"))
  assert.ok(source.includes("'请遵守当地法规，作者不承担任何法律责任'"))
})
