import { useEffect, useRef, useState } from 'react'
import { FabricImage, Rect } from 'fabric'

const CANVAS_READY_POLL_MS = 50

function buildCropMarkerRect(scenePoint) {
  return new Rect({
    left: scenePoint.x,
    top: scenePoint.y,
    width: 0,
    height: 0,
    fill: 'rgba(0,0,0,0.1)',
    stroke: '#000000',
    strokeDashArray: [4, 4],
    strokeWidth: 1,
    selectable: false,
    evented: false,
  })
}

/**
 * 캔버스에 표시된 내용을 사각형으로 드래그 지정해 잘라내는(크롭) 도구.
 *
 * 그리기 도구(usePaintTools)와 별개의 편집 모드다 — isDrawingMode를 켜지 않고
 * 캔버스 마우스 이벤트를 직접 구독해 임시 Rect로 드래그 영역을 표시한다.
 * startCropping()으로 크롭 모드에 들어가면 캔버스의 오브젝트 선택(selection/skipTargetFind)을
 * 잠시 꺼서 드래그가 항상 새 크롭 영역을 그리도록 한다.
 * applyCrop()은 표시된 영역을 fabricCanvas.toCanvasElement()로 rasterize해
 * 기존 오브젝트를 모두 제거하고 그 결과 하나만 캔버스 중앙에 남긴다(architecture.md 섹션 4).
 * cancelCropping()은 표시 중인 영역만 지우고 캔버스 내용은 그대로 둔다.
 * @param {React.RefObject<import('fabric').Canvas | null>} fabricCanvasRef
 * @returns {{
 *   isCropping: boolean,
 *   startCropping: () => void,
 *   cancelCropping: () => void,
 *   applyCrop: () => void,
 * }}
 */
export function useStickerCropTool(fabricCanvasRef) {
  const [isCropping, setIsCropping] = useState(false)
  const cropRectRef = useRef(null)
  const dragOriginRef = useRef(null)
  const previousSelectionStateRef = useRef(null)

  function removeCropMarkerRect(canvas) {
    if (!cropRectRef.current) return
    canvas.remove(cropRectRef.current)
    cropRectRef.current = null
  }

  function restoreSelectionState(canvas) {
    if (!previousSelectionStateRef.current) return
    canvas.selection = previousSelectionStateRef.current.selection
    canvas.skipTargetFind = previousSelectionStateRef.current.skipTargetFind
    previousSelectionStateRef.current = null
  }

  useEffect(() => {
    if (!isCropping) return undefined

    function handleMouseDown({ scenePoint }) {
      dragOriginRef.current = scenePoint
      removeCropMarkerRect(canvas)
      cropRectRef.current = buildCropMarkerRect(scenePoint)
      canvas.add(cropRectRef.current)
    }

    function handleMouseMove({ scenePoint }) {
      const rect = cropRectRef.current
      const origin = dragOriginRef.current
      if (!rect || !origin) return
      rect.set({
        left: Math.min(origin.x, scenePoint.x),
        top: Math.min(origin.y, scenePoint.y),
        width: Math.abs(scenePoint.x - origin.x),
        height: Math.abs(scenePoint.y - origin.y),
      })
      canvas.renderAll()
    }

    function handleMouseUp() {
      dragOriginRef.current = null
    }

    let canvas
    function subscribeToCanvas(readyCanvas) {
      canvas = readyCanvas
      previousSelectionStateRef.current = { selection: canvas.selection, skipTargetFind: canvas.skipTargetFind }
      canvas.discardActiveObject()
      canvas.selection = false
      canvas.skipTargetFind = true
      canvas.renderAll()

      canvas.on('mouse:down', handleMouseDown)
      canvas.on('mouse:move', handleMouseMove)
      canvas.on('mouse:up', handleMouseUp)
      return () => {
        canvas.off('mouse:down', handleMouseDown)
        canvas.off('mouse:move', handleMouseMove)
        canvas.off('mouse:up', handleMouseUp)
      }
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
  }, [fabricCanvasRef, isCropping])

  function startCropping() {
    setIsCropping(true)
  }

  function cancelCropping() {
    const canvas = fabricCanvasRef.current
    if (canvas) {
      removeCropMarkerRect(canvas)
      restoreSelectionState(canvas)
      canvas.renderAll()
    }
    setIsCropping(false)
  }

  function applyCrop() {
    const canvas = fabricCanvasRef.current
    const rect = cropRectRef.current
    if (!canvas || !rect || rect.width === 0 || rect.height === 0) return

    const { left, top, width, height } = rect
    canvas.remove(rect)
    cropRectRef.current = null

    const croppedElement = canvas.toCanvasElement(1, { left, top, width, height })
    canvas.remove(...canvas.getObjects())

    const croppedImage = new FabricImage(croppedElement)
    croppedImage.set({
      left: (canvas.getWidth() - croppedImage.width) / 2,
      top: (canvas.getHeight() - croppedImage.height) / 2,
    })
    canvas.add(croppedImage)
    canvas.setActiveObject(croppedImage)

    restoreSelectionState(canvas)
    canvas.renderAll()
    setIsCropping(false)
  }

  return { isCropping, startCropping, cancelCropping, applyCrop }
}
