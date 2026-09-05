import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import { lyricsSyncToLrc, parseLrc } from './lyrics'

let lyricsEditorLineId = 0
const createLyricsEditorLine = (line = {}) => ({
  id: `lyrics-line-${lyricsEditorLineId += 1}`,
  start: line.start == null ? null : Number(line.start),
  text: String(line.text ?? ''),
})

function Admin({
  onClose,
  onVideoUpdated,
  initialTab = 'members',
  initialUserId = null,
}) {
  const [activeTab, setActiveTab] = useState(initialTab)
  const adminTabsRef = useRef(null)
  const [menus, setMenus] = useState([])
const [loadingMenus, setLoadingMenus] = useState(false)
const [showMenuForm, setShowMenuForm] = useState(false)
const [editingMenuId, setEditingMenuId] = useState(null)

const [menuName, setMenuName] = useState('')
const [menuParentId, setMenuParentId] = useState('')
const [menuRoute, setMenuRoute] = useState('')
const [menuIcon, setMenuIcon] = useState('')
const [menuSortOrder, setMenuSortOrder] = useState(0)
const [menuVisible, setMenuVisible] = useState(true)
const [menuActive, setMenuActive] = useState(true)
const [selectedMenuGroupIds, setSelectedMenuGroupIds] = useState([])
const [savingMenu, setSavingMenu] = useState(false)

  const [categories, setCategories] = useState([])
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState(null)

  const [categoryMenuId, setCategoryMenuId] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const [categorySortOrder, setCategorySortOrder] = useState(0)
  const [categoryActive, setCategoryActive] = useState(true)
  const [savingCategory, setSavingCategory] = useState(false)

  const [profiles, setProfiles] = useState([])
  const [loadingProfiles, setLoadingProfiles] = useState(true)
  const [memberSearchText, setMemberSearchText] = useState('')
  const [memberStatusFilter, setMemberStatusFilter] = useState('all')
  const [memberRoleFilter, setMemberRoleFilter] = useState('all')

  const [videos, setVideos] = useState([])
  const [loadingVideos, setLoadingVideos] = useState(true)
  const [contentSearchText, setContentSearchText] = useState('')
  const [contentStatusFilter, setContentStatusFilter] = useState('all')
  const [contentMediaTypeFilter, setContentMediaTypeFilter] = useState('all')
  const [contentPrimaryMenuId, setContentPrimaryMenuId] = useState('')
  const [contentSubMenuId, setContentSubMenuId] = useState('')

  const [editingId, setEditingId] = useState(null)

  const [editTitle, setEditTitle] = useState('')
  const [editMediaType, setEditMediaType] = useState('video')
  const [editPrimaryMenuId, setEditPrimaryMenuId] = useState('')
  const [editSubMenuId, setEditSubMenuId] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editSyncLyrics, setEditSyncLyrics] = useState('')
  const [lyricsEditorVideo, setLyricsEditorVideo] = useState(null)
  const [editorLines, setEditorLines] = useState([])
  const [editorTargetIndex, setEditorTargetIndex] = useState(0)
  const [editorSelectedIndices, setEditorSelectedIndices] = useState([])
  const [editorCurrentTime, setEditorCurrentTime] = useState(0)
  const [editorDuration, setEditorDuration] = useState(0)
  const [editorCompensation, setEditorCompensation] = useState(-0.15)
  const [editorPlaying, setEditorPlaying] = useState(false)
  const [playingLyricIndex, setPlayingLyricIndex] = useState(-1)
  const [splitEditorIndex, setSplitEditorIndex] = useState(null)
  const [splitEditorText, setSplitEditorText] = useState('')
  const [editorError, setEditorError] = useState('')

  const [editMediaFile, setEditMediaFile] = useState(null)
  const [editThumbnailFile, setEditThumbnailFile] = useState(null)
  const [editThumbnailPreview, setEditThumbnailPreview] = useState(null)
  const [capturingEditThumbnail, setCapturingEditThumbnail] = useState(false)

  const [editingNicknameId, setEditingNicknameId] = useState(null)
  const [editNickname, setEditNickname] = useState('')

  const [savingVideo, setSavingVideo] = useState(false)
  const editVideoRef = useRef(null)
  const editCanvasRef = useRef(null)
  const lyricsEditorAudioRef = useRef(null)
  const lyricsEditorListRef = useRef(null)
  const lyricsEditorLineRefs = useRef([])
  const lyricsEditorLastActionRef = useRef('')
  const lyricsEditorAutoScrollRef = useRef(false)
  const lyricsEditorManualUntilRef = useRef(0)

  const handleLyricsEditorListScroll = () => {
    if (lyricsEditorAutoScrollRef.current) {
      lyricsEditorAutoScrollRef.current = false
      return
    }
    lyricsEditorManualUntilRef.current = Date.now() + 3500
  }

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

  const contentMediaTypePresentation = {
    audio: { icon: '🎵', label: '음악' },
    video: { icon: '🎬', label: '동영상' },
    image: { icon: '🖼️', label: '이미지' },
    document: { icon: '📄', label: '문서' },
  }

  const getNormalizedMediaType = (mediaType) =>
    Object.hasOwn(mediaTypeOptions, mediaType) ? mediaType : 'video'

  const contentPrimaryMenus = menus
    .filter((menu) => menu.level === 1 && menu.is_active === true)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

  const contentSubMenus = contentPrimaryMenuId
    ? menus
        .filter(
          (menu) =>
            menu.level === 2 && menu.parent_id === contentPrimaryMenuId
        )
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    : []

  const filteredVideos = videos.filter((video) => {
    const title = (video.title ?? '').toLowerCase()
    const searchText = contentSearchText.trim().toLowerCase()
    const matchesSearch = !searchText || title.includes(searchText)
    const matchesStatus =
      contentStatusFilter === 'all' ||
      video.status === contentStatusFilter
    const matchesMediaType =
      contentMediaTypeFilter === 'all' ||
      getNormalizedMediaType(video.media_type) === contentMediaTypeFilter
    const matchesMenu = !contentPrimaryMenuId
      ? true
      : contentSubMenuId
        ? video.menu_id === contentSubMenuId
        : contentSubMenus.some((menu) => menu.id === video.menu_id)

    return (
      matchesSearch &&
      matchesStatus &&
      matchesMediaType &&
      matchesMenu
    )
  })

  const getVideoStatusPresentation = (status) => {
    if (status === 'ACTIVE') {
      return {
        label: '🟢 표시',
        className: 'content-status-active',
        toggleable: true,
      }
    }

    if (status === 'HIDDEN') {
      return {
        label: '⚪ 숨김',
        className: 'content-status-hidden',
        toggleable: true,
      }
    }

    return {
      label: '⚠️ 확인 필요',
      className: 'content-status-unknown',
      toggleable: false,
    }
  }

  const getContentMenuLabel = (menuId) => {
    const subMenu = menus.find(
      (menu) =>
        menu.id === menuId &&
        menu.level === 2
    )

    if (!subMenu) return '미지정'

    const primaryMenu = menus.find(
      (menu) =>
        menu.id === subMenu.parent_id &&
        menu.level === 1
    )

    if (!primaryMenu) return '미지정'

    return `${primaryMenu.name} › ${subMenu.name}`
  }

  // =========================
  // 영상 접근 권한 관리
  // =========================
  const [permissionGroups, setPermissionGroups] = useState([])
  const [selectedPermissionVideoId, setSelectedPermissionVideoId] = useState(null)
  const [permissionType, setPermissionType] = useState('PUBLIC')
  const [permissionGroupIds, setPermissionGroupIds] = useState([])
  const [loadingVideoPermission, setLoadingVideoPermission] = useState(false)
  const [savingVideoPermission, setSavingVideoPermission] = useState(false)
  const [videoPermissionSummary, setVideoPermissionSummary] = useState({})

  // =========================
  // 그룹 관리
  // =========================
  const [groups, setGroups] = useState([])
  const [groupTypes, setGroupTypes] = useState([])
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [showGroupForm, setShowGroupForm] = useState(false)
  const [editingGroupId, setEditingGroupId] = useState(null)
  const [groupTypeId, setGroupTypeId] = useState('')
  const [groupName, setGroupName] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [savingGroup, setSavingGroup] = useState(false)

  // 그룹 멤버 관리
  const [selectedGroupForMembers, setSelectedGroupForMembers] = useState(null)
  const [groupMembers, setGroupMembers] = useState([])
  const [groupMemberships, setGroupMemberships] = useState([])
  const [loadingGroupMembers, setLoadingGroupMembers] = useState(false)
  const [availableMembers, setAvailableMembers] = useState([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [addingMember, setAddingMember] = useState(false)

  // =========================
  // 초기 로딩
  // =========================

  useEffect(() => {
    loadProfiles()
    loadMenus()
        loadCategories()
    loadVideos()
    loadGroupTypes()
    loadGroups()
    loadGroupMemberships()
    loadPermissionGroups()
    loadVideoPermissionSummaries()
  }, [])

  useEffect(() => {
    if (!window.matchMedia('(max-width: 768px)').matches) return

    const activeTabButton = adminTabsRef.current?.querySelector(
      `[data-admin-tab="${activeTab}"]`,
    )

    activeTabButton?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    })
  }, [activeTab])

  // =========================
  // 회원 목록
  // =========================
