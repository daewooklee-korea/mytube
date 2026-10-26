export function prepareWebtoonFiles(files, existing = []) {
  const selected = Array.from(files)
  if (!selected.length) return []
  if (selected.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) throw new Error('JPG, PNG, WebP 이미지만 선택해주세요.')
  if (selected.some((file) => !file.size || file.size > 10 * 1024 * 1024)) throw new Error('이미지는 0바이트보다 크고 장당 10MB 이하여야 합니다.')
  if (existing.length + selected.length > 100) throw new Error('한 회차에 최대 100장까지 올릴 수 있습니다.')
  if ([...existing, ...selected].reduce((total, file) => total + file.size, 0) > 200 * 1024 * 1024) throw new Error('한 회차의 전체 용량은 200MB 이하여야 합니다.')
  return selected.sort((a, b) => a.name.localeCompare(b.name, 'ko', { numeric: true }))
}

export function moveWebtoonPage(pages, index, delta) {
  const target = index + delta
  if (index < 0 || index >= pages.length || target < 0 || target >= pages.length) return pages
  const next = [...pages]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}
