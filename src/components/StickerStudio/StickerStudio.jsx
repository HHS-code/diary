import { useEffect, useRef } from 'react'
import { FabricImage } from 'fabric'
import { useFabricCanvas } from '../../hooks/useFabricCanvas'
import { usePaintTools } from '../../hooks/usePaintTools'
import { useCanvasHistory } from '../../hooks/useCanvasHistory'
import { useCanvasKeyboardShortcuts } from '../../hooks/useCanvasKeyboardShortcuts'
import { useStickerCropTool } from '../../hooks/useStickerCropTool'
import { commitLassoCutout, previewLassoCutout } from '../../fabric/stickerCutout'
import { PaintToolbox } from '../PaintToolbox/PaintToolbox'
import { StickerImageUpload } from './StickerImageUpload'

const CANVAS_READY_POLL_MS = 50

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
 * 누끼 대상 이미지를 고른다. 캔버스에 이미지가 하나뿐이면 그것을, 아니면 현재
 * 선택된 오브젝트를 대상으로 삼는다(architecture.md 섹션 5).
 * @param {import('fabric').Canvas} canvas
 * @returns {import('fabric').FabricObject | undefined}
 */
function resolveLassoCutoutTarget(canvas) {
  const images = canvas.getObjects().filter((object) => object instanceof FabricImage)
  if (images.length === 1) return images[0]
  return canvas.getActiveObject()
}

/**
 * 스티커 스튜디오 화면의 루트. 빈 투명 캔버스를 열고, 다이어리의 그리기·undo/redo·
 * 복사/붙여넣기 훅을 그대로 재사용한다(ADR-7). 편집 중 상태를 영속시키지 않으므로
 * useFabricCanvas에 onSave를 넘기지 않는다 — 저장은 이후 step("완성" 버튼)에서 다룬다.
 * 이미지 업로드(StickerImageUpload)와 사각형 크롭(useStickerCropTool)을 사이드바에서 제공한다.
 * 올가미(lasso) 도구로 그린 Path는 path:created 시 stickerCutout.js의 previewLassoCutout으로
 * 넘어가 대상 이미지의 clipPath 미리보기가 되고, "누끼 적용" 버튼이 commitLassoCutout으로
 * 확정(rasterize)한다(ADR-5).
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

  useEffect(() => {
    function handlePathCreated(canvas, path) {
      if (paintTools.tool !== 'lasso') return
      previewLassoCutout(resolveLassoCutoutTarget(canvas), path)
    }

    function subscribeToCanvas(canvas) {
      const onPathCreated = ({ path }) => handlePathCreated(canvas, path)
      canvas.on('path:created', onPathCreated)
      return () => canvas.off('path:created', onPathCreated)
    }

    if (fabricCanvasRef.current) {
      return subscribeToCanvas(fabricCanvasRef.current)
    }

    let unsubscribe = null
    const pollTimer = setInterval(() => {
      if (!fabricCanvasRef.current) return
      unsubscribe = subscribeToCanvas(fabricCanvasRef.current)
      clearInterval(pollTimer)
    }, CANVAS_READY_POLL_MS)

    return () => {
      clearInterval(pollTimer)
      if (unsubscribe) unsubscribe()
    }
  }, [fabricCanvasRef, paintTools.tool])

  function handleCommitLassoCutout() {
    const canvas = fabricCanvasRef.current
    if (!canvas) return
    commitLassoCutout(canvas, resolveLassoCutoutTarget(canvas))
  }

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
          <button type="button" style={cropButtonStyle} onClick={handleCommitLassoCutout}>
            누끼 적용
          </button>
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
