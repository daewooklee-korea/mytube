const getBaseUrl = () =>
  String(import.meta.env.VITE_MACMINI_MEDIA_BASE_URL ?? '').replace(/\/+$/, '')

export const getMacMiniVideos = async (signal) => {
  const baseUrl = getBaseUrl()
  if (!baseUrl) {
    throw new Error('Mac mini 미디어 서버 주소가 설정되지 않았습니다.')
  }

  const response = await fetch(`${baseUrl}/api/videos`, { signal })
  if (!response.ok) {
    throw new Error(`Mac mini API 오류 (${response.status})`)
  }

  const payload = await response.json()
  if (!payload || !Array.isArray(payload.videos)) {
    throw new Error('Mac mini API 응답 형식이 올바르지 않습니다.')
  }

  return payload.videos
}
