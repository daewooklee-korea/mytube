import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import { prepareWebtoonFiles, moveWebtoonPage } from './webtoon'

export default function WebtoonUpload({ menus, onUpload, onBack }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [pages, setPages] = useState([])
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const lock = useRef(false)
  const previews = useRef(new Set())
  const parent = menus.find((menu) => menu.route === '/webtoon')
  const destinations = menus.filter((menu) => menu.parent_id === parent?.id && menu.level === 2 && !['All', 'Playlist'].includes(menu.name))
  const [destination, setDestination] = useState('')
  const menuId = destination || destinations[0]?.id

  useEffect(() => {
    const urls = previews.current
    return () => { urls.forEach((url) => URL.revokeObjectURL(url)); urls.clear() }
  }, [])

  const selectFiles = (files) => {
    try {
      const accepted = prepareWebtoonFiles(files, pages.map((page) => page.file))
      const added = accepted.map((file) => {
        const preview = URL.createObjectURL(file)
        previews.current.add(preview)
        return { file, preview, id: crypto.randomUUID() }
      })
      setPages((previous) => [...previous, ...added])
      setError('')
    } catch (failure) { setError(failure.message) }
  }

  const remove = (index) => {
    URL.revokeObjectURL(pages[index].preview)
    previews.current.delete(pages[index].preview)
    setPages((previous) => previous.filter((_, i) => i !== index))
  }

  const upload = async (event) => {
    event.preventDefault()
    if (lock.current) return
    if (!title.trim() || !pages.length || !menuId) {
      setError('제목, 웹툰 메뉴, 페이지 이미지를 확인해주세요.')
      return
    }
    lock.current = true
    setBusy(true)
    setError('')
    const uploadedPaths = []
    let registered = false
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) throw new Error('로그인이 필요합니다.')
      // Check schema access before uploading files, avoiding orphan uploads on old deployments.
      const { error: schemaError } = await supabase.from('videos').select('image_pages').limit(0)
      if (schemaError) throw new Error('웹툰 저장 기능이 아직 준비되지 않았습니다. 관리자에게 문의해주세요.')
      const { data: policy, error: policyError } = await supabase.from('storage_policies').select('storage_provider').eq('content_type', 'image').single()
      if (policyError || policy?.storage_provider !== 'supabase') throw new Error('이미지 저장 정책을 Supabase로 설정해주세요.')
      const folder = `webtoons/${user.id}/${crypto.randomUUID()}`
      const urls = []
      for (const [index, page] of pages.entries()) {
        setStatus(`${index + 1} / ${pages.length}페이지 업로드 중…`)
        const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[page.file.type]
        const path = `${folder}/${String(index + 1).padStart(4, '0')}.${extension}`
        const { error: uploadError } = await supabase.storage.from('Videos').upload(path, page.file, { contentType: page.file.type, upsert: false })
        if (uploadError) throw uploadError
        uploadedPaths.push(path)
        urls.push(supabase.storage.from('Videos').getPublicUrl(path).data.publicUrl)
      }
      setStatus('웹툰 등록 중…')
      const { error: saveError } = await supabase.from('videos').insert({
        title: title.trim(), description: description.trim() || null,
        user_id: user.id, menu_id: menuId, media_type: 'image',
        video_url: urls[0], thumbnail_url: urls[0], image_pages: urls,
        storage_provider: 'supabase', storage_path: uploadedPaths[0],
        file_size_bytes: pages.reduce((sum, page) => sum + page.file.size, 0), views: 0,
      })
      if (saveError) throw saveError
      registered = true
      setStatus('웹툰이 등록되었습니다.')
    } catch (failure) {
      let cleanupFailed = false
      if (uploadedPaths.length) {
        try {
          const { error: cleanupError } = await supabase.storage.from('Videos').remove(uploadedPaths)
          cleanupFailed = !!cleanupError
        } catch { cleanupFailed = true }
      }
      setStatus('')
      setError(`${failure.message || '업로드에 실패했습니다.'}${cleanupFailed ? ' 일부 업로드 파일을 정리하지 못했습니다. 관리자에게 문의해주세요.' : ''}`)
    } finally {
      lock.current = false
      setBusy(false)
    }
    if (registered) onUpload()
  }

  return (
    <div className="upload-page webtoon-upload">
      <button type="button" disabled={busy} onClick={onBack}>← 일반 업로드</button>
      <h1>▤ 웹툰 올리기</h1>
      <p>한 회차의 이미지를 순서대로 올려주세요. 첫 번째 이미지가 표지가 됩니다.</p>
      <form onSubmit={upload}>
        <fieldset className="upload-box" disabled={busy}>
          <label htmlFor="webtoon-title">작품명 · 회차 제목</label>
          <input id="webtoon-title" required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 우리 동네 이야기 · 1화" />
          <label htmlFor="webtoon-menu">등록 메뉴</label>
          <select id="webtoon-menu" value={menuId || ''} onChange={(e) => setDestination(e.target.value)} required>
            {!destinations.length && <option value="">웹툰 메뉴 준비 중</option>}
            {destinations.map((menu) => <option key={menu.id} value={menu.id}>{menu.name}</option>)}
          </select>
          <label htmlFor="webtoon-description">설명 (선택)</label>
          <textarea id="webtoon-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          <label htmlFor="webtoon-files">페이지 이미지</label>
          <input id="webtoon-files" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => { selectFiles(e.target.files); e.target.value = '' }} />
          <p>JPG·PNG·WebP / 장당 10MB / 최대 100장·총 200MB. 선택한 파일은 파일명 숫자 순으로 추가됩니다.</p>
          <ol className="webtoon-pages">
            {pages.map((page, index) => <li key={page.id}>
              <img src={page.preview} alt={`${index + 1}페이지 미리보기`} />
              <span>{index + 1}. {page.file.name}{index === 0 ? ' · 표지' : ''}</span>
              <div>
                <button type="button" aria-label={`${index + 1}페이지 위로`} disabled={busy || index === 0} onClick={() => setPages((previous) => moveWebtoonPage(previous, index, -1))}>↑</button>
                <button type="button" aria-label={`${index + 1}페이지 아래로`} disabled={busy || index === pages.length - 1} onClick={() => setPages((previous) => moveWebtoonPage(previous, index, 1))}>↓</button>
                <button type="button" aria-label={`${index + 1}페이지 삭제`} onClick={() => remove(index)}>삭제</button>
              </div>
            </li>)}
          </ol>
          <button type="submit" disabled={busy || !pages.length || !menuId}>{busy ? '업로드 중…' : `${pages.length}페이지 웹툰 등록`}</button>
        </fieldset>
      </form>
      {status && <p role="status">{status}</p>}
      {error && <p role="alert" className="storage-admin-error">{error}</p>}
    </div>
  )
}
