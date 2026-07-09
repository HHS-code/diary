import { useRef } from 'react'
import { useFabricCanvas } from '../../hooks/useFabricCanvas'
import { StickerPalette } from '../StickerPalette/StickerPalette'
import { ImageUploadButton } from '../ImageUploadButton/ImageUploadButton'
import { TextMemoButton } from '../TextMemoButton/TextMemoButton'

/**
 * Fabric.js 캔버스와 스티커 팔레트를 렌더링하는 컴포넌트.
 * canvasJSON이 있으면 마운트 시 해당 상태를 복원한다.
 * onSave가 있으면 캔버스 변경 시 500ms 디바운스 후 호출된다.
 * @param {{ canvasJSON: object | null, onSave: ((canvasJSON: object) => void) | null }} props
 */
export function DiaryCanvas({ canvasJSON, onSave }) {
  const canvasElRef = useRef(null)
  const fabricCanvasRef = useFabricCanvas(canvasElRef, canvasJSON, onSave)

  return (
    <div style={{ padding: '16px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <StickerPalette fabricCanvasRef={fabricCanvasRef} />
        <ImageUploadButton fabricCanvasRef={fabricCanvasRef} />
        <TextMemoButton fabricCanvasRef={fabricCanvasRef} />
      </div>
      <div style={{ border: '1px solid #ccc', display: 'inline-block' }}>
        <canvas ref={canvasElRef} />
      </div>
    </div>
  )
}
