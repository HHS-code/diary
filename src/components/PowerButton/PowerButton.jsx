import { useEffect, useRef, useState } from 'react'
import { powerButtonIcon, downloadIcon } from '../../assets/icons'
import { loadAllDiaryData } from '../../storage/diaryStorage'

function formatToday() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function downloadAllDataAsJSON() {
  const data = loadAllDiaryData()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `diary-backup-${formatToday()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

const buttonStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '32px',
  height: '32px',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  padding: 0,
}

const menuWrapperStyle = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  height: '48px',
}

const flyoutStyle = {
  position: 'absolute',
  bottom: '100%',
  left: '-8px',
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
  cursor: 'pointer',
  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.4)',
}

const flyoutTopBarStyle = {
  height: '6px',
  background: 'linear-gradient(to bottom, #4f8cf5, #0f5fc9)',
}

const flyoutBottomBarStyle = {
  height: '6px',
  background: 'linear-gradient(to bottom, #3f77c9, #123a70)',
}

const flyoutBodyStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '10px 24px 10px 10px',
  backgroundColor: '#c3c3c3',
  whiteSpace: 'nowrap',
}

const flyoutLabelStyle = {
  color: '#fff',
  fontWeight: 'bold',
  fontSize: '15px',
  textShadow: '1px 1px 1px rgba(0, 0, 0, 0.3)',
}

/**
 * 전원 버튼 + DOWNLOAD 플라이아웃 메뉴. props 없음.
 */
export function PowerButton() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const wrapperRef = useRef(null)

  useEffect(() => {
    if (!isMenuOpen) return

    function handleOutsideClick(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [isMenuOpen])

  function handleDownloadClick() {
    downloadAllDataAsJSON()
    setIsMenuOpen(false)
  }

  return (
    <div ref={wrapperRef} style={menuWrapperStyle}>
      {isMenuOpen && (
        <div style={flyoutStyle} onClick={handleDownloadClick}>
          <div style={flyoutTopBarStyle} />
          <div style={flyoutBodyStyle}>
            <img src={downloadIcon} alt="" style={{ display: 'block', width: '28px', height: '28px' }} />
            <span style={flyoutLabelStyle}>DOWNLOAD</span>
          </div>
          <div style={flyoutBottomBarStyle} />
        </div>
      )}
      <button
        type="button"
        style={buttonStyle}
        onClick={() => setIsMenuOpen((open) => !open)}
        aria-label="전원"
      >
        <img src={powerButtonIcon} alt="" style={{ display: 'block', width: '100%', height: '100%' }} />
      </button>
    </div>
  )
}
