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
  background: 'linear-gradient(180deg,#2c88f0 0%,#1560e0 6%,#1055d8 45%,#0f4cc9 88%,#1a5ddc 100%)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.35)',
  zIndex: 200,
}

const traySegmentStyle = {
  display: 'flex',
  alignItems: 'center',
  height: '100%',
  padding: '0 12px',
  marginLeft: 'auto',
  borderRadius: '10px 0 0 10px',
  background: 'linear-gradient(180deg,#2c88f0 0%,#1560e0 6%,#1055d8 45%,#0f4cc9 88%,#1a5ddc 100%)',
  boxShadow: 'inset 1px 0 0 rgba(255,255,255,.3)',
}

/**
 * 화면 하단 전체 폭 taskbar. 좌측 초록 세그먼트에 PowerButton, 우측 하늘색
 * 세그먼트에 Clock 배치만 함(WindowsXPScreenshot.webp 색상 실측 반영).
 * props 없음.
 */
export function Taskbar() {
  return (
    <div style={barStyle}>
      <PowerButton />
      <div style={traySegmentStyle}>
        <Clock />
      </div>
    </div>
  )
}
