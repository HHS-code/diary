import { useRef } from 'react'
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

  return (
    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
      <button onClick={handleExportJSON}>JSON 내보내기</button>
      <button onClick={() => fileInputRef.current.click()}>JSON 불러오기</button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        style={{ display: 'none' }}
        onChange={handleImportJSON}
      />
      <button onClick={handleExportPNG}>PNG 내보내기</button>
    </div>
  )
}
