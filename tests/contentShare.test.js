import test from 'node:test'
import assert from 'node:assert/strict'
import { contentShareUrl, shareContent } from '../src/contentShare.js'

test('share URLs contain only the content identifier, preserving the origin', () => {
  assert.equal(contentShareUrl('https://example.com/admin?token=secret', 52), 'https://example.com/?content=52')
})
test('native sharing receives title and URL', async () => {
  let payload
  assert.equal(await shareContent('제목', 'https://example.com/?content=52', {
    share: async (value) => { payload = value },
  }), 'shared')
  assert.deepEqual(payload, { title: '제목', url: 'https://example.com/?content=52' })
})
test('cancelling the native sheet does not copy', async () => {
  assert.equal(await shareContent('title', 'url', {
    share: async () => { throw Object.assign(new Error(), { name: 'AbortError' }) },
    clipboard: { writeText: async () => assert.fail('must not copy') },
  }), 'cancelled')
})
test('unsupported or failed native sharing falls back to clipboard', async () => {
  for (const share of [undefined, async () => { throw new Error('unsupported') }]) {
    let copied
    assert.equal(await shareContent('title', 'url', { share, clipboard: { writeText: async (value) => { copied = value } } }), 'copied')
    assert.equal(copied, 'url')
  }
})
test('clipboard denial exposes manual copy fallback', async () => {
  assert.equal(await shareContent('title', 'url', {}), 'manual')
})
