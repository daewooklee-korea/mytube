import { useEffect, useState } from 'react'
import { supabase } from './supabase'

function Admin({ onClose }) {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProfiles()
  }, [])

  const loadProfiles = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('회원 목록 불러오기 실패:', error)
      alert('회원 목록을 불러오지 못했습니다.')
      setLoading(false)
      return
    }

    setProfiles(data)
    setLoading(false)
  }

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
        p.id === id ? { ...p, status: newStatus } : p
      )
    )
  }

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
        p.id === id ? { ...p, role: newRole } : p
      )
    )
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>관리자 페이지</h1>
        <button className="back-button" onClick={onClose}>
          ← 홈으로
        </button>
      </div>

      {loading ? (
        <p>불러오는 중...</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
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
                <td>{profile.email}</td>
                <td>
                  {new Date(profile.created_at).toLocaleDateString('ko-KR')}
                </td>
                <td>
                  <span className={`status-badge status-${profile.status}`}>
                    {profile.status}
                  </span>
                </td>
                <td>
                  <select
                    value={profile.role}
                    onChange={(e) => updateRole(profile.id, e.target.value)}
                  >
                    <option value="user">user</option>
                    <option value="creator">creator</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td>
                  {profile.status === 'pending' && (
                    <>
                      <button
                        className="approve-button"
                        onClick={() => updateStatus(profile.id, 'approved')}
                      >
                        승인
                      </button>
                      <button
                        className="reject-button"
                        onClick={() => updateStatus(profile.id, 'rejected')}
                      >
                        거절
                      </button>
                    </>
                  )}
                  {profile.status === 'approved' && (
                    <button
                      className="reject-button"
                      onClick={() => updateStatus(profile.id, 'rejected')}
                    >
                      정지
                    </button>
                  )}
                  {profile.status === 'rejected' && (
                    <button
                      className="approve-button"
                      onClick={() => updateStatus(profile.id, 'approved')}
                    >
                      재승인
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default Admin