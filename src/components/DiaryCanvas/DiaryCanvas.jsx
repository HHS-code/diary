import { useRef } from 'react'
import { useFabricCanvas } from '../../hooks/useFabricCanvas'
import { useActiveSelection } from '../../hooks/useActiveSelection'
import { useObjectActions } from '../../hooks/useObjectActions'
import { useCanvasKeyboardShortcuts } from '../../hooks/useCanvasKeyboardShortcuts'
import { scaleCanvasObjects } from '../../hooks/canvasMigration'
import { StickerPalette } from '../StickerPalette/StickerPalette'
import { ImageUploadButton } from '../ImageUploadButton/ImageUploadButton'
import { TextMemoButton } from '../TextMemoButton/TextMemoButton'
import { ExportImportControls } from '../ExportImportControls/ExportImportControls'
import { ObjectToolbar } from '../ObjectToolbar/ObjectToolbar'

const CANVAS_WIDTH = 1400
const CANVAS_HEIGHT = 900

// canvasSize 메타데이터가 없는 구버전 데이터는 이 크기로 저장된 것으로 간주한다.
const LEGACY_CANVAS_SIZE = { width: 800, height: 600 }

/**
 * Fabric.js 캔버스와 스티커 팔레트를 렌더링하는 컴포넌트.
 * canvasJSON이 있으면 마운트 시 해당 상태를 복원하고, 저장 당시 캔버스 크기
 * (canvasSize, 없으면 800×600)와 현재 크기가 다르면 오브젝트를 비율대로 재배치한다.
 * onSave가 있으면 캔버스 변경 시 500ms 디바운스 후 호출된다.
 * @param {{
 *   canvasJSON: object | null,
 *   canvasSize: { width: number, height: number } | null,
 *   onSave: ((canvasJSON: object, canvasSize: { width: number, height: number }) => void) | null,
 *   selectedDate: string,
 *   onImportSuccess: () => void,
 * }} props
 */
export function DiaryCanvas({ canvasJSON, canvasSize, onSave, selectedDate, onImportSuccess }) {
  const canvasElRef = useRef(null)

  function rescaleLoadedObjects(fabricCanvas) {
    const savedSize = canvasSize ?? LEGACY_CANVAS_SIZE
    scaleCanvasObjects(fabricCanvas, savedSize, { width: CANVAS_WIDTH, height: CANVAS_HEIGHT })
  }

  const fabricCanvasRef = useFabricCanvas(canvasElRef, canvasJSON, onSave, {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    onLoaded: rescaleLoadedObjects,
  })
  const { activeObject } = useActiveSelection(fabricCanvasRef)
  const objectActions = useObjectActions(fabricCanvasRef)
  useCanvasKeyboardShortcuts(fabricCanvasRef)

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <StickerPalette fabricCanvasRef={fabricCanvasRef} />
          <ImageUploadButton fabricCanvasRef={fabricCanvasRef} />
          <TextMemoButton fabricCanvasRef={fabricCanvasRef} />
        </div>
        <div style={{ position: 'relative', border: '2px inset #9a9a9a', display: 'inline-block' }}>
          <canvas ref={canvasElRef} />
          {activeObject && <ObjectToolbar activeObject={activeObject} actions={objectActions} />}
        </div>
      </div>
      <ExportImportControls
        fabricCanvasRef={fabricCanvasRef}
        selectedDate={selectedDate}
        onImportSuccess={onImportSuccess}
      />
    </div>
  )
}
