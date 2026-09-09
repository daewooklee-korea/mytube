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

const authenticatedJsonRequest = async (path, options = {}) => {
  const { data: { session } = {} } = await supabase.auth.getSession()
  if (!session?.access_token) {
    const error = new Error('로그인이 필요합니다.')
    error.status = 401
    throw error
  }
  const response = await fetch(getApiUrl(path), {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload.error || `Mac mini 시스템 API 오류 (${response.status})`)
    error.status = response.status
    throw error
  }
  return payload
}

export const formatConversionDuration = (seconds) => {
  const value = Number(seconds)
  if (!Number.isFinite(value) || value < 0) return null
  const total = Math.floor(value)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const remaining = total % 60
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`
  return `${minutes}:${String(remaining).padStart(2, '0')}`
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

export const getMacMiniSystemStatus = async (signal) => {
  const response = await fetch(getApiUrl('/api/system/status'), { signal })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.error || `Mac mini 상태 API 오류 (${response.status})`)
  }
  if (!payload || !payload.media_server || !payload.tunnel || !payload.vercel || !payload.storage) {
    throw new Error('Mac mini 상태 API 응답 형식이 올바르지 않습니다.')
  }
  return payload
}

export const getMacMiniDiagnosis = (signal) =>
  authenticatedJsonRequest('/api/system/diagnose', { signal })

export const restartMacMiniMediaServer = () =>
  authenticatedJsonRequest('/api/system/restart-media-server', { method: 'POST' })

export const restartMacMiniTunnel = () =>
  authenticatedJsonRequest('/api/system/restart-tunnel', { method: 'POST' })

export const resyncMacMiniVercel = () =>
  authenticatedJsonRequest('/api/system/resync-vercel', { method: 'POST' })

export const startMacMiniAutoRecovery = () =>
  authenticatedJsonRequest('/api/system/auto-recover', { method: 'POST' })

export const getMacMiniRecoveryStatus = (jobId, signal) =>
  authenticatedJsonRequest(`/api/system/recovery-status?job_id=${encodeURIComponent(String(jobId ?? ''))}`, { signal })

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

export const uploadMacMiniVideo = async (file, { onProgress, signal } = {}) => {
  const { data: { session } = {} } = await supabase.auth.getSession()
  if (!session?.access_token) {
    const error = new Error('로그인이 필요합니다.')
    error.status = 401
    throw error
  }

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('POST', getApiUrl('/api/videos/upload'))
    request.setRequestHeader('Authorization', `Bearer ${session.access_token}`)
    request.setRequestHeader('X-PlayMe-Media-Type', 'video')
    request.responseType = 'json'
    request.upload.onprogress = (event) => {
      if (event.lengthComputable && typeof onProgress === 'function') {
        onProgress({ loaded: event.loaded, total: event.total })
      }
    }
    request.onerror = () => reject(new Error('Mac mini 저장소에 연결할 수 없습니다.'))
    request.onabort = () => reject(new Error('Mac mini 업로드가 취소되었습니다.'))
    request.onload = () => {
      const payload = request.response ?? (() => {
        try { return JSON.parse(request.responseText || '{}') } catch { return {} }
      })()
      if (request.status < 200 || request.status >= 300) {
        const error = new Error(payload.error || `Mac mini 업로드 API 오류 (${request.status})`)
        error.status = request.status
        reject(error)
        return
      }
      resolve(payload)
    }
    if (signal) {
      if (signal.aborted) {
        request.abort()
        return
      }
      signal.addEventListener('abort', () => request.abort(), { once: true })
    }
    const formData = new FormData()
    formData.append('file', file, file.name)
    request.send(formData)
  })
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
