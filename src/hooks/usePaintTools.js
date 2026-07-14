import { useEffect, useState } from 'react'
import { PencilBrush, SprayBrush } from 'fabric'

const DEFAULT_COLOR = '#000000'
const DEFAULT_WIDTH = 4
// XP 그림판의 연필처럼 항상 가는 고정 굵기
const PENCIL_WIDTH = 1
// 에어브러시 밀도(분사 점 개수)를 굵기에 비례시키는 배율.
// 기본 굵기 4에서 fabric SprayBrush의 기본 밀도(20)와 같아진다.
const SPRAY_DENSITY_PER_WIDTH = 5
const CANVAS_READY_POLL_MS = 50

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
  // airbrush
  const brush = new SprayBrush(canvas)
  brush.color = color
  brush.width = width
  brush.density = width * SPRAY_DENSITY_PER_WIDTH
  return brush
}

function applyToolToCanvas(canvas, tool, color, width) {
  if (tool === 'select') {
    canvas.isDrawingMode = false
    return
  }
  canvas.isDrawingMode = true
  canvas.freeDrawingBrush = buildBrush(canvas, tool, color, width)
}

/**
 * 그림판식 그리기 도구 상태를 Fabric.js 캔버스에 연결하는 커스텀 훅.
 *
 * - tool ∈ { 'select', 'pencil', 'brush', 'airbrush' }, 기본 'select'.
 *   select는 그리기 모드를 끄고(기존 오브젝트 선택/이동), 나머지는
 *   그리기 모드를 켜며 도구에 맞는 브러시를 설정한다.
 * - color/width 변경은 현재 활성 브러시에 즉시 반영된다 (연필은 굵기 1 고정).
 * - 그린 획은 path:created 시점에 박제된다 — 그림판처럼 선택·이동 불가
 *   (selectable/evented false)이고, isFreeDrawing·erasable 태그로
 *   직렬화·지우개 대상 식별이 가능하다.
 * @param {React.RefObject<import('fabric').Canvas | null>} fabricCanvasRef
 * @returns {{
 *   tool: 'select' | 'pencil' | 'brush' | 'airbrush',
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
  const [width, setWidth] = useState(DEFAULT_WIDTH)

  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return
    applyToolToCanvas(canvas, tool, color, width)
  }, [fabricCanvasRef, tool, color, width])

  useEffect(() => {
    // 에어브러시 산출물(Group)도 path 키로 전달된다 — 획과 동일하게 박제.
    function pinCreatedStroke({ path }) {
      path.set({ selectable: false, evented: false, isFreeDrawing: true, erasable: true })
    }

    function subscribeToCanvas(canvas) {
      canvas.on('path:created', pinCreatedStroke)
      return () => canvas.off('path:created', pinCreatedStroke)
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
  }, [fabricCanvasRef])

  return { tool, color, width, setTool, setColor, setWidth }
}
