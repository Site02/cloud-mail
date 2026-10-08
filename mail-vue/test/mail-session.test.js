import test from 'node:test'
import assert from 'node:assert/strict'
import {createPinia, setActivePinia} from 'pinia'
import {useEmailStore} from '../src/store/email.js'
import {useWriterStore} from '../src/store/writer.js'

test('recent recipients are isolated by signed-in account and recover on return', () => {
  setActivePinia(createPinia())
  const email = useEmailStore()
  const writer = useWriterStore()
  email.setSessionUser(1)
  writer.sendRecipientRecord = ['first@example.test']
  email.clearPrivateSession()
  assert.deepEqual(writer.sendRecipientRecord, [])
  email.setSessionUser(2)
  assert.deepEqual(writer.sendRecipientRecord, [])
  writer.sendRecipientRecord = ['second@example.test']
  email.setSessionUser(1)
  assert.deepEqual(writer.sendRecipientRecord, ['first@example.test'])
})

test('changing signed-in user clears prior private messages and the selected detail', () => {
  setActivePinia(createPinia())
  const store = useEmailStore()
  store.setSessionUser(1)
  store.applyFullList([{emailId: 2, content: '<p>Private</p>'}])
  store.contentData.email = store.detailMap[2]
  store.setSessionUser(3)
  assert.deepEqual(store.detailMap, {})
  assert.equal(store.contentData.email, null)
  assert.equal(store.sessionUserId, 3)
})

test('a pending list cannot repopulate private mail after logout', async () => {
  setActivePinia(createPinia())
  const store = useEmailStore()
  store.setSessionUser(1)
  let finish
  const pending = store.fetchList(() => new Promise(resolve => {finish = resolve}))
  store.clearPrivateSession()
  finish({list: [{emailId: 2, content: 'old session'}]})
  await assert.rejects(pending, /Mail session changed/)
  assert.deepEqual(store.detailMap, {})
  assert.equal(store.sessionUserId, 0)
})
