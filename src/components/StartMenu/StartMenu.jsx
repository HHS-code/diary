import { useState } from 'react'
import { diaryIcon, downloadIcon } from '../../assets/icons'

const menuStyle = {
  position: 'absolute',
  bottom: '100%',
  left: '-8px',
  margin: 0,
  width: '300px',
  display: 'flex',
  flexDirection: 'column',
  cursor: 'default',
  border: '1px solid #0a3fae',
  boxShadow: '2px -2px 12px rgba(0, 0, 0, 0.45)',
  borderRadius: '8px 8px 4px 4px',
  overflow: 'hidden',
}

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  height: '50px',
  padding: '0 12px',
  background: 'linear-gradient(115deg, #0b60c8 0%, #0c62c8 35%, #5388d8 100%)',
  borderBottom: '2px solid #f3ddcb',
}

const headerLabelStyle = {
  color: '#fff',
  fontWeight: 'bold',
  fontSize: '15px',
  textShadow: '1px 1px 1px rgba(0, 0, 0, 0.3)',
}

const bodyStyle = {
  display: 'flex',
  minHeight: '160px',
}

const leftPanelStyle = {
  flex: '1 1 50%',
  background: '#ffffff',
}

const rightPanelStyle = {
  flex: '1 1 50%',
  background: '#d2e5fa',
}

const menuItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '8px 12px',
  cursor: 'pointer',
}

const menuItemLabelStyle = {
  color: '#1a3d8f',
  fontWeight: 'bold',
  fontSize: '13px',
}

const allProgramsBarStyle = {
  height: '18px',
  background: 'linear-gradient(180deg,#3d3d3d,#2a2a2a)',
}

const bottomBarStyle = {
  height: '28px',
  background: 'linear-gradient(180deg,#4489dc 0%,#1e66c9 45%,#0e3f8b 100%)',
}

/**
 * PowerButton flyout에서 쓰는 XP start 메뉴 레이아웃. 헤더/좌우 패널/
 * All Programs 바/하단 바 비율은 reference/WindowsXPScreenshot.webp 실측 기준
 * (전체 380x475 중 헤더 62, 바디 413, allPrograms 6, bottom 40 → 이 컴포넌트 비율로 축소).
 * 실제 기능 항목은 DOWNLOAD 하나뿐이라 좌측 패널에만 배치하고 우측은 빈 패널로 둔다.
 */
export function StartMenu({ onDownloadClick }) {
  const [isItemHovered, setIsItemHovered] = useState(false)

  const menuItemHoverableStyle = {
    ...menuItemStyle,
    background: isItemHovered ? '#2a63d6' : 'transparent',
  }
  const menuItemLabelHoverableStyle = {
    ...menuItemLabelStyle,
    color: isItemHovered ? '#fff' : menuItemLabelStyle.color,
  }

  return (
    <div style={menuStyle}>
      <div style={headerStyle}>
        <img src={diaryIcon} alt="" style={{ display: 'block', width: '32px', height: '32px' }} />
        <span style={headerLabelStyle}>diary</span>
      </div>
      <div style={bodyStyle}>
        <div style={leftPanelStyle}>
          <div
            style={menuItemHoverableStyle}
            onClick={onDownloadClick}
            onMouseEnter={() => setIsItemHovered(true)}
            onMouseLeave={() => setIsItemHovered(false)}
          >
            <img src={downloadIcon} alt="" style={{ display: 'block', width: '24px', height: '24px' }} />
            <span style={menuItemLabelHoverableStyle}>DOWNLOAD</span>
          </div>
        </div>
        <div style={rightPanelStyle} />
      </div>
      <div style={allProgramsBarStyle} />
      <div style={bottomBarStyle} />
    </div>
  )
}
