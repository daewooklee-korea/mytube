import { useEffect, useState } from 'react'
import './App.css'
import Upload from './Upload'
import Login from './Login'
import { supabase } from './supabase'
import Admin from './Admin'

function App() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [showAdmin, setShowAdmin] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState(null)
  const [showUpload, setShowUpload] = useState(false)

  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)

  const [commentText, setCommentText] = useState('')
  const [comments, setComments] = useState([])

  const [videos, setVideos] = useState([])
  const [searchText, setSearchText] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('전체')

  // 로그인 상태 확인
useEffect(() => {
  checkUser()

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      if (!session?.user) {
        setUser(null)
      }
    }
  )

  return () => {
    subscription.unsubscribe()
  }
}, [])

  const checkUser = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    setUser(null)
    return
  }

  const { data: profile, error } =
  await supabase
    .from('profiles')
    .select('status, role, nickname')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    await supabase.auth.signOut()
    setUser(null)
    return
  }

  if (profile.status === 'pending') {
    await supabase.auth.signOut()
    setUser(null)
    alert('관리자 승인 대기 중입니다.')
    return
  }

  if (profile.status === 'rejected') {
    await supabase.auth.signOut()
    setUser(null)
    alert('가입이 승인되지 않았습니다.')
    return
  }

  setProfile(profile)
  console.log('현재 profile:', profile)
  setUser(user)
}

  // Supabase에서 영상 목록 가져오기
  useEffect(() => {
    if (user) {
      loadVideos()
    }
  }, [user])

 const loadVideos = async () => {
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error(
      '영상 목록 불러오기 실패:',
      error
    )
    return
  }

  // 전체 좋아요 목록 불러와서 영상별로 개수 세기
  const { data: likesData, error: likesError } = await supabase
    .from('likes')
    .select('video_id')

  if (likesError) {
    console.error('좋아요 불러오기 실패:', likesError)
  }

  const likeCounts = {}
  ;(likesData ?? []).forEach((like) => {
    likeCounts[like.video_id] = (likeCounts[like.video_id] ?? 0) + 1
  })

  // 업로더 닉네임 불러오기
const { data: profilesData, error: profilesError } = await supabase
  .rpc('get_public_profiles')

  if (profilesError) {
    console.error('업로더 정보 불러오기 실패:', profilesError)
  }

  const nicknameMap = {}
  ;(profilesData ?? []).forEach((p) => {
    nicknameMap[p.id] = p.nickname
  })

  const formattedVideos = data.map((video) => ({
    id: video.id,
    title: video.title,
    views: `조회수 ${video.views}회`,
    rawViews: video.views,
    time: formatTime(video.created_at),
    video: video.video_url,
    thumbnail: video.thumbnail_url,
    likeCount: likeCounts[video.id] ?? 0,
    uploaderNickname: nicknameMap[video.user_id] ?? '알 수 없음',
    category: video.category,
  }))

  setVideos(formattedVideos)
}

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()

    const diff = Math.floor(
      (now - date) / 1000
    )

    if (diff < 60) {
      return '방금 전'
    }

    if (diff < 3600) {
      return `${Math.floor(diff / 60)}분 전`
    }

    if (diff < 86400) {
      return `${Math.floor(diff / 3600)}시간 전`
    }

    return `${Math.floor(diff / 86400)}일 전`
  }

  const handleVideoClick = async (video) => {
  if (!video.video) return

  setSelectedVideo(video)
  setCommentText('')
  setComments([])

   // 조회수 DB에서 증가 (RPC 함수 호출)
  const { error } = await supabase.rpc('increment_view_count', {
    video_id: video.id,
  })

  if (error) {
    console.error('조회수 업데이트 실패:', error)
  } else {
    const newViews = video.rawViews + 1

    setVideos((prev) =>
      prev.map((v) =>
        v.id === video.id
          ? { ...v, views: `조회수 ${newViews}회`, rawViews: newViews }
          : v
      )
    )

    setSelectedVideo((prev) =>
      prev ? { ...prev, views: `조회수 ${newViews}회` } : prev
    )
  }

    // 좋아요 정보 불러오기
  loadLikes(video.id)

  // 댓글 불러오기
  loadComments(video.id)
}

