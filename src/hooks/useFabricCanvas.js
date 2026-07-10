import { useEffect, useRef } from 'react'
import { Canvas } from 'fabric'

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600
const DEBOUNCE_MS = 500

/**
 * Fabric.js 캔버스 생명주기를 React에 연결하는 커스텀 훅.
 * 마운트 시 fabric.Canvas를 생성하고, 언마운트 시 dispose()로 정리한다.
 * initialCanvasJSON이 있으면 캔버스 생성 직후 loadFromJSON으로 복원한다.
 * onSave가 있으면 캔버스 변경(추가·수정·삭제) 이벤트마다 500ms 디바운스 후 호출한다.
 * @param {React.RefObject<HTMLCanvasElement>} canvasElementRef
 * @param {object | null} [initialCanvasJSON]
 * @param {((canvasJSON: object) => void) | null} [onSave]
 * @returns {React.RefObject<import('fabric').Canvas | null>}
 */
export function useFabricCanvas(canvasElementRef, initialCanvasJSON, onSave) {
  const fabricCanvasRef = useRef(null)
  const onSaveRef = useRef(onSave)

  useEffect(() => {
    onSaveRef.current = onSave
  })

  useEffect(() => {
    const el = canvasElementRef.current
    if (!el) return

    const fabricCanvas = new Canvas(el, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
    })
    fabricCanvasRef.current = fabricCanvas

    let isLoading = false
    let debounceTimer = null

    function scheduleSave() {
      if (isLoading) return
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        if (onSaveRef.current) {
          onSaveRef.current(fabricCanvas.toJSON())
        }
      }, DEBOUNCE_MS)
    }

    fabricCanvas.on('object:added', scheduleSave)
    fabricCanvas.on('object:modified', scheduleSave)
    fabricCanvas.on('object:removed', scheduleSave)

    if (initialCanvasJSON) {
      isLoading = true
      fabricCanvas.loadFromJSON(initialCanvasJSON).then(() => {
        fabricCanvas.renderAll()
        isLoading = false
      })
    }

    return () => {
      clearTimeout(debounceTimer)
      fabricCanvas.dispose()
      fabricCanvasRef.current = null
    }
    // canvasElementRef는 useRef 반환값으로 렌더링 간 동일 참조 — 의존 배열 생략
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return fabricCanvasRef
}
