import { useEffect, useRef, useState } from 'react'
import './App.css'
import Upload from './Upload'
import Login from './Login'
import { supabase } from './supabase'
import Admin from './Admin'
import SunoReservation from './SunoReservation'

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
  const [playlists, setPlaylists] = useState([])
  const [selectedPlaylist, setSelectedPlaylist] = useState(null)
  const [playlistItems, setPlaylistItems] = useState([])
  const [showAddPlaylistContent, setShowAddPlaylistContent] = useState(false)
const [selectedPlaylistVideos, setSelectedPlaylistVideos] = useState([])
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false)
const [playlistName, setPlaylistName] = useState('')
const [deferredPrompt, setDeferredPrompt] = useState(null)
const [isInstalled, setIsInstalled] = useState(false)
const [playlistDescription, setPlaylistDescription] = useState('')

const [notifications, setNotifications] = useState([])
const [showNotifications, setShowNotifications] = useState(false)
const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)
const [notificationTargetUserId, setNotificationTargetUserId] = useState(null)
  const navigationHistoryRef = useRef([])
    const [playMode, setPlayMode] = useState(() => {
    return (
      localStorage.getItem('playMode') ||
      'once'
    )
  })

const [playModeMenuOpen, setPlayModeMenuOpen] =
  useState(false)

  const audioRef = useRef(null)
  const videoRef = useRef(null)
   // =========================
  // 모바일 브라우저 뒤로가기
  // =========================

    useEffect(() => {
    const handlePopState = () => {
      const previousState =
        navigationHistoryRef.current.pop()

      if (!previousState) {
        return
      }

      setShowAdmin(
        previousState.showAdmin || false
      )

      setShowUpload(
        previousState.showUpload || false
      )

      setSelectedVideo(
        previousState.selectedVideo || null
      )

      setSelectedPlaylist(
        previousState.selectedPlaylist || null
      )

      setSelectedMenu(
        previousState.selectedMenu || null
      )

      setCurrentRoute(
        previousState.currentRoute || '/'
      )
    }

    window.addEventListener(
      'popstate',
      handlePopState
    )

    return () => {
      window.removeEventListener(
        'popstate',
        handlePopState
      )
    }
  }, [])
  // =========================
  // 로그인 상태 확인
  // =========================

 useEffect(() => {

  checkUser()

  const handleBeforeInstallPrompt = (e) => {
    e.preventDefault()
    setDeferredPrompt(e)
  }

  const handleAppInstalled = () => {
    setDeferredPrompt(null)
    setIsInstalled(true)
  }

  window.addEventListener(
    'beforeinstallprompt',
    handleBeforeInstallPrompt
  )

  window.addEventListener(
    'appinstalled',
    handleAppInstalled
  )

  if (
    window.matchMedia(
      '(display-mode: standalone)'
    ).matches ||
    window.navigator.standalone === true
  ) {
    setIsInstalled(true)
  }

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

  window.removeEventListener(
    'beforeinstallprompt',
    handleBeforeInstallPrompt
  )

  window.removeEventListener(
    'appinstalled',
    handleAppInstalled
  )
}
  }, [])
const handleInstallApp = async () => {
  if (!deferredPrompt) {
    alert(
      '현재 브라우저에서는 바로 설치할 수 없습니다.\n' +
      'Chrome 또는 삼성 인터넷에서 PlayMe를 열어주세요.'
    )
    return
  }

  deferredPrompt.prompt()

  const { outcome } =
    await deferredPrompt.userChoice

  console.log(
    '앱 설치 결과:',
    outcome
  )

  setDeferredPrompt(null)
}
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
        .select('status, role, nickname, username')
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
    loadNotifications()
  }
}, [user, profile?.role])

