export function menuContentIds(menus, menuId) {
  const ids = new Set(menuId ? [menuId] : [])
  let changed = true
  while (changed) {
    changed = false
    for (const menu of menus) {
      if (ids.has(menu.parent_id) && !ids.has(menu.id)) {
        ids.add(menu.id)
        changed = true
      }
    }
  }
  return ids
}
