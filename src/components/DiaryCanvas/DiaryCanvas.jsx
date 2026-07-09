import { useRef } from 'react'
import { useFabricCanvas } from '../../hooks/useFabricCanvas'
import { StickerPalette } from '../StickerPalette/StickerPalette'
import { ImageUploadButton } from '../ImageUploadButton/ImageUploadButton'
import { TextMemoButton } from '../TextMemoButton/TextMemoButton'

/**
 * Fabric.js 캔버스와 스티커 팔레트를 렌더링하는 컴포넌트.
 */
export function DiaryCanvas() {
  const canvasElRef = useRef(null)
  const fabricCanvasRef = useFabricCanvas(canvasElRef)

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
