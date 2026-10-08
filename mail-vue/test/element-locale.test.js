import test from 'node:test'
import assert from 'node:assert/strict'

import {languages} from '../src/i18n/languages.js'
import {hasElementLocale, loadElementLocale} from '../src/ui/element-locale.js'

const reviewedPaths = [
  'datepicker.dateTablePrompt', 'datepicker.monthTablePrompt',
  'datepicker.yearTablePrompt', 'datepicker.selectedDate',
  'datepicker.weeksFull.sun', 'datepicker.weeksFull.mon',
  'datepicker.weeksFull.tue', 'datepicker.weeksFull.wed',
  'datepicker.weeksFull.thu', 'datepicker.weeksFull.fri',
  'datepicker.weeksFull.sat',
  'inputNumber.decrease', 'inputNumber.increase', 'dropdown.toggleDropdown',
  'dialog.close', 'drawer.close', 'messagebox.close',
  'pagination.prev', 'pagination.next', 'pagination.currentPage',
  'pagination.prevPages', 'pagination.nextPages',
  'slider.defaultLabel', 'slider.defaultRangeStartLabel', 'slider.defaultRangeEndLabel',
  'table.selectAllLabel', 'table.selectRowLabel',
  'table.expandRowLabel', 'table.collapseRowLabel',
  'table.sortLabel', 'table.filterLabel', 'table.resetFilter',
  'image.error',
]

function valueAt(locale, path) {
  return path.split('.').reduce((value, part) => value?.[part], locale.el)
}

function placeholders(value) {
  return [...value.matchAll(/\{[a-zA-Z]+\}/g)].map(match => match[0]).sort()
}

test('high-impact component labels use the selected language with intact placeholders', async () => {
  const english = await loadElementLocale('en')
  for (const {code} of languages) {
    assert.equal(hasElementLocale(code), true, code)
    const locale = await loadElementLocale(code)
    assert.equal(await loadElementLocale(code), locale, code + ': cached locale')
    for (const path of reviewedPaths) {
      const actual = valueAt(locale, path)
      const baseline = valueAt(english, path)
      assert.ok(typeof actual === 'string' && actual.trim(), code + ':' + path)
      assert.deepEqual(placeholders(actual), placeholders(baseline), code + ':' + path)
      if (code !== 'en') assert.notEqual(actual, baseline, code + ':' + path)
    }
  }
})

test('reviewed labels do not mutate the upstream component pack', async () => {
  const upstream = (await import('element-plus/es/locale/lang/es')).default
  const reviewed = await loadElementLocale('es')
  assert.equal(upstream.el.dialog.close, 'Close this dialog')
  assert.equal(upstream.el.table.selectAllLabel, 'Select all rows')
  assert.notEqual(reviewed, upstream)
  assert.notEqual(reviewed.el.dialog, upstream.el.dialog)
  assert.notEqual(reviewed.el.datepicker, upstream.el.datepicker)
  assert.equal(reviewed.el.select, upstream.el.select)
})

test('unknown component locales fail before selection', async () => {
  assert.equal(hasElementLocale('xx'), false)
  await assert.rejects(loadElementLocale('xx'), /unavailable/)
  assert.equal(hasElementLocale('xx'), false)
})