const loadLikes = async (videoId) => {
  const { data: { user } } = await supabase.auth.getUser()

  // 전체 좋아요 개수
  const { count } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('video_id', videoId)

  setLikeCount(count ?? 0)

  // 내가 눌렀는지 확인
  const { data: myLike } = await supabase
    .from('likes')
    .select('id')
    .eq('video_id', videoId)
    .eq('user_id', user.id)
    .maybeSingle()

  setLiked(!!myLike)
}
const loadComments = async (videoId) => {
  const { data, error } = await supabase
    .from('comments')
    .select('id, content, user_nickname, created_at')
    .eq('video_id', videoId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('댓글 불러오기 실패:', error)
    return
  }

  setComments(data)
}
 

  const handleLike = async () => {
  const { data: { user } } = await supabase.auth.getUser()

  if (liked) {
    // 좋아요 취소
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('video_id', selectedVideo.id)
      .eq('user_id', user.id)

    if (error) {
      console.error('좋아요 취소 실패:', error)
      return
    }

    setLiked(false)
    setLikeCount((prev) => prev - 1)
    setVideos((prev) =>
      prev.map((v) =>
        v.id === selectedVideo.id
          ? { ...v, likeCount: v.likeCount - 1 }
          : v
      )
    )
  } else {
    // 좋아요 추가
    const { error } = await supabase
      .from('likes')
      .insert({ video_id: selectedVideo.id, user_id: user.id })

    if (error) {
      console.error('좋아요 추가 실패:', error)
      return
    }

     setLiked(true)
    setLikeCount((prev) => prev + 1)
    setVideos((prev) =>
      prev.map((v) =>
        v.id === selectedVideo.id
          ? { ...v, likeCount: v.likeCount + 1 }
          : v
      )
    )
  }
}

 const handleComment = async () => {
  if (!commentText.trim()) {
    return
  }

  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
  .from('comments')
  .insert({
    video_id: selectedVideo.id,
    user_id: user.id,
    user_nickname: profile.nickname,
    content: commentText,
  })
  .select()
  .single()

  if (error) {
    console.error('댓글 등록 실패:', error)
    alert('댓글 등록에 실패했습니다.')
    return
  }

  setComments([...comments, data])
  setCommentText('')
}

  const handleUpload = (newVideo) => {
    setVideos([
      newVideo,
      ...videos,
    ])

    setShowUpload(false)
  }

