import test from 'node:test'
import assert from 'node:assert/strict'
import {validDomainChoice, addressAtDomain} from '../src/utils/mailbox-domain.js'
const domains = ['okkmail.cc', 'qtmail.click', 'qtgmail.click']
test('domain switching retains the username including plus addressing', () => {
  assert.equal(addressAtDomain('alice+ticket@okkmail.cc', 'qtmail.click', domains), 'alice+ticket@qtmail.click')
  assert.equal(addressAtDomain('alice@qtmail.click', 'qtgmail.click', domains), 'alice@qtgmail.click')
})
test('only configured domains can become a target address', () => {
  assert.equal(addressAtDomain('alice@okkmail.cc', 'other.test', domains), '')
  assert.equal(addressAtDomain('bad@@okkmail.cc', 'qtmail.click', domains), '')
  assert.equal(addressAtDomain('', 'qtmail.click', domains), '')
})
test('remembered selection preserves random mode and recovers removed domains', () => {
  assert.equal(validDomainChoice('random', domains), 'random')
  assert.equal(validDomainChoice('qtgmail.click', domains), 'qtgmail.click')
  assert.equal(validDomainChoice('removed.test', domains), 'okkmail.cc')
  assert.equal(validDomainChoice('', []), '')
})
