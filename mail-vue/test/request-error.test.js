import test from 'node:test'
import assert from 'node:assert/strict'

import {requestErrorMessage} from '../src/utils/request-error.js'

const translate = key => `localized:${key}`

test('network and timeout failures never expose transport error text', () => {
  assert.equal(requestErrorMessage({code: 'ERR_NETWORK', message: 'Network Error'}, 'loadFailed', translate),
    'localized:networkErrorMsg')
  assert.equal(requestErrorMessage({code: 'ECONNABORTED', message: 'timeout exceeded'}, 'loadFailed', translate),
    'localized:timeoutErrorMsg')
  assert.equal(requestErrorMessage(new Error('Unexpected failure'), 'loadFailed', translate),
    'localized:loadFailed')
})

test('request specific business errors retain the server message', () => {
  assert.equal(requestErrorMessage({code: 403, message: 'This address is unavailable'}, 'loadFailed', translate),
    'This address is unavailable')
})
