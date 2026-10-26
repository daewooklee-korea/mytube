import test from 'node:test'
import assert from 'node:assert/strict'
import { prepareWebtoonFiles, moveWebtoonPage } from '../src/webtoon.js'
const file = (name, size = 100, type = 'image/png') => ({ name, size, type })
test('pages sort numerically without changing the selection', () => {
  const files = [file('10.png'), file('2.png'), file('1.png')]
  assert.deepEqual(prepareWebtoonFiles(files).map((x) => x.name), ['1.png', '2.png', '10.png'])
  assert.equal(files[0].name, '10.png')
})
test('rejects unsupported and empty images', () => {
  assert.throws(() => prepareWebtoonFiles([file('x.svg', 100, 'image/svg+xml')]))
  assert.throws(() => prepareWebtoonFiles([file('x.png', 0)]))
})
test('enforces individual, combined size and count limits across selections', () => {
  assert.throws(() => prepareWebtoonFiles([file('x.png', 10 * 1024 * 1024 + 1)]))
  assert.throws(() => prepareWebtoonFiles([file('x.png')], Array(100).fill(file('a.png'))))
  assert.throws(() => prepareWebtoonFiles([file('x.png')], Array(20).fill(file('a.png', 10 * 1024 * 1024))))
  assert.equal(prepareWebtoonFiles([file('x.png', 10 * 1024 * 1024)]).length, 1)
})
test('page movement preserves every page and handles boundaries', () => {
  const pages = ['a', 'b', 'c']
  assert.deepEqual(moveWebtoonPage(pages, 1, -1), ['b', 'a', 'c'])
  assert.deepEqual(moveWebtoonPage(pages, 1, 1), ['a', 'c', 'b'])
  assert.equal(moveWebtoonPage(pages, 0, -1), pages)
  assert.equal(moveWebtoonPage(pages, 2, 1), pages)
  assert.deepEqual(pages, ['a', 'b', 'c'])
})
