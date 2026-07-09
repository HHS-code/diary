import { useRef } from 'react'
import { Rect } from 'fabric'
import { useFabricCanvas } from '../../hooks/useFabricCanvas'

/**
 * Fabric.js 캔버스를 렌더링하는 컴포넌트.
 * step 2~4에서 실제 스티커/이미지/텍스트 추가 버튼으로 대체될 임시 버튼 포함.
 */
export function DiaryCanvas() {
  const canvasElRef = useRef(null)
  const fabricCanvasRef = useFabricCanvas(canvasElRef)

  function addTestRect() {
    const fc = fabricCanvasRef.current
    if (!fc) return
    const rect = new Rect({
      left: 100,
      top: 100,
      width: 120,
      height: 80,
      fill: '#a0c4ff',
    })
    fc.add(rect)
    fc.setActiveObject(rect)
    fc.renderAll()
  }

  return (
    <div style={{ padding: '16px' }}>
      <button type="button" onClick={addTestRect}>
        테스트용 네모 추가
      </button>
      <div style={{ marginTop: '8px', border: '1px solid #ccc', display: 'inline-block' }}>
        <canvas ref={canvasElRef} />
      </div>
    </div>
  )
}
