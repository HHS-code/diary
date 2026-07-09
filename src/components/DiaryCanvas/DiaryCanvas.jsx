import { useRef } from 'react'
import { useFabricCanvas } from '../../hooks/useFabricCanvas'
import { StickerPalette } from '../StickerPalette/StickerPalette'

/**
 * Fabric.js 캔버스와 스티커 팔레트를 렌더링하는 컴포넌트.
 */
export function DiaryCanvas() {
  const canvasElRef = useRef(null)
  const fabricCanvasRef = useFabricCanvas(canvasElRef)

  return (
    <div style={{ padding: '16px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
      <StickerPalette fabricCanvasRef={fabricCanvasRef} />
      <div style={{ border: '1px solid #ccc', display: 'inline-block' }}>
        <canvas ref={canvasElRef} />
      </div>
    </div>
  )
}
