const MIN_OBJECTS_TO_DISTRIBUTE = 3

/**
 * 다중 선택된 캔버스 오브젝트의 정렬/등간격 배치를 제공하는 커스텀 훅.
 * 각 함수는 ActiveSelection을 인자로 받아 하위 오브젝트들의 left/top을 재계산한다.
 * @param {React.RefObject<import('fabric').Canvas | null>} fabricCanvasRef
 * @returns {{
 *   alignLeft: (selection: import('fabric').ActiveSelection) => void,
 *   alignRight: (selection: import('fabric').ActiveSelection) => void,
 *   alignTop: (selection: import('fabric').ActiveSelection) => void,
 *   alignBottom: (selection: import('fabric').ActiveSelection) => void,
 *   alignCenterH: (selection: import('fabric').ActiveSelection) => void,
 *   alignCenterV: (selection: import('fabric').ActiveSelection) => void,
 *   distributeHorizontal: (selection: import('fabric').ActiveSelection) => void,
 *   distributeVertical: (selection: import('fabric').ActiveSelection) => void,
 * }}
 */
export function useAlignment(fabricCanvasRef) {
  function getObjectsAndRects(selection) {
    const objects = selection.getObjects()
    const rects = objects.map((object) => object.getBoundingRect())
    return { objects, rects }
  }

  function alignLeft(selection) {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const { objects, rects } = getObjectsAndRects(selection)
    const minLeft = Math.min(...rects.map((rect) => rect.left))

    objects.forEach((object, index) => {
      const delta = minLeft - rects[index].left
      object.set({ left: object.left + delta })
    })
    canvas.renderAll()
  }

  function alignRight(selection) {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const { objects, rects } = getObjectsAndRects(selection)
    const maxRight = Math.max(...rects.map((rect) => rect.left + rect.width))

    objects.forEach((object, index) => {
      const rect = rects[index]
      const delta = maxRight - (rect.left + rect.width)
      object.set({ left: object.left + delta })
    })
    canvas.renderAll()
  }

  function alignTop(selection) {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const { objects, rects } = getObjectsAndRects(selection)
    const minTop = Math.min(...rects.map((rect) => rect.top))

    objects.forEach((object, index) => {
      const delta = minTop - rects[index].top
      object.set({ top: object.top + delta })
    })
    canvas.renderAll()
  }

  function alignBottom(selection) {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const { objects, rects } = getObjectsAndRects(selection)
    const maxBottom = Math.max(...rects.map((rect) => rect.top + rect.height))

    objects.forEach((object, index) => {
      const rect = rects[index]
      const delta = maxBottom - (rect.top + rect.height)
      object.set({ top: object.top + delta })
    })
    canvas.renderAll()
  }

  function alignCenterH(selection) {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const { objects, rects } = getObjectsAndRects(selection)
    const minLeft = Math.min(...rects.map((rect) => rect.left))
    const maxRight = Math.max(...rects.map((rect) => rect.left + rect.width))
    const centerX = (minLeft + maxRight) / 2

    objects.forEach((object, index) => {
      const rect = rects[index]
      const delta = centerX - (rect.left + rect.width / 2)
      object.set({ left: object.left + delta })
    })
    canvas.renderAll()
  }

  function alignCenterV(selection) {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const { objects, rects } = getObjectsAndRects(selection)
    const minTop = Math.min(...rects.map((rect) => rect.top))
    const maxBottom = Math.max(...rects.map((rect) => rect.top + rect.height))
    const centerY = (minTop + maxBottom) / 2

    objects.forEach((object, index) => {
      const rect = rects[index]
      const delta = centerY - (rect.top + rect.height / 2)
      object.set({ top: object.top + delta })
    })
    canvas.renderAll()
  }

  function distributeHorizontal(selection) {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const { objects, rects } = getObjectsAndRects(selection)
    if (objects.length < MIN_OBJECTS_TO_DISTRIBUTE) return

    const entries = objects
      .map((object, index) => ({ object, center: rects[index].left + rects[index].width / 2 }))
      .sort((a, b) => a.center - b.center)

    const step = (entries[entries.length - 1].center - entries[0].center) / (entries.length - 1)

    entries.forEach((entry, index) => {
      if (index === 0 || index === entries.length - 1) return
      const targetCenter = entries[0].center + step * index
      entry.object.set({ left: entry.object.left + (targetCenter - entry.center) })
    })
    canvas.renderAll()
  }

  function distributeVertical(selection) {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const { objects, rects } = getObjectsAndRects(selection)
    if (objects.length < MIN_OBJECTS_TO_DISTRIBUTE) return

    const entries = objects
      .map((object, index) => ({ object, center: rects[index].top + rects[index].height / 2 }))
      .sort((a, b) => a.center - b.center)

    const step = (entries[entries.length - 1].center - entries[0].center) / (entries.length - 1)

    entries.forEach((entry, index) => {
      if (index === 0 || index === entries.length - 1) return
      const targetCenter = entries[0].center + step * index
      entry.object.set({ top: entry.object.top + (targetCenter - entry.center) })
    })
    canvas.renderAll()
  }

  return {
    alignLeft,
    alignRight,
    alignTop,
    alignBottom,
    alignCenterH,
    alignCenterV,
    distributeHorizontal,
    distributeVertical,
  }
}
