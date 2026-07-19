import { useEffect, useRef, useState } from 'react'
import { FabricImage, Rect } from 'fabric'
import { addUnerasableBackground } from '../fabric/stickerEraserBackground'

const CANVAS_READY_POLL_MS = 50

function buildDraftCropRect(scenePoint) {
  return new Rect({
    left: scenePoint.x,
    top: scenePoint.y,
    // Fabric 7의 FabricObject 기본 origin은 'center'다(5 이하에서는 'left'/'top'이었음).
    // origin이 center인 채로 리사이즈 컨트롤을 쓰면, Fabric이 오브젝트 중심을 고정점으로
    // 삼아 대칭으로 스케일한다 — 모서리 핸들 하나만 당겨도 반대쪽 모서리까지 반대 방향으로
    // 같이 움직이는 버그의 원인이었다(2026-07-19 실측: br 핸들만 당겼는데 tl이 캔버스
    // 밖 음수 좌표까지 밀려났음). 그림판처럼 "잡은 모서리만 움직이고 반대쪽은 고정"되려면
    // origin을 명시적으로 left/top으로 고정해야 한다.
    originX: 'left',
    originY: 'top',
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
 * 드래그로 그린 초안 사각형을 그림판처럼 모서리 핸들로 조절 가능한 상태로 전환한다.
 * 크기(음수 width/height로 뒤집어 그렸을 수 있음)를 양수로 정규화하고 selectable/hasControls를
 * 켠 뒤 활성 오브젝트로 선택한다.
 */
function makeCropRectAdjustable(canvas, rect) {
  rect.set({
    left: Math.min(rect.left, rect.left + rect.width),
    top: Math.min(rect.top, rect.top + rect.height),
    width: Math.abs(rect.width),
    height: Math.abs(rect.height),
    selectable: true,
    evented: true,
    hasControls: true,
    hasRotatingPoint: false,
    lockRotation: true,
  })
  canvas.setActiveObject(rect)
  canvas.renderAll()
}

/**
 * 캔버스에 표시된 내용을 사각형으로 지정해 잘라내는(크롭) 도구.
 *
 * 그림판(MS Paint)과 동일한 2단계 흐름이다: (1) 드래그로 초안 영역을 그리면 (2) 그 사각형에
 * 모서리 핸들이 생겨 자유롭게 크기·위치를 다시 조절할 수 있고, (3) "크롭 적용" 버튼을 눌러야
 * 비로소 확정된다. 드래그 한 번으로 바로 확정되던 이전 방식은 오차가 있으면 처음부터 다시
 * 그려야 해 불편했다(2026-07-19 사용자 피드백).
 *
 * 그리기 도구(usePaintTools)와 별개의 편집 모드다 — isDrawingMode를 켜지 않고
 * 캔버스 마우스 이벤트를 직접 구독해 임시 Rect로 드래그 영역을 표시한다.
 * startCropping()으로 크롭 모드에 들어가면 캔버스의 오브젝트 선택(selection/skipTargetFind)을
 * 잠시 꺼서, 아직 크롭 사각형이 없을 때의 드래그는 항상 새 영역을 그리도록 한다. 사각형이
 * 생긴 뒤에는 selection을 다시 켜서 그 사각형만 선택·조절할 수 있게 한다 — 사각형이 아닌
 * 빈 캔버스를 다시 드래그하면 기존 사각형을 버리고 새로 그리기 시작한다.
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

    // 이미 조절 가능한 사각형의 몸통이나 컨트롤 핸들을 누른 거라면(target이 그 사각형
    // 자신 — Fabric은 컨트롤 클릭도 target을 activeObject로 준다), Fabric의 기본
    // 리사이즈/이동 컨트롤에 완전히 맡기고 새 드래그를 시작하지 않는다. 사각형 밖 빈
    // 공간이나 다른 오브젝트를 클릭하면 기존 사각형을 버리고 새로 그리기 시작한다.
    function handleMouseDown({ target, scenePoint }) {
      if (cropRectRef.current && target === cropRectRef.current) return

      dragOriginRef.current = scenePoint
      removeCropMarkerRect(canvas)
      canvas.selection = false
      canvas.skipTargetFind = true
      cropRectRef.current = buildDraftCropRect(scenePoint)
      canvas.add(cropRectRef.current)
    }

    // rect.selectable(조절 가능 상태로 전환된 뒤)이면 이 핸들러들은 아무 것도 하지
    // 않는다 — 안전망이다. handleMouseDown이 이미 그 사각형 클릭을 걸러내므로 정상
    // 흐름에선 selectable인 rect에 대해 이 코드가 실행될 일이 없지만, 혹시라도
    // dragOriginRef가 남아있는 상태로 실행되면 Fabric의 컨트롤 리사이즈와 좌표를
    // 동시에 덮어써 충돌한다(2026-07-19 실측 버그 — 근본 원인은 Rect의 origin이
    // Fabric 7 기본값인 'center'였던 것이었고 buildDraftCropRect에서 origin을
    // 'left'/'top'으로 고정해 해결했지만, 이 가드도 이중 안전장치로 남겨둔다).
    function handleMouseMove({ scenePoint }) {
      const rect = cropRectRef.current
      const origin = dragOriginRef.current
      if (!rect || !origin || rect.selectable) return
      rect.set({
        left: Math.min(origin.x, scenePoint.x),
        top: Math.min(origin.y, scenePoint.y),
        width: Math.abs(scenePoint.x - origin.x),
        height: Math.abs(scenePoint.y - origin.y),
      })
      canvas.renderAll()
    }

    function handleMouseUp() {
      if (!dragOriginRef.current) return
      dragOriginRef.current = null
      const rect = cropRectRef.current
      if (!rect || rect.selectable || rect.width === 0 || rect.height === 0) return
      canvas.skipTargetFind = false
      makeCropRectAdjustable(canvas, rect)
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

    // 핸들로 조절한 뒤에는 크기 변화가 scaleX/scaleY에 반영돼 있을 수 있어
    // width/height에 스케일을 직접 곱해야 정확하다(getScaledWidth/Height는 stroke
    // 두께까지 포함해 순수 크기보다 커진다 — 여기선 stroke 없는 실제 크롭 크기가 필요).
    const left = rect.left
    const top = rect.top
    const width = rect.width * rect.scaleX
    const height = rect.height * rect.scaleY
    canvas.remove(rect)
    cropRectRef.current = null

    const croppedElement = canvas.toCanvasElement(1, { left, top, width, height })
    canvas.remove(...canvas.getObjects())
    addUnerasableBackground(canvas)

    const croppedImage = new FabricImage(croppedElement)
    croppedImage.set({
      left: (canvas.getWidth() - croppedImage.width) / 2,
      top: (canvas.getHeight() - croppedImage.height) / 2,
      erasable: true,
    })
    canvas.add(croppedImage)
    canvas.setActiveObject(croppedImage)

    restoreSelectionState(canvas)
    canvas.renderAll()
    setIsCropping(false)
  }

  return { isCropping, startCropping, cancelCropping, applyCrop }
}
