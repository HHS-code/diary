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
  const disposePromiseRef = useRef(null)

  useEffect(() => {
    onSaveRef.current = onSave
  })

  useEffect(() => {
    const el = canvasElementRef.current
    if (!el) return

    let cancelled = false
    let debounceTimer = null
    let fabricCanvas = null
    // fabric Canvas#dispose()는 pending requestAnimationFrame이 있으면 그걸
    // 기다리는 비동기 작업(Promise 반환)이다. StrictMode 개발 모드는 같은
    // effect를 mount→unmount→mount로 두 번 실행하는데, dispose 완료 전에
    // 같은 <canvas> DOM 엘리먼트로 new Canvas()를 또 호출하면 fabric 내부
    // 상태가 겹쳐 "Cannot read properties of undefined (reading 'clearRect')"가
    // 난다. 그래서 이전 dispose Promise가 끝난 뒤에만 생성한다.
    const setupPromise = Promise.resolve(disposePromiseRef.current).then(() => {
      if (cancelled) return

      fabricCanvas = new Canvas(el, {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
      })

      let isLoading = false

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
          if (cancelled) return
          fabricCanvas.renderAll()
          isLoading = false
        })
      }

      fabricCanvasRef.current = fabricCanvas
    })

    return () => {
      cancelled = true
      clearTimeout(debounceTimer)
      fabricCanvasRef.current = null
      disposePromiseRef.current = setupPromise.then(() => fabricCanvas?.dispose())
    }
    // canvasElementRef는 useRef 반환값으로 렌더링 간 동일 참조 — 의존 배열 생략
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return fabricCanvasRef
}
