import { useEffect, useRef, useState } from 'react'
import { powerButtonIcon } from '../../assets/icons'
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

/**
 * 전원 버튼. 클릭 시 StartMenu를 flyout으로 띄운다. props 없음.
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
        style={buttonStyle}
        onClick={() => setIsMenuOpen((open) => !open)}
        aria-label="전원"
      >
        <img
          src={powerButtonIcon}
          alt=""
          style={{ display: 'block', width: '100%', height: '100%' }}
        />
      </button>
    </div>
  )
}
