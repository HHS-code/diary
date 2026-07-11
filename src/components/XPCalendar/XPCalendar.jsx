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

  return (
    <div style={{ width: '420px', border: '2px solid #0a246a', borderRadius: '4px', background: '#ece9d8', flexShrink: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(to bottom, #3d95ff, #0058e6)',
          padding: '6px 10px',
        }}
      >
        <button
          onClick={moveToPrevMonth}
          style={{ cursor: 'pointer', background: 'none', border: 'none', color: '#fff', fontSize: '16px' }}
        >
          ◀
        </button>
        <strong style={{ color: '#fff', fontSize: '16px' }}>{monthLabel}</strong>
        <button
          onClick={moveToNextMonth}
          style={{ cursor: 'pointer', background: 'none', border: 'none', color: '#fff', fontSize: '16px' }}
        >
          ▶
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', padding: '4px 6px 2px' }}>
        {WEEKDAYS.map(w => (
          <div key={w} style={{ fontWeight: 'bold', fontSize: '12px', color: '#333', padding: '4px 0' }}>
            {w}
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px', padding: '2px 6px 6px' }}>
        {days.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} />
          }
          const dateKey = formatDateKey(currentYear, currentMonth, day)
          const isToday = dateKey === todayKey
          const isSelected = dateKey === selectedDate && !isToday

          let background = '#fff'
          if (isToday) {
            background = '#ffff00'
          }
          let border = '1px solid #b5b0a1'
          if (isSelected) {
            border = '2px solid #0058e6'
          }

          return (
            <button
              key={dateKey}
              onClick={() => onSelectDate(dateKey)}
              style={{
                height: '48px',
                padding: '4px',
                fontSize: '13px',
                textAlign: 'right',
                cursor: 'pointer',
                background,
                border,
                borderRadius: '2px',
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
