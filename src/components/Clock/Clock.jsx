import { useEffect, useState } from 'react'

function formatTime(d) {
  const hours24 = d.getHours()
  const period = hours24 < 12 ? 'a.m.' : 'p.m.'
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${hours12}:${minutes} ${period}`
}

function formatDate(d) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/**
 * 1초마다 갱신되는 실시간 시계 텍스트. props 없음.
 */
export function Clock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(intervalId)
  }, [])

  return (
    <div style={{ color: '#fff', textAlign: 'right', fontSize: '13px', lineHeight: 1.4 }}>
      <div>{formatTime(now)}</div>
      <div>{formatDate(now)}</div>
    </div>
  )
}
