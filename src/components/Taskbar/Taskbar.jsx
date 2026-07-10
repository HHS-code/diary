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
  background: 'linear-gradient(to bottom, #478ff1 0%, #2059d7 33%, #2662df 100%)',
  zIndex: 200,
}

const startSegmentStyle = {
  display: 'flex',
  alignItems: 'center',
  height: '100%',
  padding: '0 14px 0 8px',
  borderRadius: '0 20px 20px 0',
  background: 'linear-gradient(to bottom, #356d2f 0%, #209420 47%, #259025 100%)',
}

const traySegmentStyle = {
  display: 'flex',
  alignItems: 'center',
  height: '100%',
  padding: '0 12px',
  marginLeft: 'auto',
  borderRadius: '10px 0 0 10px',
  background: 'linear-gradient(to bottom, #478ff1 0%, #2059d7 33%, #2662df 100%)',
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
