import { useEffect, useState } from 'react'
import './App.css'
import Upload from './Upload'
import Login from './Login'
import { supabase } from './supabase'
import Admin from './Admin'

const menuIcons = {
  home: '⌂',
  video: '▶',
  music: '♫',
  'book-open': '▤',
  playground: '✦',
  library: '▣',
}

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
  const [menus, setMenus] = useState([])
  const [loadingMenus, setLoadingMenus] = useState(false)
  const [selectedMenu, setSelectedMenu] = useState(null)
  const [currentRoute, setCurrentRoute] = useState('/')
  const [recentlyPlayedIds, setRecentlyPlayedIds] = useState([])

  // =========================
  // 로그인 상태 확인
  // =========================

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

  // =========================
  // 영상 목록
  // =========================

  useEffect(() => {
  if (user && profile?.role) {
    loadMenus()
    loadVideos()
  }
}, [user, profile?.role])
const loadMenus = async () => {
  console.log('🔥 loadMenus 실행됨')
  if (!profile?.role) return

  setLoadingMenus(true)

  const { data, error } = await supabase
    .from('menus')
    .select(`
      id,
      name,
      parent_id,
      level,
      route,
      icon,
      sort_order,
      is_visible,
      is_active,
      menu_permissions!inner (
        role
      )
    `)
    .eq('is_active', true)
    .eq('is_visible', true)
    .eq('menu_permissions.role', profile.role)
    .order('level', { ascending: true })
    .order('sort_order', { ascending: true })

console.log('메뉴 조회 결과:', { data, error })

  if (error) {
    console.error('메뉴 불러오기 실패:', error)
    setMenus([])
    setLoadingMenus(false)
    console.log('DB 메뉴:', data)
    return
  }

  setMenus(data ?? [])
  setLoadingMenus(false)
}
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

    // 전체 좋아요 목록
    const {
      data: likesData,
      error: likesError,
    } = await supabase
      .from('likes')
.select('video_id, user_id')

    if (likesError) {
      console.error(
        '좋아요 불러오기 실패:',
        likesError
      )
    }

    const likeCounts = {}

    ;(likesData ?? []).forEach((like) => {
      likeCounts[like.video_id] =
        (likeCounts[like.video_id] ?? 0) + 1
    })

    // 업로더 닉네임
    const {
      data: profilesData,
      error: profilesError,
    } = await supabase.rpc(
      'get_public_profiles'
    )

    if (profilesError) {
      console.error(
        '업로더 정보 불러오기 실패:',
        profilesError
      )
    }

    const nicknameMap = {}

    ;(profilesData ?? []).forEach((p) => {
      nicknameMap[p.id] = p.nickname
    })

    const formattedVideos = data.map(
      (video) => ({
        id: video.id,
        userId: video.user_id,
        title: video.title,

        views: `조회수 ${video.views}회`,
        rawViews: video.views,

        time: formatTime(
          video.created_at
        ),

        video: video.video_url,
        thumbnail: video.thumbnail_url,

        likeCount:
          likeCounts[video.id] ?? 0,
isFavorite:
  (likesData ?? []).some(
    (like) =>
      like.video_id === video.id &&
      like.user_id === user.id
  ),
        uploaderNickname:
          nicknameMap[video.user_id] ??
          '알 수 없음',

        category: video.category,

        mediaType:
          video.media_type ?? 'video',

        // ⭐ 설명 / 가사
        description:
          video.description ?? null,
      })
    )

    setVideos(formattedVideos)
  }

  const loadRecentlyPlayed = async () => {
  const { data, error } = await supabase
    .from('play_history')
    .select('video_id, played_at')
    .eq('user_id', user.id)
    .order('played_at', { ascending: false })

  if (error) {
    console.error(
      '최근 재생 기록 불러오기 실패:',
      error
    )
    return
  }

  // 같은 콘텐츠는 가장 최근 기록 하나만 사용
  const uniqueIds = []

  ;(data ?? []).forEach((item) => {
    if (!uniqueIds.includes(item.video_id)) {
      uniqueIds.push(item.video_id)
    }
  })

  setRecentlyPlayedIds(uniqueIds)

  console.log(
    '최근 재생 콘텐츠:',
    uniqueIds
  )
}

