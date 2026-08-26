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
  const [loadingGroupMembers, setLoadingGroupMembers] = useState(false)
  const [availableMembers, setAvailableMembers] = useState([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [addingMember, setAddingMember] = useState(false)

  // =========================
  // 초기 로딩
  // =========================

  useEffect(() => {
    loadProfiles()
    loadVideos()
    loadGroupTypes()
    loadGroups()
    loadPermissionGroups()
    loadVideoPermissionSummaries()
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
          email,
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
      .select('id, email, nickname, role, status')
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
                    <td>
                      <span
                        className={`status-badge ${
                          group.is_active
                            ? 'status-approved'
                            : 'status-rejected'
                        }`}
                      >
                        {group.is_active ? 'ACTIVE' : 'INACTIVE'}
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
                          gap: '6px',
                          flexWrap: 'wrap',
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
                  {profile.nickname || profile.email} ({profile.role})
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
                  <th>이메일</th>
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
                    <td>{member.profiles?.email || '-'}</td>
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
                    접근 권한
                  </th>

                  <th>
                    공유 그룹
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
                        <span
                          className={
                            videoPermissionSummary[video.id]?.type === 'GROUP'
                              ? 'status-badge status-rejected'
                              : 'status-badge status-approved'
                          }
                        >
                          {videoPermissionSummary[video.id]?.type === 'GROUP'
                            ? '🔒 그룹 전용'
                            : '🌐 전체 공개'}
                        </span>
                      </td>

                      <td>
                        {videoPermissionSummary[video.id]?.type === 'GROUP' &&
                        videoPermissionSummary[video.id]?.groups?.length
                          ? videoPermissionSummary[video.id].groups.join(', ')
                          : '-'}
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
                          className="approve-button"
                          onClick={() =>
                            openVideoPermission(video)
                          }
                        >
                          접근 권한
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


      {/* =========================
          영상 접근 권한 관리
      ========================= */}

      {activeTab === 'videos' && selectedPermissionVideoId && (
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
              <h2 style={{ margin: 0 }}>영상 접근 권한</h2>
              <p style={{ margin: '6px 0 0', color: '#666' }}>
                선택한 영상의 접근 범위를 설정합니다.
              </p>
            </div>

            <button
              className="reject-button"
              onClick={closeVideoPermission}
            >
              닫기
            </button>
          </div>

          {loadingVideoPermission ? (
            <p>권한 정보를 불러오는 중...</p>
          ) : (
            <div style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontWeight: '600',
                  }}
                >
                  접근 권한
                </label>

                <select
                  value={permissionType}
                  onChange={(e) => {
                    const value = e.target.value
                    setPermissionType(value)

                    if (value === 'PUBLIC') {
                      setPermissionGroupIds([])
                    }
                  }}
                  style={{ width: '100%' }}
                >
                  <option value="PUBLIC">전체 공개</option>
                  <option value="GROUP">그룹 전용</option>
                </select>
              </div>

              {permissionType === 'GROUP' && (
                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '6px',
                      fontWeight: '600',
                    }}
                  >
                    그룹
                  </label>

                  {permissionGroups.length === 0 ? (
                    <p style={{ color: '#777', marginTop: '8px' }}>
                      활성화된 그룹이 없습니다. 먼저 그룹을 생성해주세요.
                    </p>
                  ) : (
                    <div
                      style={{
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        padding: '12px',
                        display: 'grid',
                        gap: '8px',
                      }}
                    >
                      {permissionGroups.map((group) => (
                        <label
                          key={group.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={permissionGroupIds.includes(group.id)}
                            onChange={(e) => {
                              setPermissionGroupIds((prev) =>
                                e.target.checked
                                  ? [...prev, group.id]
                                  : prev.filter(
                                      (id) => id !== group.id
                                    )
                              )
                            }}
                          />
                          <span>{group.name}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {permissionGroupIds.length > 0 && (
                    <p
                      style={{
                        color: '#666',
                        marginTop: '8px',
                        marginBottom: 0,
                      }}
                    >
                      {permissionGroupIds.length}개 그룹 선택됨
                    </p>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
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

                <button
                  className="reject-button"
                  onClick={closeVideoPermission}
                  disabled={savingVideoPermission}
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  )
}

export default Admin