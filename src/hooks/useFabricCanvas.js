import { useEffect, useRef } from 'react'
import { Canvas } from 'fabric'

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600

/**
 * Fabric.js 캔버스 생명주기를 React에 연결하는 커스텀 훅.
 * 마운트 시 fabric.Canvas를 생성하고, 언마운트 시 dispose()로 정리한다.
 * @param {React.RefObject<HTMLCanvasElement>} canvasElementRef
 * @returns {React.RefObject<import('fabric').Canvas | null>}
 */
export function useFabricCanvas(canvasElementRef) {
  const fabricCanvasRef = useRef(null)

  useEffect(() => {
    const el = canvasElementRef.current
    if (!el) return

    const fabricCanvas = new Canvas(el, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
    })
    fabricCanvasRef.current = fabricCanvas

    return () => {
      fabricCanvas.dispose()
      fabricCanvasRef.current = null
    }
    // canvasElementRef는 useRef 반환값으로 렌더링 간 동일 참조 — 의존 배열 생략
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return fabricCanvasRef
}
