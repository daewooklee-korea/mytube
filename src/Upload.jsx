import { useState, useRef } from 'react'
import { supabase } from './supabase'
import { parseLrc } from './lyrics'
import {
  convertMacMiniVideo,
  formatConversionDuration,
  getMacMiniConversionStatus,
  getMacMiniVideos,
  uploadMacMiniVideo,
} from './macMiniMedia'

function Upload({ onUpload, menus }) {
  const [title, setTitle] = useState('')
  const [selectedMenuId, setSelectedMenuId] = useState('')
  const [selectedSubMenuId, setSelectedSubMenuId] = useState('')
  const [description, setDescription] = useState('')
  const [syncLyrics, setSyncLyrics] = useState('')
  const [mediaFile, setMediaFile] = useState(null)
  const [mediaType, setMediaType] = useState('audio')
  const [thumbnailFile, setThumbnailFile] = useState(null)
  const [thumbnailPreview, setThumbnailPreview] = useState(null)
  const [capturing, setCapturing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')

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
    setUploadStatus('')

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
    setUploadStatus('')
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

    const { lines: lyricsSync, error: lyricsError } = parseLrc(syncLyrics)
    if (lyricsError) {
      alert(lyricsError)
      return
    }

    if (mediaType === 'video' && !thumbnailFile) {
      alert('썸네일을 준비 중입니다. 잠시 후 다시 시도해주세요.')
      return
    }

 
    setUploading(true)
    setUploadStatus('저장 정책 확인 중...')

    try {
      const { data: policy, error: policyError } = await supabase
        .from('storage_policies')
        .select('storage_provider')
        .eq('content_type', mediaType)
        .maybeSingle()
      if (policyError) throw new Error(`저장 정책을 확인하지 못했습니다: ${policyError.message}`)

      const storageProvider = policy?.storage_provider
      if (!['supabase', 'macmini'].includes(storageProvider)) {
        throw new Error('지원되지 않거나 설정되지 않은 저장소 정책입니다.')
      }
      if (storageProvider === 'macmini' && mediaType !== 'video') {
        throw new Error('현재 Mac mini 업로드는 동영상만 지원합니다. 저장 정책을 Supabase로 설정해주세요.')
      }

      let mediaUrl = ''
      let storagePath = null
      let storedFileSize = Number.isFinite(Number(mediaFile?.size)) ? Number(mediaFile.size) : null

      if (storageProvider === 'macmini') {
        setUploadStatus('Mac mini로 업로드 중...')
        const uploaded = await uploadMacMiniVideo(mediaFile, {
          onProgress: ({ loaded, total }) => {
            if (total > 0) {
              setUploadStatus(`Mac mini로 업로드 중... ${Math.round((loaded / total) * 100)}%`)
            }
          },
        })
        if (uploaded.status !== 'uploaded' || !uploaded.relative_path || !Number.isFinite(Number(uploaded.size))) {
          throw new Error('Mac mini 업로드 응답이 올바르지 않습니다.')
        }
        storedFileSize = Number(uploaded.size)

        setUploadStatus('HLS 변환 준비 중...')
        const conversion = await convertMacMiniVideo(uploaded.relative_path)
        if (conversion.status === 'already_ready') {
          storagePath = conversion.hls_path
        } else if (conversion.job_id) {
          setUploadStatus('HLS 변환 중...')
          for (;;) {
            await new Promise((resolve) => window.setTimeout(resolve, 2000))
            const status = await getMacMiniConversionStatus(conversion.job_id)
            if (status.progress_percent != null) {
              const processed = formatConversionDuration(status.processed_seconds)
              const duration = formatConversionDuration(status.duration_seconds)
              setUploadStatus(
                duration
                  ? `HLS 변환 중... ${status.progress_percent}% (${processed || '0:00'} / ${duration})`
                  : 'HLS 변환 중...'
              )
            }
            if (status.status === 'processing') continue
            if (status.status !== 'completed' || !status.hls_path) {
              throw new Error(status.error || 'HLS 변환에 실패했습니다.')
            }
            storagePath = status.hls_path
            break
          }
        } else {
          throw new Error('HLS 변환 작업을 시작하지 못했습니다.')
        }

        const latestVideos = await getMacMiniVideos()
        const readyVideo = latestVideos.find((video) => video.relative_path === uploaded.relative_path)
        if (!readyVideo?.hls_ready || readyVideo.hls_path !== storagePath) {
          throw new Error('HLS 변환 결과를 확인하지 못했습니다.')
        }
      } else {
        setUploadStatus('Supabase에 파일 업로드 중...')
        const extension = mediaFile.name.split('.').pop()
        const mediaFileName = `media-${Date.now()}.${extension}`
        const { error: mediaError } = await supabase.storage
          .from('Videos')
          .upload(mediaFileName, mediaFile, {
            contentType: mediaFile.type,
            upsert: false,
          })
        if (mediaError) throw mediaError
        const { data: mediaData } = supabase.storage.from('Videos').getPublicUrl(mediaFileName)
        mediaUrl = mediaData.publicUrl
        storagePath = mediaFileName
      }

      setUploadStatus('썸네일 업로드 중...')
      const thumbnailExtension = thumbnailFile.name.split('.').pop()
      const thumbnailFileName = `thumbnail-${Date.now()}.${thumbnailExtension}`
      const { error: thumbnailError } = await supabase.storage
        .from('Thumbnails')
        .upload(thumbnailFileName, thumbnailFile, {
          contentType: thumbnailFile.type,
          upsert: false,
        })
      if (thumbnailError) throw thumbnailError
      const { data: thumbnailData } = supabase.storage.from('Thumbnails').getPublicUrl(thumbnailFileName)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다.')

      setUploadStatus('콘텐츠 등록 중...')
      const { error: databaseError } = await supabase
        .from('videos')
        .insert({
          title,
          description,
          video_url: mediaUrl,
          thumbnail_url: thumbnailData.publicUrl,
          views: 0,
          user_id: user.id,
          menu_id: selectedSubMenuId,
          media_type: mediaType,
          lyrics_sync: lyricsSync,
          storage_provider: storageProvider,
          storage_path: storagePath,
          file_size_bytes: storedFileSize,
        })
      if (databaseError) throw databaseError

      setTitle('')
      setDescription('')
      setSyncLyrics('')
      setMediaFile(null)
      setMediaType('audio')
      setThumbnailFile(null)
      setThumbnailPreview(null)
      setUploadStatus('완료')
      onUpload()
      alert('업로드 성공!')
    } catch (error) {
      console.error('콘텐츠 업로드 실패:', error)
      alert(error.message || '업로드에 실패했습니다.')
    } finally {
      setUploading(false)
    }
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

<label>싱크 가사 (선택)</label>

<textarea
  value={syncLyrics}
  onChange={(e) => setSyncLyrics(e.target.value)}
  placeholder={'[00:12.40] 어릴 땐 빨리 크고 싶었지\n[00:16.80] 내맘대로 살고 싶어서'}
  rows="6"
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

        {uploadStatus && <p className="upload-status" role="status">{uploadStatus}</p>}

      </div>

      <video ref={videoRef} style={{ display: 'none' }} muted />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

    </div>
  )
}

export default Upload
