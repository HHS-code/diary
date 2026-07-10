import { wallpaper, diaryIcon } from '../../assets/icons'

const screenStyle = {
  position: 'fixed',
  inset: 0,
  backgroundImage: `url(${wallpaper})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
}

const iconButtonStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '4px',
  width: '80px',
  margin: '16px',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
}

const iconLabelStyle = {
  color: '#fff',
  fontSize: '13px',
  textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
}

/**
 * @param {{ onOpenDiary: () => void }} props
 */
export function Desktop({ onOpenDiary }) {
  return (
    <div style={screenStyle}>
      <button type="button" style={iconButtonStyle} onClick={onOpenDiary}>
        <img src={diaryIcon} alt="" style={{ height: '56px', width: 'auto' }} />
        <span style={iconLabelStyle}>diary</span>
      </button>
    </div>
  )
}
