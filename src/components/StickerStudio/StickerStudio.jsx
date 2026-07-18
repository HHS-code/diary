import { useEffect, useRef, useState } from 'react'
import { FabricImage } from 'fabric'
import { useFabricCanvas } from '../../hooks/useFabricCanvas'
import { usePaintTools } from '../../hooks/usePaintTools'
import { useCanvasHistory } from '../../hooks/useCanvasHistory'
import { useCanvasKeyboardShortcuts } from '../../hooks/useCanvasKeyboardShortcuts'
import { useStickerCropTool } from '../../hooks/useStickerCropTool'
import { useAssetLibrary } from '../../hooks/useAssetLibrary'
import { commitLassoCutout, previewLassoCutout } from '../../fabric/stickerCutout'
import { createOutlinedSticker } from '../../fabric/stickerOutline'
import { removeBackgroundFromImage } from '../../ai/backgroundRemoval'
import { getAsset, createAssetObjectURL } from '../../storage/assetStorage'
import { PaintToolbox } from '../PaintToolbox/PaintToolbox'
import { StickerImageUpload } from './StickerImageUpload'
import { MyStickersPanel } from './MyStickersPanel'

const CANVAS_READY_POLL_MS = 50
const OUTLINE_PREVIEW_DEBOUNCE_MS = 100
const DEFAULT_OUTLINE_THICKNESS_PX = 5
const MIN_OUTLINE_THICKNESS_PX = 0
const MAX_OUTLINE_THICKNESS_PX = 20
const SAVED_LABEL_RESET_MS = 1500

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
 * targetImage의 경계 영역만 rasterize한 HTMLCanvasElement를 반환한다(commitLassoCutout의
 * rasterize 패턴과 동일 — canvas.toCanvasElement + filter). AI 배경제거의 입력(source)이자,
 * 이후 "AI 보정"의 복원이 참조할 원본 픽셀이 된다.
 * @param {import('fabric').Canvas} canvas
 * @param {import('fabric').FabricObject} targetImage
 * @returns {{ canvasElement: HTMLCanvasElement, left: number, top: number }}
 */
function rasterizeTargetImageBounds(canvas, targetImage) {
  const { left, top, width, height } = targetImage.getBoundingRect()
  const canvasElement = canvas.toCanvasElement(1, {
    left,
    top,
    width,
    height,
    filter: (object) => object === targetImage,
  })
  return { canvasElement, left, top }
}

/**
 * "AI 배경제거" 버튼 라벨을 상태에 따라 결정한다.
 * @param {'idle' | 'processing' | 'error'} status
 * @param {string} progressMessage
 * @returns {string}
 */
function getBackgroundRemovalButtonLabel(status, progressMessage) {
  if (status === 'processing') {
    return progressMessage ? `처리 중... (${progressMessage})` : '처리 중...'
  }
  if (status === 'error') return '실패'
  return 'AI 배경제거'
}

/**
 * HTMLCanvasElement를 투명 배경 PNG Blob으로 변환한다(콜백 기반 toBlob을 Promise로 감쌈).
 * @param {HTMLCanvasElement} canvasElement
 * @returns {Promise<Blob>}
 */
function rasterizeCanvasToPngBlob(canvasElement) {
  return new Promise((resolve) => canvasElement.toBlob(resolve, 'image/png'))
}

/**
 * 스티커 스튜디오 화면의 루트. 빈 투명 캔버스를 열고, 다이어리의 그리기·undo/redo·
 * 복사/붙여넣기 훅을 그대로 재사용한다(ADR-7). 편집 중 상태를 영속시키지 않으므로
 * useFabricCanvas에 onSave를 넘기지 않는다 — 저장은 이후 step("완성" 버튼)에서 다룬다.
 * 이미지 업로드(StickerImageUpload)와 사각형 크롭(useStickerCropTool)을 사이드바에서 제공한다.
 * 올가미(lasso) 도구로 그린 Path는 path:created 시 stickerCutout.js의 previewLassoCutout으로
 * 넘어가 대상 이미지의 clipPath 미리보기가 되고, "누끼 적용" 버튼이 commitLassoCutout으로
 * 확정(rasterize)한다(ADR-5).
 * "완성" 버튼은 테두리 확정 결과(있으면)나 현재 캔버스를 rasterize해 PNG Blob으로 만들어
 * assetStorage에 type: 'sticker'로 저장한다 — 항상 새 assetId로 저장하며 원본을 덮어쓰지
 * 않는다(ADR-4). "내 스티커" 패널(MyStickersPanel)에서 저장된 스티커를 클릭하면 현재 캔버스의
 * 오브젝트를 모두 지우고 그 스티커 하나로 교체해 재편집을 이어갈 수 있다.
 */
