import { PowerButton } from '../PowerButton/PowerButton'
import { Clock } from '../Clock/Clock'

const barStyle = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  height: '48px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 12px',
  background: '#3f48cc',
  zIndex: 200,
}

/**
 * 화면 하단 전체 폭 taskbar. 좌측 PowerButton, 우측 Clock 배치만 함. props 없음.
 */
export function Taskbar() {
  return (
    <div style={barStyle}>
      <PowerButton />
      <Clock />
    </div>
  )
}
