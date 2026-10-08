import test from 'node:test'
import assert from 'node:assert/strict'
import {inlineMediaKeys, hasCompleteInlineMedia, needsInlineRecovery} from '../src/utils/inline-media.js'

const content = '<div><img src="{{domain}}attachments/6346cd26e43844829c79dd2496198b93.png" alt="image.png"></div>'
const key = 'attachments/6346cd26e43844829c79dd2496198b93.png'
const url = `/api/media/${'A'.repeat(43)}`

test('a stored inline image waits for its private media URL before the message is shown', () => {
  const keys = inlineMediaKeys(content)
  assert.deepEqual(keys, [key])
  assert.equal(hasCompleteInlineMedia(keys, {}), false)
  assert.equal(hasCompleteInlineMedia(keys, {[key]: url}), true)
  assert.equal(hasCompleteInlineMedia(keys, {[key]: '/attachments/public.png'}), false)
})

test('messages without private inline images do not need a media request', () => {
  assert.deepEqual(inlineMediaKeys('<p>Hello</p><img src="https://example.test/logo.png">'), [])
  assert.equal(hasCompleteInlineMedia([], null), true)
})

test('a full local message with a missing image still needs online recovery', () => {
  assert.equal(needsInlineRecovery(content, {}), true)
  assert.equal(needsInlineRecovery(content, {[key]: 'data:image/png;base64,AAAA'}), false)
  assert.equal(needsInlineRecovery('<p>Text only</p>', {}), false)
})