const loadMenus = async () => {
  setLoadingMenus(true)

  const { data, error } = await supabase
    .from('menus')
    .select('*')
    .order('level', { ascending: true })
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('메뉴 목록 불러오기 실패:', error)
    alert('메뉴 목록을 불러오지 못했습니다.')
    setLoadingMenus(false)
    return
  }

  setMenus(data ?? [])
  setLoadingMenus(false)
}
  const loadCategories = async () => {
    setLoadingCategories(true)

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('menu_id', { ascending: true })
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('카테고리 목록 불러오기 실패:', error)
      alert('카테고리 목록을 불러오지 못했습니다.')
      setLoadingCategories(false)
      return
    }

    setCategories(data ?? [])
    setLoadingCategories(false)
  }
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
  // 영상 목록용 권한 요약
  // =========================

  const loadVideoPermissionSummaries = async () => {
    const { data, error } = await supabase
      .from('video_permissions')
      .select(`
        video_id,
        permission_type,
        group_id,
        groups (
          id,
          name
        )
      `)

    if (error) {
      console.error('영상 권한 요약 불러오기 실패:', error)
      return
    }

    const summary = {}

    for (const permission of data ?? []) {
      if (!summary[permission.video_id]) {
        summary[permission.video_id] = {
          type: permission.permission_type,
          groups: [],
        }
      }

      if (
        permission.permission_type === 'GROUP' &&
        permission.groups?.name
      ) {
        summary[permission.video_id].groups.push(
          permission.groups.name
        )
      }
    }

    setVideoPermissionSummary(summary)
  }

  // =========================
  // 영상 권한용 그룹 목록
  // =========================

  const loadPermissionGroups = async () => {
    const { data, error } = await supabase
      .from('groups')
      .select('id, name, is_active')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) {
      console.error('영상 권한 그룹 불러오기 실패:', error)
      return
    }

    setPermissionGroups(data ?? [])
  }

  // =========================
  // 영상 접근 권한 조회
  // =========================

  const loadVideoPermission = async (videoId) => {
    setLoadingVideoPermission(true)

    const { data, error } = await supabase
      .from('video_permissions')
      .select('id, video_id, permission_type, group_id, user_id, share_token, expires_at')
      .eq('video_id', videoId)

    if (error) {
      console.error('영상 권한 불러오기 실패:', error)
      alert('영상 권한을 불러오지 못했습니다.')
      setLoadingVideoPermission(false)
      return
    }

    const groupPermissions = (data ?? []).filter(
      (item) =>
        item.permission_type === 'GROUP' &&
        item.group_id
    )

    if (groupPermissions.length > 0) {
      setPermissionType('GROUP')
      setPermissionGroupIds(
        groupPermissions.map((item) => item.group_id)
      )
    } else {
      // 현재 can_view_video()에서는 Permission이 없으면 전체 공개
      setPermissionType('PUBLIC')
      setPermissionGroupIds([])
    }

    setLoadingVideoPermission(false)
  }

  const openVideoPermission = async (video) => {
    setSelectedPermissionVideoId(video.id)
    setPermissionType('PUBLIC')
    setPermissionGroupIds([])
    await loadVideoPermission(video.id)
  }

  const closeVideoPermission = () => {
    setSelectedPermissionVideoId(null)
    setPermissionType('PUBLIC')
    setPermissionGroupIds([])
  }

  useEffect(() => {
    if (!selectedPermissionVideoId) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !savingVideoPermission) {
        closeVideoPermission()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedPermissionVideoId, savingVideoPermission])

  // =========================
  // 영상 접근 권한 저장
  // =========================

  const saveVideoPermission = async () => {
    if (!selectedPermissionVideoId) return

    if (
      permissionType === 'GROUP' &&
      permissionGroupIds.length === 0
    ) {
      alert('공유할 그룹을 하나 이상 선택해주세요.')
      return
    }

    setSavingVideoPermission(true)

    try {
      // 현재 영상에 걸린 기존 권한을 먼저 제거한다.
      const { error: deleteError } = await supabase
        .from('video_permissions')
        .delete()
        .eq('video_id', selectedPermissionVideoId)

      if (deleteError) throw deleteError

      // PUBLIC은 permission row가 없는 상태로 저장한다.
      if (permissionType === 'GROUP') {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        const permissionRows = permissionGroupIds.map(
          (groupId) => ({
            video_id: selectedPermissionVideoId,
            permission_type: 'GROUP',
            group_id: groupId,
            created_by: user?.id ?? null,
          })
        )

        const { error: insertError } = await supabase
          .from('video_permissions')
          .insert(permissionRows)

        if (insertError) throw insertError
      }

      alert(
        permissionType === 'GROUP'
          ? '그룹 전용 권한으로 저장되었습니다.'
          : '전체 공개로 저장되었습니다.'
      )

      await loadVideoPermission(selectedPermissionVideoId)
      await loadVideoPermissionSummaries()
      closeVideoPermission()
    } catch (error) {
      console.error('영상 권한 저장 실패:', error)
      alert(
        `영상 권한 저장에 실패했습니다: ${
          error.message ?? '알 수 없는 오류'
        }`
      )
    } finally {
      setSavingVideoPermission(false)
    }
  }

  // =========================
  // 그룹 유형 목록
  // =========================

  const loadGroupTypes = async () => {
    const { data, error } = await supabase
      .from('group_types')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('그룹 유형 불러오기 실패:', error)
      alert('그룹 유형을 불러오지 못했습니다.')
      return
    }

    setGroupTypes(data ?? [])
  }

  // =========================
  // 그룹 목록
  // =========================

  const loadGroups = async () => {
    setLoadingGroups(true)

    const { data, error } = await supabase
      .from('groups')
      .select(`
        *,
        group_types (
          id,
          code,
          name
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('그룹 목록 불러오기 실패:', error)
      alert('그룹 목록을 불러오지 못했습니다.')
      setLoadingGroups(false)
      return
    }

    setGroups(data ?? [])
    setLoadingGroups(false)
  }

  const loadGroupMemberships = async () => {
    const { data, error } = await supabase
      .from('group_members')
      .select('group_id, user_id')

    if (error) {
      console.error('그룹 멤버십 불러오기 실패:', error)
      setGroupMemberships([])
      return
    }

    setGroupMemberships(data ?? [])
  }

  const resetGroupForm = () => {
    setShowGroupForm(false)
    setEditingGroupId(null)
    setGroupTypeId('')
    setGroupName('')
    setGroupDescription('')
  }

  const startCreatingGroup = () => {
    setEditingGroupId(null)
    setGroupTypeId(groupTypes[0]?.id ?? '')
    setGroupName('')
    setGroupDescription('')
    setShowGroupForm(true)
  }

  const startEditingGroup = (group) => {
    setEditingGroupId(group.id)
    setGroupTypeId(group.group_type_id ?? '')
    setGroupName(group.name ?? '')
    setGroupDescription(group.description ?? '')
    setShowGroupForm(true)
  }

  const saveGroup = async () => {
    if (!groupTypeId) {
      alert('그룹 유형을 선택해주세요.')
      return
    }

    if (!groupName.trim()) {
      alert('그룹 이름을 입력해주세요.')
      return
    }

    setSavingGroup(true)

    try {
      if (editingGroupId) {
        const { data, error } = await supabase
          .from('groups')
          .update({
            group_type_id: groupTypeId,
            name: groupName.trim(),
            description: groupDescription.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingGroupId)
          .select(`
            *,
            group_types (
              id,
              code,
              name
            )
          `)
          .single()

        if (error) throw error

        setGroups((prev) =>
          prev.map((group) =>
            group.id === editingGroupId ? data : group
          )
        )
        alert('그룹이 수정되었습니다.')
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        const { data, error } = await supabase
          .from('groups')
          .insert({
            group_type_id: groupTypeId,
            name: groupName.trim(),
            description: groupDescription.trim() || null,
            created_by: user?.id ?? null,
          })
          .select(`
            *,
            group_types (
              id,
              code,
              name
            )
          `)
          .single()

        if (error) throw error

        setGroups((prev) => [data, ...prev])
        alert('그룹이 생성되었습니다.')
      }

      resetGroupForm()
    } catch (error) {
      console.error('그룹 저장 실패:', error)
      alert(`그룹 저장에 실패했습니다: ${error.message ?? '알 수 없는 오류'}`)
    } finally {
      setSavingGroup(false)
    }
  }

  const toggleGroupActive = async (group) => {
    const nextActive = !group.is_active

    const { error } = await supabase
      .from('groups')
      .update({
        is_active: nextActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', group.id)

    if (error) {
      console.error('그룹 상태 변경 실패:', error)
      alert('그룹 상태 변경에 실패했습니다.')
      return
    }

    setGroups((prev) =>
      prev.map((item) =>
        item.id === group.id
          ? { ...item, is_active: nextActive }
          : item
      )
    )
  }

  const deleteGroup = async (id) => {
    const confirmed = window.confirm(
      '이 그룹을 삭제하시겠습니까? 되돌릴 수 없습니다.'
    )

    if (!confirmed) return

    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('그룹 삭제 실패:', error)
      alert('그룹 삭제에 실패했습니다.')
      return
    }

    setGroups((prev) => prev.filter((group) => group.id !== id))

    if (editingGroupId === id) {
      resetGroupForm()
    }

    alert('그룹이 삭제되었습니다.')
  }
  // =========================
  // 메뉴 관리
  // =========================

  const resetMenuForm = () => {
    setShowMenuForm(false)
    setEditingMenuId(null)
    setMenuName('')
    setMenuParentId('')
    setMenuRoute('')
    setMenuIcon('')
    setMenuSortOrder(0)
    setMenuVisible(true)
    setMenuActive(true)
    setSelectedMenuGroupIds([])
  }

  const startCreatingMenu = () => {
    setEditingMenuId(null)
    setMenuName('')
    setMenuParentId('')
    setMenuRoute('')
    setMenuIcon('')
    setMenuSortOrder(0)
    setMenuVisible(true)
    setMenuActive(true)
    setSelectedMenuGroupIds([])
    setShowMenuForm(true)
  }

  const startEditingMenu = async (menu) => {
  setEditingMenuId(menu.id)
  setMenuName(menu.name ?? '')
  setMenuParentId(menu.parent_id ?? '')
  setMenuRoute(menu.route ?? '')
  setMenuIcon(menu.icon ?? '')
  setMenuSortOrder(menu.sort_order ?? 0)
  setMenuVisible(menu.is_visible ?? true)
  setMenuActive(menu.is_active ?? true)

  const { data: menuGroups, error } = await supabase
    .from('menu_groups')
    .select('group_id')
    .eq('menu_id', menu.id)

  if (error) {
    console.error('메뉴 그룹 조회 실패:', error)
    setSelectedMenuGroupIds([])
  } else {
    setSelectedMenuGroupIds(
      (menuGroups ?? []).map((item) => item.group_id)
    )
  }

  setShowMenuForm(true)
}

  const saveMenu = async () => {
    if (!menuName.trim()) {
      alert('메뉴 이름을 입력해주세요.')
      return
    }

    if (!menuRoute.trim()) {
      alert('Route를 입력해주세요.')
      return
    }

    setSavingMenu(true)

    try {
            const parentId = menuParentId || null
      const level = parentId ? 2 : 1

      let sortOrder = Number(menuSortOrder) || 0

      if (!editingMenuId) {
        const siblingMenus = menus.filter(
          (menu) =>
            (menu.parent_id || null) === parentId
        )

        const maxSortOrder = siblingMenus.reduce(
          (max, menu) =>
            Math.max(
              max,
              Number(menu.sort_order) || 0
            ),
          0
        )

        sortOrder = maxSortOrder + 1
      }

      const menuData = {
        name: menuName.trim(),
        parent_id: parentId,
        level,
        route: menuRoute.trim(),
        icon: level === 1
          ? menuIcon.trim() || null
          : null,
        sort_order: sortOrder,
        is_visible: menuVisible,
        is_active: menuActive,
        updated_at: new Date().toISOString(),
      }

      if (editingMenuId) {
        const { data, error } = await supabase
          .from('menus')
          .update(menuData)
          .eq('id', editingMenuId)
          .select('*')
          .single()

        if (error) throw error
// 메뉴-그룹 연결 정보 갱신
const { error: deleteGroupError } = await supabase
  .from('menu_groups')
  .delete()
  .eq('menu_id', editingMenuId)

if (deleteGroupError) throw deleteGroupError

if (selectedMenuGroupIds.length > 0) {
  const menuGroupRows = selectedMenuGroupIds.map(
    (groupId) => ({
      menu_id: editingMenuId,
      group_id: groupId,
    })
  )

  const { error: insertGroupError } = await supabase
    .from('menu_groups')
    .insert(menuGroupRows)

  if (insertGroupError) throw insertGroupError
}
        setMenus((prev) =>
          prev.map((menu) =>
            menu.id === editingMenuId
              ? data
              : menu
          )
        )

        alert('메뉴가 수정되었습니다.')
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        const { data, error } = await supabase
          .from('menus')
          .insert({
            ...menuData,
            created_by: user?.id ?? null,
          })
          .select('*')
          .single()

        if (error) throw error
        if (selectedMenuGroupIds.length > 0) {
  const menuGroupRows = selectedMenuGroupIds.map(
    (groupId) => ({
      menu_id: data.id,
      group_id: groupId,
    })
  )

  const { error: insertGroupError } = await supabase
    .from('menu_groups')
    .insert(menuGroupRows)

  if (insertGroupError) throw insertGroupError
}

        setMenus((prev) => [
          ...prev,
          data,
        ])

        alert(
          '메뉴가 생성되었습니다.\n권한은 자동으로 생성됩니다.'
        )
      }

      resetMenuForm()
      await loadMenus()
    } catch (error) {
      console.error('메뉴 저장 실패:', error)

      alert(
        `메뉴 저장에 실패했습니다: ${
          error.message ?? '알 수 없는 오류'
        }`
      )
    } finally {
      setSavingMenu(false)
    }
  }
// =========================
// 메뉴 순서 위/아래 이동
// =========================
const moveMenu = async (menu, direction) => {
  // 같은 부모를 가진 메뉴 전체를 찾는다.
  // 활성/비활성 여부와 관계없이 순서에 포함한다.
  const siblings = menus
    .filter(
      (item) =>
        item.parent_id === menu.parent_id &&
        item.level === menu.level
    )
    .sort(
      (a, b) =>
        (a.sort_order ?? 0) -
        (b.sort_order ?? 0)
    )

  // 현재 메뉴의 위치
  const currentIndex = siblings.findIndex(
    (item) => item.id === menu.id
  )

  if (currentIndex === -1) return

  // 이동할 위치
  const targetIndex =
    direction === 'up'
      ? currentIndex - 1
      : currentIndex + 1

  // 이미 첫 번째 또는 마지막이면 이동하지 않는다.
  if (
    targetIndex < 0 ||
    targetIndex >= siblings.length
  ) {
    return
  }

  // 현재 메뉴를 배열에서 제거한 후
  // 새로운 위치에 삽입한다.
  const reordered = [...siblings]

  const [movedMenu] =
    reordered.splice(
      currentIndex,
      1
    )

  reordered.splice(
    targetIndex,
    0,
    movedMenu
  )

  try {
    // 같은 부모 그룹의 순서를
    // 1부터 다시 정리한다.
    const updates = reordered.map(
      (item, index) => ({
        id: item.id,
        sort_order: index + 1,
      })
    )

    // Supabase DB에 순서 저장
    for (const item of updates) {
      const { error } = await supabase
        .from('menus')
        .update({
          sort_order: item.sort_order,
          updated_at:
            new Date().toISOString(),
        })
        .eq('id', item.id)

      if (error) {
        throw error
      }
    }

    // 화면의 메뉴 순서도 즉시 반영한다.
    setMenus((prev) =>
      prev.map((item) => {
        const updated =
          updates.find(
            (u) => u.id === item.id
          )

        return updated
          ? {
              ...item,
              sort_order:
                updated.sort_order,
            }
          : item
      })
    )
  } catch (error) {
    console.error(
      '메뉴 순서 변경 실패:',
      error
    )

    alert(
      `메뉴 순서 변경에 실패했습니다: ${
        error.message ??
        '알 수 없는 오류'
      }`
    )
  }
}

// 위로 이동
const moveMenuUp = (menu) =>
  moveMenu(menu, 'up')

// 아래로 이동
const moveMenuDown = (menu) =>
  moveMenu(menu, 'down')
  const toggleMenuActive = async (menu) => {
  const nextActive = !menu.is_active

  const { error } = await supabase
    .from('menus')
    .update({
      is_active: nextActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', menu.id)

  if (error) {
    console.error('메뉴 상태 변경 실패:', error)
    alert(
      `메뉴 상태 변경에 실패했습니다: ${
        error.message ?? '알 수 없는 오류'
      }`
    )
    return
  }

  setMenus((prev) =>
    prev.map((item) =>
      item.id === menu.id
        ? {
            ...item,
            is_active: nextActive,
          }
        : item
    )
  )
}

const toggleMenuVisible = async (menu) => {
  const nextVisible = !menu.is_visible

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  console.log('메뉴 변경 사용자:', user)
  console.log('메뉴 변경 사용자 ID:', user?.id)
  console.log('사용자 조회 오류:', userError)

  const { data: profile, error: profileError } =
    await supabase
      .from('profiles')
      .select('id, username, nickname, role, status')
      .eq('id', user?.id)
      .single()

  console.log('메뉴 변경 사용자 프로필:', profile)
  console.log('프로필 조회 오류:', profileError)

  const { data: adminCheck, error: adminCheckError } =
    await supabase.rpc('is_admin')

  console.log('is_admin() 결과:', adminCheck)
  console.log('is_admin() 오류:', adminCheckError)

  const { error } = await supabase
    .from('menus')
    .update({
      is_visible: nextVisible,
      updated_at: new Date().toISOString(),
    })
    .eq('id', menu.id)

  if (error) {
    console.error('메뉴 표시 상태 변경 실패:', error)
    alert(
      `메뉴 표시 상태 변경에 실패했습니다: ${
        error.message ?? '알 수 없는 오류'
      }`
    )
    return
  }

  setMenus((prev) =>
    prev.map((item) =>
      item.id === menu.id
        ? {
            ...item,
            is_visible: nextVisible,
          }
        : item
    )
  )
}
  // =========================
  // 카테고리 관리
  // =========================

  const resetCategoryForm = () => {
    setShowCategoryForm(false)
    setEditingCategoryId(null)
    setCategoryMenuId('')
    setCategoryName('')
    setCategorySortOrder(0)
    setCategoryActive(true)
  }

  const startCreatingCategory = () => {
    setEditingCategoryId(null)
    setCategoryMenuId('')
    setCategoryName('')
    setCategorySortOrder(0)
    setCategoryActive(true)
    setShowCategoryForm(true)
  }

  const startEditingCategory = (category) => {
    setEditingCategoryId(category.id)
    setCategoryMenuId(category.menu_id ?? '')
    setCategoryName(category.name ?? '')
    setCategorySortOrder(category.sort_order ?? 0)
    setCategoryActive(category.is_active ?? true)
    setShowCategoryForm(true)
  }

  const saveCategory = async () => {
    if (!categoryMenuId) {
      alert('2차 메뉴를 선택해주세요.')
      return
    }

    if (!categoryName.trim()) {
      alert('카테고리 이름을 입력해주세요.')
      return
    }

    setSavingCategory(true)

    try {
      let sortOrder = Number(categorySortOrder) || 0

      if (!editingCategoryId) {
        const siblingCategories = categories.filter(
          (category) =>
            category.menu_id === categoryMenuId
        )

        const maxSortOrder = siblingCategories.reduce(
          (max, category) =>
            Math.max(
              max,
              Number(category.sort_order) || 0
            ),
          0
        )

        sortOrder = maxSortOrder + 1
      }

      const categoryData = {
        menu_id: categoryMenuId,
        name: categoryName.trim(),
        sort_order: sortOrder,
        is_active: categoryActive,
        updated_at: new Date().toISOString(),
      }

      if (editingCategoryId) {
        const { data, error } = await supabase
          .from('categories')
          .update(categoryData)
          .eq('id', editingCategoryId)
          .select('*')
          .single()

        if (error) throw error

        setCategories((prev) =>
          prev.map((category) =>
            category.id === editingCategoryId
              ? data
              : category
          )
        )

        alert('카테고리가 수정되었습니다.')
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        const { data, error } = await supabase
          .from('categories')
          .insert({
            ...categoryData,
            created_by: user?.id ?? null,
          })
          .select('*')
          .single()

        if (error) throw error

        setCategories((prev) => [
          ...prev,
          data,
        ])

        alert('카테고리가 생성되었습니다.')
      }

      resetCategoryForm()
      await loadCategories()
    } catch (error) {
      console.error('카테고리 저장 실패:', error)

      alert(
        `카테고리 저장에 실패했습니다: ${
          error.message ?? '알 수 없는 오류'
        }`
      )
    } finally {
      setSavingCategory(false)
    }
  }

  const deleteCategory = async (id) => {
    const confirmed = window.confirm(
      '이 카테고리를 삭제하시겠습니까?\n연결된 영상의 카테고리 정보도 확인이 필요합니다.'
    )

    if (!confirmed) return

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('카테고리 삭제 실패:', error)
      alert(
        `카테고리 삭제에 실패했습니다: ${
          error.message ?? '알 수 없는 오류'
        }`
      )
      return
    }

    setCategories((prev) =>
      prev.filter((category) => category.id !== id)
    )

    if (editingCategoryId === id) {
      resetCategoryForm()
    }

    alert('카테고리가 삭제되었습니다.')
  }
  // =========================
  // 그룹 멤버 목록
  // =========================

  const loadGroupMembers = async (groupId) => {
    setLoadingGroupMembers(true)

    const { data, error } = await supabase
      .from('group_members')
      .select(`
        id,
        group_id,
        user_id,
        status,
        joined_at,
        profiles (
  id,
  username,
  nickname,
  role,
  status
)
      `)
      .eq('group_id', groupId)
      .order('joined_at', { ascending: true })

    if (error) {
      console.error('그룹 멤버 불러오기 실패:', error)
      alert('그룹 멤버를 불러오지 못했습니다.')
      setLoadingGroupMembers(false)
      return
    }

    setGroupMembers(data ?? [])
    setLoadingGroupMembers(false)
  }

  // =========================
  // 그룹 멤버 추가 후보
  // =========================

  const loadAvailableMembers = async (groupId) => {
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, nickname, role, status')
      .eq('status', 'approved')
      .order('nickname', { ascending: true })

    if (profilesError) {
      console.error('사용자 목록 불러오기 실패:', profilesError)
      alert('사용자 목록을 불러오지 못했습니다.')
      return
    }

    const { data: membersData, error: membersError } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId)

    if (membersError) {
      console.error('기존 멤버 확인 실패:', membersError)
      alert('기존 멤버를 확인하지 못했습니다.')
      return
    }

    const memberIds = new Set(
      (membersData ?? []).map((member) => member.user_id)
    )

    setAvailableMembers(
      (profilesData ?? []).filter(
        (profile) => !memberIds.has(profile.id)
      )
    )
  }

  // =========================
  // 멤버 관리 열기
  // =========================

  const openGroupMembers = async (group) => {
    setSelectedGroupForMembers(group)
    setSelectedUserId('')
    await Promise.all([
      loadGroupMembers(group.id),
      loadAvailableMembers(group.id),
    ])
  }

  // =========================
  // 멤버 관리 닫기
  // =========================

  const closeGroupMembers = () => {
    setSelectedGroupForMembers(null)
    setGroupMembers([])
    setAvailableMembers([])
    setSelectedUserId('')
  }

  // =========================
  // 그룹 멤버 추가
  // =========================

  const addGroupMember = async () => {
    if (!selectedGroupForMembers) return

    if (!selectedUserId) {
      alert('추가할 사용자를 선택해주세요.')
      return
    }

    setAddingMember(true)

    const { error } = await supabase
      .from('group_members')
      .insert({
        group_id: selectedGroupForMembers.id,
        user_id: selectedUserId,
        status: 'ACTIVE',
      })

    if (error) {
      console.error('그룹 멤버 추가 실패:', error)

      if (error.code === '23505') {
        alert('이미 그룹에 가입된 사용자입니다.')
      } else {
        alert(`그룹 멤버 추가에 실패했습니다: ${error.message ?? ''}`)
      }

      setAddingMember(false)
      return
    }

    await loadGroupMembers(selectedGroupForMembers.id)
    await loadAvailableMembers(selectedGroupForMembers.id)

    setSelectedUserId('')
    setAddingMember(false)

    alert('그룹 멤버가 추가되었습니다.')
  }

  // =========================
  // 그룹 멤버 삭제
  // =========================

  const deleteGroupMember = async (memberId) => {
    const confirmed = window.confirm(
      '이 사용자를 그룹에서 삭제하시겠습니까?'
    )

    if (!confirmed) return

    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('id', memberId)

    if (error) {
      console.error('그룹 멤버 삭제 실패:', error)
      alert('그룹 멤버 삭제에 실패했습니다.')
      return
    }

    if (selectedGroupForMembers) {
      await loadGroupMembers(selectedGroupForMembers.id)
      await loadAvailableMembers(selectedGroupForMembers.id)
    }

    alert('그룹 멤버가 삭제되었습니다.')
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

  const getProfileStatusFilterValue = (status) => {
    if (status === 'approved' || status === 'rejected') {
      return status
    }

    return 'pending'
  }

  const getProfileStatusPresentation = (status) => {
    if (getProfileStatusFilterValue(status) === 'approved') {
      return { label: '정상', className: 'status-approved' }
    }

    if (getProfileStatusFilterValue(status) === 'rejected') {
      return { label: '정지', className: 'status-rejected' }
    }

    return { label: '승인 대기', className: 'status-pending' }
  }

  const getProfileGroupNames = (userId) => {
    const groupNames = groupMemberships
      .filter((membership) => membership.user_id === userId)
      .map((membership) =>
        groups.find((group) => group.id === membership.group_id)
      )
      .filter(Boolean)
      .map((group) => group.name)

    return groupNames.length > 0
      ? groupNames.join(' · ')
      : '-'
  }

  const getGroupMemberCount = (groupId) =>
    groupMemberships.filter(
      (membership) => membership.group_id === groupId
    ).length

  const normalizedMemberSearch = memberSearchText.trim().toLowerCase()

  const filteredProfiles = profiles.filter((profile) => {
    const matchesSearch =
      !normalizedMemberSearch ||
      (profile.nickname ?? '')
        .toLowerCase()
        .includes(normalizedMemberSearch) ||
      (profile.username ?? '')
        .toLowerCase()
        .includes(normalizedMemberSearch)
    const matchesStatus =
      memberStatusFilter === 'all' ||
      getProfileStatusFilterValue(profile.status) ===
        memberStatusFilter
    const matchesRole =
      memberRoleFilter === 'all' ||
      profile.role === memberRoleFilter

    return matchesSearch && matchesStatus && matchesRole
  })

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

    const normalizedMediaType =
      Object.hasOwn(mediaTypeOptions, video.media_type)
        ? video.media_type
        : 'video'
    const subMenu = menus.find(
      (menu) =>
        menu.id === video.menu_id &&
        menu.level === 2
    )

    setEditTitle(
      video.title ?? ''
    )

    setEditMediaType(normalizedMediaType)
    setEditPrimaryMenuId(subMenu?.parent_id ?? '')
    setEditSubMenuId(subMenu?.id ?? '')

    setEditDescription(
      video.description ?? ''
    )
    setEditSyncLyrics(lyricsSyncToLrc(video.lyrics_sync))

    setEditMediaFile(null)
    setEditThumbnailFile(null)
    setEditThumbnailPreview(
      video.thumbnail_url ??
        (normalizedMediaType === 'image'
          ? video.video_url
          : null)
    )
    setCapturingEditThumbnail(false)
  }

  // =========================
  // 영상 수정 취소
  // =========================

  const cancelEditing = () => {
    setEditingId(null)

    setEditTitle('')
    setEditMediaType('video')
    setEditPrimaryMenuId('')
    setEditSubMenuId('')
    setEditDescription('')
    setEditSyncLyrics('')

    setEditMediaFile(null)
    setEditThumbnailFile(null)
    setEditThumbnailPreview(null)
    setCapturingEditThumbnail(false)
  }

  const buildLyricsEditorLines = (video) => {
    if (Array.isArray(video?.lyrics_sync) && video.lyrics_sync.length > 0) {
      return video.lyrics_sync.map((line) => createLyricsEditorLine({
        start: Number.isFinite(Number(line.start)) ? Number(line.start) : null,
        text: String(line.text ?? ''),
      }))
    }

    return String(video?.description ?? '')
      .split(/\r?\n/)
      .filter((line) => line.trim() && !/^\s*\[[^\]]+\]\s*$/.test(line))
      .map((text) => createLyricsEditorLine({ start: null, text: text.trim() }))
  }

  const openLyricsEditor = () => {
    if (!editingVideo || editMediaType !== 'audio') return

    const parsedDraft = editSyncLyrics.trim()
      ? parseLrc(editSyncLyrics)
      : { lines: null, error: null }
    const lines = parsedDraft.lines ?? buildLyricsEditorLines(editingVideo)

    setLyricsEditorVideo(editingVideo)
    setEditorLines(lines)
    setEditorTargetIndex(0)
    setEditorSelectedIndices([])
    setEditorCurrentTime(0)
    setEditorDuration(0)
    setEditorCompensation(-0.15)
    setEditorPlaying(false)
    setPlayingLyricIndex(-1)
    setSplitEditorIndex(null)
    setSplitEditorText('')
    setEditorError(parsedDraft.error ?? '')
  }

  const closeLyricsEditor = () => {
    lyricsEditorAudioRef.current?.pause()
    setLyricsEditorVideo(null)
    setPlayingLyricIndex(-1)
    setSplitEditorIndex(null)
    setEditorError('')
  }

  const formatEditorTime = (seconds) => {
    if (!Number.isFinite(seconds)) return '--:--.--'
    const safe = Math.max(0, seconds)
    const minutes = Math.floor(safe / 60)
    const remainder = safe - minutes * 60
    return `${String(minutes).padStart(2, '0')}:${remainder.toFixed(2).padStart(5, '0')}`
  }

  const setEditorLineStart = (index, start) => {
    setEditorLines((previous) =>
      previous.map((line, lineIndex) =>
        lineIndex === index
          ? { ...line, start: start == null ? null : Math.max(0, Number(start)) }
          : line
      )
    )
  }

  const getPlayingLyricIndex = (time, lines = editorLines) => {
    const currentTime = Number(time) || 0
    return lines.findIndex((line, index) => {
      if (line.start == null) return false
      const nextTimedLine = lines
        .slice(index + 1)
        .find((candidate) => candidate.start != null)
      return (
        currentTime >= Number(line.start) &&
        (nextTimedLine == null || currentTime < Number(nextTimedLine.start))
      )
    })
  }

  const updatePlayingLyricIndex = (time, lines = editorLines) => {
    const nextIndex = getPlayingLyricIndex(time, lines)
    setPlayingLyricIndex((previousIndex) =>
      previousIndex === nextIndex ? previousIndex : nextIndex
    )
  }

  const stampEditorLine = (index = editorTargetIndex) => {
    if (!editorLines[index]) return
    const audioTime = lyricsEditorAudioRef.current?.currentTime ?? editorCurrentTime
    const compensation = Math.max(-1, Math.min(1, Number(editorCompensation) || 0))
    setEditorLineStart(index, Math.max(0, audioTime + compensation))
    lyricsEditorLastActionRef.current = 'target'
    updatePlayingLyricIndex(audioTime)
    setEditorError('')
    setEditorTargetIndex(Math.min(index + 1, editorLines.length - 1))
  }

  const adjustEditorLine = (index, amount) => {
    const line = editorLines[index]
    if (!line || line.start == null) return
    setEditorLineStart(index, Math.max(0, Number((line.start + amount).toFixed(3))))
    updatePlayingLyricIndex(editorCurrentTime)
  }

  const mergeSelectedEditorLines = () => {
    const indices = [...editorSelectedIndices].sort((a, b) => a - b)
    if (indices.length < 2) return
    const firstIndex = indices[0]
    const selected = indices.map((index) => editorLines[index])
    const merged = createLyricsEditorLine({
      start: selected[0].start,
      text: selected.map((line) => line.text.trim()).filter(Boolean).join(' '),
    })
    setEditorLines((previous) => {
      const next = []
      previous.forEach((line, index) => {
        if (index === firstIndex) next.push(merged)
        else if (!indices.includes(index)) next.push(line)
      })
      return next
    })
    setEditorTargetIndex(firstIndex)
    setEditorSelectedIndices([])
    lyricsEditorLastActionRef.current = 'target'
    updatePlayingLyricIndex(editorCurrentTime)
  }

  const deleteSelectedEditorLines = () => {
    if (editorSelectedIndices.length === 0) return
    const remaining = editorLines.filter((_, index) => !editorSelectedIndices.includes(index))
    setEditorLines(remaining)
    setEditorTargetIndex(Math.min(editorTargetIndex, Math.max(0, remaining.length - 1)))
    setEditorSelectedIndices([])
    setPlayingLyricIndex(getPlayingLyricIndex(editorCurrentTime, remaining))
  }

  const addEditorLine = () => {
    const newLine = createLyricsEditorLine()
    setEditorLines((previous) => [...previous, newLine])
    setEditorTargetIndex(editorLines.length)
  }

  const insertEditorLine = (position) => {
    const selectedIndex = editorSelectedIndices.length === 1
      ? editorSelectedIndices[0]
      : editorTargetIndex
    const index = Math.max(0, Math.min(editorLines.length, selectedIndex + (position === 'after' ? 1 : 0)))
    const newLine = createLyricsEditorLine()
    setEditorLines((previous) => {
      const next = [...previous]
      next.splice(index, 0, newLine)
      return next
    })
    setEditorTargetIndex(index)
    setEditorSelectedIndices([])
    lyricsEditorLastActionRef.current = 'target'
    setEditorError('')
  }

  const resetEditorFromLine = (index) => {
    if (!window.confirm('이 줄부터 다시 시간을 찍을까요?')) return
    setEditorLines((previous) =>
      previous.map((line, lineIndex) =>
        lineIndex >= index ? { ...line, start: null } : line
      )
    )
    setEditorTargetIndex(index)
    lyricsEditorLastActionRef.current = 'target'
    updatePlayingLyricIndex(editorCurrentTime)
  }

  const openSplitEditor = (index) => {
    const line = editorLines[index]
    if (!line) return
    setSplitEditorIndex(index)
    setSplitEditorText(line.text)
    setEditorError('')
  }

  const applySplitEditor = () => {
    if (splitEditorIndex == null) return
    const parts = splitEditorText.split(/\r?\n/).map((text) => text.trim()).filter(Boolean)
    if (parts.length < 2) {
      setEditorError('두 줄 이상으로 입력해주세요.')
      return
    }
    const sourceLine = editorLines[splitEditorIndex]
    const splitLines = parts.map((text, index) =>
      createLyricsEditorLine({
        start: index === 0 ? sourceLine.start : null,
        text,
      })
    )
    setEditorLines((previous) => [
      ...previous.slice(0, splitEditorIndex),
      ...splitLines,
      ...previous.slice(splitEditorIndex + 1),
    ])
    setEditorTargetIndex(splitEditorIndex)
    setEditorSelectedIndices([])
    lyricsEditorLastActionRef.current = 'target'
    setPlayingLyricIndex(getPlayingLyricIndex(editorCurrentTime, [
      ...editorLines.slice(0, splitEditorIndex),
      ...splitLines,
      ...editorLines.slice(splitEditorIndex + 1),
    ]))
    setSplitEditorIndex(null)
    setSplitEditorText('')
  }

  const saveLyricsEditor = () => {
    if (editorLines.length === 0) {
      setEditSyncLyrics('')
      setEditorError('')
      closeLyricsEditor()
      return
    }
    const invalidIndex = editorLines.findIndex(
      (line) => line.start == null || !String(line.text ?? '').trim()
    )
    if (invalidIndex >= 0) {
      setEditorError(`${invalidIndex + 1}번째 줄의 시간과 가사를 모두 입력해주세요.`)
      return
    }
    for (let index = 1; index < editorLines.length; index += 1) {
      if (editorLines[index].start <= editorLines[index - 1].start) {
        setEditorError('싱크 시간은 중복 없이 오름차순이어야 합니다.')
        return
      }
    }

    const normalized = editorLines.map((line, index) => ({
      start: Number(line.start),
      end: editorLines[index + 1]?.start ?? null,
      text: String(line.text).trim(),
    }))
    setEditSyncLyrics(lyricsSyncToLrc(normalized))
    setEditorError('')
    closeLyricsEditor()
  }

  useEffect(() => {
    if (!editingId) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !savingVideo) {
        cancelEditing()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [editingId, savingVideo])

  useEffect(() => {
    if (!lyricsEditorVideo) return undefined

    const handleEditorKeyDown = (event) => {
      const tagName = event.target?.tagName?.toLowerCase()
      const isTextInput =
        tagName === 'input' ||
        tagName === 'textarea' ||
        event.target?.isContentEditable

      if (event.key === 'Escape') {
        event.preventDefault()
        closeLyricsEditor()
        return
      }

      if (isTextInput) return

      if (event.key === ' ') {
        event.preventDefault()
        stampEditorLine()
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        setEditorTargetIndex((index) => Math.max(0, index - 1))
      } else if (event.key === 'ArrowDown') {
        event.preventDefault()
        setEditorTargetIndex((index) => Math.min(editorLines.length - 1, index + 1))
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        saveLyricsEditor()
      }
    }

    window.addEventListener('keydown', handleEditorKeyDown)
    return () => window.removeEventListener('keydown', handleEditorKeyDown)
  }, [lyricsEditorVideo, editorLines.length, editorTargetIndex, editorCurrentTime, editorCompensation])

  useEffect(() => {
    if (!lyricsEditorVideo || editorTargetIndex < 0) return
    lyricsEditorAutoScrollRef.current = true
    lyricsEditorLineRefs.current[editorTargetIndex]?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }, [lyricsEditorVideo, editorTargetIndex])

  useEffect(() => {
    if (!lyricsEditorVideo || playingLyricIndex < 0) return
    if (Date.now() < lyricsEditorManualUntilRef.current) return
    if (lyricsEditorLastActionRef.current === 'target') {
      lyricsEditorLastActionRef.current = ''
      return
    }
    if (playingLyricIndex === editorTargetIndex) return
    lyricsEditorLineRefs.current[playingLyricIndex]?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }, [lyricsEditorVideo, playingLyricIndex, editorTargetIndex])

  useEffect(() => {
    if (!lyricsEditorVideo) return
    updatePlayingLyricIndex(editorCurrentTime, editorLines)
  }, [lyricsEditorVideo, editorCurrentTime, editorLines])

  const isValidEditMediaFile = (file) => {
    if (editMediaType === 'audio') {
      return file.type.startsWith('audio/')
    }

    if (editMediaType === 'video') {
      return file.type.startsWith('video/')
    }

    if (editMediaType === 'image') {
      return file.type.startsWith('image/')
    }

    return [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ].includes(file.type)
  }

  const generateDefaultThumbnail = (icon, fileName) => {
    const svg = `
      <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="400" fill="#1a1a1a" />
        <text x="200" y="230" font-size="140" text-anchor="middle" fill="#ffffff">${icon}</text>
      </svg>
    `

    const blob = new Blob([svg], {
      type: 'image/svg+xml',
    })

    return new File([blob], fileName, {
      type: 'image/svg+xml',
    })
  }

  const handleEditMediaSelect = (file) => {
    if (!file) return false

    if (!isValidEditMediaFile(file)) {
      alert('선택한 콘텐츠 타입에 맞는 파일을 선택해주세요.')
      return false
    }

    setEditMediaFile(file)
    setEditThumbnailFile(null)
    setEditThumbnailPreview(null)
    setCapturingEditThumbnail(false)

    if (editMediaType === 'audio') {
      const defaultCover = generateDefaultThumbnail(
        '♪',
        'default-cover.svg'
      )
      setEditThumbnailFile(defaultCover)
      setEditThumbnailPreview(URL.createObjectURL(defaultCover))
      return true
    }

    if (editMediaType === 'image') {
      setEditThumbnailFile(file)
      setEditThumbnailPreview(URL.createObjectURL(file))
      return true
    }

    if (editMediaType === 'document') {
      const defaultThumbnail = generateDefaultThumbnail(
        '📄',
        'default-document.svg'
      )
      setEditThumbnailFile(defaultThumbnail)
      setEditThumbnailPreview(URL.createObjectURL(defaultThumbnail))
      return true
    }

    setCapturingEditThumbnail(true)
    const videoUrl = URL.createObjectURL(file)
    const video = editVideoRef.current

    video.src = videoUrl
    video.onloadeddata = () => {
      video.currentTime = 1
    }
    video.onseeked = () => {
      const canvas = editCanvasRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      const context = canvas.getContext('2d')
      context.drawImage(video, 0, 0, canvas.width, canvas.height)

      canvas.toBlob((blob) => {
        if (!blob) {
          setCapturingEditThumbnail(false)
          URL.revokeObjectURL(videoUrl)
          return
        }

        const thumbnail = new File([blob], 'thumbnail.jpg', {
          type: 'image/jpeg',
        })
        setEditThumbnailFile(thumbnail)
        setEditThumbnailPreview(URL.createObjectURL(blob))
        setCapturingEditThumbnail(false)
        URL.revokeObjectURL(videoUrl)
      }, 'image/jpeg')
    }

    return true
  }

  const handleEditMediaTypeChange = (nextMediaType) => {
    setEditMediaType(nextMediaType)
    setEditMediaFile(null)
    setEditThumbnailFile(null)
    setEditThumbnailPreview(null)
    setCapturingEditThumbnail(false)
  }

  const handleEditThumbnailSelect = (file) => {
    if (!file) return

    setEditThumbnailFile(file)
    setEditThumbnailPreview(URL.createObjectURL(file))
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

    if (!editPrimaryMenuId) {
      alert('1차 메뉴를 선택해주세요.')
      return
    }

    if (!editSubMenuId) {
      alert('2차 메뉴를 선택해주세요.')
      return
    }

    const selectedSubMenu = menus.find(
      (menu) =>
        menu.id === editSubMenuId &&
        menu.level === 2 &&
        menu.parent_id === editPrimaryMenuId &&
        menu.name !== 'All' &&
        menu.name !== 'Playlist'
    )

    if (!selectedSubMenu) {
      alert('선택 가능한 2차 메뉴를 선택해주세요.')
      return
    }

    const { lines: lyricsSync, error: lyricsError } = parseLrc(editSyncLyrics)
    if (lyricsError) {
      alert(lyricsError)
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

    const currentMediaType =
      Object.hasOwn(mediaTypeOptions, video.media_type)
        ? video.media_type
        : 'video'

    if (
      currentMediaType !== editMediaType &&
      !editMediaFile
    ) {
      alert(
        '콘텐츠 타입을 변경하려면 해당 타입의 새 파일을 선택해주세요.'
      )
      return
    }

    if (
      editMediaFile &&
      !isValidEditMediaFile(editMediaFile)
    ) {
      alert('선택한 콘텐츠 타입에 맞는 파일을 선택해주세요.')
      return
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

          menu_id:
            editSubMenuId,

          media_type:
            editMediaType,

          description:
            editDescription.trim() ||
            null,

          lyrics_sync: lyricsSync,

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

                menu_id:
                  editSubMenuId,

                media_type:
                  editMediaType,

                description:
                  editDescription.trim() ||
                  null,

                lyrics_sync: lyricsSync,

                video_url:
                  newMediaUrl,

                thumbnail_url:
                  newThumbnailUrl,
              }
            : v
        )
      )

      onVideoUpdated?.({
        id,
        title: editTitle.trim(),
        menu_id: editSubMenuId,
        media_type: editMediaType,
        description: editDescription.trim() || null,
        lyrics_sync: lyricsSync,
        video_url: newMediaUrl,
        thumbnail_url: newThumbnailUrl,
      })

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
  // 콘텐츠 표시 상태 변경
  // =========================

  const toggleVideoStatus = async (video) => {
    if (video.status !== 'ACTIVE' && video.status !== 'HIDDEN') {
      alert('현재 콘텐츠 상태를 확인할 수 없어 변경하지 않았습니다.')
      return
    }

    const nextStatus = video.status === 'ACTIVE' ? 'HIDDEN' : 'ACTIVE'
    const confirmed = window.confirm(
      nextStatus === 'HIDDEN'
        ? '이 콘텐츠를 숨길까요?\n숨기면 일반 사용자 화면에서 표시되지 않습니다.'
        : '이 콘텐츠를 다시 표시할까요?'
    )

    if (!confirmed) return

    const { error } = await supabase
      .from('videos')
      .update({ status: nextStatus })
      .eq('id', video.id)

    if (error) {
      console.error('콘텐츠 상태 변경 실패:', error)
      alert('콘텐츠 상태를 변경하지 못했습니다.')
      return
    }

    setVideos((prev) =>
      prev.map((item) =>
        item.id === video.id
          ? { ...item, status: nextStatus }
          : item
      )
    )
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

  const editingVideo = videos.find((video) => video.id === editingId)
  const permissionEditingVideo = videos.find(
    (video) => video.id === selectedPermissionVideoId
  )
  const editingMediaFileName = (() => {
    if (!editingVideo?.video_url) return null

    try {
      const pathname = new URL(
        editingVideo.video_url,
        window.location.origin
      ).pathname
      const fileName = pathname.split('/').filter(Boolean).pop()

      return fileName ? decodeURIComponent(fileName) : null
    } catch {
      return null
    }
  })()

  return (
    <div
      className={`admin-page ${
        activeTab === 'videos' ? 'admin-page-content' : ''
      }`}
    >

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

      <div className="admin-tabs" ref={adminTabsRef}>

        <button
          data-admin-tab="members"
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
          data-admin-tab="groups"
          className={
            activeTab ===
            'groups'
              ? 'active'
              : ''
          }
          onClick={() =>
            setActiveTab(
              'groups'
            )
          }
        >
          그룹 관리
        </button>

        <button
          data-admin-tab="videos"
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
          콘텐츠 관리
        </button>

<button
  data-admin-tab="menus"
  className={
    activeTab === 'menus'
      ? 'active'
      : ''
  }
  onClick={() =>
    setActiveTab('menus')
  }
>
  메뉴 관리
</button>
        <button
          data-admin-tab="categories"
          className={
            activeTab === 'categories'
              ? 'active'
              : ''
          }
          onClick={() =>
            setActiveTab('categories')
          }
        >
          카테고리 관리
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

          <>

          <div className="member-filters">
            <label className="member-filter member-filter-search">
              <span>회원 검색</span>
              <input
                type="search"
                value={memberSearchText}
                onChange={(e) => setMemberSearchText(e.target.value)}
                placeholder="닉네임 또는 ID 검색"
              />
            </label>

            <label className="member-filter">
              <span>상태</span>
              <select
                value={memberStatusFilter}
                onChange={(e) => setMemberStatusFilter(e.target.value)}
              >
                <option value="all">전체</option>
                <option value="approved">정상</option>
                <option value="pending">승인 대기</option>
                <option value="rejected">정지</option>
              </select>
            </label>

            <label className="member-filter">
              <span>역할</span>
              <select
                value={memberRoleFilter}
                onChange={(e) => setMemberRoleFilter(e.target.value)}
              >
                <option value="all">전체</option>
                <option value="admin">admin</option>
                <option value="user">user</option>
              </select>
            </label>
          </div>

          <table className="admin-table">

            <thead>

              <tr>

                <th>
                  닉네임
                </th>

                <th>
  ID
</th>

                <th>
                  그룹
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

              {filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center' }}>
                    조건에 맞는 회원이 없습니다.
                  </td>
                </tr>
              ) : filteredProfiles.map(
                (profile) => (

                 <tr
  key={profile.id}
  className={
    profile.id === initialUserId
      ? 'notification-target-user'
      : ''
  }
>

                    <td>

                      {editingNicknameId ===
                      profile.id ? (

                      <div
  style={{
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '6px',
    whiteSpace: 'nowrap',
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
  {profile.username ?? '-'}
</td>

                    <td>
                      {getProfileGroupNames(profile.id)}
                    </td>

                    <td>
                      {new Date(
                        profile.created_at
                      ).toLocaleDateString(
                        'ko-KR'
                      )}
                    </td>

                    <td>

                      {(() => {
                        const status =
                          getProfileStatusPresentation(
                            profile.status
                          )

                        return (
                      <span
                        className={`status-badge ${status.className}`}
                      >
                        {status.label}
                      </span>
                        )
                      })()}

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

          </>

        )
      )}


      {/* =========================
          그룹 관리
      ========================= */}

      {activeTab === 'groups' && (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <h2 style={{ margin: 0 }}>그룹 관리</h2>

            <button
              className="approve-button"
              onClick={startCreatingGroup}
              disabled={groupTypes.length === 0}
            >
              + 그룹 생성
            </button>
          </div>

          {groupTypes.length === 0 && (
            <p>
              활성화된 그룹 유형이 없습니다. 먼저 group_types를 등록해주세요.
            </p>
          )}

          {showGroupForm && (
            <div
              style={{
                border: '1px solid #ddd',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '24px',
              }}
            >
              <h3 style={{ marginTop: 0 }}>
                {editingGroupId ? '그룹 수정' : '그룹 생성'}
              </h3>

              <div style={{ display: 'grid', gap: '12px' }}>
                <div>
                  <label>그룹 유형</label>
                  <select
                    value={groupTypeId}
                    onChange={(e) => setGroupTypeId(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="">선택해주세요</option>
                    {groupTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>그룹 이름</label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="예: 우리 가족"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label>설명</label>
                  <textarea
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                    placeholder="그룹 설명 (선택사항)"
                    rows="4"
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="approve-button"
                    onClick={saveGroup}
                    disabled={savingGroup}
                  >
                    {savingGroup ? '저장 중...' : '저장'}
                  </button>

                  <button
                    className="reject-button"
                    onClick={resetGroupForm}
                    disabled={savingGroup}
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          )}

          {loadingGroups ? (
            <p>그룹을 불러오는 중...</p>
          ) : groups.length === 0 ? (
            <p>등록된 그룹이 없습니다.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>그룹명</th>
                  <th>유형</th>
                  <th>설명</th>
                  <th>멤버</th>
                  <th>상태</th>
                  <th>생성일</th>
                  <th>작업</th>
                </tr>
              </thead>

              <tbody>
                {groups.map((group) => (
                  <tr key={group.id}>
                    <td>{group.name}</td>
                    <td>{group.group_types?.name ?? '-'}</td>
                    <td>{group.description ?? '-'}</td>
                    <td>{getGroupMemberCount(group.id)}명</td>
                    <td>
                      <span
                        className={`status-badge ${
                          group.is_active
                            ? 'status-approved'
                            : 'status-rejected'
                        }`}
                      >
                        {group.is_active ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td>
                      {group.created_at
                        ? new Date(group.created_at).toLocaleDateString('ko-KR')
                        : '-'}
                    </td>
                    <td>
                      <div
  style={{
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '6px',
    whiteSpace: 'nowrap',
  }}
>
                        <button
                          className="approve-button"
                          onClick={() => startEditingGroup(group)}
                        >
                          수정
                        </button>

                        <button
                          className="approve-button"
                          onClick={() => openGroupMembers(group)}
                        >
                          멤버 관리
                        </button>

                        <button
                          className={
                            group.is_active
                              ? 'reject-button'
                              : 'approve-button'
                          }
                          onClick={() => toggleGroupActive(group)}
                        >
                          {group.is_active ? '비활성' : '활성'}
                        </button>

                        <button
                          className="reject-button"
                          onClick={() => deleteGroup(group.id)}
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* =========================
          그룹 멤버 관리
      ========================= */}

      {activeTab === 'groups' && selectedGroupForMembers && (
        <div
          style={{
            marginTop: '24px',
            border: '1px solid #ddd',
            borderRadius: '12px',
            padding: '20px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}
          >
            <div>
              <h2 style={{ margin: 0 }}>
                {selectedGroupForMembers.name} 멤버 관리
              </h2>
              <p style={{ margin: '6px 0 0', color: '#666' }}>
                그룹에 사용자를 추가하거나 삭제할 수 있습니다.
              </p>
            </div>

            <button
              className="reject-button"
              onClick={closeGroupMembers}
            >
              닫기
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              marginBottom: '20px',
              flexWrap: 'wrap',
            }}
          >
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              style={{ minWidth: '280px' }}
            >
              <option value="">멤버를 선택하세요</option>

              {availableMembers.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.nickname || profile.username} ({profile.role})
                </option>
              ))}
            </select>

            <button
              className="approve-button"
              onClick={addGroupMember}
              disabled={addingMember || !selectedUserId}
            >
              {addingMember ? '추가 중...' : '+ 멤버 추가'}
            </button>
          </div>

          {loadingGroupMembers ? (
            <p>멤버를 불러오는 중...</p>
          ) : groupMembers.length === 0 ? (
            <p>현재 등록된 멤버가 없습니다.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>닉네임</th>
                  <th>ID</th>
                  <th>역할</th>
                  <th>상태</th>
                  <th>가입일</th>
                  <th>작업</th>
                </tr>
              </thead>

              <tbody>
                {groupMembers.map((member) => (
                  <tr key={member.id}>
                    <td>{member.profiles?.nickname || '-'}</td>
                    <td>{member.profiles?.username || '-'}</td>
                    <td>{member.profiles?.role || '-'}</td>
                    <td>{member.status}</td>
                    <td>
                      {member.joined_at
                        ? new Date(
                            member.joined_at
                          ).toLocaleDateString('ko-KR')
                        : '-'}
                    </td>
                    <td>
                      <button
                        className="reject-button"
                        onClick={() => deleteGroupMember(member.id)}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!loadingGroupMembers &&
            availableMembers.length === 0 &&
            groupMembers.length > 0 && (
              <p style={{ marginTop: '12px', color: '#666' }}>
                추가할 수 있는 승인된 사용자가 없습니다.
              </p>
            )}
        </div>
      )}

      {/* =========================
          콘텐츠 관리
      ========================= */}

      {activeTab ===
        'videos' && (

        loadingVideos ? (

          <p>
            불러오는 중...
          </p>

        ) : (

          <>

            <div className="content-admin-filters">
              <div className="content-admin-filter content-admin-filter-search">
                <label htmlFor="content-search">콘텐츠 검색</label>
                <input
                  id="content-search"
                  type="search"
                  value={contentSearchText}
                  onChange={(event) => setContentSearchText(event.target.value)}
                  placeholder="제목 검색"
                />
              </div>

              <div className="content-admin-filter">
                <label htmlFor="content-status-filter">상태</label>
                <select
                  id="content-status-filter"
                  value={contentStatusFilter}
                  onChange={(event) => setContentStatusFilter(event.target.value)}
                >
                  <option value="all">전체</option>
                  <option value="ACTIVE">표시</option>
                  <option value="HIDDEN">숨김</option>
                </select>
              </div>

              <div className="content-admin-filter">
                <label htmlFor="content-type-filter">유형</label>
                <select
                  id="content-type-filter"
                  value={contentMediaTypeFilter}
                  onChange={(event) =>
                    setContentMediaTypeFilter(event.target.value)
                  }
                >
                  <option value="all">전체</option>
                  <option value="audio">🎵 음악</option>
                  <option value="video">🎬 영상</option>
                  <option value="image">🖼 이미지</option>
                  <option value="document">📄 문서</option>
                </select>
              </div>

              <div className="content-admin-filter">
                <label htmlFor="content-primary-menu-filter">1차 메뉴</label>
                <select
                  id="content-primary-menu-filter"
                  value={contentPrimaryMenuId}
                  onChange={(event) => {
                    setContentPrimaryMenuId(event.target.value)
                    setContentSubMenuId('')
                  }}
                >
                  <option value="">전체</option>
                  {contentPrimaryMenus.map((menu) => (
                    <option key={menu.id} value={menu.id}>
                      {menu.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="content-admin-filter">
                <label htmlFor="content-sub-menu-filter">2차 메뉴</label>
                <select
                  id="content-sub-menu-filter"
                  value={contentSubMenuId}
                  disabled={!contentPrimaryMenuId}
                  onChange={(event) => setContentSubMenuId(event.target.value)}
                >
                  <option value="">전체</option>
                  {contentSubMenus.map((menu) => (
                    <option key={menu.id} value={menu.id}>
                      {menu.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="content-admin-table-wrap">
            <table className="admin-table content-admin-table">

              <colgroup>
                <col className="content-col-title" />
                <col className="content-col-status" />
                <col className="content-col-permission" />
                <col className="content-col-groups" />
                <col className="content-col-type" />
                <col className="content-col-menu" />
                <col className="content-col-actions" />
                <col className="content-col-views" />
                <col className="content-col-date" />
              </colgroup>

              <thead>

                <tr>

                  <th className="content-admin-title-cell">
                    제목
                  </th>

                  <th>
                    상태
                  </th>

                  <th>
                    공개
                  </th>

                  <th>
                    공유 그룹
                  </th>

                  <th>
                    유형
                  </th>

                  <th>
                    메뉴
                  </th>

                  <th>
                    작업
                  </th>

                  <th>
                    조회수
                  </th>

                  <th>
                    업로드일
                  </th>

                </tr>

              </thead>

              <tbody>

                {filteredVideos.length === 0 ? (
                  <tr>
                    <td className="content-admin-empty" colSpan={9}>
                      조건에 맞는 콘텐츠가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredVideos.map(
                  (video) => (

                    <tr
                      key={
                        video.id
                      }
                    >

                      <td className="content-admin-title-cell">
                        <span className="content-admin-title-text">
                          {video.title}
                        </span>
                      </td>

                      <td>
                        {(() => {
                          const status = getVideoStatusPresentation(
                            video.status
                          )

                          return status.toggleable ? (
                            <button
                              type="button"
                              className={`content-status-button ${status.className}`}
                              onClick={() => toggleVideoStatus(video)}
                              title={
                                video.status === 'ACTIVE'
                                  ? '콘텐츠 숨기기'
                                  : '콘텐츠 다시 표시하기'
                              }
                            >
                              {status.label}
                            </button>
                          ) : (
                            <span
                              className={`content-status-button ${status.className}`}
                              title="예상하지 못한 콘텐츠 상태"
                            >
                              {status.label}
                            </span>
                          )
                        })()}
                      </td>

                      <td>
                        <span
                          className={
                            videoPermissionSummary[video.id]?.type === 'GROUP'
                              ? 'status-badge status-rejected'
                              : 'status-badge status-approved'
                          }
                        >
                          {videoPermissionSummary[video.id]?.type === 'GROUP'
                            ? '👥 그룹'
                            : '🌐 전체'}
                        </span>
                      </td>

                      <td>
                        {videoPermissionSummary[video.id]?.type === 'GROUP' &&
                        videoPermissionSummary[video.id]?.groups?.length
                          ? videoPermissionSummary[video.id].groups.join(', ')
                          : '-'}
                      </td>

                      <td>
                        {(() => {
                          const mediaType = getNormalizedMediaType(
                            video.media_type
                          )
                          const presentation =
                            contentMediaTypePresentation[mediaType]

                          return (
                            <span
                              className="content-type-icon"
                              title={presentation.label}
                              aria-label={presentation.label}
                            >
                              {presentation.icon}
                            </span>
                          )
                        })()}
                      </td>

                      <td>
                        {getContentMenuLabel(video.menu_id)}
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
                          className="approve-button"
                          onClick={() =>
                            openVideoPermission(video)
                          }
                        >
                          공개 범위
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

                      <td>
                        {
                          video.views
                        }
                      </td>

                      <td>
                        {new Date(
                          video.created_at
                        ).toLocaleDateString(
                          'ko-KR',
                          {
                            year: '2-digit',
                            month: 'numeric',
                            day: 'numeric',
                          }
                        )}
                      </td>

                    </tr>

                  )
                  )
                )}

              </tbody>

            </table>
            </div>


            {/* =========================
                콘텐츠 수정 모달
            ========================= */}

            {editingId && (

              <div className="video-edit-overlay" role="presentation">
              <div
                className="video-edit-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="video-edit-title"
              >
                <div className="video-edit-header">
                  <div>
                    <h2 id="video-edit-title">콘텐츠 수정</h2>
                    <p>콘텐츠 정보, 파일, 커버 이미지를 수정할 수 있습니다.</p>
                  </div>
                  <button
                    type="button"
                    className="video-edit-close"
                    onClick={cancelEditing}
                    disabled={savingVideo}
                    aria-label="수정 창 닫기"
                  >
                    ×
                  </button>
                </div>

                <div className="video-edit-grid">
                  <div className="video-edit-column">
                    <label>제목</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                    />

                    <label>콘텐츠 타입</label>
                    <select
                      value={editMediaType}
                      onChange={(e) =>
                        handleEditMediaTypeChange(e.target.value)
                      }
                    >
                      {Object.entries(mediaTypeOptions).map(
                        ([value, option]) => (
                          <option key={value} value={value}>
                            {option.label}
                          </option>
                        )
                      )}
                    </select>

                    <label>1차 메뉴</label>
                    <select
                      value={editPrimaryMenuId}
                      onChange={(e) => {
                        setEditPrimaryMenuId(e.target.value)
                        setEditSubMenuId('')
                      }}
                    >
                      <option value="">1차 메뉴를 선택하세요</option>
                      {menus
                        .filter((menu) => menu.level === 1)
                        .sort(
                          (a, b) =>
                            (a.sort_order ?? 0) - (b.sort_order ?? 0)
                        )
                        .map((menu) => (
                          <option key={menu.id} value={menu.id}>
                            {menu.name}
                          </option>
                        ))}
                    </select>

                    <label>2차 메뉴</label>
                    <select
                      value={editSubMenuId}
                      onChange={(e) => setEditSubMenuId(e.target.value)}
                      disabled={!editPrimaryMenuId}
                    >
                      <option value="">2차 메뉴를 선택하세요</option>
                      {menus
                        .filter(
                          (menu) =>
                            menu.level === 2 &&
                            menu.parent_id === editPrimaryMenuId &&
                            menu.name !== 'All' &&
                            menu.name !== 'Playlist'
                        )
                        .sort(
                          (a, b) =>
                            (a.sort_order ?? 0) - (b.sort_order ?? 0)
                        )
                        .map((menu) => (
                          <option key={menu.id} value={menu.id}>
                            {menu.name}
                          </option>
                        ))}
                    </select>

                    <label>설명 / 가사</label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="설명이나 가사를 입력하세요 (선택사항)"
                      rows="10"
                    />

                    <label>싱크 가사 (선택)</label>
                    <textarea
                      value={editSyncLyrics}
                      onChange={(e) => setEditSyncLyrics(e.target.value)}
                      placeholder={'[00:12.40] 어릴 땐 빨리 크고 싶었지\n[00:16.80] 내맘대로 살고 싶어서'}
                      rows="6"
                    />
                    {editMediaType === 'audio' && (
                      <button
                        type="button"
                        className="lyrics-sync-open-button"
                        onClick={openLyricsEditor}
                      >
                        싱크 편집
                      </button>
                    )}
                  </div>

                  <div className="video-edit-column video-edit-media-column">
                    <div className="video-edit-current-file">
                      <div className="video-edit-current-file-info">
                        <strong>현재 미디어 파일</strong>
                        {editingMediaFileName && (
                          <span title={editingMediaFileName}>
                            {editingMediaFileName}
                          </span>
                        )}
                      </div>
                      {editingVideo?.video_url ? (
                        <a
                          href={editingVideo.video_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          현재 파일 열기
                        </a>
                      ) : (
                        <span>-</span>
                      )}
                    </div>

                    <label>
                      {mediaTypeOptions[editMediaType].label} 파일 교체
                    </label>
                    <input
                      key={editMediaType}
                      type="file"
                      accept={mediaTypeOptions[editMediaType].accept}
                      onChange={(e) => {
                        if (!handleEditMediaSelect(e.target.files?.[0])) {
                          e.target.value = ''
                        }
                      }}
                    />
                    {editMediaFile && <p>선택한 파일: {editMediaFile.name}</p>}

                    <label>현재 커버 이미지</label>
                    {editThumbnailPreview ? (
                      <img
                        className="video-edit-thumbnail"
                        src={editThumbnailPreview}
                        alt="커버 이미지 미리보기"
                      />
                    ) : (
                      <p>등록된 커버 이미지가 없습니다.</p>
                    )}

                    {capturingEditThumbnail && (
                      <p>썸네일을 캡처하는 중...</p>
                    )}

                    {editMediaType !== 'image' && (
                      <>
                        <label>커버 이미지 교체</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            handleEditThumbnailSelect(e.target.files?.[0])
                          }
                        />
                      </>
                    )}

                    {editThumbnailFile && (
                      <p>선택한 썸네일: {editThumbnailFile.name}</p>
                    )}

                    <p className="video-edit-help">
                      {editMediaType === 'audio'
                        ? '기본 커버가 자동 적용됩니다. 직접 이미지를 선택해 바꿀 수도 있어요.'
                        : editMediaType === 'video'
                          ? '영상에서 자동으로 캡처되며, 직접 이미지를 선택해 바꿀 수도 있어요.'
                          : editMediaType === 'image'
                            ? '선택한 이미지가 미리보기와 썸네일로 사용됩니다.'
                            : '기본 문서 썸네일이 적용되며, 직접 이미지를 선택해 바꿀 수도 있어요.'}
                    </p>

                    <video ref={editVideoRef} style={{ display: 'none' }} muted />
                    <canvas ref={editCanvasRef} style={{ display: 'none' }} />
                  </div>
                </div>

                <div className="video-edit-buttons">
                  <button
                    className="approve-button"
                    onClick={() => saveEditing(editingId)}
                    disabled={savingVideo || capturingEditThumbnail}
                  >
                    {savingVideo ? '저장 중...' : '저장'}
                  </button>
                  <button
                    className="reject-button"
                    onClick={cancelEditing}
                    disabled={savingVideo}
                  >
                    취소
                  </button>
                </div>
              </div>
              </div>

            )}

          </>

        )
      )}

      {lyricsEditorVideo && (
        <div className="lyrics-sync-editor-overlay" role="presentation">
          <div
            className="lyrics-sync-editor"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lyrics-sync-editor-title"
          >
            <div className="lyrics-sync-editor-header">
              <div>
                <h2 id="lyrics-sync-editor-title">싱크 편집</h2>
                <p>{lyricsEditorVideo.title}</p>
              </div>
              <button
                type="button"
                className="video-edit-close"
                onClick={closeLyricsEditor}
                aria-label="싱크 편집 닫기"
              >
                ×
              </button>
            </div>

            <div className="lyrics-sync-editor-player">
              <audio
                ref={lyricsEditorAudioRef}
                src={lyricsEditorVideo.video_url}
                controls
                onLoadedMetadata={(event) => setEditorDuration(event.currentTarget.duration || 0)}
                onTimeUpdate={(event) => {
                  const nextTime = event.currentTarget.currentTime
                  setEditorCurrentTime(nextTime)
                  updatePlayingLyricIndex(nextTime)
                }}
                onPlay={() => setEditorPlaying(true)}
                onPause={() => setEditorPlaying(false)}
              />
              <div className="lyrics-sync-editor-time-row">
                <span>{formatEditorTime(editorCurrentTime)}</span>
                <span>{formatEditorTime(editorDuration)}</span>
              </div>
              <input
                className="lyrics-sync-editor-progress"
                type="range"
                min="0"
                max={editorDuration || 0}
                step="0.01"
                value={Math.min(editorCurrentTime, editorDuration || editorCurrentTime)}
                onChange={(event) => {
                  const nextTime = Number(event.target.value)
                  if (lyricsEditorAudioRef.current) lyricsEditorAudioRef.current.currentTime = nextTime
                  setEditorCurrentTime(nextTime)
                  updatePlayingLyricIndex(nextTime)
                }}
                disabled={!editorDuration}
                aria-label="재생 위치"
              />
              <div className="lyrics-sync-editor-player-actions">
                <button type="button" onClick={() => { const nextTime = Math.max(0, (lyricsEditorAudioRef.current?.currentTime || 0) - 5); if (lyricsEditorAudioRef.current) lyricsEditorAudioRef.current.currentTime = nextTime; setEditorCurrentTime(nextTime); updatePlayingLyricIndex(nextTime) }}>−5초</button>
                <button type="button" onClick={() => { const nextTime = Math.min(editorDuration || Infinity, (lyricsEditorAudioRef.current?.currentTime || 0) + 5); if (lyricsEditorAudioRef.current) lyricsEditorAudioRef.current.currentTime = nextTime; setEditorCurrentTime(nextTime); updatePlayingLyricIndex(nextTime) }}>+5초</button>
                <label>
                  입력 보정
                  <input
                    type="number"
                    min="-1"
                    max="1"
                    step="0.01"
                    value={editorCompensation}
                    onChange={(event) => setEditorCompensation(Math.max(-1, Math.min(1, Number(event.target.value) || 0)))}
                  /> 초
                </label>
                <span>{editorPlaying ? '재생 중' : '일시정지'}</span>
              </div>
            </div>

            <div className="lyrics-sync-editor-toolbar">
              <button type="button" onClick={() => insertEditorLine('before')} disabled={editorLines.length > 0 && editorTargetIndex < 0}>윗줄 추가</button>
              <button type="button" onClick={() => insertEditorLine('after')} disabled={editorLines.length > 0 && editorTargetIndex < 0}>아랫줄 추가</button>
              <button type="button" onClick={mergeSelectedEditorLines} disabled={editorSelectedIndices.length < 2}>선택 줄 합치기</button>
              <button type="button" onClick={() => openSplitEditor(editorSelectedIndices[0])} disabled={editorSelectedIndices.length !== 1}>선택 줄 나누기</button>
              <button type="button" onClick={deleteSelectedEditorLines} disabled={editorSelectedIndices.length === 0}>선택 줄 삭제</button>
              <span>{editorLines.length}줄 · Space로 현재 시간 찍기</span>
            </div>

            {editorError && <p className="lyrics-sync-editor-error" role="alert">{editorError}</p>}

            <div className="lyrics-sync-editor-list" ref={lyricsEditorListRef} onScroll={handleLyricsEditorListScroll}>
              {editorLines.length === 0 && <p className="lyrics-sync-editor-empty">가사 줄이 없습니다. 기존 가사를 입력하거나 줄을 추가해주세요.</p>}
              {editorLines.map((line, index) => (
                <div
                  key={line.id}
                  ref={(element) => { lyricsEditorLineRefs.current[index] = element }}
                  className={`lyrics-sync-editor-line${editorTargetIndex === index ? ' current' : ''}${playingLyricIndex === index ? ' playing' : ''}${line.start != null ? ' completed' : ''}`}
                  onClick={() => setEditorTargetIndex(index)}
                >
                  <input
                    type="checkbox"
                    checked={editorSelectedIndices.includes(index)}
                    onChange={() => setEditorSelectedIndices((previous) => previous.includes(index) ? previous.filter((item) => item !== index) : [...previous, index])}
                    onClick={(event) => event.stopPropagation()}
                    aria-label={`${index + 1}번째 줄 선택`}
                  />
                  <span className="lyrics-sync-editor-line-time">{line.start == null ? '--:--.--' : formatEditorTime(line.start)}</span>
                  <input
                    className="lyrics-sync-editor-line-text"
                    value={line.text}
                    onChange={(event) => setEditorLines((previous) => previous.map((item, itemIndex) => itemIndex === index ? { ...item, text: event.target.value } : item))}
                    onClick={(event) => event.stopPropagation()}
                    aria-label={`${index + 1}번째 가사`}
                  />
                  <div className="lyrics-sync-editor-line-actions">
                    <button type="button" onClick={(event) => { event.stopPropagation(); adjustEditorLine(index, -0.5) }}>−0.5</button>
                    <button type="button" onClick={(event) => { event.stopPropagation(); adjustEditorLine(index, -0.1) }}>−0.1</button>
                    <button type="button" onClick={(event) => { event.stopPropagation(); adjustEditorLine(index, 0.1) }}>+0.1</button>
                    <button type="button" onClick={(event) => { event.stopPropagation(); adjustEditorLine(index, 0.5) }}>+0.5</button>
                    <button type="button" disabled={line.start == null} onClick={(event) => { event.stopPropagation(); if (!lyricsEditorAudioRef.current || line.start == null) return; lyricsEditorAudioRef.current.currentTime = Number(line.start); setEditorCurrentTime(Number(line.start)); updatePlayingLyricIndex(Number(line.start)); lyricsEditorAudioRef.current.play() }}>이 줄부터 재생</button>
                    <button type="button" onClick={(event) => { event.stopPropagation(); resetEditorFromLine(index) }}>이 줄부터 다시 찍기</button>
                  </div>
                </div>
              ))}
            </div>

            {splitEditorIndex != null && (
              <div className="lyrics-sync-split-overlay" role="presentation">
                <div className="lyrics-sync-split-dialog" role="dialog" aria-modal="true" aria-labelledby="lyrics-split-title">
                  <h3 id="lyrics-split-title">선택 줄 나누기</h3>
                  <p>줄바꿈한 위치마다 새 가사 줄이 만들어집니다. 첫 줄의 시간만 유지됩니다.</p>
                  <textarea
                    value={splitEditorText}
                    onChange={(event) => setSplitEditorText(event.target.value)}
                    rows="6"
                    autoFocus
                  />
                  <div className="lyrics-sync-split-actions">
                    <button type="button" className="reject-button" onClick={() => { setSplitEditorIndex(null); setSplitEditorText('') }}>취소</button>
                    <button type="button" className="approve-button" onClick={applySplitEditor}>나누기</button>
                  </div>
                </div>
              </div>
            )}

            <div className="lyrics-sync-editor-footer">
              <button type="button" className="approve-button" onClick={() => stampEditorLine()}>지금 시간 찍기</button>
              <button type="button" className="approve-button" onClick={saveLyricsEditor}>싱크 저장</button>
              <button type="button" className="reject-button" onClick={closeLyricsEditor}>취소</button>
            </div>
          </div>
        </div>
      )}

      {/* =========================
          메뉴 관리
      ========================= */}

      {activeTab === 'menus' && (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <h2 style={{ margin: 0 }}>메뉴 관리</h2>

            <button
              className="approve-button"
              onClick={startCreatingMenu}
            >
              + 메뉴 추가
            </button>
          </div>

          {showMenuForm && (
            <div
              style={{
                border: '1px solid #ddd',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '24px',
              }}
            >
              <h3 style={{ marginTop: 0 }}>
                {editingMenuId ? '메뉴 수정' : '메뉴 추가'}
              </h3>

              <div
                style={{
                  display: 'grid',
                  gap: '12px',
                }}
              >
                                <div>
                  <label>메뉴 이름</label>
                  <input
                    type="text"
                    value={menuName}
                    onChange={(e) =>
                      setMenuName(e.target.value)
                    }
                    placeholder="예: 어학"
                    style={{ width: '100%' }}
                  />
                  <small
                    style={{
                      display: 'block',
                      marginTop: '6px',
                      color: '#777',
                    }}
                  >
                    사용자에게 표시되는 메뉴 이름입니다.
                  </small>
                </div>

                <div>
                  <label>상위 메뉴</label>
                  <select
                    value={menuParentId}
                    onChange={(e) =>
                      setMenuParentId(e.target.value)
                    }
                    style={{ width: '100%' }}
                  >
                    <option value="">
                      1차 메뉴
                    </option>

                    {menus
                      .filter(
                        (menu) =>
                          menu.level === 1 &&
                          menu.id !== editingMenuId
                      )
                      .map((menu) => (
                        <option
                          key={menu.id}
                          value={menu.id}
                        >
                          {menu.name}
                        </option>
                      ))}
                  </select>

                  <small
                    style={{
                      display: 'block',
                      marginTop: '6px',
                      color: '#777',
                    }}
                  >
                    2차 메뉴인 경우 상위 1차 메뉴를 선택합니다.
                  </small>
                </div>

                <div>
                  <label>Route</label>

                  {menuParentId ? (
                    (() => {
                      const parentMenu = menus.find(
                        (menu) =>
                          menu.id === menuParentId
                      )

                      const parentRoute =
                        parentMenu?.route || ''

                      const childRoute =
                        menuRoute.startsWith(
                          `${parentRoute}/`
                        )
                          ? menuRoute.slice(
                              parentRoute.length + 1
                            )
                          : menuRoute

                      return (
                        <>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              width: '100%',
                            }}
                          >
                            <span
                              style={{
                                padding: '10px 0',
                                color: '#666',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {parentRoute}/
                            </span>

                            <input
                              type="text"
                              value={childRoute}
                              onChange={(e) =>
                                setMenuRoute(
                                  `${parentRoute}/${e.target.value}`
                                )
                              }
                              placeholder="language"
                              style={{
                                flex: 1,
                                minWidth: 0,
                              }}
                            />
                          </div>
                        </>
                      )
                    })()
                  ) : (
                    <input
                      type="text"
                      value={menuRoute}
                      onChange={(e) =>
                        setMenuRoute(e.target.value)
                      }
                      placeholder="/music"
                      style={{ width: '100%' }}
                    />
                  )}

                  <small
                    style={{
                      display: 'block',
                      marginTop: '6px',
                      color: '#777',
                    }}
                  >
                    화면을 구분하는 경로입니다.
                    2차 메뉴는 상위 메뉴의 경로가 자동으로 표시됩니다.
                    영문과 숫자 사용을 권장합니다.
                  </small>
                </div>

                {!menuParentId && (
                  <div>
                    <label>Icon</label>

                    <div
                      style={{
                        display: 'flex',
                        gap: '8px',
                        flexWrap: 'wrap',
                        marginTop: '8px',
                      }}
                    >
                      {[
                        ['home', '⌂', '홈'],
                        ['video', '▶', '영상'],
                        ['music', '♫', '음악'],
                        ['book-open', '▤', '책'],
                        ['playground', '✦', '놀이터'],
                        ['library', '▣', '보관함'],
                      ].map(
                        ([key, icon, label]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() =>
                              setMenuIcon(icon)
                            }
                            style={{
                              padding: '8px 12px',
                              border:
                                menuIcon === icon
                                  ? '2px solid #222'
                                  : '1px solid #ddd',
                              borderRadius: '8px',
                              background:
                                menuIcon === icon
                                  ? '#f0f0f0'
                                  : '#fff',
                              cursor: 'pointer',
                              fontSize: '14px',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '20px',
                                marginRight: '5px',
                              }}
                            >
                              {icon}
                            </span>
                            {label}
                          </button>
                        )
                      )}
                    </div>

                    <small
                      style={{
                        display: 'block',
                        marginTop: '6px',
                        color: '#777',
                      }}
                    >
                      1차 메뉴에 표시할 아이콘을 선택합니다.
                    </small>
                  </div>
                )}

                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: '#f8f8f8',
                    color: '#666',
                    fontSize: '14px',
                  }}
                >
                  <strong>정렬 순서</strong>

                  <div style={{ marginTop: '4px' }}>
                    자동 설정
                  </div>

                  <small>
                    같은 상위 메뉴의 마지막 위치에 자동으로 추가됩니다.
                  </small>
                </div>
<div>
  <label>연결 그룹</label>

  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      marginTop: '8px',
      padding: '12px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      background: '#fafafa',
    }}
  >
    {groups.length === 0 ? (
      <span style={{ color: '#777' }}>
        등록된 그룹이 없습니다.
      </span>
    ) : (
      groups.map((group) => (
        <label
          key={group.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <input
            type="checkbox"
            checked={selectedMenuGroupIds.includes(group.id)}
            onChange={(e) => {
              setSelectedMenuGroupIds((prev) =>
                e.target.checked
                  ? [...prev, group.id]
                  : prev.filter(
                      (id) => id !== group.id
                    )
              )
            }}
          />

          {group.name}
        </label>
      ))
    )}
  </div>
</div>
                <label>
                  <input
                    type="checkbox"
                    checked={menuVisible}
                    onChange={(e) =>
                      setMenuVisible(e.target.checked)
                    }
                  />
                  {' '}메뉴 표시
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={menuActive}
                    onChange={(e) =>
                      setMenuActive(e.target.checked)
                    }
                  />
                  {' '}메뉴 활성
                </label>

                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                  }}
                >
                  <button
                    className="approve-button"
                    onClick={saveMenu}
                    disabled={savingMenu}
                  >
                    {savingMenu
                      ? '저장 중...'
                      : '저장'}
                  </button>

                  <button
                    className="reject-button"
                    onClick={resetMenuForm}
                    disabled={savingMenu}
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          )}

          {loadingMenus ? (
            <p>메뉴를 불러오는 중...</p>
          ) : menus.length === 0 ? (
            <p>등록된 메뉴가 없습니다.</p>
          ) : (
           <table className="admin-table menu-admin-table">
              <thead>
  <tr>
    <th>메뉴</th>
    <th>레벨</th>
    <th>순서</th>
    <th>표시</th>
    <th>상태</th>
    <th>작업</th>
  </tr>
</thead>

              <tbody>
                              {menus
                .filter((menu) => menu.level === 1)
                .sort(
                  (a, b) =>
                    (a.sort_order ?? 0) -
                    (b.sort_order ?? 0)
                )
                .flatMap((parentMenu) => {
                  const children = menus
                    .filter(
                      (menu) =>
                        menu.level === 2 &&
                        menu.parent_id === parentMenu.id
                    )
                    .sort(
                      (a, b) =>
                        (a.sort_order ?? 0) -
                        (b.sort_order ?? 0)
                    )

                  return [
                    parentMenu,
                    ...children,
                  ]
                })
                .map((menu) => {
                  const parentMenu =
                    menu.level === 2
                      ? menus.find(
                          (item) =>
                            item.id ===
                            menu.parent_id
                        )
                      : null

                  return (
                    <tr key={menu.id}>
                      <td>
                        {menu.level === 2
                          ? '　↳ '
                          : ''}

                        <strong>
                          {menu.name}
                        </strong>
                      </td>

                      <td>
                        {menu.level}
                      </td>

                     

                      <td>
                       {menu.level === 1
                         ? `${menu.sort_order}-0`
                         : `${parentMenu?.sort_order ?? 0}-${menu.sort_order}`}
                      </td>

                     <td>
  <button
    className={
      menu.is_visible
        ? 'approve-button'
        : 'reject-button'
    }
    onClick={() =>
      toggleMenuVisible(menu)
    }
    title={
      menu.is_visible
        ? '클릭하면 숨김'
        : '클릭하면 표시'
    }
  >
    {menu.is_visible
      ? '표시'
      : '숨김'}
  </button>
</td>

                     <td>
  <button
    className={
      menu.is_active
        ? 'approve-button'
        : 'reject-button'
    }
    onClick={() =>
      toggleMenuActive(menu)
    }
    title={
      menu.is_active
        ? '클릭하면 비활성'
        : '클릭하면 활성'
    }
  >
    {menu.is_active
      ? 'ACTIVE'
      : 'INACTIVE'}
  </button>
</td>

                      <td>
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: '6px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <button
                            className="approve-button"
                            onClick={() =>
                              startEditingMenu(menu)
                            }
                          >
                            수정
                          </button>
<button
  className="approve-button"
  onClick={() =>
    moveMenuUp(menu)
  }
  title="위로 이동"
>
  ↑
</button>

<button
  className="approve-button"
  onClick={() =>
    moveMenuDown(menu)
  }
  title="아래로 이동"
>
  ↓
</button>
                        
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
           {/* =========================
          카테고리 관리
      ========================= */}

      {activeTab === 'categories' && (
        <div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <h2 style={{ margin: 0 }}>
              카테고리 관리
            </h2>

            <button
              className="approve-button"
              onClick={startCreatingCategory}
            >
              + 카테고리 추가
            </button>
          </div>

          {showCategoryForm && (
            <div
              style={{
                border: '1px solid #ddd',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '24px',
              }}
            >

              <h3 style={{ marginTop: 0 }}>
                {editingCategoryId
                  ? '카테고리 수정'
                  : '카테고리 추가'}
              </h3>

              <div
                style={{
                  display: 'grid',
                  gap: '12px',
                }}
              >

                <div>
                  <label>2차 메뉴</label>

                  <select
                    value={categoryMenuId}
                    onChange={(e) =>
                      setCategoryMenuId(e.target.value)
                    }
                    style={{ width: '100%' }}
                  >
                    <option value="">
                      2차 메뉴 선택
                    </option>

                    {menus
                      .filter(
                        (menu) => menu.level === 2
                      )
                      .sort(
                        (a, b) =>
                          (a.sort_order ?? 0) -
                          (b.sort_order ?? 0)
                      )
                      .map((menu) => (
                        <option
                          key={menu.id}
                          value={menu.id}
                        >
                          {menu.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label>카테고리 이름</label>

                  <input
                    type="text"
                    value={categoryName}
                    onChange={(e) =>
                      setCategoryName(e.target.value)
                    }
                    placeholder="예: Pop"
                    style={{ width: '100%' }}
                  />
                </div>

                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: '#f8f8f8',
                    color: '#666',
                    fontSize: '14px',
                  }}
                >
                  <strong>정렬 순서</strong>

                  <div style={{ marginTop: '4px' }}>
                    자동 설정
                  </div>

                  <small>
                    같은 2차 메뉴의 마지막 위치에
                    자동으로 추가됩니다.
                  </small>
                </div>

                <label>
                  <input
                    type="checkbox"
                    checked={categoryActive}
                    onChange={(e) =>
                      setCategoryActive(
                        e.target.checked
                      )
                    }
                  />
                  {' '}카테고리 활성
                </label>

                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                  }}
                >

                  <button
                    className="approve-button"
                    onClick={saveCategory}
                    disabled={savingCategory}
                  >
                    {savingCategory
                      ? '저장 중...'
                      : '저장'}
                  </button>

                  <button
                    className="reject-button"
                    onClick={resetCategoryForm}
                    disabled={savingCategory}
                  >
                    취소
                  </button>

                </div>

              </div>
            </div>
          )}

          {loadingCategories ? (
            <p>카테고리를 불러오는 중...</p>
          ) : categories.length === 0 ? (
            <p>등록된 카테고리가 없습니다.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>2차 메뉴</th>
                  <th>카테고리</th>
                  <th>순서</th>
                  <th>상태</th>
                  <th>작업</th>
                </tr>
              </thead>

              <tbody>
                {categories
                  .slice()
                  .sort((a, b) => {
                    const menuA = menus.find(
                      (menu) => menu.id === a.menu_id
                    )
                    const menuB = menus.find(
                      (menu) => menu.id === b.menu_id
                    )

                    return (
                      (menuA?.sort_order ?? 0) -
                        (menuB?.sort_order ?? 0) ||
                      (a.sort_order ?? 0) -
                        (b.sort_order ?? 0)
                    )
                  })
                  .map((category) => {

                    const menu = menus.find(
                      (item) =>
                        item.id === category.menu_id
                    )

                    return (
                      <tr key={category.id}>

                        <td>
                          {menu?.name ?? '-'}
                        </td>

                        <td>
                          <strong>
                            {category.name}
                          </strong>
                        </td>

                        <td>
                          {category.sort_order}
                        </td>

                        <td>
                          {category.is_active
                            ? 'ACTIVE'
                            : 'INACTIVE'}
                        </td>

                        <td>
                          <div
                            style={{
                              display: 'flex',
                              gap: '6px',
                            }}
                          >

                            <button
                              className="approve-button"
                              onClick={() =>
                                startEditingCategory(
                                  category
                                )
                              }
                            >
                              수정
                            </button>

                            <button
                              className="reject-button"
                              onClick={() =>
                                deleteCategory(
                                  category.id
                                )
                              }
                            >
                              삭제
                            </button>

                          </div>
                        </td>

                      </tr>
                    )
                  })}
              </tbody>
            </table>
          )}

        </div>
      )}
      {/* =========================
          콘텐츠 접근 권한 관리
      ========================= */}

      {activeTab === 'videos' && selectedPermissionVideoId && (
        <div
          className="video-edit-overlay permission-edit-overlay"
          onClick={(event) => {
            if (
              event.target === event.currentTarget &&
              !savingVideoPermission
            ) {
              closeVideoPermission()
            }
          }}
        >
          <div
            className="permission-edit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="permission-edit-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="permission-edit-header">
              <div>
                <h2 id="permission-edit-title">공개 범위</h2>
                {permissionEditingVideo?.title && (
                  <strong className="permission-edit-content-title">
                    {permissionEditingVideo.title}
                  </strong>
                )}
                <p>선택한 콘텐츠의 공개 범위를 설정합니다.</p>
              </div>

              <button
                type="button"
                className="video-edit-close"
                onClick={closeVideoPermission}
                disabled={savingVideoPermission}
                aria-label="공개 범위 창 닫기"
              >
                ×
              </button>
            </div>

            {loadingVideoPermission ? (
              <p>권한 정보를 불러오는 중...</p>
            ) : (
              <div className="permission-edit-body">
                <div>
                  <label>공개 범위</label>

                  <select
                    value={permissionType}
                    onChange={(e) => {
                      const value = e.target.value
                      setPermissionType(value)

                      if (value === 'PUBLIC') {
                        setPermissionGroupIds([])
                      }
                    }}
                  >
                    <option value="PUBLIC">전체 공개</option>
                    <option value="GROUP">그룹 전용</option>
                  </select>
                </div>

                {permissionType === 'GROUP' && (
                  <div>
                    <label>그룹</label>

                    {permissionGroups.length === 0 ? (
                      <p className="permission-edit-empty">
                        활성화된 그룹이 없습니다. 먼저 그룹을 생성해주세요.
                      </p>
                    ) : (
                      <div className="permission-edit-groups">
                        {permissionGroups.map((group) => (
                          <label key={group.id}>
                            <input
                              type="checkbox"
                              checked={permissionGroupIds.includes(group.id)}
                              onChange={(e) => {
                                setPermissionGroupIds((prev) =>
                                  e.target.checked
                                    ? [...prev, group.id]
                                    : prev.filter((id) => id !== group.id)
                                )
                              }}
                            />
                            <span>{group.name}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {permissionGroupIds.length > 0 && (
                      <p className="permission-edit-count">
                        {permissionGroupIds.length}개 그룹 선택됨
                      </p>
                    )}
                  </div>
                )}

                <div className="permission-edit-actions">
                  <button
                    className="reject-button"
                    onClick={closeVideoPermission}
                    disabled={savingVideoPermission}
                  >
                    취소
                  </button>

                  <button
                    className="approve-button"
                    onClick={saveVideoPermission}
                    disabled={
                      savingVideoPermission ||
                      (permissionType === 'GROUP' &&
                        permissionGroupIds.length === 0)
                    }
                  >
                    {savingVideoPermission ? '저장 중...' : '권한 저장'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

export default Admin
