import test from 'node:test'
import assert from 'node:assert/strict'
import {loadCompleteMailPage, mailPollingDelay, canPollMail, attachmentPath} from '../src/utils/mail-recovery.js'

test('a visible mail list already has full detail and uses one database request', async () => {
  const calls = []
  const detail = {emailId: 12, content: '<p>Full body</p>', attList: [{attId: 4}]}
  const page = await loadCompleteMailPage(async full => {
    calls.push(full)
    return {list: [detail]}
  }, list => assert.equal(list[0].content, '<p>Full body</p>'))
  assert.deepEqual(calls, [1])
  assert.equal(page.list[0].attList.length, 1)
  await assert.rejects(loadCompleteMailPage(async () => {throw new Error('service unavailable')}, () => {}))
})

test('background, unmounted and filtered mail views do not poll', () => {
  assert.equal(canPollMail({active: true}), true)
  for (const option of ['hidden', 'disposed', 'filtered', 'loading']) {
    assert.equal(canPollMail({active: true, [option]: true}), false)
  }
  assert.equal(canPollMail({active: false}), false)
  assert.equal(mailPollingDelay(3, 0), 3000)
  assert.equal(mailPollingDelay(3, 1), 30000)
  assert.equal(mailPollingDelay(3, 2), 60000)
  assert.equal(mailPollingDelay(3, 6), 300000)
})

test('all-mail attachment actions use the administrator permission boundary', () => {
  assert.equal(attachmentPath('physics'), '/allEmail/attachment')
  assert.equal(attachmentPath('logic'), '/email/attachment')
  assert.equal(attachmentPath(null), '/email/attachment')
})
