import { PowerButton } from '../PowerButton/PowerButton'
import { Clock } from '../Clock/Clock'

const barStyle = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  height: '48px',
  display: 'flex',
  alignItems: 'stretch',
  background: 'linear-gradient(to bottom, #4a86e8 0%, #225dda 15%, #1c4fc0 100%)',
  borderTop: '1px solid #0a2a7a',
  zIndex: 200,
}

const startSegmentStyle = {
  display: 'flex',
  alignItems: 'center',
  height: '100%',
  padding: '0 14px 0 8px',
  borderRadius: '0 20px 20px 0',
  background: 'linear-gradient(to bottom, #1f9c1f 0%, #33c433 35%, #1c9c1c 70%, #0f6e0f 100%)',
  boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.25)',
}

const traySegmentStyle = {
  display: 'flex',
  alignItems: 'center',
  height: '100%',
  padding: '0 12px',
  marginLeft: 'auto',
  borderRadius: '10px 0 0 10px',
  background: 'linear-gradient(to bottom, #4fc3f7 0%, #1596e6 40%, #0d78c9 100%)',
  boxShadow: 'inset 1px 0 0 rgba(0, 0, 0, 0.25)',
}

/**
 * 화면 하단 전체 폭 taskbar. 좌측 초록 세그먼트에 PowerButton, 우측 하늘색
 * 세그먼트에 Clock 배치만 함(WindowsXPScreenshot.webp 색상 실측 반영).
 * props 없음.
 */
export function Taskbar() {
  return (
    <div style={barStyle}>
      <div style={startSegmentStyle}>
        <PowerButton />
      </div>
      <div style={traySegmentStyle}>
        <Clock />
      </div>
    </div>
  )
}
