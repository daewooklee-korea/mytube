import { useEffect, useState } from 'react'
import { supabase } from './supabase'

function Admin({ onClose }) {
  const [activeTab, setActiveTab] = useState('members')

  // 회원
  const [profiles, setProfiles] = useState([])
  const [loadingProfiles, setLoadingProfiles] = useState(true)

  // 영상
  const [videos, setVideos] = useState([])
  const [loadingVideos, setLoadingVideos] = useState(true)

  // 영상 수정
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editCategory, setEditCategory] = useState('전체')
  const [editDescription, setEditDescription] = useState('')

  // 닉네임 수정
  const [editingNicknameId, setEditingNicknameId] = useState(null)
  const [editNickname, setEditNickname] = useState('')

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
      .order('created_at', { ascending: false })

    if (error) {
      console.error('회원 목록 불러오기 실패:', error)
      alert('회원 목록을 불러오지 못했습니다.')
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

    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('영상 목록 불러오기 실패:', error)
      alert('영상 목록을 불러오지 못했습니다.')
      setLoadingVideos(false)
      return
    }

    setVideos(data)
    setLoadingVideos(false)
  }

  // =========================
  // 회원 상태 변경
  // =========================

  const updateStatus = async (id, newStatus) => {
    const { error } = await supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('id', id)

    if (error) {
      console.error('상태 변경 실패:', error)
      alert('상태 변경에 실패했습니다.')
      return
    }

    setProfiles((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, status: newStatus }
          : p
      )
    )
  }

  // =========================
  // 회원 역할 변경
  // =========================

  const updateRole = async (id, newRole) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', id)

    if (error) {
      console.error('역할 변경 실패:', error)
      alert('역할 변경에 실패했습니다.')
      return
    }

    setProfiles((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, role: newRole }
          : p
      )
    )
  }

  // =========================
  // 닉네임 수정
  // =========================

  const startEditingNickname = (profile) => {
    setEditingNicknameId(profile.id)
    setEditNickname(profile.nickname ?? '')
  }

  const cancelEditingNickname = () => {
    setEditingNicknameId(null)
    setEditNickname('')
  }

  const saveNickname = async (id) => {
    if (!editNickname.trim()) {
      alert('닉네임을 입력해주세요.')
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        nickname: editNickname.trim(),
      })
      .eq('id', id)

    if (error) {
      console.error('닉네임 변경 실패:', error)
      alert('닉네임 변경에 실패했습니다.')
      return
    }

    setProfiles((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              nickname: editNickname.trim(),
            }
          : p
      )
    )

    cancelEditingNickname()
  }

  // =========================
  // 영상 수정 시작
  // =========================

  const startEditing = (video) => {
    setEditingId(video.id)
    setEditTitle(video.title ?? '')
    setEditCategory(video.category ?? '전체')
    setEditDescription(video.description ?? '')
  }

  // =========================
  // 영상 수정 취소
  // =========================

  const cancelEditing = () => {
    setEditingId(null)
    setEditTitle('')
    setEditCategory('전체')
    setEditDescription('')
  }

  // =========================
  // 영상 수정 저장
  // =========================

  const saveEditing = async (id) => {
    if (!editTitle.trim()) {
      alert('제목을 입력해주세요.')
      return
    }

    const cleanedTitle = editTitle.trim()
    const cleanedDescription =
      editDescription.trim() || null

    const { error } = await supabase
      .from('videos')
      .update({
        title: cleanedTitle,
        category: editCategory,
        description: cleanedDescription,
      })
      .eq('id', id)

    if (error) {
      console.error('영상 수정 실패:', error)
      alert('영상 수정에 실패했습니다.')
      return
    }

    setVideos((prev) =>
      prev.map((v) =>
        v.id === id
          ? {
              ...v,
              title: cleanedTitle,
              category: editCategory,
              description: cleanedDescription,
            }
          : v
      )
    )

    alert('영상 정보가 수정되었습니다.')

    cancelEditing()
  }

  // =========================
  // 영상 삭제
  // =========================

  const deleteVideo = async (id) => {
    const confirmed = window.confirm(
      '이 영상을 삭제하시겠습니까? 되돌릴 수 없습니다.'
    )

    if (!confirmed) return

    const { error } = await supabase
      .from('videos')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('영상 삭제 실패:', error)
      alert('영상 삭제에 실패했습니다.')
      return
    }

    setVideos((prev) =>
      prev.filter((v) => v.id !== id)
    )

    if (editingId === id) {
      cancelEditing()
    }
  }

  // 현재 수정 중인 영상
  const editingVideo =
    videos.find((video) => video.id === editingId) ?? null

  // =========================
  // 화면
  // =========================

  return (
    <div className="admin-page">

      {/* 관리자 헤더 */}
      <div className="admin-header">

        <h1>관리자 페이지</h1>

        <button
          className="back-button"
          onClick={onClose}
        >
          ← 홈으로
        </button>

      </div>

      {/* 탭 */}
      <div className="admin-tabs">

        <button
          className={
            activeTab === 'members'
              ? 'active'
              : ''
          }
          onClick={() => {
            setActiveTab('members')
            cancelEditing()
          }}
        >
          회원 관리
        </button>

        <button
          className={
            activeTab === 'videos'
              ? 'active'
              : ''
          }
          onClick={() => {
            setActiveTab('videos')
            cancelEditing()
          }}
        >
          영상 관리
        </button>

      </div>

      {/* ================================= */}
      {/* 회원 관리 */}
      {/* ================================= */}

      {activeTab === 'members' && (

        loadingProfiles ? (

          <p>불러오는 중...</p>

        ) : (

          <div
            style={{
              width: '100%',
              overflowX: 'auto',
            }}
          >

            <table className="admin-table">

              <thead>

                <tr>
                  <th>닉네임</th>
                  <th>이메일</th>
                  <th>가입일</th>
                  <th>상태</th>
                  <th>역할</th>
                  <th>작업</th>
                </tr>

              </thead>

              <tbody>

                {profiles.map((profile) => (

                  <tr key={profile.id}>

                    {/* 닉네임 */}
                    <td>

                      {editingNicknameId === profile.id ? (

                        <div
                          style={{
                            display: 'flex',
                            gap: '6px',
                          }}
                        >

                          <input
                            type="text"
                            value={editNickname}
                            onChange={(e) =>
                              setEditNickname(
                                e.target.value
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
                            cursor: 'pointer',
                          }}
                        >
                          {profile.nickname ?? '-'} ✏️
                        </span>

                      )}

                    </td>

                    {/* 이메일 */}
                    <td>
                      {profile.email}
                    </td>

                    {/* 가입일 */}
                    <td>
                      {new Date(
                        profile.created_at
                      ).toLocaleDateString(
                        'ko-KR'
                      )}
                    </td>

                    {/* 상태 */}
                    <td>

                      <span
                        className={`status-badge status-${profile.status}`}
                      >
                        {profile.status}
                      </span>

                    </td>

                    {/* 역할 */}
                    <td>

                      <select
                        value={profile.role}
                        onChange={(e) =>
                          updateRole(
                            profile.id,
                            e.target.value
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

                    {/* 작업 */}
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

                ))}

              </tbody>

            </table>

          </div>

        )

      )}

      {/* ================================= */}
      {/* 영상 관리 */}
      {/* ================================= */}

      {activeTab === 'videos' && (

        loadingVideos ? (

          <p>불러오는 중...</p>

        ) : (

          <>

            {/* 영상 테이블 */}

            <div
              style={{
                width: '100%',
                overflowX: 'auto',
              }}
            >

              <table className="admin-table">

                <thead>

                  <tr>
                    <th>제목</th>
                    <th>유형</th>
                    <th>카테고리</th>
                    <th>조회수</th>
                    <th>업로드일</th>
                    <th>작업</th>
                  </tr>

                </thead>

                <tbody>

                  {videos.map((video) => (

                    <tr key={video.id}>

                      {/* 제목 */}
                      <td>
                        {video.title}
                      </td>

                      {/* 유형 */}
                      <td>
                        {video.media_type ===
                        'audio'
                          ? '음악'
                          : '영상'}
                      </td>

                      {/* 카테고리 */}
                      <td>
                        {video.category ??
                          '전체'}
                      </td>

                      {/* 조회수 */}
                      <td>
                        {video.views}
                      </td>

                      {/* 업로드일 */}
                      <td>
                        {new Date(
                          video.created_at
                        ).toLocaleDateString(
                          'ko-KR'
                        )}
                      </td>

                      {/* 작업 */}
                      <td>

                        <button
                          className="approve-button"
                          onClick={() =>
                            startEditing(video)
                          }
                        >
                          {editingId === video.id
                            ? '수정 중'
                            : '수정'}
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

                  ))}

                </tbody>

              </table>

            </div>

            {/* ================================= */}
            {/* 영상 수정 패널 */}
            {/* ================================= */}

            {editingVideo && (

              <div className="video-edit-panel">

                <h2>
                  {editingVideo.media_type ===
                  'audio'
                    ? '음악 수정'
                    : '영상 수정'}
                </h2>

                <p
                  style={{
                    marginBottom: '20px',
                    color: '#777',
                  }}
                >
                  {editingVideo.media_type ===
                  'audio'
                    ? '음악 정보와 가사를 수정할 수 있습니다.'
                    : '영상 정보와 설명을 수정할 수 있습니다.'}
                </p>

                {/* 제목 */}

                <label>
                  제목
                </label>

                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) =>
                    setEditTitle(
                      e.target.value
                    )
                  }
                />

                {/* 카테고리 */}

                <label>
                  카테고리
                </label>

                <select
                  value={editCategory}
                  onChange={(e) =>
                    setEditCategory(
                      e.target.value
                    )
                  }
                >

                  <option value="전체">
                    전체
                  </option>

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

                {/* 설명 / 가사 */}

                <label>
                  {editingVideo.media_type ===
                  'audio'
                    ? '가사'
                    : '영상 설명'}
                </label>

                <textarea
                  value={editDescription}
                  onChange={(e) =>
                    setEditDescription(
                      e.target.value
                    )
                  }
                  placeholder={
                    editingVideo.media_type ===
                    'audio'
                      ? '가사를 입력하세요 (선택사항)'
                      : '영상 설명을 입력하세요 (선택사항)'
                  }
                  rows={8}
                />

                {/* 버튼 */}

                <div
                  className="video-edit-buttons"
                >

                  <button
                    className="approve-button"
                    onClick={() =>
                      saveEditing(
                        editingVideo.id
                      )
                    }
                  >
                    저장
                  </button>

                  <button
                    className="reject-button"
                    onClick={cancelEditing}
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