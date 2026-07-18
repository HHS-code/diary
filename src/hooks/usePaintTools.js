import { useEffect, useState } from 'react'
import { PencilBrush, SprayBrush } from 'fabric'
// 이 import는 부수효과로 ClippingGroup(type 'clipping')을 fabric classRegistry에
// 등록한다 — 지워진 획의 loadFromJSON 역직렬화에 필요. 다른 파일로 옮기지 말 것
// (architecture.md 모듈 경계: @erase2d/fabric 의존은 이 파일 안에만).
import { EraserBrush } from '@erase2d/fabric'

const DEFAULT_COLOR = '#000000'
const DEFAULT_WIDTH = 4
// 지우개는 브러시(2~8)보다 굵은 전용 굵기 체계(8~32)를 쓴다 — XP 그림판의 지우개 크기처럼.
const ERASER_DEFAULT_WIDTH = 16
// XP 그림판의 연필처럼 항상 가는 고정 굵기
const PENCIL_WIDTH = 1
// 에어브러시 밀도(분사 점 개수)를 굵기에 비례시키는 배율.
// 기본 굵기 4에서 fabric SprayBrush의 기본 밀도(20)와 같아진다.
const SPRAY_DENSITY_PER_WIDTH = 5
// 올가미는 그림이 아니라 선택 영역 표시선이므로, 굵기 설정과 무관하게
// 얇은 점선 파란색으로 고정해 다른 획과 시각적으로 구분한다.
const LASSO_COLOR = '#0080ff'
const LASSO_WIDTH = 1
const LASSO_DASH_ARRAY = [4, 4]
const CANVAS_READY_POLL_MS = 50

/**
 * 드래그 중 실시간 미리보기를 교정한 지우개 브러시.
 *
 * erase2d 기본 _render는 하단 캔버스를 destination-out으로 뚫는데, 그러면
 * 캔버스 뒤 회색 작업대가 경로 가장자리(안티앨리어싱)로 비쳐서 지우개가
 * 지나간 자리가 회색 줄로 보인다 — 굵기가 얇을수록 줄 전체가 회색이 된다.
 * 미리보기는 "지워진 뒤의 모습"(배경 + 지울 수 없는 오브젝트만 그린
 * effectContext)을 경로 모양으로 상단 캔버스에 덮어그리면 충분하므로,
 * 하단 캔버스를 뚫는 단계를 생략한다. 실제 지우기 커밋(mouseup)은 그대로다.
 */
class LiveEraserBrush extends EraserBrush {
  _render(ctx = this.canvas.getTopContext()) {
    PencilBrush.prototype._render.call(this, ctx)
    ctx.save()
    ctx.globalCompositeOperation = 'source-in'
    ctx.resetTransform()
    ctx.drawImage(this.effectContext.canvas, 0, 0)
    ctx.restore()
  }
}

function buildEraserBrush(canvas, width) {
  const brush = new LiveEraserBrush(canvas)
  brush.width = width
  brush.on('end', async (event) => {
    // 기본 자동 커밋 대신 직접 커밋해 완료 시점을 잡는다 — 지우기는 fabric의
    // object:* 이벤트를 스스로 발생시키지 않으므로, 커밋이 끝난 뒤
    // object:modified를 발생시켜야 기존 오토세이브가 지운 상태를 저장한다.
    event.preventDefault()
    if (event.detail.targets.length === 0) return
    await brush.commit(event.detail)
    canvas.fire('object:modified')
  })
  return brush
}

function buildBrush(canvas, tool, color, width) {
  if (tool === 'pencil') {
    const brush = new PencilBrush(canvas)
    brush.color = color
    brush.width = PENCIL_WIDTH
    return brush
  }
  if (tool === 'brush') {
    const brush = new PencilBrush(canvas)
    brush.color = color
    brush.width = width
    return brush
  }
  if (tool === 'eraser') {
    return buildEraserBrush(canvas, width)
  }
  if (tool === 'lasso') {
    const brush = new PencilBrush(canvas)
    brush.color = LASSO_COLOR
    brush.width = LASSO_WIDTH
    brush.strokeDashArray = LASSO_DASH_ARRAY
    return brush
  }
  // airbrush
  const brush = new SprayBrush(canvas)
  brush.color = color
  brush.width = width
  brush.density = width * SPRAY_DENSITY_PER_WIDTH
  return brush
}

/**
 * 지우개 크기를 그대로 보여주는 사각형 커서 (XP 그림판의 지우개 커서).
 * size는 화면 픽셀 기준 — 논리 굵기에 표시 배율(zoom)을 곱해 넘긴다.
 */
