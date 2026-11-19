// Keep the menu URL stable when the private chat server's tunnel changes.
const fallbackUrl = 'https://practitioners-mothers-linda-underwear.trycloudflare.com/'

export default function handler(_request, response) {
  const destination = new URL(process.env.OPEN_WEBUI_URL || fallbackUrl)
  if (destination.protocol !== 'https:' || destination.username || destination.password) {
    response.status(503).send('AI 채팅 연결 주소를 확인하고 있습니다.')
    return
  }
  response.setHeader('Cache-Control', 'no-store, max-age=0')
  response.redirect(302, destination.href)
}
