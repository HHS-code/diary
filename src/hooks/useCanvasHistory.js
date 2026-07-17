import { useEffect, useRef, useState } from 'react'
import { EXTRA_SERIALIZED_PROPS } from './useFabricCanvas'

const MAX_HISTORY = 30
const CANVAS_READY_POLL_MS = 50

/**
 * 캔버스 전체 편집(그리기·지우기·오브젝트 추가/이동/삭제)에 대한
 * undo/redo를 제공하는 커스텀 훅. 부작용으로 Ctrl+Z(undo)/Ctrl+Y(redo)
 * 전역 keydown을 등록한다 (IText 편집 중에는 가로채지 않는다).
 *
 * 캔버스 변경(object:added/modified/removed) 이벤트마다 canvas.toObject
 * 스냅샷을 past 스택에 쌓는다 — 최대 30개, 초과 시 가장 오래된 것부터 버린다.
 * 새 변경이 생기면 future(redo) 스택은 비운다.
 * undo/redo가 수행하는 loadFromJSON 복원 중 발생하는 이벤트는 isRestoring
 * 가드로 히스토리에 다시 기록되지 않는다. 복원 후에는 아직 가드가 걸린
 * 상태에서 'object:modified'를 발생시켜 기존 오토세이브 파이프라인을 태운다.
 * @param {React.RefObject<import('fabric').Canvas | null>} fabricCanvasRef
 * @returns {{ undo: () => void, redo: () => void, canUndo: boolean, canRedo: boolean }}
 */
export function useCanvasHistory(fabricCanvasRef) {
  const pastRef = useRef([])
  const futureRef = useRef([])
  const isRestoringRef = useRef(false)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  function syncButtonState() {
    setCanUndo(pastRef.current.length > 1)
    setCanRedo(futureRef.current.length > 0)
  }

  async function restoreSnapshot(canvas, snapshot) {
    isRestoringRef.current = true
    await canvas.loadFromJSON(snapshot)
    canvas.renderAll()
    // 아직 가드가 걸린 상태에서 발생시켜야 이 fire 자체가 새 히스토리로
    // 기록되지 않는다 (가드 해제는 그 다음에).
    canvas.fire('object:modified')
    isRestoringRef.current = false
    syncButtonState()
  }

  function undo() {
    const canvas = fabricCanvasRef.current
    if (!canvas) return
    if (pastRef.current.length <= 1) return

    const current = pastRef.current.pop()
    futureRef.current.push(current)
    restoreSnapshot(canvas, pastRef.current[pastRef.current.length - 1])
  }

  function redo() {
    const canvas = fabricCanvasRef.current
    if (!canvas) return
    if (futureRef.current.length === 0) return

    const next = futureRef.current.pop()
    pastRef.current.push(next)
    restoreSnapshot(canvas, next)
  }

  useEffect(() => {
    function recordSnapshot(canvas) {
      if (isRestoringRef.current) return
      pastRef.current.push(canvas.toObject(EXTRA_SERIALIZED_PROPS))
      if (pastRef.current.length > MAX_HISTORY) {
        pastRef.current.shift()
      }
      futureRef.current = []
      syncButtonState()
    }

    function subscribeToCanvas(canvas) {
      pastRef.current = [canvas.toObject(EXTRA_SERIALIZED_PROPS)]
      futureRef.current = []
      syncButtonState()

      const handleChange = () => recordSnapshot(canvas)
      canvas.on('object:added', handleChange)
      canvas.on('object:modified', handleChange)
      canvas.on('object:removed', handleChange)
      return () => {
        canvas.off('object:added', handleChange)
        canvas.off('object:modified', handleChange)
        canvas.off('object:removed', handleChange)
      }
    }

    let unsubscribeFromCanvas = null
    let pollTimer = null

    // fabricCanvasRef.current는 useFabricCanvas 내부에서 비동기로 채워지므로,
    // 아직 준비되지 않았다면 짧은 간격으로 폴링하다가 준비되는 즉시 구독한다
    // (usePaintTools의 폴링 패턴과 동일).
    if (fabricCanvasRef.current) {
      unsubscribeFromCanvas = subscribeToCanvas(fabricCanvasRef.current)
    } else {
      pollTimer = setInterval(() => {
        if (!fabricCanvasRef.current) return
        unsubscribeFromCanvas = subscribeToCanvas(fabricCanvasRef.current)
        clearInterval(pollTimer)
      }, CANVAS_READY_POLL_MS)
    }

    return () => {
      clearInterval(pollTimer)
      if (unsubscribeFromCanvas) unsubscribeFromCanvas()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fabricCanvasRef])

  useEffect(() => {
    function isEditingText(canvas) {
      return Boolean(canvas.getActiveObject()?.isEditing)
    }

    function handleKeyDown(event) {
      const canvas = fabricCanvasRef.current
      if (!canvas) return
      if (isEditingText(canvas)) return

      const isCtrlOrCmd = event.ctrlKey || event.metaKey
      if (isCtrlOrCmd && event.key === 'z') {
        event.preventDefault()
        undo()
        return
      }
      if (isCtrlOrCmd && event.key === 'y') {
        event.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fabricCanvasRef])

  return { undo, redo, canUndo, canRedo }
}