const handleLogout = async () => {
  await supabase.auth.signOut()

  setUser(null)
  setProfile(null)
  setSelectedVideo(null)
  setShowUpload(false)
  setShowAdmin(false)
}

  // 로그인하지 않은 경우
 if (!user) {
  return (
    <Login
      onLogin={() => {
        checkUser()
      }}
    />
  )
}
const filteredVideos = videos.filter((video) => {
  const matchesSearch = video.title
    .toLowerCase()
    .includes(searchText.toLowerCase())

  const matchesCategory =
    selectedCategory === '전체' || video.category === selectedCategory

  return matchesSearch && matchesCategory
})
console.log('전체 videos:', videos)
console.log('선택된 카테고리:', selectedCategory)
console.log('필터링 결과:', filteredVideos)
  return (
  <div className="app">

    {showAdmin ? (

      <Admin onClose={() => setShowAdmin(false)} />

    ) : showUpload ? (

      <Upload onUpload={handleUpload} />

    ) : selectedVideo ? (

        <>
          <header className="header">

            <div
  className="logo"
  onClick={() => setSelectedVideo(null)}
  style={{ cursor: 'pointer' }}
>
  <svg width="24" height="24" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="1" width="30" height="30" rx="9" fill="#1a1a1a" />
    <path d="M13 10.5L22 16L13 21.5V10.5Z" fill="#ffffff" />
  </svg>
  PlayMe
</div>

<div className="user-area">

  {profile?.role === 'admin' && (
    <button
      className="admin-button"
      onClick={() => setShowAdmin(true)}
    >
      관리자
    </button>
  )}

  <span>
    {user.email}
  </span>

  <button
    className="login"
    onClick={handleLogout}
  >
    로그아웃
  </button>

</div>

          </header>

          <main className="watch-page">

            <button
              className="back-button"
              onClick={() =>
                setSelectedVideo(null)
              }
            >
              ← 홈으로
            </button>

            <div className="player">

              <video
                src={selectedVideo.video}
                controls
                autoPlay
                playsInline
              />

            </div>

            <h1>
              {selectedVideo.title}
            </h1>

            <p>
  {selectedVideo.uploaderNickname}
</p>

            <p>
  {selectedVideo.views} ·{' '}
  {selectedVideo.time}
</p>

            <div className="actions">

              <button
                onClick={handleLike}
              >
                {liked
                  ? '❤️ 좋아요 취소'
                  : '👍 좋아요'
                } {likeCount}
              </button>

              <button>
                ↗ 공유
              </button>

            </div>

            <section className="comments">

              <h2>
                댓글 {comments.length}개
              </h2>

              <div className="comment-input">

                <input
                  type="text"
                  value={commentText}
                  onChange={(e) =>
                    setCommentText(
                      e.target.value
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleComment()
                    }
                  }}
                  placeholder="댓글을 입력하세요..."
                />

                <button
                  onClick={handleComment}
                >
                  댓글 등록
                </button>

              </div>

           <div className="comment-list">

  {comments.map(
    (comment) => (

      <div
        className="comment"
        key={comment.id}
      >

        <div className="comment-avatar">
          {comment.user_nickname?.[0]?.toUpperCase()}
        </div>

        <div>

          <strong>
            {comment.user_nickname}
          </strong>

          <p>
            {comment.content}
          </p>

        </div>

      </div>

    )
  )}

</div>

            </section>

          </main>
        </>

      ) : (

        <>

          <header className="header">

           <div className="logo">
  <svg width="24" height="24" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="1" width="30" height="30" rx="9" fill="#1a1a1a" />
    <path d="M13 10.5L22 16L13 21.5V10.5Z" fill="#ffffff" />
  </svg>
  PlayMe
</div>

           <div className="search">

  <input
    type="text"
    placeholder="검색"
    value={searchText}
    onChange={(e) =>
      setSearchText(e.target.value)
    }
  />

  <button>
    🔍
  </button>

</div>

           <div className="user-area">
  {profile?.role === 'admin' && (
    <button className="admin-button" onClick={() => setShowAdmin(true)}>
      관리자
    </button>
  )}
  <span>{user.email}</span>
  <button className="login" onClick={handleLogout}>
    로그아웃
  </button>
</div>

{(profile?.role === 'creator' || profile?.role === 'admin') && (
  <button
    className="upload-button"
    onClick={() =>
      setShowUpload(true)
    }
  >
    ＋ 업로드
  </button>
)}

          </header>

          <nav className="menu">

  {['전체', '음악', '브이로그', '여행', '코미디'].map((category) => (
    <button
      key={category}
      onClick={() => setSelectedCategory(category)}
      className={
        selectedCategory === category ? 'active' : ''
      }
    >
      {category}
    </button>
  ))}

</nav>

          <main className="content">


            <div className="video-grid">

            {filteredVideos.map(
                (video) => (

                  <div
                    className="video-card"
                    key={video.id}
                    onClick={() =>
                      handleVideoClick(
                        video
                      )
                    }
                    style={{
                      cursor:
                        video.video
                          ? 'pointer'
                          : 'default',
                    }}
                  >

                    <div className="thumbnail">

                      {video.thumbnail ? (

                        <img
                          src={video.thumbnail}
                          alt={video.title}
                        />

                      ) : (

                        <video
                          src={video.video}
                          muted
                        />

                      )}

                      <span>
                        ▶
                      </span>

                    </div>

              <div className="video-info">

  <div className="video-info-top">
    <h3>
      {video.title}
    </h3>

    <span className="category-badge">
      {video.category}
    </span>
  </div>

  <p>
    {video.uploaderNickname} · {video.views} · {video.time} · ❤️ {video.likeCount}
  </p>

</div>

                  </div>

                )
              )}

            </div>

          </main>

        </>

      )}

    </div>
  )
}

export default App