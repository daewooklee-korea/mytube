import { useEffect, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import Hls from 'hls.js'
import PlayMeBrand from './PlayMeBrand'
import { resolveMediaUrl, isHlsUrl } from './mediaUrl'
import { contentShareUrl, shareContent } from './contentShare'
import EducationPage from './components/education/EducationPage'
import StudyHub from './components/education/StudyHub'
import { getEducationCourse, isStudyMenu } from './components/education/educationCourses'
import { menuContentIds } from './publicMenus'
import './PublicBrowse.css'

// Guest browsing must never inherit a signed-in session while auth initializes.
const guest = createClient(import.meta.env.VITE_SUPABASE_URL.trim(), import.meta.env.VITE_SUPABASE_ANON_KEY.trim(), {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'playme-public' },
})

function PublicMedia({ content }) {
  const ref = useRef(null)
  const url = resolveMediaUrl(content)
  useEffect(() => {
    const element = ref.current
    if (!element || !isHlsUrl(url) || element.canPlayType('application/vnd.apple.mpegurl') || !Hls.isSupported()) return
    const hls = new Hls()
    hls.loadSource(url)
    hls.attachMedia(element)
    return () => hls.destroy()
  }, [url])
  if (content.image_pages?.length) return <div className="webtoon-reader" aria-label={`${content.title} 웹툰`}>
    {content.image_pages.map((page, index) => <div className="webtoon-page" key={`${index}-${page}`}>
      {index > 0 && <div className="webtoon-page-divider" aria-hidden="true">{index + 1} / {content.image_pages.length} 페이지</div>}
      <img src={page} alt={`${content.title} ${index + 1}페이지`} loading={index ? 'lazy' : 'eager'} />
    </div>)}
    <p>마지막 페이지입니다 · {content.image_pages.length}페이지</p>
  </div>
  if (content.media_type === 'image') return <img className="public-image" src={url} alt={content.title} />
  if (content.media_type === 'document') return <a href={url} target="_blank" rel="noreferrer">문서 열기 ↗</a>
  if (content.media_type === 'audio') return <audio ref={ref} controls src={url} />
  return <video ref={ref} controls playsInline src={url} poster={content.thumbnail_url || undefined} />
}

function readLocation() {
  const params = new URLSearchParams(window.location.search)
  return { path: window.location.pathname, content: params.get('content'), menu: params.get('menu') }
}

