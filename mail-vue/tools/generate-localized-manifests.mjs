import {readFile, readdir, unlink, writeFile} from 'node:fs/promises'
import {existsSync} from 'node:fs'
import {dirname, resolve} from 'node:path'
import {fileURLToPath, pathToFileURL} from 'node:url'
import {languages} from '../src/i18n/languages.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = resolve(root, 'public')
const icons = [
  {src: '/app-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any'},
  {src: '/app-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any'},
  {src: '/app-icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable'},
]

async function messagesFor(code) {
  const localePath = resolve(root, 'src/i18n/locales', `${code}.json`)
  if (existsSync(localePath)) return JSON.parse(await readFile(localePath, 'utf8'))
  const sourcePath = resolve(root, 'src/i18n', `${code}.js`)
  if (!existsSync(sourcePath)) throw new Error(`Missing dictionary: ${code}`)
  return (await import(pathToFileURL(sourcePath).href)).default
}

function requiredText(value, code, key) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Missing ${key} for ${code}`)
  return value.trim()
}

function manifestFor(language, messages, temporary) {
  const {code, intl, dir} = language
  const name = temporary ? messages.temporaryInbox?.title : messages.pwa?.appName
  const shortName = temporary ? messages.temporaryInbox?.shortName : messages.pwa?.shortName
  const description = temporary ? messages.temporaryInbox?.description : messages.pwa?.description
  return {
    id: temporary ? '/temporary-mail-app' : '/mail-app',
    name: requiredText(name, code, temporary ? 'temporaryInbox.title' : 'pwa.appName'),
    short_name: requiredText(shortName, code, temporary ? 'temporaryInbox.shortName' : 'pwa.shortName'),
    description: requiredText(description, code, temporary ? 'temporaryInbox.description' : 'pwa.description'),
    start_url: temporary ? '/find' : '/inbox',
    scope: '/',
    display: 'standalone',
    background_color: temporary ? '#0a0e14' : '#f5f7fb',
    theme_color: temporary ? '#0a0e14' : '#175cd3',
    icons,
    lang: intl,
    dir,
  }
}

const check = process.argv.includes('--check')
const seen = new Set()
for (const language of languages) {
  if (seen.has(language.code)) throw new Error(`Duplicate language: ${language.code}`)
  seen.add(language.code)
  const messages = await messagesFor(language.code)
  for (const temporary of [false, true]) {
    const filePath = resolve(publicDir, `manifest-${temporary ? 'temp' : 'mail'}-${language.code}.webmanifest`)
    const content = JSON.stringify(manifestFor(language, messages, temporary), null, 2) + '\n'
    if (check) {
      if (!existsSync(filePath) || await readFile(filePath, 'utf8') !== content) {
        throw new Error(`Manifest is missing or outdated: ${filePath}`)
      }
    } else {
      await writeFile(filePath, content)
    }
  }
}

for (const filename of await readdir(publicDir)) {
  const match = /^manifest-(?:mail|temp)-(.+)\.webmanifest$/.exec(filename)
  if (!match || seen.has(match[1])) continue
  if (check) throw new Error(`Manifest is no longer offered: ${filename}`)
  await unlink(resolve(publicDir, filename))
}

process.stdout.write(`${check ? 'Checked' : 'Generated'} ${seen.size * 2} localized manifests.\n`)
