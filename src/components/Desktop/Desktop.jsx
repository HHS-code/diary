import { wallpaper, diaryIcon, stickerStudioIcon } from '../../assets/icons'

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
  border: '1px dotted transparent',
  background: 'transparent',
  cursor: 'pointer',
}

const iconLabelStyle = {
  color: '#fff',
  fontSize: '12px',
  textShadow: '1px 1px 2px rgba(0, 0, 0, 0.9)',
}

/**
 * @param {{ onOpenDiary: () => void, onOpenStickerStudio: () => void }} props
 */
export function Desktop({ onOpenDiary, onOpenStickerStudio }) {
  function handleMouseEnter(event) {
    event.currentTarget.style.border = '1px dotted rgba(255,255,255,.6)'
    event.currentTarget.style.background = 'rgba(30,70,160,.25)'
  }

  function handleMouseLeave(event) {
    event.currentTarget.style.border = iconButtonStyle.border
    event.currentTarget.style.background = iconButtonStyle.background
  }

  return (
    <div style={screenStyle}>
      <button
        type="button"
        style={iconButtonStyle}
        aria-label="diary"
        onClick={onOpenDiary}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <img src={diaryIcon} alt="" style={{ height: '84px', width: 'auto' }} />
        <span style={iconLabelStyle}>diary</span>
      </button>
      <button
        type="button"
        style={iconButtonStyle}
        aria-label="sticker studio"
        onClick={onOpenStickerStudio}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <img src={stickerStudioIcon} alt="" style={{ height: '84px', width: 'auto' }} />
        <span style={iconLabelStyle}>sticker studio</span>
      </button>
    </div>
  )
}
