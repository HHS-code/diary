import { useRef } from 'react'
import { useFabricCanvas } from '../../hooks/useFabricCanvas'
import { usePaintTools } from '../../hooks/usePaintTools'
import { useCanvasHistory } from '../../hooks/useCanvasHistory'
import { useCanvasKeyboardShortcuts } from '../../hooks/useCanvasKeyboardShortcuts'
import { useStickerCropTool } from '../../hooks/useStickerCropTool'
import { PaintToolbox } from '../PaintToolbox/PaintToolbox'
import { StickerImageUpload } from './StickerImageUpload'

const sidebarPanelStyle = {
  width: '240px',
  boxSizing: 'border-box',
  border: '1px solid #7d7d64',
  borderRadius: 3,
  background: '#ece9d8',
  boxShadow: '1px 1px 0 rgba(255,255,255,.7) inset, 2px 2px 5px rgba(0,0,0,.25)',
  padding: '8px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
}

const cropButtonStyle = {
  padding: '8px 16px',
  border: '1px solid #7d7d64',
  borderRadius: 3,
  background: 'linear-gradient(180deg,#fdfdfa,#dcd9c7)',
  cursor: 'pointer',
  fontSize: '14px',
  flex: 1,
}

// 스티커 스튜디오 캔버스의 고정 논리 크기 — 다이어리의 LOGICAL_CANVAS(1600x1000)와
// 별개로, 작은 정사각형 스티커 제작용(PRD 섹션 2).
const STICKER_LOGICAL_CANVAS = { width: 512, height: 512 }

/**
 * 스티커 스튜디오 화면의 루트. 빈 투명 캔버스를 열고, 다이어리의 그리기·undo/redo·
 * 복사/붙여넣기 훅을 그대로 재사용한다(ADR-7). 편집 중 상태를 영속시키지 않으므로
 * useFabricCanvas에 onSave를 넘기지 않는다 — 저장은 이후 step("완성" 버튼)에서 다룬다.
 * 이미지 업로드(StickerImageUpload)와 사각형 크롭(useStickerCropTool)을 사이드바에서 제공한다.
 */
export function StickerStudio() {
  const canvasElRef = useRef(null)
  const fabricCanvasRef = useFabricCanvas(canvasElRef, null, null, {
    logicalSize: STICKER_LOGICAL_CANVAS,
    backgroundColor: 'transparent',
  })
  const paintTools = usePaintTools(fabricCanvasRef)
  const cropTool = useStickerCropTool(fabricCanvasRef)

  useCanvasHistory(fabricCanvasRef)
  useCanvasKeyboardShortcuts(fabricCanvasRef)

  return (
    <div style={{ display: 'flex', gap: '12px', padding: '8px', height: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <PaintToolbox
          tool={paintTools.tool}
          color={paintTools.color}
          width={paintTools.width}
          onToolChange={paintTools.setTool}
          onColorChange={paintTools.setColor}
          onWidthChange={paintTools.setWidth}
        />
        <div style={sidebarPanelStyle}>
          <StickerImageUpload fabricCanvasRef={fabricCanvasRef} />
          {cropTool.isCropping ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" style={cropButtonStyle} onClick={cropTool.applyCrop}>
                크롭 적용
              </button>
              <button type="button" style={cropButtonStyle} onClick={cropTool.cancelCropping}>
                취소
              </button>
            </div>
          ) : (
            <button type="button" style={cropButtonStyle} onClick={cropTool.startCropping}>
              자르기
            </button>
          )}
        </div>
      </div>
      <div
        style={{
          background: '#808080',
          border: '2px inset #9a9a9a',
          padding: '8px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'inline-block', boxShadow: '2px 2px 4px rgba(0,0,0,.4)' }}>
          <canvas ref={canvasElRef} />
        </div>
      </div>
    </div>
  )
}
