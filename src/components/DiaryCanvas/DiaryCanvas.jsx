import { useLayoutEffect, useRef, useState } from 'react'
import { useFabricCanvas } from '../../hooks/useFabricCanvas'
import { useActiveSelection } from '../../hooks/useActiveSelection'
import { useObjectActions } from '../../hooks/useObjectActions'
import { useCanvasKeyboardShortcuts } from '../../hooks/useCanvasKeyboardShortcuts'
import { useCanvasBackground } from '../../hooks/useCanvasBackground'
import { scaleCanvasObjects } from '../../hooks/canvasMigration'
import { StickerPalette } from '../StickerPalette/StickerPalette'
import { CanvasBackgroundControl } from '../CanvasBackgroundControl/CanvasBackgroundControl'
import { ImageUploadButton } from '../ImageUploadButton/ImageUploadButton'
import { TextMemoButton } from '../TextMemoButton/TextMemoButton'
import { ExportImportControls } from '../ExportImportControls/ExportImportControls'
import { ObjectToolbar } from '../ObjectToolbar/ObjectToolbar'

// 사이드바 패널 폭(240px) + 세로 스크롤바 여유
const SIDEBAR_WIDTH = 258
const LAYOUT_GAP = 12
// 캔버스 래퍼의 2px inset 보더 (좌우/상하 합)
const CANVAS_BORDER = 4
const MIN_CANVAS_WIDTH = 400
const MIN_CANVAS_HEIGHT = 300

// canvasSize 메타데이터가 없는 구버전 데이터는 이 크기로 저장된 것으로 간주한다.
const LEGACY_CANVAS_SIZE = { width: 800, height: 600 }

/**
 * 다이어리 편집 작업 공간. 마운트 시 부모가 준 공간을 1회 측정해,
 * 캔버스가 화면에서 잘리지 않는 최대 크기로 생성한다.
 * @param {{
 *   canvasJSON: object | null,
 *   canvasSize: { width: number, height: number } | null,
 *   onSave: ((canvasJSON: object, canvasSize: { width: number, height: number }) => void) | null,
 *   selectedDate: string,
 *   onImportSuccess: () => void,
 * }} props
 */
export function DiaryCanvas(props) {
  const containerRef = useRef(null)
  const [workspaceSize, setWorkspaceSize] = useState(null)

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    setWorkspaceSize({ width: el.clientWidth, height: el.clientHeight })
  }, [])

  return (
    <div ref={containerRef} style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
      {workspaceSize && <CanvasWorkspace {...props} workspaceSize={workspaceSize} />}
    </div>
  )
}

/**
 * 측정된 공간 안에서 Fabric.js 캔버스와 도구 사이드바를 렌더링한다.
 * canvasJSON이 있으면 마운트 시 복원하고, 저장 당시 캔버스 크기(canvasSize,
 * 없으면 800×600)와 현재 크기가 다르면 오브젝트를 비율대로 재배치한다.
 * onSave가 있으면 캔버스 변경 시 500ms 디바운스 후 호출된다.
 */
function CanvasWorkspace({ canvasJSON, canvasSize, onSave, selectedDate, onImportSuccess, workspaceSize }) {
  const canvasElRef = useRef(null)

  const canvasWidth = Math.max(
    MIN_CANVAS_WIDTH,
    workspaceSize.width - SIDEBAR_WIDTH - LAYOUT_GAP - CANVAS_BORDER,
  )
  const canvasHeight = Math.max(MIN_CANVAS_HEIGHT, workspaceSize.height - CANVAS_BORDER)

  function rescaleLoadedObjects(fabricCanvas) {
    const savedSize = canvasSize ?? LEGACY_CANVAS_SIZE
    scaleCanvasObjects(fabricCanvas, savedSize, { width: canvasWidth, height: canvasHeight })
  }

  const fabricCanvasRef = useFabricCanvas(canvasElRef, canvasJSON, onSave, {
    width: canvasWidth,
    height: canvasHeight,
    onLoaded: rescaleLoadedObjects,
  })
  const { activeObject } = useActiveSelection(fabricCanvasRef)
  const objectActions = useObjectActions(fabricCanvasRef)
  const backgroundActions = useCanvasBackground(fabricCanvasRef)
  useCanvasKeyboardShortcuts(fabricCanvasRef)

  return (
    <div style={{ display: 'flex', gap: `${LAYOUT_GAP}px`, height: '100%' }}>
      <div
        style={{
          width: `${SIDEBAR_WIDTH}px`,
          flexShrink: 0,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <StickerPalette fabricCanvasRef={fabricCanvasRef} />
        <CanvasBackgroundControl actions={backgroundActions} />
        <ObjectToolbar activeObject={activeObject} actions={objectActions} />
        <ImageUploadButton fabricCanvasRef={fabricCanvasRef} />
        <TextMemoButton fabricCanvasRef={fabricCanvasRef} />
        <ExportImportControls
          fabricCanvasRef={fabricCanvasRef}
          selectedDate={selectedDate}
          onImportSuccess={onImportSuccess}
        />
      </div>
      <div style={{ border: '2px inset #9a9a9a', alignSelf: 'flex-start' }}>
        <canvas ref={canvasElRef} />
      </div>
    </div>
  )
}
