import { supabase } from './supabase'

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

export const getMacMiniStorageStatus = async (signal) => {
  const response = await fetch(getApiUrl('/api/storage'), { signal })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.error || `Mac mini 저장소 API 오류 (${response.status})`)
  }
  if (!payload || !payload.disk || !payload.playme || !payload.videos) {
    throw new Error('Mac mini 저장소 API 응답 형식이 올바르지 않습니다.')
  }
  return payload
}

export const convertMacMiniVideo = async (relativePath, signal) => {
  const { data: { session } = {} } = await supabase.auth.getSession()
  if (!session?.access_token) {
    const error = new Error('로그인이 필요합니다.')
    error.status = 401
    throw error
  }
  const response = await fetch(getApiUrl('/api/videos/convert'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ relative_path: relativePath }),
    signal,
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload.error || `Mac mini 변환 API 오류 (${response.status})`)
    error.status = response.status
    throw error
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
