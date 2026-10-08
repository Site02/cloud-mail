import {readFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

import frontendEnglish from '../src/i18n/en.js'
import backendEnglish from '../../mail-worker/src/i18n/en.js'

const sensitiveFrontend = [
  'systemDefaults.roleName', 'systemDefaults.roleDescription',
  'systemDefaults.noticeContent',
  'delAccountMsg', 'delAccountConfirm', 'delAccountSoftMsg',
  'delAccountSoftConfirm', 'clearAllDelConfirm', 'webhookSecret', 'webhookClearSecret',
  'permissionTreeLoadFailed',
  'temporaryInbox.accessNote', 'temporaryInbox.localHistoryNote',
  'temporaryInbox.clearConfirm', 'temporaryInbox.attachmentUnavailable',
  'temporaryInbox.imageUnavailable', 'temporaryInbox.registeredAddress',
  'temporaryInbox.ownDomainOnly', 'pwa.installHelpTemporary',
]
const sensitiveBackend = [
  'publicRegisteredAddress', 'mailGone', 'attachmentGone', 'resourceExpired',
  'deletionPolicyChanged',
  'perms.邮件删除', 'perms.邮箱删除', 'perms.用户注销', 'perms.用户删除',
  'perms.权限修改', 'perms.身份修改',
]
const distinctPermissionPairs = [
  ['perms.邮件删除', 'perms.邮箱删除'],
  ['perms.邮箱查看', 'perms.邮件查看'],
  ['perms.用户注销', 'perms.用户删除'],
  ['perms.权限修改', 'perms.身份修改'],
]

function flatten(tree, prefix = '', result = {}) {
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix + key
    if (typeof value === 'string') result[path] = value
    else if (value && typeof value === 'object' && !Array.isArray(value)) flatten(value, path + '.', result)
    else result[path] = value
  }
  return result
}

function placeholders(value) {
  return [...value.matchAll(/\{\{?[a-zA-Z]\w*\}?\}/g)].map(match => match[0]).sort()
}

function markup(value) {
  return [...value.matchAll(/<\/?([a-z][\w-]*)\b[^>]*>/gi)].map(match => match[1].toLowerCase()).sort()
}

export function checkCandidate(frontend, backend) {
  const findings = []
  for (const [surface, referenceTree, candidateTree, sensitive] of [
    ['frontend', frontendEnglish, frontend, sensitiveFrontend],
    ['backend', backendEnglish, backend, sensitiveBackend],
  ]) {
    const reference = flatten(referenceTree)
    const candidate = flatten(candidateTree)
    const expected = Object.keys(reference)
    const actual = Object.keys(candidate)
    for (const key of expected) {
      if (!(key in candidate)) {
        findings.push(`${surface}:${key}: missing`)
        continue
      }
      const value = candidate[key]
      if (typeof value !== 'string' || !value.trim()) {
        findings.push(`${surface}:${key}: empty or non-text`)
        continue
      }
      if (JSON.stringify(placeholders(value)) !== JSON.stringify(placeholders(reference[key]))) {
        findings.push(`${surface}:${key}: placeholder mismatch`)
      }
      if (JSON.stringify(markup(value)) !== JSON.stringify(markup(reference[key]))) {
        findings.push(`${surface}:${key}: HTML element mismatch`)
      }
    }
    for (const key of actual) if (!(key in reference)) findings.push(`${surface}:${key}: unexpected`)
    for (const key of sensitive) {
      if (candidate[key] === reference[key]) findings.push(`${surface}:${key}: sensitive text remains English`)
    }
    const frequency = new Map()
    let englishCarryover = 0
    for (const [key, value] of Object.entries(candidate)) {
      if (typeof value !== 'string') continue
      frequency.set(value, (frequency.get(value) || 0) + 1)
      if (value === reference[key]) englishCarryover++
    }
    if (Math.max(0, ...frequency.values()) > 10) findings.push(`${surface}: repeated filler text`)
    if (englishCarryover > (surface === 'frontend' ? 40 : 15)) {
      findings.push(`${surface}: ${englishCarryover} English strings remain`)
    }
  }
  const worker = flatten(backend)
  for (const [left, right] of distinctPermissionPairs) {
    if (worker[left] && worker[left] === worker[right]) {
      findings.push(`backend:${left} and ${right}: different permissions have the same label`)
    }
  }
  return findings
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [code, frontendPath, backendPath] = process.argv.slice(2)
  if (!code || !frontendPath || !backendPath) {
    process.stderr.write('Usage: node tools/check-locale-candidate.mjs <code> <frontend.json> <backend.json>\n')
    process.exitCode = 2
  } else {
    try {
      const frontend = JSON.parse(await readFile(resolve(frontendPath), 'utf8'))
      const backend = JSON.parse(await readFile(resolve(backendPath), 'utf8'))
      const findings = checkCandidate(frontend, backend)
      if (findings.length) {
        process.stderr.write(`${code}: ${findings.length} structural issues\n${findings.slice(0, 40).join('\n')}\n`)
        if (findings.length > 40) process.stderr.write(`... ${findings.length - 40} more\n`)
        process.exitCode = 1
      } else {
        process.stdout.write(`${code}: structural checks passed; translation meaning still requires review.\n`)
      }
    } catch (error) {
      process.stderr.write(`${code}: ${error.message}\n`)
      process.exitCode = 2
    }
  }
}
