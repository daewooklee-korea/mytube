import { useCallback, useEffect, useMemo, useState } from 'react'
import './SunoReservation.css'
import { supabase } from './supabase'

const HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]

const formatDate = (date) => {
  return `${date.getMonth() + 1}/${date.getDate()}`
}

const getDayName = (date) => {
  const days = ['일', '월', '화', '수', '목', '금', '토']
  return days[date.getDay()]
}

const formatDateKey = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getKoreaToday() {
  const koreaDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

  const [year, month, day] = koreaDate.split('-').map(Number)

  return new Date(year, month - 1, day)
}

function SunoReservation() {
  const [baseDate, setBaseDate] = useState(getKoreaToday)
  const [reservations, setReservations] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const dates = useMemo(() => {
    return [0, 1, 2].map((offset) => {
      const date = new Date(baseDate)
      date.setDate(date.getDate() + offset)
      return date
    })
  }, [baseDate])

  const dateKeys = useMemo(() => {
    return dates.map(formatDateKey)
  }, [dates])

  const loadReservations = useCallback(async () => {
    setLoading(true)
    setErrorMessage('')

    try {
      const { data: userData, error: userError } =
        await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      if (!userData.user) {
        setCurrentUser(null)
        setReservations([])
        return
      }

      setCurrentUser(userData.user)

      const { data, error } = await supabase
        .from('suno_reservations')
        .select(`
          id,
          user_id,
          reservation_date,
          start_hour,
          title
        `)
        .in('reservation_date', dateKeys)

      if (error) {
        throw error
      }

      const userIds = [
        ...new Set(
          (data || []).map((reservation) => reservation.user_id)
        ),
      ]

      let profiles = []

      if (userIds.length > 0) {
        const { data: profileData, error: profileError } =
          await supabase
            .from('profiles')
           .select('id, nickname')
            .in('id', userIds)

        if (profileError) {
          throw profileError
        }

        profiles = profileData || []
      }

      const profileMap = new Map(
        profiles.map((profile) => [
          profile.id,
          profile.nickname,
        ])
      )

      const reservationsWithUser = (data || []).map(
        (reservation) => ({
          ...reservation,
          nickname:
            profileMap.get(reservation.user_id) ||
            '회원',
        })
      )

      setReservations(reservationsWithUser)
    } catch (error) {
      console.error('Suno 예약 조회 오류:', error)

      setErrorMessage(
        error.message || '예약 정보를 불러오지 못했습니다.'
      )

      setReservations([])
    } finally {
      setLoading(false)
    }
  }, [dateKeys])

  useEffect(() => {
    loadReservations()
  }, [loadReservations])

  const moveDays = (days) => {
    setBaseDate((current) => {
      const next = new Date(current)
      next.setDate(next.getDate() + days)
      return next
    })
  }

  const goToday = () => {
    setBaseDate(getKoreaToday())
  }

  const findReservation = (dateKey, hour) => {
    return reservations.find(
      (reservation) =>
        reservation.reservation_date === dateKey &&
        reservation.start_hour === hour
    )
  }

  const handleSlotClick = async (date, hour) => {
    const dateKey = formatDateKey(date)
    const reservation = findReservation(dateKey, hour)

    setErrorMessage('')

    // 이미 예약된 경우
    if (reservation) {
      // 내 예약이면 취소
      if (reservation.user_id === currentUser?.id) {
        const confirmed = window.confirm(
          `${formatDate(date)} ${hour}시 예약을 취소할까요?`
        )

        if (!confirmed) {
          return
        }

        setSaving(true)

        try {
          const { error } = await supabase
            .from('suno_reservations')
            .delete()
            .eq('id', reservation.id)
            .eq('user_id', currentUser.id)

          if (error) {
            throw error
          }

          await loadReservations()
        } catch (error) {
          console.error('Suno 예약 취소 오류:', error)

          setErrorMessage(
            error.message || '예약 취소에 실패했습니다.'
          )
        } finally {
          setSaving(false)
        }
      } else {
        window.alert(
          `${reservation.username}님이 예약한 시간입니다.`
        )
      }

      return
    }

    // 로그인 확인
    if (!currentUser) {
      window.alert('로그인이 필요합니다.')
      return
    }

    const confirmed = window.confirm(
      `${formatDate(date)} ${hour}시 ~ ${hour + 1}시\n예약하시겠습니까?`
    )

    if (!confirmed) {
      return
    }

    setSaving(true)

    try {
      const { error } = await supabase
        .from('suno_reservations')
        .insert({
          user_id: currentUser.id,
          reservation_date: dateKey,
          start_hour: hour,
        })

      if (error) {
        if (error.code === '23505') {
          setErrorMessage(
            '방금 다른 회원이 먼저 예약했습니다.'
          )
        } else {
          throw error
        }

        await loadReservations()
        return
      }

      await loadReservations()
    } catch (error) {
      console.error('Suno 예약 등록 오류:', error)

      setErrorMessage(
        error.message || '예약 등록에 실패했습니다.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="suno-reservation">
      <div className="suno-header">
        <div>
          <h2>🎵 SUNO 예약</h2>
          <p>
            한국시간 기준 · 1시간 단위 예약
          </p>
        </div>

        <div className="suno-date-controls">
          <button
            type="button"
            onClick={() => moveDays(-3)}
            disabled={saving}
          >
            ◀ 이전 3일
          </button>

          <button
            type="button"
            className="suno-today-button"
            onClick={goToday}
            disabled={saving}
          >
            오늘
          </button>

          <button
            type="button"
            onClick={() => moveDays(3)}
            disabled={saving}
          >
            다음 3일 ▶
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="suno-error">
          {errorMessage}
        </div>
      )}

      <div className="suno-calendar">
        <div className="suno-grid">
          <div className="suno-time-header">
            시간
          </div>

          {dates.map((date) => (
            <div
              className="suno-date-header"
              key={formatDateKey(date)}
            >
              <strong>
                {formatDate(date)}
              </strong>

              <span>
                ({getDayName(date)})
              </span>
            </div>
          ))}

          {HOURS.map((hour) => (
            <div
              className="suno-row"
              key={hour}
            >
              <div className="suno-time">
                {String(hour).padStart(2, '0')}시
              </div>

              {dates.map((date) => {
                const dateKey = formatDateKey(date)
                const reservation = findReservation(
                  dateKey,
                  hour
                )

                const isMine =
                  reservation?.user_id === currentUser?.id

                return (
                  <button
                    type="button"
                    key={`${dateKey}-${hour}`}
                    className={`suno-slot ${
                      reservation
                        ? isMine
                          ? 'mine'
                          : 'reserved'
                        : 'available'
                    }`}
                    disabled={loading || saving}
                    onClick={() =>
                      handleSlotClick(date, hour)
                    }
                    title={
                      reservation
                        ? `${reservation.username}님 예약`
                        : `${formatDate(date)} ${hour}시 예약`
                    }
                  >
                    {reservation && (
                      <span className="suno-reserver-name">
                        {reservation.nickname}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="suno-legend">
        <span>
          <i className="legend-available" />
          예약 가능
        </span>

        <span>
          <i className="legend-reserved" />
          예약됨
        </span>

        <span>
          <i className="legend-mine" />
          내 예약
        </span>

        {loading && (
          <span>예약 정보 불러오는 중...</span>
        )}

        {saving && (
          <span>처리 중...</span>
        )}
      </div>
    </section>
  )
}

export default SunoReservation