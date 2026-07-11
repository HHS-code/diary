import { useState } from 'react'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function buildCalendarDays(year, month) {
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days = []
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push(null)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d)
  }
  return days
}

function formatDateKey(year, month, day) {
  const mm = String(month + 1).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

/**
 * Windows XP 데스크톱 캘린더 가젯 스타일의 월간 캘린더.
 * 연/월 상태는 부모가 소유하며, 이 컴포넌트는 표시와 클릭 이벤트 전달만 담당한다.
 * @param {{ selectedDate: string, onSelectDate: (dateKey: string) => void, currentYear: number, currentMonth: number, onChangeMonth: (year: number, month: number) => void }} props
 */
export function XPCalendar({ selectedDate, onSelectDate, currentYear, currentMonth, onChangeMonth }) {
  const today = new Date()
  const todayKey = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate())
  const [hoveredDateKey, setHoveredDateKey] = useState(null)

  function moveToPrevMonth() {
    if (currentMonth === 0) {
      onChangeMonth(currentYear - 1, 11)
    } else {
      onChangeMonth(currentYear, currentMonth - 1)
    }
  }

  function moveToNextMonth() {
    if (currentMonth === 11) {
      onChangeMonth(currentYear + 1, 0)
    } else {
      onChangeMonth(currentYear, currentMonth + 1)
    }
  }

  const days = buildCalendarDays(currentYear, currentMonth)
  const monthLabel = `${currentYear}년 ${currentMonth + 1}월`
  const weekRowCount = Math.ceil(days.length / 7)

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        minHeight: 0,
        boxSizing: 'border-box',
        border: '1px solid #7d7d64',
        borderRadius: '4px',
        background: '#ece9d8',
        boxShadow: '1px 1px 0 rgba(255,255,255,.7) inset, 2px 2px 5px rgba(0,0,0,.25)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(180deg,#3d84ec 0%,#1657d6 55%,#0e46bc 100%)',
          borderBottom: '1px solid #04266b',
          padding: '7px 10px',
          flexShrink: 0,
        }}
      >
        <button
          onClick={moveToPrevMonth}
          style={{ cursor: 'pointer', background: 'none', border: 'none', color: '#fff', fontSize: '20px' }}
        >
          ◀
        </button>
        <strong style={{ color: '#fff', fontSize: '20px' }}>{monthLabel}</strong>
        <button
          onClick={moveToNextMonth}
          style={{ cursor: 'pointer', background: 'none', border: 'none', color: '#fff', fontSize: '20px' }}
        >
          ▶
        </button>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          textAlign: 'center',
          background: '#f4f2e8',
          borderBottom: '1px solid #d8d5c2',
          padding: '6px 8px 2px',
          flexShrink: 0,
        }}
      >
        {WEEKDAYS.map((w, idx) => (
          <div key={w} style={{ fontWeight: 'bold', fontSize: '14px', color: idx === 0 ? '#a33' : '#333', padding: '4px 0' }}>
            {w}
          </div>
        ))}
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gridTemplateRows: `repeat(${weekRowCount}, 1fr)`,
          gap: '3px',
          padding: '2px 8px 8px',
        }}
      >
        {days.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} />
          }
          const dateKey = formatDateKey(currentYear, currentMonth, day)
          const isToday = dateKey === todayKey
          const isSelected = dateKey === selectedDate && !isToday

          let background = '#fff'
          if (isToday) {
            background = '#ffff66'
          }
          let border = '1px solid #cfcbb4'
          if (isSelected) {
            border = '2px solid #1657d6'
          }

          const isHovered = dateKey === hoveredDateKey

          return (
            <div
              key={dateKey}
              onMouseEnter={() => setHoveredDateKey(dateKey)}
              onMouseLeave={() => setHoveredDateKey(null)}
              style={{ position: 'relative' }}
            >
              <button
                onClick={() => onSelectDate(dateKey)}
                style={{
                  width: '100%',
                  height: '100%',
                  boxSizing: 'border-box',
                  padding: '4px',
                  fontSize: '15px',
                  textAlign: 'right',
                  cursor: 'pointer',
                  background,
                  border,
                  borderRadius: '2px',
                }}
              >
                {day}
              </button>
              {isHovered && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectDate(dateKey)
                  }}
                  style={{
                    position: 'absolute',
                    bottom: '3px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    padding: '2px 8px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    color: '#fff',
                    cursor: 'pointer',
                    background: 'linear-gradient(180deg,#3d84ec 0%,#1657d6 55%,#0e46bc 100%)',
                    border: '1px solid #04266b',
                    borderRadius: '3px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  작성
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
