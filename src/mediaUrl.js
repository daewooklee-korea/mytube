const macMiniBaseUrl = String(
  import.meta.env.VITE_MACMINI_MEDIA_BASE_URL ?? ''
).replace(/\/+$/, '')

export const resolveMediaUrl = (video) => {
  if (!video) return ''

  const storageProvider = video.storage_provider ?? video.storageProvider
  const storagePath = video.storage_path ?? video.storagePath
  const videoUrl = video.video_url ?? video.videoUrl

  if (
    String(storageProvider ?? '').toLowerCase() === 'macmini' &&
    storagePath
  ) {
    const path = String(storagePath)
      .split('/')
      .filter(Boolean)
      .map((part) => encodeURIComponent(part))
      .join('/')

    const resolvedUrl = macMiniBaseUrl
      ? `${macMiniBaseUrl}/${path}`
      : (videoUrl ?? video.video ?? '')

    if (typeof window !== 'undefined') {
      console.log('[PlayMe playback debug] resolveMediaUrl', {
        storage_provider: storageProvider,
        storage_path: storagePath,
        configured: Boolean(macMiniBaseUrl),
        base_origin: macMiniBaseUrl
          ? new URL(macMiniBaseUrl).origin
          : null,
        resolved_url: resolvedUrl,
      })
    }

    return resolvedUrl
  }

  return videoUrl ?? video.video ?? ''
}

export const isHlsUrl = (url) =>
  typeof url === 'string' && /\.m3u8(?:$|[?#])/i.test(url)
