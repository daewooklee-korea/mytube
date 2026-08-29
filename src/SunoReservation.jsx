import { useMemo, useState } from 'react'
import './SunoReservation.css'

const HOURS = [8, 10, 12, 14, 16, 18, 20, 22]

const formatDate = (date) => {
  const month = date.getMonth() + 1
  const day = date.getDate()

  return `${month}/${day}`
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

function SunoReservation() {
  const getKoreaToday = () => {
    const now = new Date()

    const koreaDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now)

    const [year, month, day] = koreaDate.split('-').map(Number)

    return new Date(year, month - 1, day)
  }

  const [baseDate, setBaseDate] = useState(getKoreaToday)

  const dates = useMemo(() => {
    return [0, 1, 2].map((offset) => {
      const date = new Date(baseDate)

      date.setDate(date.getDate() + offset)

      return date
    })
  }, [baseDate])

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

  return (
    <section className="suno-reservation">
      <div className="suno-header">
        <div>
          <h2>🎵 SUNO 예약</h2>
          <p>2시간 단위로 SUNO 사용 시간을 예약할 수 있습니다.</p>
        </div>

        <div className="suno-date-controls">
          <button
            type="button"
            onClick={() => moveDays(-3)}
          >
            ◀ 이전 3일
          </button>

          <button
            type="button"
            className="suno-today-button"
            onClick={goToday}
          >
            오늘
          </button>

          <button
            type="button"
            onClick={() => moveDays(3)}
          >
            다음 3일 ▶
          </button>
        </div>
      </div>

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

                return (
                  <button
                    type="button"
                    className="suno-slot available"
                    key={`${dateKey}-${hour}`}
                    onClick={() => {
                      console.log(
                        'SUNO 예약:',
                        dateKey,
                        `${hour}시 ~ ${hour + 2}시`
                      )
                    }}
                  />
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
      </div>
    </section>
  )
}

export default SunoReservation