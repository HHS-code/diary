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
 * 월 단위 캘린더. 날짜 클릭 시 YYYY-MM-DD 형식 문자열을 onSelectDate로 전달한다.
 * @param {{ selectedDate: string, onSelectDate: (dateKey: string) => void }} props
 */
export function Calendar({ selectedDate, onSelectDate }) {
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())

  function moveToPrevMonth() {
    if (currentMonth === 0) {
      setCurrentYear(currentYear - 1)
      setCurrentMonth(11)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  function moveToNextMonth() {
    if (currentMonth === 11) {
      setCurrentYear(currentYear + 1)
      setCurrentMonth(0)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const days = buildCalendarDays(currentYear, currentMonth)
  const monthLabel = `${currentYear}년 ${currentMonth + 1}월`

  return (
    <div style={{ width: '280px', padding: '8px', border: '1px solid #ddd', borderRadius: '8px', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <button onClick={moveToPrevMonth} style={{ cursor: 'pointer', background: 'none', border: 'none', fontSize: '14px' }}>◀</button>
        <strong style={{ fontSize: '14px' }}>{monthLabel}</strong>
        <button onClick={moveToNextMonth} style={{ cursor: 'pointer', background: 'none', border: 'none', fontSize: '14px' }}>▶</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', gap: '2px' }}>
        {WEEKDAYS.map(w => (
          <div key={w} style={{ fontWeight: 'bold', fontSize: '11px', color: '#888', padding: '4px 0' }}>
            {w}
          </div>
        ))}
        {days.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} />
          }
          const dateKey = formatDateKey(currentYear, currentMonth, day)
          const isSelected = dateKey === selectedDate
          return (
            <button
              key={dateKey}
              onClick={() => onSelectDate(dateKey)}
              style={{
                padding: '5px 2px',
                fontSize: '13px',
                border: 'none',
                borderRadius: '50%',
                cursor: 'pointer',
                background: isSelected ? '#4a90e2' : 'transparent',
                color: isSelected ? '#fff' : '#333',
              }}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}