function buildEraserCursor(size) {
  const side = Math.max(Math.round(size), 4)
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${side}' height='${side}'>` +
    `<rect x='0.5' y='0.5' width='${side - 1}' height='${side - 1}' fill='white' stroke='black'/></svg>`
  const hotspot = Math.floor(side / 2)
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${hotspot} ${hotspot}, crosshair`
}

function applyToolToCanvas(canvas, tool, color, width) {
  if (tool === 'select') {
    canvas.isDrawingMode = false
    return
  }
  canvas.isDrawingMode = true
  canvas.freeDrawingBrush = buildBrush(canvas, tool, color, width)
  canvas.freeDrawingCursor = tool === 'eraser' ? buildEraserCursor(width * canvas.getZoom()) : 'crosshair'
}

/**
 * 그림판식 그리기 도구 상태를 Fabric.js 캔버스에 연결하는 커스텀 훅.
 *
 * - tool ∈ { 'select', 'pencil', 'brush', 'airbrush', 'eraser', 'lasso' }, 기본 'select'.
 *   select는 그리기 모드를 끄고(기존 오브젝트 선택/이동), 나머지는
 *   그리기 모드를 켜며 도구에 맞는 브러시를 설정한다.
 * - color/width 변경은 현재 활성 브러시에 즉시 반영된다 (연필은 굵기 1 고정).
 * - width는 현재 도구의 굵기다: 지우개는 전용 굵기(기본 16)를 따로 기억하고,
 *   브러시·에어브러시는 공용 굵기(기본 4)를 쓴다. setWidth도 현재 도구 쪽에 반영된다.
 * - 지우개 도구는 캔버스 커서를 지우개 크기의 사각형으로 바꾼다.
 * - 그린 획은 path:created 시점에 박제된다 — 그림판처럼 선택·이동 불가
 *   (selectable/evented false)이고, isFreeDrawing·erasable 태그로
 *   직렬화·지우개 대상 식별이 가능하다.
 * - 지우개(EraserBrush)는 erasable:true인 오브젝트(=그린 획)만 지운다.
 *   스티커/사진/텍스트는 erasable 미설정(기본 false)이라 영향받지 않는다.
 * - lasso(올가미)는 얇은 파란 점선 브러시로 그려지지만 그림 획이 아니라 선택 영역
 *   표시선이다. path:created 시 박제되지 않고 캔버스에서 즉시 제거되며, 좌표 정보는
 *   호출부(StickerStudio)가 별도로 구독해 stickerCutout.js로 전달한다.
 * @param {React.RefObject<import('fabric').Canvas | null>} fabricCanvasRef
 * @returns {{
 *   tool: 'select' | 'pencil' | 'brush' | 'airbrush' | 'eraser' | 'lasso',
 *   color: string,
 *   width: number,
 *   setTool: (tool: string) => void,
 *   setColor: (color: string) => void,
 *   setWidth: (width: number) => void,
 * }}
 */
export function usePaintTools(fabricCanvasRef) {
  const [tool, setTool] = useState('select')
  const [color, setColor] = useState(DEFAULT_COLOR)
  const [drawWidth, setDrawWidth] = useState(DEFAULT_WIDTH)
  const [eraserWidth, setEraserWidth] = useState(ERASER_DEFAULT_WIDTH)

  const width = tool === 'eraser' ? eraserWidth : drawWidth
  const setWidth = tool === 'eraser' ? setEraserWidth : setDrawWidth

  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return
    applyToolToCanvas(canvas, tool, color, width)
  }, [fabricCanvasRef, tool, color, width])

  useEffect(() => {
    // 에어브러시 산출물(Group)도 path 키로 전달된다 — 획과 동일하게 박제.
    // 올가미(lasso)는 선택 도구이지 그리기 도구가 아니므로, 그린 Path를 그림 획으로
    // 박제하지 않고 캔버스에서 즉시 제거한다 — 좌표 정보만 stickerCutout.js로 넘어간다.
    function pinCreatedStroke(canvas, path) {
      if (tool === 'lasso') {
        canvas.remove(path)
        return
      }
      path.set({ selectable: false, evented: false, isFreeDrawing: true, erasable: true })
    }

    function subscribeToCanvas(canvas) {
      const handlePathCreated = ({ path }) => pinCreatedStroke(canvas, path)
      canvas.on('path:created', handlePathCreated)
      return () => canvas.off('path:created', handlePathCreated)
    }

    // fabricCanvasRef.current는 useFabricCanvas 내부에서 비동기로 채워지므로,
    // 아직 준비되지 않았다면 짧은 간격으로 폴링하다가 준비되는 즉시 구독한다.
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
  }, [fabricCanvasRef, tool])

  return { tool, color, width, setTool, setColor, setWidth }
}
