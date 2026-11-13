export const HALL_KEY = 'playme-dodge-hall-v3'
export function normalizeName(value) {
  const name = String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ')
  if (!/^[\p{L}\p{N} _-]{1,12}$/u.test(name)) throw new Error('이름은 한글·영문·숫자 등 1~12자로 입력해주세요. 공백, 밑줄, 붙임표도 사용할 수 있어요.')
  return name
}
export function cleanEntries(value) {
  if (!Array.isArray(value)) return []
  const best = new Map()
  for (const entry of value.slice(0, 100)) {
    try {
      const name = normalizeName(entry.name)
      if (!Number.isSafeInteger(entry.score) || entry.score < 1 || !Number.isFinite(entry.at) || entry.at < 0) continue
      const row = { name, score: entry.score, at: entry.at }
      const key = name.toLocaleLowerCase('ko-KR')
      const previous = best.get(key)
      if (!previous || row.score > previous.score || (row.score === previous.score && row.at < previous.at)) best.set(key, row)
    } catch { /* Ignore malformed browser-local records. */ }
  }
  return [...best.values()].sort((a, b) => b.score - a.score || a.at - b.at || a.name.localeCompare(b.name, 'ko')).slice(0, 5)
}
export function registerScore(entries, name, score, at = Date.now()) {
  name = normalizeName(name)
  if (!Number.isSafeInteger(score) || score < 1) throw new Error('등록할 수 있는 게임 기록이 없습니다. 먼저 게임에 도전해주세요.')
  const rows = cleanEntries(entries)
  const previous = rows.find(e => e.name.toLocaleLowerCase('ko-KR') === name.toLocaleLowerCase('ko-KR'))
  const next = cleanEntries([...rows, { name, score, at }])
  const rank = next.findIndex(e => e.name.toLocaleLowerCase('ko-KR') === name.toLocaleLowerCase('ko-KR')) + 1
  return { entries: next, rank, improved: !previous || score > previous.score, name }
}