const loadNotifications = async () => {
  if (!user?.id) return

  const { data, error } = await supabase
    .from('notification_recipients')
    .select(`
      id,
      read_at,
      created_at,
      notification:notifications (
  id,
  type,
  title,
  message,
  target_user_id,
  created_at
)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('알림 불러오기 실패:', error)
    return
  }

  setNotifications(data ?? [])

  setUnreadNotificationCount(
    (data ?? []).filter((item) => !item.read_at).length
  )
}
const markNotificationAsRead = async (notificationRecipientId) => {
  const readAt = new Date().toISOString()

  const { error } = await supabase
    .from('notification_recipients')
    .update({
      read_at: readAt,
    })
    .eq('id', notificationRecipientId)
    .eq('user_id', user.id)

  if (error) {
    console.error('알림 읽음 처리 실패:', error)
    return
  }

  setNotifications((prev) =>
    prev.map((item) =>
      item.id === notificationRecipientId
        ? {
            ...item,
            read_at: readAt,
          }
        : item
    )
  )

  setUnreadNotificationCount((prev) =>
    Math.max(prev - 1, 0)
  )
}
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

const loadPlaylists = async () => {
  const { data, error } = await supabase
    .from('playlists')
    .select('*')
    .eq('owner_id', user.id)
    .eq('is_active', true)
    .order('created_at', {
      ascending: false,
    })

  if (error) {
    console.error(
      'Playlist 불러오기 실패:',
      error
    )
    return
  }

  setPlaylists(data ?? [])

  console.log(
    '내 Playlists:',
    data
  )
}
const loadPlaylistItems = async (playlistId) => {

  const { data, error } = await supabase
    .from('playlist_items')
    .select(`
      id,
      playlist_id,
      video_id,
      sort_order,
      added_at
    `)
    .eq('playlist_id', playlistId)
    .order('sort_order', {
      ascending: true,
    })

  if (error) {
    console.error(
      'Playlist 콘텐츠 불러오기 실패:',
      error
    )
    return
  }

  const videoIds = (data ?? []).map(
    (item) => item.video_id
  )

  if (videoIds.length === 0) {
    setPlaylistItems([])
    console.log('Playlist 콘텐츠 없음')
    return
  }

  const { data: rawVideos, error: videosError } =
    await supabase
      .from('videos')
      .select('*')
      .in('id', videoIds)

  if (videosError) {
    console.error(
      'Playlist 영상 정보 불러오기 실패:',
      videosError
    )
    return
  }

  const orderedVideos = videoIds
    .map((id) => {
      const video = rawVideos.find(
        (item) => item.id === id
      )

      if (!video) return null

      return {
        id: video.id,
        userId: video.user_id,
        title: video.title,
        views: `조회수 ${video.views}회`,
        rawViews: video.views,
        time: formatTime(video.created_at),
        video: video.video_url,
        thumbnail: video.thumbnail_url,
        likeCount: 0,
        isFavorite: false,
        uploaderNickname: '알 수 없음',
        category: video.category,
        mediaType:
          video.media_type ?? 'video',
        description:
          video.description ?? null,
      }
    })
    .filter(Boolean)

  setPlaylistItems(orderedVideos)

  console.log(
    'Playlist 콘텐츠:',
    orderedVideos
  )
}


const addVideosToPlaylist = async () => {
  if (!selectedPlaylist) {
    return
  }

  if (selectedPlaylistVideos.length === 0) {
    alert('추가할 콘텐츠를 선택해주세요.')
    return
  }

  const existingIds = playlistItems.map(
    (video) => video.id
  )

  const newVideoIds =
    selectedPlaylistVideos.filter(
      (id) => !existingIds.includes(id)
    )

  if (newVideoIds.length === 0) {
    alert('이미 Playlist에 추가된 콘텐츠입니다.')
    return
  }

  const startOrder = playlistItems.length

  const items = newVideoIds.map(
    (videoId, index) => ({
      playlist_id: selectedPlaylist.id,
      video_id: videoId,
      sort_order: startOrder + index,
    })
  )

  const { error } = await supabase
    .from('playlist_items')
    .insert(items)

  if (error) {
    console.error(
      'Playlist 콘텐츠 추가 실패:',
      error
    )
    alert('콘텐츠 추가에 실패했습니다.')
    return
  }

  await loadPlaylistItems(
    selectedPlaylist.id
  )

  setSelectedPlaylistVideos([])
  setShowAddPlaylistContent(false)

  console.log(
    'Playlist 콘텐츠 추가 완료:',
    newVideoIds
  )
}
const createPlaylist = async () => {
  const name = playlistName.trim()

  if (!name) {
    alert('Playlist 이름을 입력해주세요.')
    return
  }

  const { data, error } = await supabase
    .from('playlists')
    .insert({
      name,
      description:
        playlistDescription.trim() || null,
      owner_id: user.id,
      visibility: 'PRIVATE',
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    console.error(
      'Playlist 생성 실패:',
      error
    )
    alert('Playlist 생성에 실패했습니다.')
    return
  }

  setPlaylists((prev) => [
    data,
    ...prev,
  ])

  setPlaylistName('')
  setPlaylistDescription('')
  setShowCreatePlaylist(false)

  console.log(
    'Playlist 생성 완료:',
    data
  )
}
useEffect(() => {
  if (currentRoute === '/library/recently-played') {
    loadRecentlyPlayed()
  }

  if (currentRoute === '/library/playlists') {
    loadPlaylists()
  }

  if (
    currentRoute === '/library/playlist-detail' &&
    selectedPlaylist
  ) {
    loadPlaylistItems(selectedPlaylist.id)
  }
}, [currentRoute, selectedPlaylist])
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

        navigationHistoryRef.current.push({
      currentRoute,
      selectedMenu,
      selectedPlaylist,
    })

    window.history.pushState({}, '')

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
      const handleMediaEnded = () => {
    if (!selectedVideo) return

    const currentIndex = displayedVideos.findIndex(
      (video) => video.id === selectedVideo.id
    )

    if (currentIndex === -1) return

    // 1️⃣ 반복 안 함
    if (playMode === 'once') {
      return
    }

    // 🔂 한 개 반복
if (playMode === 'single') {
  const media = audioRef.current || videoRef.current

  if (media) {
    media.currentTime = 0
    media.play()
  }

  return
}

    // 🔀 랜덤 반복
    if (playMode === 'random') {
      if (displayedVideos.length <= 1) {
        setSelectedVideo(selectedVideo)
        return
      }

      let nextIndex = currentIndex

      while (nextIndex === currentIndex) {
        nextIndex = Math.floor(
          Math.random() * displayedVideos.length
        )
      }

      setSelectedVideo(
        displayedVideos[nextIndex]
      )
      return
    }

    // 🔁 전체 반복
    if (playMode === 'all') {
      const nextIndex =
        (currentIndex + 1) %
        displayedVideos.length

      setSelectedVideo(
        displayedVideos[nextIndex]
      )
    }
  }
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
  initialTab="members"
  initialUserId={notificationTargetUserId}
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

              <span>PlayMe</span>

            </div>
            <div className="play-mode">
              <button
                type="button"
                className="play-mode-button"
                onClick={() => {
                  setPlayModeMenuOpen(
                    (prev) => !prev
                  )
                }}
              >
                {playMode === 'once'
                  ? '1️⃣ : 반복 안 함'
                  : playMode === 'single'
                  ? '🔂 : 한 개 반복'
                  : playMode === 'all'
                  ? '🔁 : 전체 반복'
                  : '🔀 : 랜덤 반복'}
              </button>

              {playModeMenuOpen && (
                <div className="play-mode-menu">
                  <button
                    type="button"
                    onClick={() => {
                      setPlayMode('once')
                      localStorage.setItem(
                        'playMode',
                        'once'
                      )
                      setPlayModeMenuOpen(false)
                    }}
                  >
                    1️⃣ : 반복 안 함
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPlayMode('single')
                      localStorage.setItem(
                        'playMode',
                        'single'
                      )
                      setPlayModeMenuOpen(false)
                    }}
                  >
                    🔂 : 한 개 반복
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPlayMode('all')
                      localStorage.setItem(
                        'playMode',
                        'all'
                      )
                      setPlayModeMenuOpen(false)
                    }}
                  >
                    🔁 : 전체 반복
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPlayMode('random')
                      localStorage.setItem(
                        'playMode',
                        'random'
                      )
                      setPlayModeMenuOpen(false)
                    }}
                  >
                    🔀 : 랜덤 반복
                  </button>
                </div>
              )}
            </div>
          <div className="user-area">

  {profile?.role === 'admin' && (
    <button
      className="admin-button"
    onClick={() => {
  navigationHistoryRef.current.push({
    currentRoute,
    selectedMenu,
    selectedPlaylist,
  })

  setShowAdmin(true)
  window.history.pushState({}, '')
}}
    >
      관리자
    </button>
  )}

  
  <span>
    {profile?.username}
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
  ref={audioRef}
  src={selectedVideo.video}
  controls
  autoPlay
  playsInline
  onEnded={handleMediaEnded}
/>

                </div>

              ) : (

                /*
                 * 영상
                 */

                <video
  ref={videoRef}
  src={selectedVideo.video}
  controls
  autoPlay
  playsInline
  onEnded={handleMediaEnded}
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

  <span>PlayMe</span>

  <button
    type="button"
    className="install-button"
    onClick={(e) => {
      e.stopPropagation()
      handleInstallApp()
    }}
  >
    📱 앱 설치
  </button>

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
<button
  type="button"
  className="notification-button"
  onClick={() => {
    setShowNotifications((prev) => !prev)
    loadNotifications()
  }}
>
  🔔
  {unreadNotificationCount > 0 && (
    <span className="notification-badge">
      {unreadNotificationCount > 99
        ? '99+'
        : unreadNotificationCount}
    </span>
  )}
</button>
              {profile?.role ===
                'admin' && (

                <button
                  className="admin-button"
                  onClick={() => {
  navigationHistoryRef.current.push({
    currentRoute,
    selectedMenu,
    selectedPlaylist,
  })

  setShowAdmin(true)
  window.history.pushState({}, '')
}}
                >
                  관리자
                </button>

              )}

              <span>
               {profile?.username}
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
{showNotifications && (
  <div className="notification-panel">
    <div className="notification-header">
      <strong>알림</strong>

      <button
        type="button"
        onClick={() => setShowNotifications(false)}
      >
        닫기
      </button>
    </div>

    <div className="notification-list">
      {notifications.length === 0 ? (
        <div className="notification-empty">
          새로운 알림이 없습니다.
        </div>
      ) : (
        notifications.map((item) => (
          <div
  key={item.id}
  className={`notification-item ${
    item.read_at ? '' : 'unread'
  }`}
  onClick={async () => {
  if (!item.read_at) {
    await markNotificationAsRead(item.id)
  }

  if (item.notification?.type === 'signup') {
  setNotificationTargetUserId(
    item.notification?.target_user_id ?? null
  )
  setShowNotifications(false)

navigationHistoryRef.current.push({
  currentRoute,
  selectedMenu,
  selectedPlaylist,
})

setShowAdmin(true)
window.history.pushState({}, '')
}
}}
>
            <div className="notification-title">
              {!item.read_at && <span>●</span>}
              {item.notification?.title}
            </div>

            <div className="notification-message">
              {item.notification?.message}
            </div>

            <div className="notification-date">
              {new Date(
                item.created_at
              ).toLocaleString('ko-KR')}
            </div>
          </div>
        ))
      )}
    </div>
  </div>
)}
            {(profile?.role ===
              'creator' ||
              profile?.role ===
                'admin') && (

              <button
                className="upload-button"
                onClick={() => {
  navigationHistoryRef.current.push({
    currentRoute,
    selectedMenu,
    selectedPlaylist,
  })

  setShowUpload(true)
  window.history.pushState({}, '')
}}
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
  navigationHistoryRef.current.push({
    currentRoute,
    selectedMenu,
    selectedPlaylist,
  })

  setSelectedMenu(menu)
  setCurrentRoute(menu.route || '/')
  window.history.pushState({}, '')
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
  navigationHistoryRef.current.push({
    currentRoute,
    selectedMenu,
    selectedPlaylist,
  })

  setCurrentRoute(menu.route || '/')
  window.history.pushState({}, '')
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
          : currentRoute === '/library/recently-played'
            ? 'Recently Played'
            : currentRoute === '/library/playlists'
  ? 'Playlists'
  : currentRoute === '/library/playlist-detail'
  ? selectedPlaylist?.name || 'Playlist'
  : currentRoute === '/suno-reservation'
    ? 'SUNO 예약'
    : '추천 콘텐츠'}
</h2>
{currentRoute === '/suno-reservation' ? (
  <SunoReservation />
) : currentRoute === '/library/playlist-detail' ? (
  <div className="playlist-detail-page">

    <div className="playlist-detail-header">
      <button
        className="back-button"
        onClick={() => {
          setSelectedPlaylist(null)
          setPlaylistItems([])
          setCurrentRoute('/library/playlists')
        }}
      >
        ← Playlists
      </button>

      <h2>
        {selectedPlaylist?.name || 'Playlist'}
      </h2>

      {selectedPlaylist?.description && (
        <p>
          {selectedPlaylist.description}
        </p>
      )}

      <button
        className="add-playlist-content-button"
        onClick={() => {
  setSelectedPlaylistVideos([])
  setShowAddPlaylistContent(true)
}}
      >
        ＋ 콘텐츠 추가
      </button>
      {showAddPlaylistContent && (
  <div className="playlist-add-panel">
    <div className="playlist-add-header">
      <h3>콘텐츠 추가</h3>

      <button
        type="button"
        onClick={() => {
          setShowAddPlaylistContent(false)
        }}
      >
        ✕
      </button>
    </div>

    <div className="playlist-add-list">
      {videos.map((video) => {
        const isSelected =
          selectedPlaylistVideos.includes(video.id)

        return (
          <div
            key={video.id}
            className={`playlist-add-item ${
              isSelected ? 'selected' : ''
            }`}
            onClick={() => {
              setSelectedPlaylistVideos((prev) =>
                isSelected
                  ? prev.filter(
                      (id) => id !== video.id
                    )
                  : [...prev, video.id]
              )
            }}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => {}}
            />

            <div className="playlist-add-thumbnail">
              {video.thumbnail ? (
                <img
                  src={video.thumbnail}
                  alt={video.title}
                />
              ) : (
                <span>
                  {video.mediaType === 'audio'
                    ? '♪'
                    : '▶'}
                </span>
              )}
            </div>

            <div className="playlist-add-info">
              <strong>{video.title}</strong>
              <span>
                {video.mediaType === 'audio'
                  ? 'Music'
                  : 'Video'}
              </span>
            </div>
          </div>
        )
      })}
    </div>

    <div className="playlist-add-footer">
      <span>
        {selectedPlaylistVideos.length}개 선택
      </span>

      <button
  type="button"
  onClick={addVideosToPlaylist}
>
  추가하기
</button>
    </div>
  </div>
)}
    </div>

    {playlistItems.length === 0 ? (
      <div className="empty-playlist">
        <div className="empty-playlist-icon">
          ♫
        </div>

        <h3>
          아직 콘텐츠가 없습니다.
        </h3>

        <p>
          음악이나 영상을 추가해보세요.
        </p>
      </div>
    ) : (
      <div className="video-grid">
        {playlistItems.map((video) => (
          <div
            className="video-card"
            key={video.id}
           onClick={() => {
  const playableVideo = {
    ...video,
    video: video.video ?? video.video_url,
    mediaType:
      video.mediaType ??
      video.media_type ??
      'video',
    thumbnail:
      video.thumbnail ??
      video.thumbnail_url,
  }

  console.log(
    'Playlist 재생 데이터:',
    playableVideo
  )

  handleVideoClick(playableVideo)
}}
          >
            <div className="thumbnail">
  {video.thumbnail ? (
    <img
      src={video.thumbnail}
      alt={video.title}
    />
  ) : video.mediaType === 'audio' ? (
    <div className="audio-thumbnail">
      ♪
    </div>
  ) : (
    <video
      src={video.video}
      muted
    />
  )}

  <span>
    {video.mediaType === 'audio'
      ? '♪'
      : '▶'}
  </span>
</div>

            <div className="video-info">
  <h3>{video.title}</h3>

  <p>
    {video.uploaderNickname}
    {' · '}
    {video.views}
  </p>

  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation()
      console.log(
        'Playlist 콘텐츠 삭제:',
        video.id
      )
    }}
  >
    삭제
  </button>
</div>
          </div>
        ))}
      </div>
    )}
  </div>
) : currentRoute === '/library/playlists' ? (
  <div className="playlist-page">
    <div className="playlist-header">
      <div>
        <h3>내 Playlists</h3>
        <p>나만의 음악과 영상을 모아보세요.</p>
      </div>

      <button
  className="create-playlist-button"
  onClick={() => {
    setShowCreatePlaylist(true)
  }}
>
  ＋ 새 Playlist
</button>
    </div>
{showCreatePlaylist && (
  <div className="playlist-modal-overlay">
    <div className="playlist-modal">
      <h3>새 Playlist 만들기</h3>

      <label>
        Playlist 이름
      </label>

      <input
        type="text"
        value={playlistName}
        onChange={(e) =>
          setPlaylistName(e.target.value)
        }
        placeholder="Playlist 이름"
        autoFocus
      />

      <label>
        설명
      </label>

      <textarea
        value={playlistDescription}
        onChange={(e) =>
          setPlaylistDescription(
            e.target.value
          )
        }
        placeholder="Playlist 설명 (선택)"
        rows="3"
      />

      <div className="playlist-modal-buttons">
        <button
          type="button"
          onClick={() => {
            setPlaylistName('')
            setPlaylistDescription('')
            setShowCreatePlaylist(false)
          }}
        >
          취소
        </button>

        <button
          type="button"
          onClick={createPlaylist}
        >
          만들기
        </button>
      </div>
    </div>
  </div>
)}
    {playlists.length === 0 ? (
      <div className="empty-playlist">
        <div className="empty-playlist-icon">♫</div>
        <h3>아직 Playlist가 없습니다.</h3>
        <p>
          좋아하는 음악과 영상을 모아
          나만의 Playlist를 만들어보세요.
        </p>
      </div>
    ) : (
      <div className="playlist-grid">
        {playlists.map((playlist) => (
          <div
            key={playlist.id}
            className="playlist-card"
            onClick={() => {
  setSelectedPlaylist(playlist)
  setCurrentRoute('/library/playlist-detail')
  console.log(
    'Playlist 선택:',
    playlist
  )
}}
          >
            <div className="playlist-thumbnail">
              {playlist.thumbnail_url ? (
                <img
                  src={playlist.thumbnail_url}
                  alt={playlist.name}
                />
              ) : (
                <span>♫</span>
              )}
            </div>

            <div className="playlist-info">
              <h3>{playlist.name}</h3>

              {playlist.description && (
                <p>{playlist.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
) : (
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
          )}
          </main>

        </>

      )}

    </div>
  )
}

export default App