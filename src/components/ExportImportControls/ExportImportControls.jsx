import { useRef } from 'react'
import { MdFileDownload, MdFileUpload, MdPhotoCamera } from 'react-icons/md'
import { loadAllDiaryData, saveAllDiaryData } from '../../storage/diaryStorage'

/**
 * anchor 태그를 생성해 Blob을 파일로 다운로드시킨다.
 * @param {Blob} blob
 * @param {string} filename
 */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * JSON 전체 내보내기 / 불러오기, 현재 캔버스 PNG 내보내기 버튼 모음.
 * @param {{
 *   fabricCanvasRef: import('react').RefObject<import('fabric').Canvas | null>,
 *   selectedDate: string,
 *   onImportSuccess: () => void,
 * }} props
 */
export function ExportImportControls({ fabricCanvasRef, selectedDate, onImportSuccess }) {
  const fileInputRef = useRef(null)

  function handleExportJSON() {
    const data = loadAllDiaryData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    downloadBlob(blob, `diary-backup-${selectedDate}.json`)
  }

  function handleImportJSON(event) {
    const file = event.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const parsed = JSON.parse(e.target.result)
      saveAllDiaryData(parsed)
      onImportSuccess()
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  function handleExportPNG() {
    const canvas = fabricCanvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL({ format: 'png' })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `diary-${selectedDate}.png`
    a.click()
  }

  const buttonStyle = {
    padding: '6px 12px',
    border: '1px solid #7d7d64',
    borderRadius: 3,
    background: 'linear-gradient(180deg,#fdfdfa,#dcd9c7)',
    cursor: 'pointer',
    fontSize: '13px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <button style={buttonStyle} onClick={handleExportJSON}>
        <MdFileDownload size={16} /> JSON 내보내기
      </button>
      <button style={buttonStyle} onClick={() => fileInputRef.current.click()}>
        <MdFileUpload size={16} /> JSON 불러오기
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        style={{ display: 'none' }}
        onChange={handleImportJSON}
      />
      <button style={buttonStyle} onClick={handleExportPNG}>
        <MdPhotoCamera size={16} /> PNG 내보내기
      </button>
    </div>
  )
}
