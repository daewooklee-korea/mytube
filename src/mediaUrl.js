const macMiniBaseUrl = String(
  import.meta.env.VITE_MACMINI_MEDIA_BASE_URL ?? ''
).replace(/\/+$/, '')

export const resolveMediaUrl = (video) => {
  if (!video) return ''

  if (
    video.storage_provider?.toLowerCase() === 'macmini' &&
    video.storage_path
  ) {
    const path = String(video.storage_path)
      .split('/')
      .filter(Boolean)
      .map((part) => encodeURIComponent(part))
      .join('/')

    return macMiniBaseUrl
      ? `${macMiniBaseUrl}/${path}`
      : (video.video_url ?? video.video ?? '')
  }

  return video.video_url ?? video.video ?? ''
}

export const isHlsUrl = (url) =>
  typeof url === 'string' && /\.m3u8(?:$|[?#])/i.test(url)