export default function PublicBrowse({ onLogin }) {
  const [menus, setMenus] = useState([])
  const [contents, setContents] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [manualUrl, setManualUrl] = useState('')
  const [location, setLocation] = useState(readLocation)
  const sharing = useRef(false)
  useEffect(() => {
    const syncLocation = () => setLocation(readLocation())
    window.addEventListener('popstate', syncLocation)
    return () => window.removeEventListener('popstate', syncLocation)
  }, [])
  useEffect(() => {
    let cancelled = false
    async function load() {
      const [menuResult, contentResult] = await Promise.all([
        guest.from('menus').select('id,name,parent_id,level,route,sort_order,is_public').eq('is_public', true).order('level').order('sort_order'),
        guest.from('videos').select('id,title,description,menu_id,media_type,image_pages,thumbnail_url,video_url,storage_provider,storage_path').eq('status', 'ACTIVE').is('deleted_at', null).order('created_at', { ascending: false }),
      ])
      if (cancelled) return
      if (menuResult.error || contentResult.error) {
        setMessage('공개 콘텐츠를 불러오지 못했습니다. 잠시 후 새로고침해주세요.')
      } else {
        setMenus(menuResult.data || [])
        setContents(contentResult.data || [])
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])
  const activeMenu = menus.find((menu) => location.menu ? menu.id === location.menu : menu.route === location.path)
  const selected = contents.find((content) => String(content.id) === location.content)
  const listingMenu = activeMenu?.parent_id && /^(All|전체.*)$/i.test(activeMenu.name) ? menus.find((menu) => menu.id === activeMenu.parent_id) : activeMenu
  const ids = menuContentIds(menus, listingMenu?.id)
  const shown = activeMenu ? contents.filter((content) => ids.has(content.menu_id)) : contents
  const navigate = (path, id = null) => {
    const url = id === null ? path : contentShareUrl(window.location.origin, id)
    window.history.pushState({}, '', url)
    setLocation(readLocation())
    setMessage('')
    setManualUrl('')
    window.scrollTo(0, 0)
  }
  const share = async () => {
    if (sharing.current || !selected) return
    sharing.current = true
    const url = contentShareUrl(window.location.origin, selected.id)
    try {
      setMessage(''); setManualUrl('')
      const result = await shareContent(selected.title, url, navigator)
      if (result === 'copied') setMessage('공유 링크를 복사했습니다.')
      if (result === 'manual') { setMessage('아래 링크를 선택해서 복사해주세요.'); setManualUrl(url) }
    } finally { sharing.current = false }
  }
  return <div className="public-browse">
    <header className="public-header">
      <button className="public-brand" type="button" aria-label="공개 콘텐츠 홈" onClick={() => navigate('/')}><PlayMeBrand /></button>
      <button type="button" className="install-button" onClick={onLogin}>로그인</button>
    </header>
    <nav className="public-nav" aria-label="공개 메뉴">
      <button type="button" onClick={() => navigate('/')}>전체</button>
      {menus.map((menu) => <button type="button" key={menu.id} aria-current={activeMenu?.id === menu.id ? 'page' : undefined} onClick={() => navigate(menu.route || `/?menu=${menu.id}`, null)}>{menu.parent_id ? '↳ ' : ''}{menu.name}</button>)}
    </nav>
    <main className="public-main">
      {message && <p role="status">{message}</p>}
      {manualUrl && <input aria-label="공유 링크" readOnly value={manualUrl} onFocus={(event) => event.target.select()} />}
      {loading ? <p>공개 콘텐츠를 불러오는 중...</p> : location.content && !selected ? <><p>콘텐츠를 찾을 수 없거나 로그인이 필요합니다.</p><button type="button" onClick={onLogin}>로그인해서 확인하기</button></> : selected ? <>
        <button className="back-button" type="button" onClick={() => navigate(menus.find((menu) => menu.id === selected.menu_id)?.route || `/?menu=${selected.menu_id}`)}>← 목록으로</button>
        <h1>{selected.title}</h1>
        <div className={`player ${selected.image_pages?.length ? 'webtoon-player' : ''}`}><PublicMedia key={selected.id} content={selected} /></div>
        <div className="actions"><button type="button" onClick={share}>↗ 공유</button><button type="button" onClick={onLogin}>로그인하고 좋아요·댓글 남기기</button></div>
        {selected.description && <p className="public-description">{selected.description}</p>}
      </> : !activeMenu && (location.path !== '/' || location.menu) ? <><p>공개되지 않은 메뉴입니다. 로그인 후 확인해주세요.</p><button type="button" onClick={onLogin}>로그인</button></> : <>
        <h1>{activeMenu?.name || '공개 콘텐츠'}</h1>
        {getEducationCourse(activeMenu?.route) ? <EducationPage route={activeMenu.route} /> : isStudyMenu(activeMenu) ? <StudyHub menus={menus.filter((menu) => menu.parent_id === activeMenu.id)} onOpen={(menu) => navigate(menu.route)} /> : <>
          <div className="public-grid">{shown.map((content) => <button className="public-card" type="button" key={content.id} onClick={() => navigate('/', content.id)}>
            {content.thumbnail_url ? <img src={content.thumbnail_url} alt="" loading="lazy" /> : <div className="public-placeholder">{content.media_type === 'audio' ? '♫' : '▤'}</div>}
            <strong>{content.title}</strong>
          </button>)}</div>
          {!shown.length && <p>아직 공개된 콘텐츠가 없습니다.</p>}
        </>}
      </>}
    </main>
  </div>
}
