import { useState, useRef } from 'react'
import { supabase } from './supabase'

function Upload({ onUpload, menus }) {
  const [title, setTitle] = useState('')
  const [selectedMenuId, setSelectedMenuId] = useState('')
  const [selectedSubMenuId, setSelectedSubMenuId] = useState('')
  const [description, setDescription] = useState('')
  const [mediaFile, setMediaFile] = useState(null)
  const [mediaType, setMediaType] = useState('audio')
  const [thumbnailFile, setThumbnailFile] = useState(null)
  const [thumbnailPreview, setThumbnailPreview] = useState(null)
  const [capturing, setCapturing] = useState(false)
  const [uploading, setUploading] = useState(false)

  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  const mediaTypeOptions = {
    audio: { label: '🎵 음악', accept: 'audio/*' },
    video: { label: '🎬 동영상', accept: 'video/*' },
    image: { label: '🖼 이미지', accept: 'image/*' },
    document: {
      label: '📄 문서',
      accept:
        'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,.doc,.docx',
    },
  }

  const firstLevelMenus = menus
    .filter((menu) => menu.level === 1)
    .sort((a, b) => a.sort_order - b.sort_order)

  const secondLevelMenus = menus
    .filter(
      (menu) =>
        menu.level === 2 &&
        menu.parent_id === selectedMenuId &&
        menu.name !== 'All' &&
        menu.name !== 'Playlist'
    )
    .sort((a, b) => a.sort_order - b.sort_order)

  const isValidMediaFile = (file) => {
    if (mediaType === 'audio') return file.type.startsWith('audio/')
    if (mediaType === 'video') return file.type.startsWith('video/')
    if (mediaType === 'image') return file.type.startsWith('image/')

    return [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ].includes(file.type)
  }

  const handleMediaSelect = (file) => {
    if (!file) return false

    if (!isValidMediaFile(file)) {
      alert('선택한 콘텐츠 타입에 맞는 파일을 선택해주세요.')
      return false
    }

    setMediaFile(file)
    setThumbnailFile(null)
    setThumbnailPreview(null)
    setCapturing(false)

    if (mediaType === 'audio') {
      const defaultCover = generateDefaultCover()
      setThumbnailFile(defaultCover)
      setThumbnailPreview(URL.createObjectURL(defaultCover))
      return true
    }

    if (mediaType === 'image') {
      setThumbnailFile(file)
      setThumbnailPreview(URL.createObjectURL(file))
      return true
    }

    if (mediaType === 'document') {
      const defaultThumbnail = generateDocumentThumbnail()
      setThumbnailFile(defaultThumbnail)
      setThumbnailPreview(URL.createObjectURL(defaultThumbnail))
      return true
    }

    setCapturing(true)

    const videoUrl = URL.createObjectURL(file)
    const video = videoRef.current
    video.src = videoUrl

    video.onloadeddata = () => {
      video.currentTime = 1
    }

    video.onseeked = () => {
      const canvas = canvasRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      canvas.toBlob((blob) => {
        const capturedFile = new File([blob], 'thumbnail.jpg', {
          type: 'image/jpeg',
        })

        setThumbnailFile(capturedFile)
        setThumbnailPreview(URL.createObjectURL(blob))
        setCapturing(false)

        URL.revokeObjectURL(videoUrl)
      }, 'image/jpeg')
    }

    return true
  }

const generateDefaultThumbnail = (icon, fileName) => {
  const svg = `
    <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="400" fill="#1a1a1a" />
      <text x="200" y="230" font-size="140" text-anchor="middle" fill="#ffffff">${icon}</text>
    </svg>
  `

  const blob = new Blob([svg], { type: 'image/svg+xml' })
  return new File([blob], fileName, { type: 'image/svg+xml' })
}

  const generateDefaultCover = () =>
    generateDefaultThumbnail('♪', 'default-cover.svg')

  const generateDocumentThumbnail = () =>
    generateDefaultThumbnail('📄', 'default-document.svg')

  const handleMediaTypeChange = (nextMediaType) => {
    setMediaType(nextMediaType)
    setMediaFile(null)
    setThumbnailFile(null)
    setThumbnailPreview(null)
    setCapturing(false)
  }
  const handleManualThumbnail = (file) => {
    if (!file) return

    setThumbnailFile(file)
    setThumbnailPreview(URL.createObjectURL(file))
  }

  const handleUpload = async () => {
    if (!title.trim()) {
      alert('제목을 입력해주세요.')
      return
    }

    if (!selectedMenuId) {
      alert('1차 메뉴를 선택해주세요.')
      return
    }

    if (!selectedSubMenuId) {
      alert('2차 메뉴를 선택해주세요.')
      return
    }

    if (!mediaFile) {
      alert('파일을 선택해주세요.')
      return
    }

    if (mediaType === 'video' && !thumbnailFile) {
      alert('썸네일을 준비 중입니다. 잠시 후 다시 시도해주세요.')
      return
    }

 
    setUploading(true)

    // 1. 미디어 파일 업로드
    const extension = mediaFile.name.split('.').pop()
    const mediaFileName = `media-${Date.now()}.${extension}`

    const { error: mediaError } = await supabase.storage
      .from('Videos')
      .upload(mediaFileName, mediaFile, {
        contentType: mediaFile.type,
        upsert: false,
      })

    if (mediaError) {
      console.error(mediaError)
      alert(`파일 업로드 실패: ${mediaError.message}`)
      setUploading(false)
      return
    }

    const { data: mediaData } = supabase.storage
      .from('Videos')
      .getPublicUrl(mediaFileName)

    const mediaUrl = mediaData.publicUrl

    // 2. 썸네일 업로드
    const thumbnailExtension = thumbnailFile.name.split('.').pop()
    const thumbnailFileName = `thumbnail-${Date.now()}.${thumbnailExtension}`

    const { error: thumbnailError } = await supabase.storage
      .from('Thumbnails')
      .upload(thumbnailFileName, thumbnailFile, {
        contentType: thumbnailFile.type,
        upsert: false,
      })

    if (thumbnailError) {
      console.error(thumbnailError)
      alert(`썸네일 업로드 실패: ${thumbnailError.message}`)
      setUploading(false)
      return
    }

    const { data: thumbnailData } = supabase.storage
      .from('Thumbnails')
      .getPublicUrl(thumbnailFileName)

    const thumbnailUrl = thumbnailData.publicUrl

    // 3. 현재 로그인한 사용자 확인
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      alert('로그인이 필요합니다.')
      setUploading(false)
      return
    }

    // 4. Database에 저장
    const { error: databaseError } = await supabase
      .from('videos')
      .insert({
        title: title,
        description: description,
        video_url: mediaUrl,
        thumbnail_url: thumbnailUrl,
        views: 0,
        user_id: user.id,
        menu_id: selectedSubMenuId,
        media_type: mediaType,

      })

    if (databaseError) {
      console.error(databaseError)
      alert(`정보 저장 실패: ${databaseError.message}`)
      setUploading(false)
      return
    }

    setTitle('')
    setDescription('')
    setMediaFile(null)
    setMediaType('audio')
    setThumbnailFile(null)
    setThumbnailPreview(null)
    setUploading(false)

    onUpload()

    alert('업로드 성공!')
  }

  return (
    <div className="upload-page">

      <h1>업로드</h1>

      <div className="upload-box">

        <label>콘텐츠 타입</label>

        <select
          value={mediaType}
          onChange={(e) => handleMediaTypeChange(e.target.value)}
        >
          {Object.entries(mediaTypeOptions).map(([value, option]) => (
            <option key={value} value={value}>
              {option.label}
            </option>
          ))}
        </select>

        <label>제목</label>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력하세요"
        />
<label>1차 메뉴</label>

<select
  value={selectedMenuId}
  onChange={(e) => {
    setSelectedMenuId(e.target.value)
    setSelectedSubMenuId('')
  }}
>
  <option value="">1차 메뉴를 선택하세요</option>
  {firstLevelMenus.map((menu) => (
    <option key={menu.id} value={menu.id}>
      {menu.name}
    </option>
  ))}
</select>

<label>2차 메뉴</label>

<select
  value={selectedSubMenuId}
  onChange={(e) => setSelectedSubMenuId(e.target.value)}
  disabled={!selectedMenuId}
>
  <option value="">2차 메뉴를 선택하세요</option>
  {secondLevelMenus.map((menu) => (
    <option key={menu.id} value={menu.id}>
      {menu.name}
    </option>
  ))}
</select>

<label>설명</label>

<textarea
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  placeholder="설명을 입력하세요"
  rows="8"
/>

        <label>{mediaTypeOptions[mediaType].label} 파일</label>

        <input
          key={mediaType}
          type="file"
          accept={mediaTypeOptions[mediaType].accept}
          onChange={(e) => {
            if (!handleMediaSelect(e.target.files[0])) {
              e.target.value = ''
            }
          }}
        />

        {mediaFile && (
          <p>
            선택한 파일: {mediaFile.name} ({mediaTypeOptions[mediaType].label})
          </p>
        )}

        <label>
          {mediaType === 'audio'
            ? '커버 이미지'
            : mediaType === 'image'
              ? '이미지 미리보기'
              : mediaType === 'document'
                ? '문서 썸네일'
                : '썸네일'}
        </label>

        {capturing && <p>썸네일을 캡처하는 중...</p>}

        {thumbnailPreview && (
          <img
            src={thumbnailPreview}
            alt="썸네일 미리보기"
            style={{
              width: '160px',
              aspectRatio: '16 / 9',
              objectFit: 'cover',
              borderRadius: '8px',
              marginTop: '8px',
            }}
          />
        )}

        {mediaType !== 'image' && (
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleManualThumbnail(e.target.files[0])}
          />
        )}

       <p>
  {mediaType === 'audio'
    ? '기본 커버가 자동 적용됩니다. 직접 이미지를 선택해 바꿀 수도 있어요.'
    : mediaType === 'video'
      ? '영상에서 자동으로 캡처되며, 직접 이미지를 선택해 바꿀 수도 있어요.'
      : mediaType === 'image'
        ? '선택한 이미지가 미리보기와 썸네일로 사용됩니다.'
        : '기본 문서 썸네일이 적용되며, 직접 이미지를 선택해 바꿀 수도 있어요.'}
</p>

        <button
          onClick={handleUpload}
          disabled={uploading || capturing}
        >
          {uploading ? '업로드 중...' : '업로드'}
        </button>

      </div>

      <video ref={videoRef} style={{ display: 'none' }} muted />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

    </div>
  )
}

export default Upload
