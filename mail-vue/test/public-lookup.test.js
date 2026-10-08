import test from 'node:test'
import assert from 'node:assert/strict'
import {isRejectedPublicAddress, publicLookupErrorKey} from '../src/views/find/public-lookup.js'

test('public mailbox lookup distinguishes invalid and registered addresses from service outages', () => {
  assert.equal(publicLookupErrorKey({code: 400}), 'temporaryInbox.invalidAddress')
  assert.equal(publicLookupErrorKey({code: 403}), 'temporaryInbox.registeredAddress')
  assert.equal(publicLookupErrorKey({code: 501}), 'serverBusyErrorMsg')
  assert.equal(publicLookupErrorKey({response: {status: 500}}), 'serverBusyErrorMsg')
  assert.equal(publicLookupErrorKey({code: 'ERR_NETWORK'}), 'reqFailErrorMsg')
  assert.equal(isRejectedPublicAddress({code: 403}), true)
  assert.equal(isRejectedPublicAddress({response: {status: 500}}), false)
})
