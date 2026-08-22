import { useState } from 'react'
import { supabase } from './supabase'

function Upload({ onUpload }) {
  const [title, setTitle] = useState('')
  const [videoFile, setVideoFile] = useState(null)
  const [thumbnailFile, setThumbnailFile] = useState(null)
  const [uploading, setUploading] = useState(false)

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
      alert('썸네일 이미지를 선택해주세요.')
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

    // 2. 영상 URL 가져오기
    const { data: videoData } = supabase.storage
      .from('Videos')
      .getPublicUrl(videoFileName)

    const videoUrl = videoData.publicUrl

    // 3. 썸네일 업로드
    const thumbnailExtension =
      thumbnailFile.name.split('.').pop()

    const thumbnailFileName =
      `thumbnail-${Date.now()}.${thumbnailExtension}`

    const { error: thumbnailError } =
      await supabase.storage
        .from('Thumbnails')
        .upload(
          thumbnailFileName,
          thumbnailFile,
          {
            contentType: thumbnailFile.type,
            upsert: false,
          }
        )

    if (thumbnailError) {
      console.error(thumbnailError)
      alert(`썸네일 업로드 실패: ${thumbnailError.message}`)
      setUploading(false)
      return
    }

    // 4. 썸네일 URL 가져오기
    const { data: thumbnailData } =
      supabase.storage
        .from('Thumbnails')
        .getPublicUrl(thumbnailFileName)

    const thumbnailUrl =
      thumbnailData.publicUrl

    // 5. Database에 저장
    const { error: databaseError } =
      await supabase
        .from('videos')
        .insert({
          title: title,
          video_url: videoUrl,
          thumbnail_url: thumbnailUrl,
          views: 0,
        })

    if (databaseError) {
      console.error(databaseError)
      alert(`영상 정보 저장 실패: ${databaseError.message}`)
      setUploading(false)
      return
    }

    // 6. 화면에 바로 표시
    const newVideo = {
      title: title,
      views: '조회수 0회',
      time: '방금 전',
      video: videoUrl,
      thumbnail: thumbnailUrl,
    }

    onUpload(newVideo)

    setTitle('')
    setVideoFile(null)
    setThumbnailFile(null)
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
          onChange={(e) =>
            setTitle(e.target.value)
          }
          placeholder="영상 제목을 입력하세요"
        />

        <label>동영상 파일</label>

        <input
          type="file"
          accept="video/*"
          onChange={(e) =>
            setVideoFile(e.target.files[0])
          }
        />

        {videoFile && (
          <p>
            선택한 영상: {videoFile.name}
          </p>
        )}

        <label>썸네일 이미지</label>

        <input
          type="file"
          accept="image/*"
          onChange={(e) =>
            setThumbnailFile(e.target.files[0])
          }
        />

        {thumbnailFile && (
          <p>
            선택한 썸네일: {thumbnailFile.name}
          </p>
        )}

        <button
          onClick={handleUpload}
          disabled={uploading}
        >
          {uploading
            ? '업로드 중...'
            : '영상 업로드'}
        </button>

      </div>

    </div>
  )
}

export default Upload