import { useState, useRef } from 'react'
import { supabase } from './supabase'

function Upload({ onUpload }) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('음악')
  const [videoFile, setVideoFile] = useState(null)
  const [thumbnailFile, setThumbnailFile] = useState(null)
  const [thumbnailPreview, setThumbnailPreview] = useState(null)
  const [capturing, setCapturing] = useState(false)
  const [uploading, setUploading] = useState(false)

  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  const handleVideoSelect = (file) => {
    setVideoFile(file)
    setThumbnailFile(null)
    setThumbnailPreview(null)

    if (!file) return

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

  const handleManualThumbnail = (file) => {
    if (!file) return

    setThumbnailFile(file)
    setThumbnailPreview(URL.createObjectURL(file))
  }

  const handleUpload = async () => {
    if (!title.trim()) {
      alert('영상 제목을 입력해주세요.')
      return
    }

    if (!videoFile) {
      alert('영상을 선택해주세요.')
      return
    }

    if (!thumbnailFile) {
      alert('썸네일을 준비 중입니다. 잠시 후 다시 시도해주세요.')
      return
    }

    setUploading(true)

    // 1. 영상 업로드
    const videoFileName = `video-${Date.now()}.mp4`

    const { error: videoError } = await supabase.storage
      .from('Videos')
      .upload(videoFileName, videoFile, {
        contentType: videoFile.type,
        upsert: false,
      })

    if (videoError) {
      console.error(videoError)
      alert(`영상 업로드 실패: ${videoError.message}`)
      setUploading(false)
      return
    }

    const { data: videoData } = supabase.storage
      .from('Videos')
      .getPublicUrl(videoFileName)

    const videoUrl = videoData.publicUrl

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
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        views: 0,
        user_id: user.id,
        category: category,
      })

    if (databaseError) {
      console.error(databaseError)
      alert(`영상 정보 저장 실패: ${databaseError.message}`)
      setUploading(false)
      return
    }

    onUpload()

    setTitle('')
    setVideoFile(null)
    setThumbnailFile(null)
    setThumbnailPreview(null)
    setUploading(false)

    alert('영상 업로드 성공!')
  }

  return (
    <div className="upload-page">

      <h1>영상 업로드</h1>

      <div className="upload-box">

        <label>영상 제목</label>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="영상 제목을 입력하세요"
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

        <label>동영상 파일</label>

        <input
          type="file"
          accept="video/*"
          onChange={(e) => handleVideoSelect(e.target.files[0])}
        />

        {videoFile && (
          <p>선택한 영상: {videoFile.name}</p>
        )}

        <label>썸네일</label>

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

        <p>영상에서 자동으로 캡처되며, 직접 이미지를 선택해 바꿀 수도 있어요.</p>

        <button
          onClick={handleUpload}
          disabled={uploading || capturing}
        >
          {uploading ? '업로드 중...' : '영상 업로드'}
        </button>

      </div>

      <video ref={videoRef} style={{ display: 'none' }} muted />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

    </div>
  )
}

export default Upload