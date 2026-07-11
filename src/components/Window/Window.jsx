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
  backgroundColor: '#fff',
  borderRadius: '6px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}

const titleBarStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 12px',
  background: 'linear-gradient(to right, #0a246a, #a6caf0)',
  color: '#fff',
  fontWeight: 'bold',
  flexShrink: 0,
}

const closeButtonStyle = {
  width: '22px',
  height: '22px',
  border: '1px solid #fff',
  borderRadius: '3px',
  background: '#d94040',
  color: '#fff',
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
          <span>{title}</span>
          <button type="button" style={closeButtonStyle} onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>
        <div style={bodyStyle}>{children}</div>
      </div>
    </div>
  )
}