export function StickerStudio() {
  const canvasElRef = useRef(null)
  const fabricCanvasRef = useFabricCanvas(canvasElRef, null, null, {
    logicalSize: STICKER_LOGICAL_CANVAS,
    backgroundColor: 'transparent',
  })
  const paintTools = usePaintTools(fabricCanvasRef)
  const cropTool = useStickerCropTool(fabricCanvasRef)
  const assetLibrary = useAssetLibrary()

  useCanvasHistory(fabricCanvasRef)
  useCanvasKeyboardShortcuts(fabricCanvasRef)

  const [isOutlineEditorOpen, setIsOutlineEditorOpen] = useState(false)
  const [outlineThicknessPx, setOutlineThicknessPx] = useState(DEFAULT_OUTLINE_THICKNESS_PX)
  const [outlinePreviewCanvas, setOutlinePreviewCanvas] = useState(null)
  // 확정된 테두리 결과 — "적용"을 누르기 전까지는 null(테두리는 선택 사항, PRD 섹션 5).
  // 다음 step(저장)이 이 값을 읽어 있으면 이걸, 없으면 원본 캔버스를 저장한다.
  const outlinedResultRef = useRef(null)

  const [isSaved, setIsSaved] = useState(false)

  // AI 배경제거 직전의 대상 이미지 rasterize 결과 — 다음 step("AI 보정"의 복원)이 참조할
  // 원본 픽셀이다. 저장/새로고침 시 유지할 필요는 없다(세션 메모리로 충분, ADR-4).
  const originalBeforeAiRemovalRef = useRef(null)
  const [backgroundRemovalStatus, setBackgroundRemovalStatus] = useState('idle')
  const [backgroundRemovalProgressMessage, setBackgroundRemovalProgressMessage] = useState('')

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

  // 대상 이미지를 AI 세그멘테이션 모델로 배경 제거한다(PRD 섹션 1). 처리 직전 상태를
  // originalBeforeAiRemovalRef에 저장해두는데, 이는 다음 step의 "AI 보정 → 복원"이
  // 참조할 원본이다. 결과 이미지는 commitLassoCutout과 동일한 방식(새 FabricImage로
  // 원래 위치에 교체, assetId 승계)으로 캔버스에 반영된다.
  async function handleRemoveBackground() {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const targetImage = resolveLassoCutoutTarget(canvas)
    if (!targetImage) return

    const { canvasElement, left, top } = rasterizeTargetImageBounds(canvas, targetImage)
    originalBeforeAiRemovalRef.current = canvasElement
    setBackgroundRemovalProgressMessage('')
    setBackgroundRemovalStatus('processing')

    try {
      const resultBlob = await removeBackgroundFromImage(canvasElement, (info) => {
        setBackgroundRemovalProgressMessage(info?.message ?? '')
      })
      const resultImage = await FabricImage.fromURL(createAssetObjectURL(resultBlob))
      resultImage.set({ originX: 'left', originY: 'top', left, top, assetId: targetImage.assetId })

      canvas.remove(targetImage)
      canvas.add(resultImage)
      canvas.setActiveObject(resultImage)
      canvas.renderAll()
      setBackgroundRemovalStatus('idle')
    } catch {
      setBackgroundRemovalStatus('error')
      setTimeout(() => setBackgroundRemovalStatus('idle'), SAVED_LABEL_RESET_MS)
    }
  }

  // 두께 슬라이더가 바뀔 때마다(디바운스) 현재 캔버스를 rasterize해 오프스크린에서
  // createOutlinedSticker를 다시 계산한다 — Fabric 렌더 루프와 무관한 별도 처리(ADR-6).
  useEffect(() => {
    if (!isOutlineEditorOpen) return undefined
    const canvas = fabricCanvasRef.current
    if (!canvas) return undefined

    const debounceTimer = setTimeout(() => {
      const sourceCanvasElement = canvas.toCanvasElement()
      setOutlinePreviewCanvas(createOutlinedSticker(sourceCanvasElement, outlineThicknessPx))
    }, OUTLINE_PREVIEW_DEBOUNCE_MS)

    return () => clearTimeout(debounceTimer)
  }, [isOutlineEditorOpen, outlineThicknessPx, fabricCanvasRef])

  function handleToggleOutlineEditor() {
    setIsOutlineEditorOpen((open) => !open)
  }

  function handleConfirmOutline() {
    if (!outlinePreviewCanvas) return
    outlinedResultRef.current = outlinePreviewCanvas
    setIsOutlineEditorOpen(false)
  }

  function attachOutlinePreviewCanvas(container) {
    if (!container || !outlinePreviewCanvas) return
    container.replaceChildren(outlinePreviewCanvas)
  }

  // 테두리 확정 결과가 있으면 그것을, 없으면 현재 캔버스를 rasterize해 저장 대상으로 삼는다
  // (다음 step 요약에서 정한 규칙). 항상 새 assetId로 저장한다(ADR-4).
  async function handleSaveSticker() {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const sourceCanvasElement = outlinedResultRef.current ?? canvas.toCanvasElement()
    const blob = await rasterizeCanvasToPngBlob(sourceCanvasElement)
    await assetLibrary.registerSticker(blob, `sticker-${Date.now()}.png`)

    setIsSaved(true)
    setTimeout(() => setIsSaved(false), SAVED_LABEL_RESET_MS)
  }

  // "내 스티커"에서 스티커를 클릭하면 크롭과 동일하게 캔버스를 이 스티커 하나로 다시 시작한다.
  // 원본 assetId는 추적하지 않는다 — 저장은 항상 새 항목으로 이루어진다(ADR-4).
  async function handleSelectSticker(asset) {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const record = await getAsset(asset.id)
    if (!record) return

    const img = await FabricImage.fromURL(createAssetObjectURL(record.blob))
    canvas.remove(...canvas.getObjects())
    img.set({
      left: (canvas.getWidth() - img.width) / 2,
      top: (canvas.getHeight() - img.height) / 2,
    })
    canvas.add(img)
    canvas.setActiveObject(img)
    canvas.renderAll()
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
          <button
            type="button"
            style={cropButtonStyle}
            onClick={handleRemoveBackground}
            disabled={backgroundRemovalStatus === 'processing'}
          >
            {getBackgroundRemovalButtonLabel(backgroundRemovalStatus, backgroundRemovalProgressMessage)}
          </button>
        </div>
        <div style={sidebarPanelStyle}>
          <button type="button" style={cropButtonStyle} onClick={handleToggleOutlineEditor}>
            테두리 추가
          </button>
          {isOutlineEditorOpen && (
            <>
              <label style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                두께 {outlineThicknessPx}px
                <input
                  type="range"
                  min={MIN_OUTLINE_THICKNESS_PX}
                  max={MAX_OUTLINE_THICKNESS_PX}
                  value={outlineThicknessPx}
                  onChange={(event) => setOutlineThicknessPx(Number(event.target.value))}
                />
              </label>
              <div
                ref={attachOutlinePreviewCanvas}
                style={{
                  background: '#808080',
                  border: '1px inset #9a9a9a',
                  minHeight: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              />
              <button type="button" style={cropButtonStyle} onClick={handleConfirmOutline}>
                적용
              </button>
            </>
          )}
        </div>
        <div style={sidebarPanelStyle}>
          <button type="button" style={cropButtonStyle} onClick={handleSaveSticker}>
            {isSaved ? '저장됨' : '완성'}
          </button>
          <MyStickersPanel stickers={assetLibrary.stickers} onSelectSticker={handleSelectSticker} />
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
