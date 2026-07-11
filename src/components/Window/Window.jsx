import { diaryIcon } from '../../assets/icons'

const TASKBAR_HEIGHT = '48px'

const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: TASKBAR_HEIGHT,
  backgroundColor: 'rgba(0, 0, 0, 0.35)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
}

const windowBoxStyle = {
  width: '90%',
  height: '88%',
  background: '#ece9d8',
  border: '1px solid #003ea6',
  borderRadius: '8px 8px 3px 3px',
  boxShadow: '0 10px 34px rgba(0,0,0,.55)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}

const titleBarStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  height: 32,
  padding: '0 4px 0 8px',
  background: 'linear-gradient(180deg,#4e9af7 0%,#2f7ff2 10%,#0d5be0 55%,#0a4fd0 100%)',
  borderBottom: '1px solid #04266b',
  flexShrink: 0,
}

const titleTextStyle = {
  flex: 1,
  color: '#fff',
  fontWeight: 'bold',
  fontSize: 13,
  textShadow: '1px 1px 1px rgba(0,0,0,.5)',
}

const closeButtonStyle = {
  width: 21,
  height: 20,
  borderRadius: 3,
  border: '1px solid #f6b8ab',
  background: 'linear-gradient(180deg,#f5a29c 0%,#e8544a 45%,#c81707 100%)',
  color: '#fff',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.6)',
  cursor: 'pointer',
  lineHeight: 1,
}

const bodyStyle = {
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
}

/**
 * @param {{ title: string, onClose: () => void, children: import('react').ReactNode }} props
 */
export function Window({ title, onClose, children }) {
  return (
    <div style={overlayStyle}>
      <div style={windowBoxStyle}>
        <div style={titleBarStyle}>
          <img src={diaryIcon} alt="" style={{ width: 17, height: 17 }} />
          <span style={titleTextStyle}>{title}</span>
          <button type="button" style={closeButtonStyle} onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>
        <div style={bodyStyle}>{children}</div>
      </div>
    </div>
  )
}
