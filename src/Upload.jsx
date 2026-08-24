import { useState, useRef } from 'react'
import { supabase } from './supabase'

function Upload({ onUpload }) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('음악')
  const [description, setDescription] = useState('')
  const [mediaFile, setMediaFile] = useState(null)
  const [mediaType, setMediaType] = useState(null)
  const [thumbnailFile, setThumbnailFile] = useState(null)
  const [thumbnailPreview, setThumbnailPreview] = useState(null)
  const [capturing, setCapturing] = useState(false)
  const [uploading, setUploading] = useState(false)

  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  const handleMediaSelect = (file) => {
    setMediaFile(file)
    setThumbnailFile(null)
    setThumbnailPreview(null)

    if (!file) return

   if (file.type.startsWith('audio/')) {
  setMediaType('audio')

  const defaultCover = generateDefaultCover()
  setThumbnailFile(defaultCover)
  setThumbnailPreview(URL.createObjectURL(defaultCover))
  return
}

    setMediaType('video')
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
  }
const generateDefaultCover = () => {
  const svg = `
    <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="400" fill="#1a1a1a" />
      <text x="200" y="230" font-size="140" text-anchor="middle" fill="#ffffff">♪</text>
    </svg>
  `

  const blob = new Blob([svg], { type: 'image/svg+xml' })
  return new File([blob], 'default-cover.svg', { type: 'image/svg+xml' })
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
        category: category,
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
    setMediaType(null)
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

        <label>제목</label>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력하세요"
        />
<label>
  {category === '음악' ? '가사' : '설명'}
</label>

<textarea
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  placeholder={
    category === '음악'
      ? '가사를 입력하세요'
      : '영상 설명을 입력하세요'
  }
  rows="8"
/>
        <label>카테고리</label>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="음악">음악</option>
          <option value="브이로그">브이로그</option>
          <option value="여행">여행</option>
          <option value="코미디">코미디</option>
        </select>

        <label>동영상 또는 음악 파일</label>

        <input
          type="file"
          accept="video/*,audio/*"
          onChange={(e) => handleMediaSelect(e.target.files[0])}
        />

        {mediaFile && (
          <p>
            선택한 파일: {mediaFile.name} ({mediaType === 'audio' ? '음악' : '영상'})
          </p>
        )}

        <label>{mediaType === 'audio' ? '커버 이미지' : '썸네일'}</label>

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

        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleManualThumbnail(e.target.files[0])}
        />

       <p>
  {mediaType === 'audio'
    ? '기본 커버가 자동 적용됩니다. 직접 이미지를 선택해 바꿀 수도 있어요.'
    : '영상에서 자동으로 캡처되며, 직접 이미지를 선택해 바꿀 수도 있어요.'}
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