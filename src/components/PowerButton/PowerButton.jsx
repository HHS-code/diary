import { useEffect, useRef, useState } from 'react'
import { loadAllDiaryData } from '../../storage/diaryStorage'
import { StartMenu } from '../StartMenu/StartMenu'

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

const startButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  height: '100%',
  padding: '0 16px 0 6px',
  borderRadius: '0 14px 14px 0',
  border: 'none',
  background: 'linear-gradient(180deg,#8ee060 0%,#4ec42a 15%,#2a9e12 45%,#1c7d0d 85%,#278f16 100%)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.5), 1px 0 3px rgba(0,0,0,.3)',
  cursor: 'pointer',
}

const flagGridStyle = {
  display: 'grid',
  gridTemplateColumns: '9px 9px',
  gridTemplateRows: '9px 9px',
  width: '18px',
  height: '18px',
  transform: 'rotate(-6deg)',
  flexShrink: 0,
}

const startTextStyle = {
  color: '#fff',
  fontStyle: 'italic',
  fontWeight: 'bold',
  fontSize: '15px',
  textShadow: '1px 1px 1px rgba(0,0,0,.5)',
}

const menuWrapperStyle = {
  position: 'relative',
  display: 'flex',
  alignItems: 'stretch',
  height: '100%',
}

/**
 * XP start 버튼. 클릭 시 StartMenu를 flyout으로 띄운다. props 없음.
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
      {isMenuOpen && <StartMenu onDownloadClick={handleDownloadClick} />}
      <button
        type="button"
        style={startButtonStyle}
        onClick={() => setIsMenuOpen((open) => !open)}
        aria-label="시작"
      >
        <div style={flagGridStyle}>
          <div style={{ background: '#ff5b4d' }} />
          <div style={{ background: '#7ed321' }} />
          <div style={{ background: '#4a90e2' }} />
          <div style={{ background: '#ffd23f' }} />
        </div>
        <span style={startTextStyle}>start</span>
      </button>
    </div>
  )
}
