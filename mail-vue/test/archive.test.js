import test from 'node:test'
import assert from 'node:assert/strict'
import {indexedDB, IDBKeyRange} from 'fake-indexeddb'
import {createMailArchive, MAX_ARCHIVE_FILE_BYTES} from '../src/local-mail/archive.js'

const DAY = 24 * 60 * 60 * 1000

function archive() {
  return createMailArchive({
    name: `temporary-mail-test-${crypto.randomUUID()}`,
    indexedDB,
    IDBKeyRange,
  })
}

test('addresses and full messages survive reopening the local database', async () => {
  const store = archive()
  const name = store.db.name
  await store.recordAddress('A@Example.com')
  await store.saveMessage('a@example.com', {emailId: 42, subject: 'Code', createTime: '2026-10-02 12:00:00'})
  await store.saveMessage('a@example.com', {
    emailId: 42, subject: 'Code', createTime: '2026-10-02 12:00:00',
    content: '<p>123456</p>', text: '123456', attList: [{attId: 8, filename: 'photo.png', size: 3}],
  }, {full: true})
  await store.saveBinary(store.mailKey('a@example.com', 42), 'attachment', 8,
    new Blob(['image'], {type: 'image/png'}))
  store.db.close()

  const reopened = createMailArchive({name, indexedDB, IDBKeyRange})
  const addresses = await reopened.listAddresses()
  const messages = await reopened.listMessages('a@example.com')
  assert.equal(addresses[0].address, 'a@example.com')
  assert.equal(addresses[0].messageCount, 1)
  assert.equal(messages[0].content, '<p>123456</p>')
  assert.equal(messages[0].complete, true)
  assert.equal((await reopened.getBinary(reopened.mailKey('a@example.com', 42), 'attachment', 8)).size, 5)
  await reopened.db.delete()
})

test('long inactivity preserves addresses, messages, and binary files', async () => {
  const store = archive()
  const start = Date.now() - 365 * DAY
  await store.recordAddress('a@example.com', start)
  await store.saveMessage('a@example.com', {emailId: 1, createTime: '2026-08-01 12:00:00'}, {capturedAt: start})
  await store.saveBinary(store.mailKey('a@example.com', 1), 'attachment', 5,
    new Blob(['test']), {capturedAt: start})
  await store.db.meta.put({key: 'lastActiveAt', value: start})

  const session = await store.startSession()
  assert.equal(session.addresses[0].address, 'a@example.com')
  assert.deepEqual(await store.stats(), {addresses: 1, messages: 1, binaryBytes: 4})
  assert.equal((await store.getBinary(store.mailKey('a@example.com', 1), 'attachment', 5)).size, 4)
  await store.db.delete()
})

test('binary limits are enforced without discarding saved mail', async () => {
  const store = archive()
  await store.recordAddress('a@example.com')
  await store.saveMessage('a@example.com', {emailId: 1, createTime: '2026-10-02 12:00:00'}, {full: true})
  const key = store.mailKey('a@example.com', 1)
  assert.equal((await store.saveBinary(key, 'attachment', 1, new Blob(['hello']))).saved, true)
  assert.equal((await store.getBinary(key, 'attachment', 1)).size, 5)
  assert.equal((await store.saveBinary(key, 'attachment', 2,
    new Blob([new Uint8Array(MAX_ARCHIVE_FILE_BYTES + 1)]))).reason, 'fileLimit')
  assert.equal((await store.getMessage('a@example.com', 1)).complete, true)
  await store.db.delete()
})

test('manual clear removes every address and rejects captures started before it', async () => {
  const store = archive()
  const started = Date.now() - 1000
  const previousRevision = (await store.startSession()).clearRevision
  await store.recordAddress('first@example.com', started)
  await store.recordAddress('second@example.com', started)
  await store.saveMessage('first@example.com', {emailId: 1, createTime: '2026-10-02 12:00:00'},
    {capturedAt: started})
  await store.saveBinary(store.mailKey('first@example.com', 1), 'inline', 'image', new Blob(['data']),
    {capturedAt: started})

  const currentRevision = await store.clear()
  assert.notEqual(currentRevision, previousRevision)
  assert.deepEqual(await store.stats(), {addresses: 0, messages: 0, binaryBytes: 0})
  assert.equal(await store.recordAddress('first@example.com', started, {capturedAt: started}), false)
  assert.equal(await store.saveMessage('first@example.com', {emailId: 2}, {capturedAt: started}), false)
  assert.equal((await store.saveBinary(store.mailKey('first@example.com', 2), 'attachment', 1,
    new Blob(['late']), {capturedAt: started})).reason, 'cleared')
  const afterClear = currentRevision + 1
  assert.equal(await store.recordAddress('first@example.com', afterClear,
    {capturedAt: afterClear, expectedClear: previousRevision}), false)
  assert.equal(await store.saveMessage('first@example.com', {emailId: 3},
    {capturedAt: afterClear, expectedClear: previousRevision}), false)
  assert.equal((await store.saveBinary(store.mailKey('first@example.com', 3), 'attachment', 1,
    new Blob(['late']), {capturedAt: afterClear, expectedClear: previousRevision})).reason, 'cleared')
  assert.deepEqual(await store.listAddresses(), [])
  await store.db.delete()
})
