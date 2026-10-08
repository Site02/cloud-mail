import test from 'node:test'
import assert from 'node:assert/strict'
import {restoreAllMailPreferences} from '../src/views/all-email/preferences.js'

test('an old empty-result mail filter does not hide mail on a new visit', () => {
  assert.deepEqual(restoreAllMailPreferences(JSON.stringify({
    type: 'send', timeSort: 1, searchType: 'subject',
  })), {timeSort: 1, searchType: 'subject'})
})

test('broken stored preferences cannot prevent the mail page from opening', () => {
  assert.deepEqual(restoreAllMailPreferences('{'), {timeSort: 0, searchType: 'name'})
})
