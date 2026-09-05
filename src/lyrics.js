const LRC_LINE_PATTERN = /^\s*\[(\d{1,3}):([0-5]\d)(?:\.(\d{1,3}))?\]\s*(.*)$/

const parseTimestamp = (minutes, seconds, fraction = '') => {
  const fractionValue = fraction
    ? Number(`0.${fraction}`)
    : 0

  return Number(minutes) * 60 + Number(seconds) + fractionValue
}

/**
 * Convert the simple line-based LRC format used by the admin textarea into
 * the normalized JSON stored in videos.lyrics_sync.
 */
export function parseLrc(value) {
  const source = String(value ?? '')
  if (!source.trim()) return { lines: null, error: null }

  const parsed = []
  const invalidLines = []

  source.split(/\r?\n/).forEach((rawLine, index) => {
    if (!rawLine.trim()) return

    const match = rawLine.match(LRC_LINE_PATTERN)
    if (!match) {
      invalidLines.push(index + 1)
      return
    }

    const [, minutes, seconds, fraction, text] = match
    const normalizedText = text.trim()
    if (!normalizedText) {
      invalidLines.push(index + 1)
      return
    }

    parsed.push({
      start: parseTimestamp(minutes, seconds, fraction),
      text: normalizedText,
      sourceLine: index + 1,
    })
  })

  if (invalidLines.length > 0) {
    return {
      lines: null,
      error: `싱크 가사 ${invalidLines.join(', ')}번째 줄의 형식이 올바르지 않습니다. [mm:ss.xx] 형식을 사용해주세요.`,
    }
  }

  parsed.sort((a, b) => a.start - b.start)

  for (let index = 1; index < parsed.length; index += 1) {
    if (parsed[index - 1].start === parsed[index].start) {
      return {
        lines: null,
        error: `싱크 가사에 중복된 시간이 있습니다 (${formatLrcTimestamp(parsed[index].start)}).`,
      }
    }
  }

  return {
    lines: parsed.map((line, index) => ({
      start: line.start,
      end: parsed[index + 1]?.start ?? null,
      text: line.text,
    })),
    error: null,
  }
}

export function formatLrcTimestamp(seconds) {
  const safeSeconds = Math.max(0, Number(seconds) || 0)
  const minutes = Math.floor(safeSeconds / 60)
  const remainder = safeSeconds - minutes * 60
  const formattedSeconds = remainder.toFixed(3).replace(/0+$/, '')
  const [whole, fraction = ''] = formattedSeconds.split('.')
  const paddedFraction = fraction.padEnd(2, '0').slice(0, 3)

  return `[${String(minutes).padStart(2, '0')}:${whole.padStart(2, '0')}.${paddedFraction}]`
}

export function lyricsSyncToLrc(lines) {
  if (!Array.isArray(lines) || lines.length === 0) return ''

  return lines
    .filter((line) => Number.isFinite(Number(line?.start)) && String(line?.text ?? '').trim())
    .map((line) => `${formatLrcTimestamp(line.start)} ${String(line.text).trim()}`)
    .join('\n')
}
