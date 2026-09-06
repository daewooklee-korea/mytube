const getBaseUrl = () =>
  String(import.meta.env.VITE_MACMINI_MEDIA_BASE_URL ?? '').replace(/\/+$/, '')

const getApiUrl = (path) => {
  const baseUrl = getBaseUrl()
  if (!baseUrl) {
    throw new Error('Mac mini 미디어 서버 주소가 설정되지 않았습니다.')
  }
  return `${baseUrl}${path}`
}

export const getMacMiniVideos = async (signal) => {
  const response = await fetch(getApiUrl('/api/videos'), { signal })
  if (!response.ok) {
    throw new Error(`Mac mini API 오류 (${response.status})`)
  }

  const payload = await response.json()
  if (!payload || !Array.isArray(payload.videos)) {
    throw new Error('Mac mini API 응답 형식이 올바르지 않습니다.')
  }

  return payload.videos
}

export const convertMacMiniVideo = async (relativePath, signal) => {
  const response = await fetch(getApiUrl('/api/videos/convert'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ relative_path: relativePath }),
    signal,
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.error || `Mac mini 변환 API 오류 (${response.status})`)
  }
  return payload
}

export const getMacMiniConversionStatus = async (jobId, signal) => {
  const query = encodeURIComponent(String(jobId ?? ''))
  const response = await fetch(getApiUrl(`/api/videos/convert-status?job_id=${query}`), { signal })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.error || `Mac mini 변환 상태 API 오류 (${response.status})`)
  }
  return payload
}
