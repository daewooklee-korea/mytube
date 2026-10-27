export function contentShareUrl(origin, id) {
  const url = new URL('/', origin)
  url.searchParams.set('content', String(id))
  return url.href
}

export async function shareContent(title, url, browser) {
  if (browser.share) {
    try {
      await browser.share({ title, url })
      return 'shared'
    } catch (error) {
      if (error.name === 'AbortError') return 'cancelled'
    }
  }
  try {
    await browser.clipboard.writeText(url)
    return 'copied'
  } catch {
    return 'manual'
  }
}
