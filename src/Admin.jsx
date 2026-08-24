import { useEffect, useState } from 'react'
import { supabase } from './supabase'

function Admin({ onClose }) {
  const [activeTab, setActiveTab] = useState('members')

  const [profiles, setProfiles] = useState([])
  const [loadingProfiles, setLoadingProfiles] = useState(true)

  const [videos, setVideos] = useState([])
  const [loadingVideos, setLoadingVideos] = useState(true)

  const [editingId, setEditingId] = useState(null)

  const [editTitle, setEditTitle] = useState('')
  const [editCategory, setEditCategory] = useState('전체')
  const [editDescription, setEditDescription] = useState('')

  const [editMediaFile, setEditMediaFile] = useState(null)
  const [editThumbnailFile, setEditThumbnailFile] = useState(null)

  const [editingNicknameId, setEditingNicknameId] = useState(null)
  const [editNickname, setEditNickname] = useState('')

  const [savingVideo, setSavingVideo] = useState(false)

  // =========================
  // 초기 로딩
  // =========================

  useEffect(() => {
    loadProfiles()
    loadVideos()
  }, [])

  // =========================
  // 회원 목록
  // =========================

  const loadProfiles = async () => {
    setLoadingProfiles(true)

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', {
        ascending: false,
      })

    if (error) {
      console.error(
        '회원 목록 불러오기 실패:',
        error
      )

      alert(
        '회원 목록을 불러오지 못했습니다.'
      )

      setLoadingProfiles(false)
      return
    }

    setProfiles(data)
    setLoadingProfiles(false)
  }

  // =========================
  // 영상 목록
  // =========================

  const loadVideos = async () => {
    setLoadingVideos(true)

    const {
      data,
      error,
    } = await supabase
      .from('videos')
      .select('*')
      .order('created_at', {
        ascending: false,
      })

    if (error) {
      console.error(
        '영상 목록 불러오기 실패:',
        error
      )

      alert(
        '영상 목록을 불러오지 못했습니다.'
      )

      setLoadingVideos(false)
      return
    }

    setVideos(data)
    setLoadingVideos(false)
  }

  // =========================
  // 회원 상태 변경
  // =========================

  const updateStatus = async (
    id,
    newStatus
  ) => {
    const { error } =
      await supabase
        .from('profiles')
        .update({
          status: newStatus,
        })
        .eq('id', id)

    if (error) {
      console.error(
        '상태 변경 실패:',
        error
      )

      alert(
        '상태 변경에 실패했습니다.'
      )

      return
    }

    setProfiles((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              status: newStatus,
            }
          : p
      )
    )
  }

  // =========================
  // 회원 역할 변경
  // =========================

  const updateRole = async (
    id,
    newRole
  ) => {
    const { error } =
      await supabase
        .from('profiles')
        .update({
          role: newRole,
        })
        .eq('id', id)

    if (error) {
      console.error(
        '역할 변경 실패:',
        error
      )

      alert(
        '역할 변경에 실패했습니다.'
      )

      return
    }

    setProfiles((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              role: newRole,
            }
          : p
      )
    )
  }

  // =========================
  // 닉네임 수정
  // =========================

  const startEditingNickname = (
    profile
  ) => {
    setEditingNicknameId(
      profile.id
    )

    setEditNickname(
      profile.nickname ?? ''
    )
  }

  const cancelEditingNickname =
    () => {
      setEditingNicknameId(null)
      setEditNickname('')
    }

  const saveNickname = async (
    id
  ) => {
    if (!editNickname.trim()) {
      alert(
        '닉네임을 입력해주세요.'
      )

      return
    }

    const { error } =
      await supabase
        .from('profiles')
        .update({
          nickname:
            editNickname.trim(),
        })
        .eq('id', id)

    if (error) {
      console.error(
        '닉네임 변경 실패:',
        error
      )

      alert(
        '닉네임 변경에 실패했습니다.'
      )

      return
    }

    setProfiles((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              nickname:
                editNickname.trim(),
            }
          : p
      )
    )

    cancelEditingNickname()
  }

  // =========================
  // 영상 수정 시작
  // =========================

  const startEditing = (
    video
  ) => {
    setEditingId(video.id)

    setEditTitle(
      video.title ?? ''
    )

    setEditCategory(
      video.category ?? '전체'
    )

    setEditDescription(
      video.description ?? ''
    )

    setEditMediaFile(null)
    setEditThumbnailFile(null)
  }

  // =========================
  // 영상 수정 취소
  // =========================

  const cancelEditing = () => {
    setEditingId(null)

    setEditTitle('')
    setEditCategory('전체')
    setEditDescription('')

    setEditMediaFile(null)
    setEditThumbnailFile(null)
  }

  // =========================
  // Storage 경로 추출
  // =========================

  const getStoragePath = (
    publicUrl,
    bucketName
  ) => {
    if (!publicUrl) {
      return null
    }

    try {
      const url = new URL(
        publicUrl
      )

      const marker =
        `/object/public/${bucketName}/`

      const index =
        url.pathname.indexOf(
          marker
        )

      if (index === -1) {
        return null
      }

      const path =
        url.pathname.substring(
          index + marker.length
        )

      return decodeURIComponent(
        path
      )
    } catch (error) {
      console.error(
        'Storage 경로 추출 실패:',
        error
      )

      return null
    }
  }

  // =========================
  // 영상 / 음악 파일 업로드
  // =========================

  const uploadMediaFile = async (
    file
  ) => {
    const extension =
      file.name
        .split('.')
        .pop()
        ?.toLowerCase() ||
      'bin'

    const fileName =
      `media-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)}.${extension}`

    const {
      error,
    } = await supabase.storage
      .from('Videos')
      .upload(
        fileName,
        file,
        {
          contentType:
            file.type,
          upsert: false,
        }
      )

    if (error) {
      throw error
    }

    const {
      data,
    } = supabase.storage
      .from('Videos')
      .getPublicUrl(
        fileName
      )

    return {
      fileName,
      publicUrl:
        data.publicUrl,
    }
  }

  // =========================
  // 썸네일 업로드
  // =========================

  const uploadThumbnailFile =
    async (file) => {
      const extension =
        file.name
          .split('.')
          .pop()
          ?.toLowerCase() ||
        'jpg'

      const fileName =
        `thumbnail-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 8)}.${extension}`

      const {
        error,
      } = await supabase.storage
        .from('Thumbnails')
        .upload(
          fileName,
          file,
          {
            contentType:
              file.type,
            upsert: false,
          }
        )

      if (error) {
        throw error
      }

      const {
        data,
      } = supabase.storage
        .from('Thumbnails')
        .getPublicUrl(
          fileName
        )

      return {
        fileName,
        publicUrl:
          data.publicUrl,
      }
    }

  // =========================
  // 영상 수정 저장
  // =========================

  const saveEditing = async (
    id
  ) => {
    if (!editTitle.trim()) {
      alert(
        '제목을 입력해주세요.'
      )

      return
    }

    const video =
      videos.find(
        (v) => v.id === id
      )

    if (!video) {
      alert(
        '수정할 영상을 찾을 수 없습니다.'
      )

      return
    }

    // 영상 / 음악 파일 타입 확인
    if (editMediaFile) {
      const isAudio =
        video.media_type ===
        'audio'

      const isSelectedAudio =
        editMediaFile.type.startsWith(
          'audio/'
        )

      const isSelectedVideo =
        editMediaFile.type.startsWith(
          'video/'
        )

      if (
        isAudio &&
        !isSelectedAudio
      ) {
        alert(
          '음악 파일에는 오디오 파일을 선택해주세요.'
        )

        return
      }

      if (
        !isAudio &&
        !isSelectedVideo
      ) {
        alert(
          '영상 파일에는 동영상 파일을 선택해주세요.'
        )

        return
      }
    }

    setSavingVideo(true)

    let newMediaUrl =
      video.video_url

    let newThumbnailUrl =
      video.thumbnail_url

    let uploadedMedia = null
    let uploadedThumbnail = null

    try {
      // =========================
      // 새 영상 / 음악 업로드
      // =========================

      if (editMediaFile) {
        uploadedMedia =
          await uploadMediaFile(
            editMediaFile
          )

        newMediaUrl =
          uploadedMedia.publicUrl
      }

      // =========================
      // 새 썸네일 업로드
      // =========================

      if (
        editThumbnailFile
      ) {
        uploadedThumbnail =
          await uploadThumbnailFile(
            editThumbnailFile
          )

        newThumbnailUrl =
          uploadedThumbnail.publicUrl
      }

      // =========================
      // DB 업데이트
      // =========================

      const {
        error,
      } = await supabase
        .from('videos')
        .update({
          title:
            editTitle.trim(),

          category:
            editCategory,

          description:
            editDescription.trim() ||
            null,

          video_url:
            newMediaUrl,

          thumbnail_url:
            newThumbnailUrl,
        })
        .eq('id', id)

      if (error) {
        throw error
      }

      // =========================
      // 기존 영상 파일 삭제
      // =========================

      if (
        editMediaFile &&
        video.video_url
      ) {
        const oldPath =
          getStoragePath(
            video.video_url,
            'Videos'
          )

        if (oldPath) {
          const {
            error:
              deleteError,
          } =
            await supabase.storage
              .from('Videos')
              .remove([
                oldPath,
              ])

          if (deleteError) {
            console.warn(
              '기존 영상 파일 삭제 실패:',
              deleteError
            )
          }
        }
      }

      // =========================
      // 기존 썸네일 삭제
      // =========================

      if (
        editThumbnailFile &&
        video.thumbnail_url
      ) {
        const oldPath =
          getStoragePath(
            video.thumbnail_url,
            'Thumbnails'
          )

        if (oldPath) {
          const {
            error:
              deleteError,
          } =
            await supabase.storage
              .from('Thumbnails')
              .remove([
                oldPath,
              ])

          if (deleteError) {
            console.warn(
              '기존 썸네일 파일 삭제 실패:',
              deleteError
            )
          }
        }
      }

      // =========================
      // 화면 업데이트
      // =========================

      setVideos((prev) =>
        prev.map((v) =>
          v.id === id
            ? {
                ...v,

                title:
                  editTitle.trim(),

                category:
                  editCategory,

                description:
                  editDescription.trim() ||
                  null,

                video_url:
                  newMediaUrl,

                thumbnail_url:
                  newThumbnailUrl,
              }
            : v
        )
      )

      alert(
        '영상 정보가 수정되었습니다.'
      )

      cancelEditing()
    } catch (error) {
      console.error(
        '영상 수정 실패:',
        error
      )

      // DB 저장 실패 시 새로 업로드된 파일 삭제
      if (uploadedMedia) {
        await supabase.storage
          .from('Videos')
          .remove([
            uploadedMedia.fileName,
          ])
      }

      if (uploadedThumbnail) {
        await supabase.storage
          .from('Thumbnails')
          .remove([
            uploadedThumbnail.fileName,
          ])
      }

      alert(
        `영상 수정에 실패했습니다: ${
          error.message ??
          '알 수 없는 오류'
        }`
      )
    } finally {
      setSavingVideo(false)
    }
  }

  // =========================
  // 영상 삭제
  // =========================

  const deleteVideo = async (
    id
  ) => {
    const confirmed =
      window.confirm(
        '이 영상을 삭제하시겠습니까? 되돌릴 수 없습니다.'
      )

    if (!confirmed) {
      return
    }

    const video =
      videos.find(
        (v) => v.id === id
      )

    if (!video) {
      return
    }

    const {
      error,
    } = await supabase
      .from('videos')
      .delete()
      .eq('id', id)

    if (error) {
      console.error(
        '영상 삭제 실패:',
        error
      )

      alert(
        '영상 삭제에 실패했습니다.'
      )

      return
    }

    // Storage 영상 삭제
    if (video.video_url) {
      const path =
        getStoragePath(
          video.video_url,
          'Videos'
        )

      if (path) {
        await supabase.storage
          .from('Videos')
          .remove([path])
      }
    }

    // Storage 썸네일 삭제
    if (video.thumbnail_url) {
      const path =
        getStoragePath(
          video.thumbnail_url,
          'Thumbnails'
        )

      if (path) {
        await supabase.storage
          .from('Thumbnails')
          .remove([path])
      }
    }

    setVideos((prev) =>
      prev.filter(
        (v) => v.id !== id
      )
    )

    if (editingId === id) {
      cancelEditing()
    }
  }

  // =========================
  // 화면
  // =========================

  return (
    <div className="admin-page">

      <div className="admin-header">

        <h1>
          관리자 페이지
        </h1>

        <button
          className="back-button"
          onClick={onClose}
        >
          ← 홈으로
        </button>

      </div>


      {/* =========================
          탭
      ========================= */}

      <div className="admin-tabs">

        <button
          className={
            activeTab ===
            'members'
              ? 'active'
              : ''
          }
          onClick={() =>
            setActiveTab(
              'members'
            )
          }
        >
          회원 관리
        </button>

        <button
          className={
            activeTab ===
            'videos'
              ? 'active'
              : ''
          }
          onClick={() =>
            setActiveTab(
              'videos'
            )
          }
        >
          영상 관리
        </button>

      </div>


      {/* =========================
          회원 관리
      ========================= */}

      {activeTab ===
        'members' && (

        loadingProfiles ? (

          <p>
            불러오는 중...
          </p>

        ) : (

          <table className="admin-table">

            <thead>

              <tr>

                <th>
                  닉네임
                </th>

                <th>
                  이메일
                </th>

                <th>
                  가입일
                </th>

                <th>
                  상태
                </th>

                <th>
                  역할
                </th>

                <th>
                  작업
                </th>

              </tr>

            </thead>

            <tbody>

              {profiles.map(
                (profile) => (

                  <tr
                    key={
                      profile.id
                    }
                  >

                    <td>

                      {editingNicknameId ===
                      profile.id ? (

                        <div
                          style={{
                            display:
                              'flex',
                            gap:
                              '6px',
                          }}
                        >

                          <input
                            type="text"
                            value={
                              editNickname
                            }
                            onChange={(
                              e
                            ) =>
                              setEditNickname(
                                e
                                  .target
                                  .value
                              )
                            }
                          />

                          <button
                            className="approve-button"
                            onClick={() =>
                              saveNickname(
                                profile.id
                              )
                            }
                          >
                            저장
                          </button>

                          <button
                            className="reject-button"
                            onClick={
                              cancelEditingNickname
                            }
                          >
                            취소
                          </button>

                        </div>

                      ) : (

                        <span
                          onClick={() =>
                            startEditingNickname(
                              profile
                            )
                          }
                          style={{
                            cursor:
                              'pointer',
                          }}
                        >
                          {profile.nickname ??
                            '-'}{' '}
                          ✏️
                        </span>

                      )}

                    </td>

                    <td>
                      {profile.email}
                    </td>

                    <td>
                      {new Date(
                        profile.created_at
                      ).toLocaleDateString(
                        'ko-KR'
                      )}
                    </td>

                    <td>

                      <span
                        className={`status-badge status-${profile.status}`}
                      >
                        {
                          profile.status
                        }
                      </span>

                    </td>

                    <td>

                      <select
                        value={
                          profile.role
                        }
                        onChange={(
                          e
                        ) =>
                          updateRole(
                            profile.id,
                            e.target
                              .value
                          )
                        }
                      >

                        <option value="user">
                          user
                        </option>

                        <option value="creator">
                          creator
                        </option>

                        <option value="admin">
                          admin
                        </option>

                      </select>

                    </td>

                    <td>

                      {profile.status ===
                        'pending' && (
                        <>

                          <button
                            className="approve-button"
                            onClick={() =>
                              updateStatus(
                                profile.id,
                                'approved'
                              )
                            }
                          >
                            승인
                          </button>

                          <button
                            className="reject-button"
                            onClick={() =>
                              updateStatus(
                                profile.id,
                                'rejected'
                              )
                            }
                          >
                            거절
                          </button>

                        </>
                      )}

                      {profile.status ===
                        'approved' && (

                        <button
                          className="reject-button"
                          onClick={() =>
                            updateStatus(
                              profile.id,
                              'rejected'
                            )
                          }
                        >
                          정지
                        </button>

                      )}

                      {profile.status ===
                        'rejected' && (

                        <button
                          className="approve-button"
                          onClick={() =>
                            updateStatus(
                              profile.id,
                              'approved'
                            )
                          }
                        >
                          재승인
                        </button>

                      )}

                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        )
      )}


      {/* =========================
          영상 관리
      ========================= */}

      {activeTab ===
        'videos' && (

        loadingVideos ? (

          <p>
            불러오는 중...
          </p>

        ) : (

          <>

            <table className="admin-table">

              <thead>

                <tr>

                  <th>
                    제목
                  </th>

                  <th>
                    유형
                  </th>

                  <th>
                    카테고리
                  </th>

                  <th>
                    조회수
                  </th>

                  <th>
                    업로드일
                  </th>

                  <th>
                    작업
                  </th>

                </tr>

              </thead>

              <tbody>

                {videos.map(
                  (video) => (

                    <tr
                      key={
                        video.id
                      }
                    >

                      <td>
                        {
                          video.title
                        }
                      </td>

                      <td>
                        {video.media_type ===
                        'audio'
                          ? '음악'
                          : '영상'}
                      </td>

                      <td>
                        {
                          video.category ??
                          '전체'
                        }
                      </td>

                      <td>
                        {
                          video.views
                        }
                      </td>

                      <td>
                        {new Date(
                          video.created_at
                        ).toLocaleDateString(
                          'ko-KR'
                        )}
                      </td>

                      <td>

                        {/* =========================
                            수정 버튼
                            선택된 영상만 색상 변경
                        ========================= */}

                       <button
  className={`approve-button ${
    editingId === video.id
      ? 'edit-active'
      : ''
  }`}
  onClick={() =>
    startEditing(video)
  }
>
  수정
</button>

                        <button
                          className="reject-button"
                          onClick={() =>
                            deleteVideo(
                              video.id
                            )
                          }
                        >
                          삭제
                        </button>

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>


            {/* =========================
                영상 수정 패널
            ========================= */}

            {editingId && (

              <div className="video-edit-panel">

                <h2>
                  영상 수정
                </h2>

                <p>
                  영상 정보, 파일, 썸네일을
                  수정할 수 있습니다.
                </p>


                {/* 제목 */}

                <label>
                  제목
                </label>

                <input
                  type="text"
                  value={
                    editTitle
                  }
                  onChange={(
                    e
                  ) =>
                    setEditTitle(
                      e.target
                        .value
                    )
                  }
                />


                {/* 카테고리 */}

                <label>
                  카테고리
                </label>

                <select
                  value={
                    editCategory
                  }
                  onChange={(
                    e
                  ) =>
                    setEditCategory(
                      e.target
                        .value
                    )
                  }
                >

                  <option value="음악">
                    음악
                  </option>

                  <option value="브이로그">
                    브이로그
                  </option>

                  <option value="여행">
                    여행
                  </option>

                  <option value="코미디">
                    코미디
                  </option>

                </select>


                {/* 영상 / 음악 파일 */}

                <label>
                  {videos.find(
                    (v) =>
                      v.id ===
                      editingId
                  )?.media_type ===
                  'audio'
                    ? '음악 파일 교체'
                    : '동영상 파일 교체'}
                </label>

                <input
                  type="file"
                  accept={
                    videos.find(
                      (v) =>
                        v.id ===
                        editingId
                    )?.media_type ===
                    'audio'
                      ? 'audio/*'
                      : 'video/*'
                  }
                  onChange={(
                    e
                  ) =>
                    setEditMediaFile(
                      e.target
                        .files?.[0] ??
                        null
                    )
                  }
                />

                {editMediaFile && (

                  <p>
                    선택한 파일:{' '}
                    {
                      editMediaFile.name
                    }
                  </p>

                )}


                {/* 썸네일 */}

                <label>
                  썸네일 교체
                </label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={(
                    e
                  ) =>
                    setEditThumbnailFile(
                      e.target
                        .files?.[0] ??
                        null
                    )
                  }
                />

                {editThumbnailFile && (

                  <p>
                    선택한 썸네일:{' '}
                    {
                      editThumbnailFile.name
                    }
                  </p>

                )}


                {/* 설명 / 가사 */}

                <label>
                  설명 / 가사
                </label>

                <textarea
                  value={
                    editDescription
                  }
                  onChange={(
                    e
                  ) =>
                    setEditDescription(
                      e.target
                        .value
                    )
                  }
                  placeholder="설명이나 가사를 입력하세요 (선택사항)"
                  rows="8"
                />


                {/* 버튼 */}

                <div className="video-edit-buttons">

                  <button
                    className="approve-button"
                    onClick={() =>
                      saveEditing(
                        editingId
                      )
                    }
                    disabled={
                      savingVideo
                    }
                  >
                    {savingVideo
                      ? '저장 중...'
                      : '저장'}
                  </button>

                  <button
                    className="reject-button"
                    onClick={
                      cancelEditing
                    }
                    disabled={
                      savingVideo
                    }
                  >
                    취소
                  </button>

                </div>

              </div>

            )}

          </>

        )
      )}

    </div>
  )
}

export default Admin