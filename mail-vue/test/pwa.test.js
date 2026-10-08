import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {dirname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

const publicDir = resolve(dirname(fileURLToPath(import.meta.url)), '../public')
const readManifest = name => JSON.parse(readFileSync(resolve(publicDir, name), 'utf8'))

test('both mail apps have distinct install destinations and complete icons', () => {
  const main = readManifest('manifest.webmanifest')
  const temporary = readManifest('manifest-temp.webmanifest')

  assert.equal(main.start_url, '/inbox')
  assert.equal(temporary.start_url, '/find')
  assert.notEqual(main.id, temporary.id)

  for (const manifest of [main, temporary]) {
    assert.equal(manifest.scope, '/')
    assert.equal(manifest.display, 'standalone')
    const icons = new Map(manifest.icons.map(icon => [`${icon.sizes}:${icon.purpose}`, icon]))
    for (const specification of ['192x192:any', '512x512:any', '512x512:maskable']) {
      const icon = icons.get(specification)
      assert.ok(icon, `${manifest.name}: ${specification}`)
      const png = readFileSync(resolve(publicDir, icon.src.slice(1)))
      assert.equal(png.subarray(1, 4).toString(), 'PNG')
      const size = Number(specification.split('x')[0])
      assert.equal(png.readUInt32BE(16), size)
      assert.equal(png.readUInt32BE(20), size)
    }
  }

  const touch = readFileSync(resolve(publicDir, 'apple-touch-icon.png'))
  assert.equal(touch.readUInt32BE(16), 180)
  assert.equal(touch.readUInt32BE(20), 180)
})
