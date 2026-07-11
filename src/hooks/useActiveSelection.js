import { useEffect, useState } from 'react'

const MULTI_SELECTION_MIN_COUNT = 2
const CANVAS_READY_POLL_MS = 50

/**
 * Fabric.js 캔버스의 선택 상태를 추적하는 커스텀 훅.
 * selection:created/selection:updated/selection:cleared 이벤트를 구독해
 * 단일 선택이면 activeObject를, 다중 선택(ActiveSelection)이면 activeSelection을 채운다.
 * fabricCanvasRef.current는 useFabricCanvas 내부에서 비동기로 채워지므로,
 * 아직 준비되지 않았다면 짧은 간격으로 폴링하다가 준비되는 즉시 구독한다.
 * @param {React.RefObject<import('fabric').Canvas | null>} fabricCanvasRef
 * @returns {{ activeObject: import('fabric').FabricObject | null, activeSelection: import('fabric').ActiveSelection | null }}
 */
export function useActiveSelection(fabricCanvasRef) {
  const [activeObject, setActiveObject] = useState(null)
  const [activeSelection, setActiveSelection] = useState(null)

  useEffect(() => {
    function syncSelectionState(canvas) {
      const selected = canvas.getActiveObject()

      if (!selected) {
        setActiveObject(null)
        setActiveSelection(null)
        return
      }

      const isMultiSelection = typeof selected.getObjects === 'function'
        && selected.getObjects().length >= MULTI_SELECTION_MIN_COUNT

      if (isMultiSelection) {
        setActiveObject(null)
        setActiveSelection(selected)
        return
      }

      setActiveObject(selected)
      setActiveSelection(null)
    }

    function clearSelectionState() {
      setActiveObject(null)
      setActiveSelection(null)
    }

    function subscribeToCanvas(canvas) {
      const handleSync = () => syncSelectionState(canvas)
      canvas.on('selection:created', handleSync)
      canvas.on('selection:updated', handleSync)
      canvas.on('selection:cleared', clearSelectionState)
      return () => {
        canvas.off('selection:created', handleSync)
        canvas.off('selection:updated', handleSync)
        canvas.off('selection:cleared', clearSelectionState)
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
  }, [fabricCanvasRef])

  return { activeObject, activeSelection }
}
