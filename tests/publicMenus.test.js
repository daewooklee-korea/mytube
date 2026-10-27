import test from 'node:test'
import assert from 'node:assert/strict'
import { menuContentIds } from '../src/publicMenus.js'
test('a menu includes only its own descendants, independent of ordering', () => {
  const menus = [{id:'grandchild',parent_id:'child'},{id:'child',parent_id:'root'},{id:'other',parent_id:null}]
  assert.deepEqual([...menuContentIds(menus,'root')].sort(), ['child','grandchild','root'])
  assert.deepEqual([...menuContentIds(menus,'other')], ['other'])
})
test('cycles terminate and an empty selection has no menu IDs', () => {
  const menus = [{id:'a',parent_id:'b'},{id:'b',parent_id:'a'}]
  assert.equal(menuContentIds(menus,'a').size,2)
  assert.equal(menuContentIds(menus,null).size,0)
})
