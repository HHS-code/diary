import { useEffect, useState } from 'react'

const CENTER = 50
const FACE_RADIUS = 45
const HOUR_HAND_LENGTH = 22
const MINUTE_HAND_LENGTH = 32
const SECOND_HAND_LENGTH = 38

function calculateHandPoint(angleDegrees, length) {
  const angleRadians = ((angleDegrees - 90) * Math.PI) / 180
  return {
    x: CENTER + length * Math.cos(angleRadians),
    y: CENTER + length * Math.sin(angleRadians),
  }
}

/**
 * 1초마다 갱신되는 SVG 아날로그 시계. props 없음. Clock.jsx(Taskbar 전용 디지털 시계)와는 독립적이다.
 */
export function AnalogClockWidget() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(intervalId)
  }, [])

  const hours = now.getHours() % 12
  const minutes = now.getMinutes()
  const seconds = now.getSeconds()

  const hourAngle = hours * 30 + minutes * 0.5
  const minuteAngle = minutes * 6 + seconds * 0.1
  const secondAngle = seconds * 6

  const hourPoint = calculateHandPoint(hourAngle, HOUR_HAND_LENGTH)
  const minutePoint = calculateHandPoint(minuteAngle, MINUTE_HAND_LENGTH)
  const secondPoint = calculateHandPoint(secondAngle, SECOND_HAND_LENGTH)

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        minHeight: 0,
        boxSizing: 'border-box',
        border: '1px solid #7d7d64',
        borderRadius: 3,
        background: '#ece9d8',
        boxShadow: '1px 1px 0 rgba(255,255,255,.7) inset, 2px 2px 5px rgba(0,0,0,.25)',
        padding: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width="100%" height="100%" viewBox="0 0 100 100">
        <circle cx={CENTER} cy={CENTER} r={FACE_RADIUS} fill="#fff" stroke="#0a246a" strokeWidth="2" />
        {Array.from({ length: 12 }, (_, i) => {
          const tickPoint = calculateHandPoint(i * 30, FACE_RADIUS - 4)
          return <circle key={i} cx={tickPoint.x} cy={tickPoint.y} r="1.2" fill="#0a246a" />
        })}
        <line x1={CENTER} y1={CENTER} x2={hourPoint.x} y2={hourPoint.y} stroke="#0a246a" strokeWidth="3" strokeLinecap="round" />
        <line x1={CENTER} y1={CENTER} x2={minutePoint.x} y2={minutePoint.y} stroke="#0a246a" strokeWidth="2" strokeLinecap="round" />
        <line x1={CENTER} y1={CENTER} x2={secondPoint.x} y2={secondPoint.y} stroke="#d33" strokeWidth="1" strokeLinecap="round" />
        <circle cx={CENTER} cy={CENTER} r="2" fill="#0a246a" />
      </svg>
    </div>
  )
}
