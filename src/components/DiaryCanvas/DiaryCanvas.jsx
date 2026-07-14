import { useLayoutEffect, useRef, useState } from 'react'
import { useFabricCanvas, LOGICAL_CANVAS } from '../../hooks/useFabricCanvas'
import { useActiveSelection } from '../../hooks/useActiveSelection'
import { useObjectActions } from '../../hooks/useObjectActions'
import { useCanvasKeyboardShortcuts } from '../../hooks/useCanvasKeyboardShortcuts'
import { useCanvasBackground } from '../../hooks/useCanvasBackground'
import { fitCanvasObjects } from '../../hooks/canvasMigration'
import { StickerPalette } from '../StickerPalette/StickerPalette'
import { CanvasBackgroundControl } from '../CanvasBackgroundControl/CanvasBackgroundControl'
import { ImageUploadButton } from '../ImageUploadButton/ImageUploadButton'
import { TextMemoButton } from '../TextMemoButton/TextMemoButton'
import { ExportImportControls } from '../ExportImportControls/ExportImportControls'
import { ObjectToolbar } from '../ObjectToolbar/ObjectToolbar'

// 사이드바 패널 폭(240px) + 세로 스크롤바 여유
const SIDEBAR_WIDTH = 258
const LAYOUT_GAP = 12
// 작업대의 2px inset 보더(좌우/상하 합 4) + 내부 패딩(8px×2)
const WORKSPACE_FRAME = 20
// 아주 작은 창에서도 편집이 아예 불가능해지지 않도록 하는 표시 배율 하한
const MIN_DISPLAY_SCALE = 0.2

// canvasSize 메타데이터가 없는 구버전 데이터는 이 크기로 저장된 것으로 간주한다.
const LEGACY_CANVAS_SIZE = { width: 800, height: 600 }

/**
 * 다이어리 편집 작업 공간. 캔버스의 논리 크기는 LOGICAL_CANVAS로 고정이며,
 * 마운트 시 부모가 준 공간을 1회 측정해 화면에 맞는 표시 배율만 계산한다.
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
 * 없으면 800×600)가 논리 캔버스와 다르면 비율 유지 + 가운데 정렬로 1회 옮긴다.
 * onSave가 있으면 캔버스 변경 시 500ms 디바운스 후 호출된다.
 */
function CanvasWorkspace({ canvasJSON, canvasSize, onSave, selectedDate, onImportSuccess, workspaceSize }) {
  const canvasElRef = useRef(null)

  const availableWidth = workspaceSize.width - SIDEBAR_WIDTH - LAYOUT_GAP - WORKSPACE_FRAME
  const availableHeight = workspaceSize.height - WORKSPACE_FRAME
  const displayScale = Math.max(
    MIN_DISPLAY_SCALE,
    Math.min(availableWidth / LOGICAL_CANVAS.width, availableHeight / LOGICAL_CANVAS.height),
  )

  function fitLoadedObjects(fabricCanvas) {
    const savedSize = canvasSize ?? LEGACY_CANVAS_SIZE
    fitCanvasObjects(fabricCanvas, savedSize, LOGICAL_CANVAS)
  }

  const fabricCanvasRef = useFabricCanvas(canvasElRef, canvasJSON, onSave, {
    displayScale,
    onLoaded: fitLoadedObjects,
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
      {/* XP 그림판 스타일 작업대 — 캔버스는 좌측 상단, 남는 공간은 회색 작업 영역 */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          background: '#808080',
          border: '2px inset #9a9a9a',
          padding: '8px',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'inline-block', boxShadow: '2px 2px 4px rgba(0,0,0,.4)' }}>
          <canvas ref={canvasElRef} />
        </div>
      </div>
    </div>
  )
}