useEffect(() => {
  if (currentRoute === '/library/recently-played') {
    loadRecentlyPlayed()
  }
}, [currentRoute])
  // =========================
  // 시간 표시
  // =========================

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
      return `${Math.floor(
        diff / 60
      )}분 전`
    }

    if (diff < 86400) {
      return `${Math.floor(
        diff / 3600
      )}시간 전`
    }

    return `${Math.floor(
      diff / 86400
    )}일 전`
  }

  // =========================
  // 영상 선택
  // =========================

  const handleVideoClick = async (
    video
  ) => {
    if (!video.video) return

    setSelectedVideo(video)
    setCommentText('')
    setComments([])

// 재생 기록 저장
const { error: historyError } =
  await supabase
    .from('play_history')
    .insert({
      user_id: user.id,
      video_id: video.id,
      position: 0,
    })

if (historyError) {
  console.error(
    '재생 기록 저장 실패:',
    historyError
  )
}

    // 조회수 증가
    const { error } =
      await supabase.rpc(
        'increment_view_count',
        {
          video_id: video.id,
        }
      )

    if (error) {
      console.error(
        '조회수 업데이트 실패:',
        error
      )
    } else {
      const newViews =
        video.rawViews + 1

      setVideos((prev) =>
        prev.map((v) =>
          v.id === video.id
            ? {
                ...v,
                views: `조회수 ${newViews}회`,
                rawViews: newViews,
              }
            : v
        )
      )

      setSelectedVideo((prev) =>
        prev
          ? {
              ...prev,
              views: `조회수 ${newViews}회`,
            }
          : prev
      )
    }

    loadLikes(video.id)
    loadComments(video.id)
  }

  // =========================
  // 좋아요
  // =========================

  const loadLikes = async (
    videoId
  ) => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // 전체 좋아요
    const { count } =
      await supabase
        .from('likes')
        .select('*', {
          count: 'exact',
          head: true,
        })
        .eq(
          'video_id',
          videoId
        )

    setLikeCount(count ?? 0)

    // 내가 눌렀는지
    const { data: myLike } =
      await supabase
        .from('likes')
        .select('id')
        .eq(
          'video_id',
          videoId
        )
        .eq(
          'user_id',
          user.id
        )
        .maybeSingle()

    setLiked(!!myLike)
  }

  const handleLike = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (liked) {
      const { error } =
        await supabase
          .from('likes')
          .delete()
          .eq(
            'video_id',
            selectedVideo.id
          )
          .eq(
            'user_id',
            user.id
          )

      if (error) {
        console.error(
          '좋아요 취소 실패:',
          error
        )
        return
      }

      setLiked(false)
      setLikeCount(
        (prev) => prev - 1
      )

      setVideos((prev) =>
        prev.map((v) =>
          v.id === selectedVideo.id
            ? {
                ...v,
                likeCount:
                  v.likeCount - 1,
                  isFavorite: false,
              }
            : v
        )
      )
    } else {
      const { error } =
        await supabase
          .from('likes')
          .insert({
            video_id:
              selectedVideo.id,
            user_id: user.id,
          })

      if (error) {
        console.error(
          '좋아요 추가 실패:',
          error
        )
        return
      }

      setLiked(true)
      setLikeCount(
        (prev) => prev + 1
      )

      setVideos((prev) =>
        prev.map((v) =>
          v.id === selectedVideo.id
            ? {
                ...v,
                likeCount:
                  v.likeCount + 1,
                  isFavorite: true,
              }
            : v
        )
      )
    }
  }

  // =========================
  // 댓글
  // =========================

  const loadComments = async (
    videoId
  ) => {
    const {
      data,
      error,
    } = await supabase
      .from('comments')
      .select(
        'id, content, user_nickname, created_at'
      )
      .eq(
        'video_id',
        videoId
      )
      .order(
        'created_at',
        {
          ascending: true,
        }
      )

    if (error) {
      console.error(
        '댓글 불러오기 실패:',
        error
      )
      return
    }

    setComments(data)
  }

  const handleComment = async () => {
    if (!commentText.trim()) {
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const {
      data,
      error,
    } = await supabase
      .from('comments')
      .insert({
        video_id:
          selectedVideo.id,
        user_id: user.id,
        user_nickname:
          profile.nickname,
        content:
          commentText,
      })
      .select()
      .single()

    if (error) {
      console.error(
        '댓글 등록 실패:',
        error
      )
      alert(
        '댓글 등록에 실패했습니다.'
      )
      return
    }

    setComments([
      ...comments,
      data,
    ])

    setCommentText('')
  }

  // =========================
  // 업로드
  // =========================

  const handleUpload = () => {
    setShowUpload(false)
    loadVideos()
  }

  // =========================
  // 로그아웃
  // =========================

  const handleLogout = async () => {
    await supabase.auth.signOut()

    setUser(null)
    setProfile(null)
    setSelectedVideo(null)
    setShowUpload(false)
    setShowAdmin(false)
  }

  // =========================
  // 로그인 안 된 경우
  // =========================

  if (!user) {
    return (
      <Login
        onLogin={() => {
          checkUser()
        }}
      />
    )
  }

  // =========================
  // 검색 / 카테고리
  // =========================

  const filteredVideos =
  videos.filter((video) => {
    const matchesSearch =
      video.title
        .toLowerCase()
        .includes(
          searchText.toLowerCase()
        )

    const matchesCategory =
      selectedCategory === '전체' ||
      video.category === selectedCategory

    const matchesMediaType =
      currentRoute === '/music'
        ? video.mediaType === 'audio'
        : currentRoute === '/video'
          ? video.mediaType !== 'audio'
          : true

    const matchesFavorites =
      currentRoute === '/library/favorites'
        ? video.isFavorite
        : true

    const matchesRecentlyPlayed =
      currentRoute === '/library/recently-played'
        ? recentlyPlayedIds.includes(video.id)
        : true

    const matchesMyMedia =
      currentRoute === '/library/my-media'
        ? video.userId === user.id
        : true

    return (
      matchesSearch &&
      matchesCategory &&
      matchesMediaType &&
      matchesMyMedia &&
      matchesFavorites &&
      matchesRecentlyPlayed
    )
  })
const displayedVideos =
  currentRoute === '/library/recently-played'
    ? [...filteredVideos].sort(
        (a, b) =>
          recentlyPlayedIds.indexOf(a.id) -
          recentlyPlayedIds.indexOf(b.id)
      )
    : filteredVideos
  // =========================
  // 화면
  // =========================

  return (
    <div className="app">

      {/* =========================
          관리자
      ========================= */}

      {showAdmin ? (

        <Admin
          onClose={() => {
            setShowAdmin(false)
            loadVideos()
          }}
        />

      ) : showUpload ? (

        <Upload
          onUpload={handleUpload}
        />

      ) : selectedVideo ? (

        /* =========================
           재생 페이지
        ========================= */

        <>
          <header className="header">

            <div
              className="logo"
              onClick={() =>
                setSelectedVideo(null)
              }
              style={{
                cursor: 'pointer',
              }}
            >

              <svg
                width="24"
                height="24"
                viewBox="0 0 32 32"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  x="1"
                  y="1"
                  width="30"
                  height="30"
                  rx="9"
                  fill="#1a1a1a"
                />

                <path
                  d="M13 10.5L22 16L13 21.5V10.5Z"
                  fill="#ffffff"
                />
              </svg>

              PlayMe

            </div>

            <div className="user-area">

              {profile?.role ===
                'admin' && (

                <button
                  className="admin-button"
                  onClick={() =>
                    setShowAdmin(true)
                  }
                >
                  관리자
                </button>

              )}

              <span>
                {user.email}
              </span>

              <button
                className="login"
                onClick={
                  handleLogout
                }
              >
                로그아웃
              </button>

            </div>

          </header>

          <main className="watch-page">

            <button
              className="back-button"
              onClick={() =>
                setSelectedVideo(
                  null
                )
              }
            >
              ← 홈으로
            </button>

            {/* =========================
                플레이어
            ========================= */}

            <div className="player">

              {selectedVideo.mediaType ===
              'audio' ? (

                /*
                 * 음악
                 * 썸네일을 표시하지 않음
                 */

                <div className="audio-player">

                  <audio
                    src={
                      selectedVideo.video
                    }
                    controls
                    autoPlay
                    playsInline
                  />

                </div>

              ) : (

                /*
                 * 영상
                 */

                <video
                  src={
                    selectedVideo.video
                  }
                  controls
                  autoPlay
                  playsInline
                />

              )}

            </div>

            {/* 제목 */}

            <h1>
              {selectedVideo.title}
            </h1>

            {/* 업로더 */}

            <p>
              {selectedVideo.uploaderNickname}
            </p>

            {/* 조회수 */}

            <p>
              {selectedVideo.views}
              {' · '}
              {selectedVideo.time}
            </p>

            {/* 좋아요 / 공유 */}

            <div className="actions">

              <button
                onClick={
                  handleLike
                }
              >
                {liked
                  ? '❤️ 좋아요 취소'
                  : '👍 좋아요'}{' '}
                {likeCount}
              </button>

              <button>
                ↗ 공유
              </button>

            </div>

            {/* =========================
                설명 / 가사
            ========================= */}

            {selectedVideo.description && (

              <section className="description-section">

                <h2>
                  {selectedVideo.mediaType ===
                  'audio'
                    ? '가사'
                    : '영상 설명'}
                </h2>

                <div className="description-box">

                  {selectedVideo.description
                    .split('\n')
                    .map(
                      (
                        line,
                        index
                      ) => (
                        <p
                          key={
                            index
                          }
                        >
                          {line ||
                            '\u00A0'}
                        </p>
                      )
                    )}

                </div>

              </section>

            )}

            {/* =========================
                댓글
            ========================= */}

            <section className="comments">

              <h2>
                댓글 {comments.length}개
              </h2>

              <div className="comment-input">

                <input
                  type="text"
                  value={
                    commentText
                  }
                  onChange={(e) =>
                    setCommentText(
                      e.target.value
                    )
                  }
                  onKeyDown={(e) => {
                    if (
                      e.key ===
                      'Enter'
                    ) {
                      handleComment()
                    }
                  }}
                  placeholder="댓글을 입력하세요..."
                />

                <button
                  onClick={
                    handleComment
                  }
                >
                  댓글 등록
                </button>

              </div>

              <div className="comment-list">

                {comments.map(
                  (comment) => (

                    <div
                      className="comment"
                      key={
                        comment.id
                      }
                    >

                      <div className="comment-avatar">
                        {comment
                          .user_nickname?.[0]
                          ?.toUpperCase()}
                      </div>

                      <div>

                        <strong>
                          {
                            comment.user_nickname
                          }
                        </strong>

                        <p>
                          {
                            comment.content
                          }
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

        /* =========================
           홈
        ========================= */

        <>

          <header className="header">

            <div className="logo">

              <svg
                width="24"
                height="24"
                viewBox="0 0 32 32"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  x="1"
                  y="1"
                  width="30"
                  height="30"
                  rx="9"
                  fill="#1a1a1a"
                />

                <path
                  d="M13 10.5L22 16L13 21.5V10.5Z"
                  fill="#ffffff"
                />
              </svg>

              PlayMe

            </div>

            <div className="search">

              <input
                type="text"
                placeholder="검색"
                value={
                  searchText
                }
                onChange={(e) =>
                  setSearchText(
                    e.target.value
                  )
                }
              />

              <button>
                🔍
              </button>

            </div>

            <div className="user-area">

              {profile?.role ===
                'admin' && (

                <button
                  className="admin-button"
                  onClick={() =>
                    setShowAdmin(true)
                  }
                >
                  관리자
                </button>

              )}

              <span>
                {user.email}
              </span>

              <button
                className="login"
                onClick={
                  handleLogout
                }
              >
                로그아웃
              </button>

            </div>

            {(profile?.role ===
              'creator' ||
              profile?.role ===
                'admin') && (

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

          {/* =========================
              카테고리
          ========================= */}

          {/* =========================
    PlayMe Navigation
========================= */}

<nav className="main-menu">
  {menus
    .filter((menu) => menu.level === 1)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((menu) => {
      const isSelected =
        selectedMenu?.id === menu.id

      return (
        <button
          key={menu.id}
          className={`main-menu-item ${
            isSelected ? 'selected' : ''
          }`}
          onClick={() => {
  setSelectedMenu(menu)
  setCurrentRoute(menu.route || '/')
}}
        >
          <span className="menu-icon">
            {menuIcons[menu.icon] || '•'}
          </span>

          <span className="menu-label">
            {menu.name}
          </span>
        </button>
      )
    })}
</nav>

{/* =========================
    Sub Menu
========================= */}

{selectedMenu && (
  <nav className="sub-menu">
    {menus
      .filter(
        (menu) =>
          menu.parent_id === selectedMenu.id &&
          menu.level === 2
      )
      .sort(
        (a, b) =>
          a.sort_order - b.sort_order
      )
      .map((menu) => (
        <button
          key={menu.id}
          className="sub-menu-item"
          onClick={() => {
  setCurrentRoute(menu.route || '/')
  console.log('하위 메뉴 선택:', menu)
}}
        >
          {menu.name}
        </button>
      ))}
  </nav>
)}


          {/* =========================
              영상 목록
          ========================= */}

          <main className="content">

            <h2>
  {currentRoute === '/music'
    ? 'Music'
    : currentRoute === '/video'
      ? 'Video'
      : currentRoute === '/library/my-media'
        ? 'My Media'
        : currentRoute === '/library/favorites'
          ? 'Favorites'
          : '추천 콘텐츠'}
</h2>

            <div className="video-grid">

              {displayedVideos.map(
                (video) => (

                  <div
                    className="video-card"
                    key={
                      video.id
                    }
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
                          src={
                            video.thumbnail
                          }
                          alt={
                            video.title
                          }
                        />

                      ) : (

                        <video
                          src={
                            video.video
                          }
                          muted
                        />

                      )}

                      <span>
                        {video.mediaType ===
                        'audio'
                          ? '♪'
                          : '▶'}
                      </span>

                    </div>

                    <div className="video-info">

                      <div className="video-info-top">

                        <h3>
                          {
                            video.title
                          }
                        </h3>

                        <span className="category-badge">
                          {
                            video.category
                          }
                        </span>

                      </div>

                      <p>
                        {
                          video.uploaderNickname
                        }
                        {' · '}
                        {
                          video.views
                        }
                        {' · '}
                        {
                          video.time
                        }
                        {' · '}
                        ❤️{' '}
                        {
                          video.likeCount
                        }
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